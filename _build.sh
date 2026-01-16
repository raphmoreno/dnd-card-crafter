#!/bin/bash
# Cloudflare Pages build script
# Forces npm usage instead of bun

echo "Installing dependencies with npm..."
npm ci

echo "Building application..."
npm run build

echo "Build complete!"

