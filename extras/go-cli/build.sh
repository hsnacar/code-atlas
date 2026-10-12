#!/bin/bash
set -e

# Code Atlas Go Standalone Cross-Compilation Script
VERSION="0.1.0"
OUTPUT_DIR="./bin"

mkdir -p "$OUTPUT_DIR"

PLATFORMS=(
  "darwin/arm64"
  "darwin/amd64"
  "linux/amd64"
  "linux/arm64"
  "windows/amd64"
)

echo "🚀 Building Code Atlas v$VERSION standalone binaries..."

for PLATFORM in "${PLATFORMS[@]}"; do
  GOOS="${PLATFORM%/*}"
  GOARCH="${PLATFORM#*/}"
  
  EXT=""
  if [ "$GOOS" = "windows" ]; then
    EXT=".exe"
  fi
  
  BINARY_NAME="code-atlas-${GOOS}-${GOARCH}${EXT}"
  TARGET="${OUTPUT_DIR}/${BINARY_NAME}"
  
  echo "  📦 Building for $GOOS/$GOARCH -> $TARGET"
  CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w" -o "$TARGET" main.go
done

echo "✅ All binaries built successfully in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR"
