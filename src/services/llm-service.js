/**
 * Multimodal LLM Interface
 * Connects to local Hugging Face model (Qwen2-VL-2B-Instruct)
 * Based on ARCHITECTURE.md Section 4
 */

export class LLMService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8000';
    this.model = config.model || 'Qwen/Qwen2-VL-2B-Instruct';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Send chat completion request
   * @param {Object} params - { messages, images?, temperature?, max_tokens? }
   * @returns {Promise<Object>} LLM response
   */
  async chat(params) {
    const { messages, images = [], temperature = 0.7, max_tokens = 1000 } = params;

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.prepareMessages(messages, images),
          temperature,
          max_tokens
        })
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('LLM service error:', error);
      throw new Error(`Failed to get LLM response: ${error.message}`);
    }
  }

  /**
   * Prepare messages with image support
   * @param {Array} messages - Array of { role, content }
   * @param {Array} images - Array of base64 images or URLs
   * @returns {Array} Formatted messages
   */
  prepareMessages(messages, images) {
    return messages.map(msg => {
      if (msg.role === 'user' && images.length > 0) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            ...images.map(img => ({
              type: 'image_url',
              image_url: { url: img }
            }))
          ]
        };
      }
      return msg;
    });
  }

  /**
   * Parse LLM response
   * @param {Object} data - Raw response from API
   * @returns {Object} Parsed response
   */
  parseResponse(data) {
    // Handle streaming or non-streaming responses
    if (data.choices && data.choices[0]) {
      return {
        content: data.choices[0].message?.content || '',
        finishReason: data.choices[0].finish_reason,
        usage: data.usage
      };
    }
    
    // Fallback for different response formats
    return {
      content: data.content || data.text || '',
      finishReason: 'stop',
      usage: data.usage || {}
    };
  }

  /**
   * Check if LLM service is available
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
