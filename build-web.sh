#!/usr/bin/env bash
# Build the WebAssembly version of Nebula Strike 313 and stage it in web/.
#
# Usage:  ./build-web.sh
# Then:   (cd web && python3 -m http.server 8080)  and open http://localhost:8080
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Ensuring wasm target is installed"
rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

echo "==> Building release wasm"
cargo build --release --target wasm32-unknown-unknown

echo "==> Copying artifact into web/"
cp target/wasm32-unknown-unknown/release/nebula_strike.wasm web/nebula_strike.wasm

echo "==> Done. Serve it with:"
echo "    (cd web && python3 -m http.server 8080)"
echo "    then open http://localhost:8080"
