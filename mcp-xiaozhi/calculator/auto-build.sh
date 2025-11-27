#!/bin/bash

# Set image name
IMAGE_NAME="mcp/calculater"

echo "[+] Building Docker image: $IMAGE_NAME"

# Build the image
docker build -t $IMAGE_NAME .

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "[✓] Build successful!"
    echo "[→] You can now run the challenge with:"
    echo "    docker run $IMAGE_NAME"
else
    echo "[✗] Build failed. Check your Dockerfile and app.py for errors."
fi

