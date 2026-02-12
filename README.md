# BioScriptAI v2.0

A Chrome extension with a persistent sidebar for context-aware academic paper assistance. Provides AI-powered question answering, summarization, term definitions, figure interpretation, and Zotero integration.

## Overview

BioScriptAI v2.0 helps researchers:
- **Answer questions** about papers using context-aware AI
- **Summarize papers** with customizable focus (methods, results, literature gap)
- **Define terms** with contextual explanations and usage examples
- **Interpret figures and tables** using multimodal AI
- **Manage projects** and organize papers with Zotero integration
- **Get recommendations** for next relevant papers

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the high-level design. The extension uses:
- **Local LLM** (Qwen2-VL-2B-Instruct via Hugging Face) for privacy-first processing
- **Screen inference** to capture visible paper content
- **Zotero API** for reference management
- **Chrome Side Panel API** for persistent sidebar

## Getting Started

### Prerequisites

1. **Chrome/Chromium browser** (Manifest V3 support)
2. **Local LLM server** running Qwen2-VL-2B-Instruct (or compatible model)
   - Default endpoint: `http://localhost:8000`
   - See [ARCHITECTURE.md](ARCHITECTURE.md) Section 4 for setup details
3. **Zotero account** (optional, for reference management)
   - Get API key: https://www.zotero.org/settings/keys/new

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd BioScriptAI-v2
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `BioScriptAI-v2` directory

3. Configure settings:
   - Click the extension icon → Options (or right-click → Options)
   - Enter your local LLM server URL (default: `http://localhost:8000`)
   - (Optional) Enter your Zotero API key
   - Test connections and save

### Local LLM Setup

The extension expects a local HTTP server running a Hugging Face model. Example setup:

```python
# Example: Simple Flask server (not included, create separately)
from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)
pipe = pipeline("text-generation", model="Qwen/Qwen2-VL-2B-Instruct")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    # Process messages and return response
    return jsonify({"choices": [{"message": {"content": "..."}}]})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=8000)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for details on the expected API format.

## Usage

1. **Open sidebar**: Click the extension icon or press `Ctrl+Shift+B`
2. **Load a paper**: Navigate to a PDF or article page
3. **Ask questions**: Type in the question input area
4. **Summarize**: Use quick actions or ask "Summarize this paper"
5. **Manage projects**: Use the Workspace tab to create projects and organize papers
6. **Export**: Export project bibliographies in APA, MLA, or BibTeX format

## Project Structure

```
BioScriptAI-v2/
├── manifest.json              # Chrome extension manifest
├── src/
│   ├── background/
│   │   └── service-worker.js  # Main orchestrator
│   ├── content/
│   │   └── content-script.js  # PDF/HTML parsing
│   ├── core/
│   │   └── context-manager.js  # Context management
│   ├── modules/
│   │   ├── qa-module.js       # Question answering
│   │   └── summarization-module.js
│   ├── services/
│   │   ├── llm-service.js     # LLM interface
│   │   └── zotero-service.js  # Zotero API
│   ├── sidebar/
│   │   ├── sidebar.html       # Sidebar UI
│   │   ├── sidebar.css
│   │   └── sidebar.js
│   ├── options/
│   │   ├── options.html       # Settings page
│   │   └── options.js
│   └── utils/
│       └── prompt-loader.js   # Prompt templates
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── SIDEBAR_UI_SPEC.json
│   ├── QA_PROMPT_TEMPLATE.md
│   └── ...
└── README.md
```

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and component descriptions
- **[SIDEBAR_UI_SPEC.json](docs/SIDEBAR_UI_SPEC.json)** - UI/UX specification
- **[PRIVACY_SECURITY_SPEC.md](docs/PRIVACY_SECURITY_SPEC.md)** - Privacy and security guidelines
- **[ZOTERO_INTEGRATION_BLUEPRINT.md](docs/ZOTERO_INTEGRATION_BLUEPRINT.md)** - Zotero API integration guide
- **[EVALUATION_TEST_SUITE.md](docs/EVALUATION_TEST_SUITE.md)** - Test cases and evaluation metrics

## Development

### Building

No build step required for basic development. The extension uses ES modules directly.

### Testing

See [EVALUATION_TEST_SUITE.md](docs/EVALUATION_TEST_SUITE.md) for test cases covering:
- Summary accuracy
- QA context awareness
- Term definition correctness
- Figure understanding
- Zotero integration
- UI responsiveness

## Privacy

By default, all processing is **local-only**:
- Screen content is captured and processed on your device
- LLM inference runs on your local server
- No data is sent to cloud services unless you explicitly opt in

See [PRIVACY_SECURITY_SPEC.md](docs/PRIVACY_SECURITY_SPEC.md) for details.

## Contributing

Contributions welcome! Please read the architecture docs and follow the existing code structure.

## License

MIT (or specify your license)
