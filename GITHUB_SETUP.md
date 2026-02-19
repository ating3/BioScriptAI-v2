# Pushing to GitHub

## Quick Start

### Option 1: Using the script (recommended)

```bash
bash scripts/push-to-github.sh
```

The script will guide you through adding the remote and pushing.

### Option 2: Manual steps

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it `BioScriptAI-v2` (or your preferred name)
   - Don't initialize with README, .gitignore, or license (we already have these)

2. **Add the remote and push:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/BioScriptAI-v2.git
   git branch -M main
   git push -u origin main
   ```

### Option 3: Using GitHub CLI

If you have `gh` installed:

```bash
gh repo create BioScriptAI-v2 --public --source=. --remote=origin --push
```

## Authentication

**HTTPS (recommended for first time):**
- GitHub will prompt for username and password
- Use a Personal Access Token (PAT) as password: https://github.com/settings/tokens

**SSH (recommended for regular use):**
- Set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- Use SSH URL: `git@github.com:YOUR_USERNAME/BioScriptAI-v2.git`

## What's included

The repository includes:
- ✅ All source code (`src/`)
- ✅ Documentation (`docs/`, `ARCHITECTURE.md`, `README.md`)
- ✅ Scripts (`scripts/`)
- ✅ Configuration files (`manifest.json`, `package.json`)
- ✅ `.gitignore` (excludes `node_modules/`, build files, etc.)

**Not included** (via .gitignore):
- `node_modules/`
- Build artifacts
- Local environment files
- Model cache (users download separately)

## After pushing

Your repository will be available at:
```
https://github.com/YOUR_USERNAME/BioScriptAI-v2
```

Others can clone and set it up following the README instructions.
