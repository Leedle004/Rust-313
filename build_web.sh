#!/usr/bin/env bash
# Build the WebAssembly version of Astro Blaster and drop the artifact next to
# the HTML/JS loader in web/. Then serve web/ with any static file server.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Ensuring wasm32 target is installed"
rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

echo "==> Building release wasm"
cargo build --release --target wasm32-unknown-unknown

echo "==> Copying wasm into web/"
cp target/wasm32-unknown-unknown/release/astro_blaster.wasm web/astro_blaster.wasm

cat <<'EOF'

Done. To play in a browser, serve the web/ directory, e.g.:

    python3 -m http.server --directory web 8080

then open http://localhost:8080
EOF
