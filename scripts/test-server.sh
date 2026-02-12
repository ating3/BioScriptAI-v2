#!/bin/bash
# Bash script to test the LLM server

echo "Testing health endpoint..."
curl -s http://localhost:8000/health | jq '.' || echo "Health check failed"

echo -e "\nTesting chat endpoint..."
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Say Hi back in one word."}
    ],
    "max_tokens": 50
  }' | jq '.'
