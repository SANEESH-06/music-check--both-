#!/usr/bin/env zsh

set -e

PROJECT_NODE_PATH="/Users/sanu/Desktop/project/.tools/node/bin"
ZSHRC="$HOME/.zshrc"
MARKER="# Sounddeck local Node.js"

touch "$ZSHRC"

if grep -q "$MARKER" "$ZSHRC"; then
  echo "Node path is already configured in $ZSHRC"
else
  {
    echo ""
    echo "$MARKER"
    echo "export PATH=\"$PROJECT_NODE_PATH:\$PATH\""
  } >> "$ZSHRC"

  echo "Added local Node.js to $ZSHRC"
fi

echo "Run this now:"
echo "source ~/.zshrc"
echo
echo "Then check:"
echo "node -v"
echo "npm -v"
