#!/bin/bash
# Script to push BioScriptAI-v2 to GitHub

echo "🚀 Pushing BioScriptAI v2.0 to GitHub"
echo ""

# Check if remote exists
if git remote get-url origin 2>/dev/null; then
    echo "✓ Remote 'origin' already configured"
    REMOTE_URL=$(git remote get-url origin)
    echo "  URL: $REMOTE_URL"
else
    echo "⚠ No remote configured"
    echo ""
    echo "To add a GitHub remote, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/BioScriptAI-v2.git"
    echo ""
    echo "Or if you've already created the repo on GitHub, paste the URL:"
    read -p "GitHub repository URL: " REPO_URL
    if [ ! -z "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "✓ Remote added"
    else
        echo "✗ No URL provided. Exiting."
        exit 1
    fi
fi

echo ""
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "Your repository is now available at:"
    git remote get-url origin
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "  1. Repository doesn't exist on GitHub - create it first at github.com/new"
    echo "  2. Authentication required - use GitHub CLI (gh auth login) or SSH keys"
    echo "  3. Branch name mismatch - GitHub may use 'main' or 'master'"
fi
