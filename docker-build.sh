#!/bin/bash

# Build and push multi-platform Docker image for BrowserQuest
docker buildx build --platform linux/arm64,linux/amd64 -t docker.io/gonzalomg0/browserquest:latest --push .

