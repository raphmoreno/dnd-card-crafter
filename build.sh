#!/bin/bash
# Build script for Cloudflare Pages
# This ensures VITE_API_URL is available during the build

set -e

echo "Building with VITE_API_URL: ${VITE_API_URL:-'(not set)'}"

# Install dependencies
npm ci

# Build with the environment variable
npm run build

echo "Build complete!"

