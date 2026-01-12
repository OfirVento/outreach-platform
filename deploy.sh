#!/bin/bash
# Deploy script for Outreach Platform
# This script builds the app and deploys to GitHub Pages

set -e

echo "🚀 Starting deployment to GitHub Pages..."

# Step 1: Commit any pending changes
echo "📝 Checking for uncommitted changes..."
if [[ -n $(git status --porcelain) ]]; then
    echo "   Committing changes..."
    git add -A
    git commit -m "Auto-commit before deploy: $(date '+%Y-%m-%d %H:%M')"
    git push
else
    echo "   No uncommitted changes."
fi

# Step 2: Build the production version
echo "🔨 Building production version..."
rm -rf .next out
npm run build

# Step 3: Deploy to GitHub Pages
echo "🌐 Deploying to GitHub Pages..."
npx gh-pages -d out

# Step 4: Push final changes
echo "📤 Pushing to repository..."
git push

echo ""
echo "✅ Deployment complete!"
echo "🔗 Live at: https://ofirvento.github.io/outreach-platform/"
echo ""
echo "Note: GitHub Pages may take 1-2 minutes to update."
