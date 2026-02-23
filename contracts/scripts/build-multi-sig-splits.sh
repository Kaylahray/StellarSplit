#!/bin/bash
# Build the Multi-Signature Splits Soroban contract to WASM

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACT_DIR="$SCRIPT_DIR/../multi-sig-splits"
TARGET_DIR="$SCRIPT_DIR/../target"

echo "🔨 Building multi-sig-splits contract..."
echo "   Contract directory: $CONTRACT_DIR"

cd "$CONTRACT_DIR"

# Check if wasm32 target is installed
if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "📦 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Build for release
echo "🔧 Compiling contract..."
cargo build --target wasm32-unknown-unknown --release

WASM_PATH="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/multi_sig_splits.wasm"

# Check if build succeeded
if [ -f "$WASM_PATH" ]; then
    echo "✅ Build successful!"
    echo "📁 Output: $WASM_PATH"

    # Show file size
    SIZE=$(ls -lh "$WASM_PATH" | awk '{print $5}')
    echo "📊 Contract size: $SIZE"
else
    echo "❌ Build failed: WASM file not found"
    exit 1
fi

# Optimize WASM if soroban CLI is available
if command -v soroban &> /dev/null; then
    echo ""
    echo "📦 Optimizing WASM with Soroban CLI..."
    soroban contract optimize --wasm "$WASM_PATH"

    OPTIMIZED_PATH="${WASM_PATH%.wasm}.optimized.wasm"
    if [ -f "$OPTIMIZED_PATH" ]; then
        OPT_SIZE=$(ls -lh "$OPTIMIZED_PATH" | awk '{print $5}')
        echo "✅ Optimization complete!"
        echo "📊 Optimized size: $OPT_SIZE"
    fi
else
    echo ""
    echo "💡 Tip: Install soroban-cli for WASM optimization:"
    echo "   cargo install soroban-cli"
fi

echo ""
echo "🎉 Build complete!"