# Local LLM Server - Quick Start

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or install manually:
pip install flask flask-cors transformers torch accelerate
```

## Run the Server

**From the scripts directory:**
```bash
cd scripts
python local-llm-server-example.py
```

**Or from project root:**
```bash
python scripts/local-llm-server-example.py
```

**If using WSL (recommended for Windows):**
```bash
# From WSL terminal
cd ~/projects/BioScriptAI-v2/scripts
python3 local-llm-server-example.py

# Or use the helper script
bash scripts/run-server.sh
```

**First run:**
- Model will download automatically (~4-6 GB)
- Takes 10-30 minutes depending on connection
- Subsequent runs use cached model (instant)

## Verify It's Working

**PowerShell (Windows):**
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get

# Test chat endpoint
$body = @{
    messages = @(@{role="user"; content="Hello!"})
    max_tokens = 100
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/chat" -Method Post -Body $body -ContentType "application/json"

# Or use the test script:
.\scripts\test-server.ps1
```

**Bash/WSL:**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"what is a mitochondria"}],"max_tokens":100}'

#Test Model endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "image", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg"},
          {"type": "text", "text": "What animal is in this image? Describe it briefly."}
        ]
      }
    ],
    "temperature": 0.7,
    "max_tokens": 256
  }'

# Or use the test script:
bash scripts/test-server.sh
```

## Troubleshooting

**Out of memory?**
- Use CPU mode (slower but works): The script auto-detects
- Or use a smaller model: Change `model_name` in the script

**Model download fails?**
- Check internet connection
- Try setting `HF_ENDPOINT` environment variable if behind firewall
- See `docs/LOCAL_LLM_SETUP.md` for manual download options

**Port 8000 already in use?**
- Change port in the script: `app.run(port=8001)`
- Update extension settings to match

## Next Steps

1. Start the server: `python local-llm-server-example.py`
2. Configure extension: Set LLM URL to `http://localhost:8000` in options
3. Test in extension: Open sidebar and ask a question!
