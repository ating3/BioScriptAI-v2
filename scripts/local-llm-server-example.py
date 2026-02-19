#!/usr/bin/env python3
"""
Local LLM Server for BioScriptAI
Ready-to-use server for Qwen2-VL-2B-Instruct or compatible models.

Install: pip install flask transformers torch flask-cors accelerate
"""

from flask import Flask, request, jsonify
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
from flask_cors import CORS
import copy
import logging
import torch

app = Flask(__name__)
CORS(app)  # Allow Chrome extension to connect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model (lazy load on first request)
model = None
processor = None

def load_model():
    """Load the Hugging Face model"""
    global model, processor
    if model is None:
        logger.info("Loading model...")
        try:
            
            model_name = "Qwen/Qwen2-VL-2B-Instruct"
            
            # Load processor
            processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")

            # Determine device and dtype
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            logger.info(f"Loading model on {device} with dtype {dtype}")
            
            # Load model
            if torch.cuda.is_available():
                model = Qwen2VLForConditionalGeneration.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    trust_remote_code=True
                )
            else:
                model = Qwen2VLForConditionalGeneration.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True
                )
                model = model.to("cpu")
            
            model.eval()  # Set to evaluation mode
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.error("Make sure you have installed: pip install transformers torch accelerate")
            raise
    return model, processor

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

@app.route("/chat", methods=["POST"])
def chat():
    """Chat completion endpoint"""
    try:
        data = request.json
        messages = data.get("messages", [])
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 1000)

        # Load model if needed
        model, processor = load_model()

        # Use tokenizer's chat template if available (Qwen models support this)
        if hasattr(processor, 'apply_chat_template'):
            try:
                # Extract images from the ORIGINAL messages. Use a deep copy for
                # apply_chat_template so the template cannot mutate our message
                # content (which would break vision extraction).
                image_inputs, video_inputs = process_vision_info(messages)
                messages_for_template = copy.deepcopy(messages)
                prompt = processor.apply_chat_template(
                    messages_for_template,
                    tokenize=False,
                    add_generation_prompt=True
                )
                inputs = processor(
                    text=[prompt],
                    images=image_inputs,
                    videos=video_inputs,
                    padding=True,
                    return_tensors="pt",
                )
            except Exception as e:
                logger.warning(f"Chat template failed, using fallback: {e}")
                prompt = format_messages(messages)
                inputs = processor(prompt, return_tensors="pt")
        else:
            # Fallback to manual formatting
            prompt = format_messages(messages)
            inputs = processor(prompt, return_tensors="pt")

        # Move inputs to same device as model
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=temperature > 0,
                pad_token_id=processor.tokenizer.eos_token_id,
                eos_token_id=processor.tokenizer.eos_token_id
            )
        
        # Extract only the new tokens (response)
        input_length = inputs['input_ids'].shape[1]
        response_ids = [out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs["input_ids"], outputs)]
        response_text = processor.batch_decode(response_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)

        # Return in expected format
        return jsonify({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": input_length,
                "completion_tokens": len(response_ids),
                "total_tokens": input_length + len(response_ids)
            }
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

def format_messages(messages):
    """Format messages for the model (fallback when chat template not available)"""
    # Qwen-style format
    formatted = ""
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        
        if isinstance(content, list):
            # Handle multimodal content (extract text parts)
            text_parts = [item.get("text", "") for item in content if item.get("type") == "text"]
            content = " ".join(text_parts)
        
        if role == "system":
            formatted += f"<|im_start|>system\n{content}<|im_end|>\n"
        elif role == "user":
            formatted += f"<|im_start|>user\n{content}<|im_end|>\n"
        elif role == "assistant":
            formatted += f"<|im_start|>assistant\n{content}<|im_end|>\n"
    
    formatted += "<|im_start|>assistant\n"
    return formatted

if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("BioScriptAI Local LLM Server")
    logger.info("=" * 50)
    logger.info("Starting server on http://localhost:8000")
    logger.info("Model will be downloaded automatically on first request")
    logger.info("Press Ctrl+C to stop")
    logger.info("=" * 50)
    
    try:
        app.run(host="0.0.0.0", port=8000, debug=False)
    except KeyboardInterrupt:
        logger.info("\nShutting down server...")
