#!/usr/bin/env bash
# Builds the game for the web (wasm32) and stages the artifact for web/index.html.
set -euo pipefail

cd "$(dirname "$0")"

rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

cargo build --release --target wasm32-unknown-unknown

mkdir -p web/pkg
cp target/wasm32-unknown-unknown/release/rust-313.wasm web/pkg/rust-313.wasm

echo "Built web/pkg/rust-313.wasm"
echo "Serve the 'web' directory, e.g.:"
echo "  cd web && python3 -m http.server 8080"
