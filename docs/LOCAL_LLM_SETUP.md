# Local LLM Setup Guide

Guide for setting up the local Hugging Face model (Qwen2-VL-2B-Instruct) for BioScriptAI.

---

## Model Download

### Automatic Download (Default)

When you run the server for the first time, the `transformers` library will automatically download the model from Hugging Face:

```python
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")
```

**What happens:**
- Model files are downloaded to your Hugging Face cache directory:
  - **Linux/Mac**: `~/.cache/huggingface/hub/`
  - **Windows**: `C:\Users\<username>\.cache\huggingface\hub\`
- Model size: ~4-6 GB (for Qwen2-VL-2B-Instruct)
- Download time: Depends on your internet speed (typically 10-30 minutes)

### Manual Download (Optional)

If you want to download the model manually or use a specific location:

**Option 1: Using Hugging Face CLI**
```bash
pip install huggingface_hub
huggingface-cli download Qwen/Qwen2-VL-2B-Instruct --local-dir ./models/Qwen2-VL-2B-Instruct
```

Then modify the server script:
```python
model = AutoModelForCausalLM.from_pretrained("./models/Qwen2-VL-2B-Instruct")
```

**Option 2: Using Python**
```python
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="Qwen/Qwen2-VL-2B-Instruct",
    local_dir="./models/Qwen2-VL-2B-Instruct"
)
```

---

## Model Size & Requirements

| Model | Size | VRAM (FP16) | RAM (CPU) |
|-------|------|-------------|-----------|
| Qwen2-VL-2B-Instruct | ~4-6 GB | ~4-6 GB | ~8-12 GB |
| Qwen2-VL-7B-Instruct | ~14-16 GB | ~14-16 GB | ~20-24 GB |

**Recommendations:**
- **2B model**: Good for quick demo, runs on modest GPU or CPU (slower)
- **7B model**: Better quality, requires more VRAM

---

## Check if Model is Already Downloaded

```python
from huggingface_hub import hf_hub_download
import os

cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
model_path = os.path.join(cache_dir, "models--Qwen--Qwen2-VL-2B-Instruct")

if os.path.exists(model_path):
    print("Model is already downloaded!")
else:
    print("Model will be downloaded on first run.")
```

Or check via Python:
```python
from transformers import AutoTokenizer

try:
    tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-VL-2B-Instruct", local_files_only=True)
    print("Model is cached locally")
except:
    print("Model not found, will download")
```

---

## First Run

When you start the server for the first time:

```bash
python scripts/local-llm-server-example.py
```

You'll see:
```
Loading model...
Downloading model files...
100%|████████████| 4.2G/4.2G [15:23<00:00, 4.5MB/s]
Model loaded successfully
Starting BioScriptAI LLM server on http://localhost:8000
```

**Note:** The download happens automatically - you don't need to do anything extra!

---

## Using a Different Model

If you want to use a different model (e.g., smaller or different architecture):

1. **Change the model name** in the server script:
   ```python
   model_name = "microsoft/Phi-3-mini-4k-instruct"  # Smaller alternative
   ```

2. **Or use a local path** if you've downloaded manually:
   ```python
   model_name = "./models/my-custom-model"
   ```

**Compatible models:**
- Any Hugging Face model that supports `AutoModelForCausalLM`
- Models with instruction-following capabilities work best
- For multimodal (figures), use vision-language models like Qwen2-VL

---

## Troubleshooting

### Download Fails / Slow Connection

**Use a mirror or manual download:**
```bash
# Set Hugging Face mirror (if in China)
export HF_ENDPOINT=https://hf-mirror.com

# Or download via git-lfs
git lfs install
git clone https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct
```

### Out of Disk Space

The model cache can grow large. To clean up:
```python
from huggingface_hub import scan_cache_dir

cache_info = scan_cache_dir()
print(f"Cache size: {cache_info.size_on_disk_str}")
# Delete unused: cache_info.delete_revisions(...)
```

Or manually delete from `~/.cache/huggingface/hub/`.

### Model Already Downloaded But Not Found

Check the cache location:
```python
from transformers import file_utils
print(file_utils.default_cache_path)
```

Ensure the model ID matches exactly: `Qwen/Qwen2-VL-2B-Instruct`

---

## Quick Start Summary

1. **Install dependencies:**
   ```bash
   pip install flask transformers torch flask-cors
   ```

2. **Run the server:**
   ```bash
   python scripts/local-llm-server-example.py
   ```

3. **First run will download the model automatically** (~4-6 GB, one-time)

4. **Subsequent runs use the cached model** (no download needed)

That's it! The model download is handled automatically by Hugging Face's `transformers` library.
