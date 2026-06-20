#!/bin/bash
# ──────────────────────────────────────────────────────
# StellarProcure — Soroban Contract Deployment Script
# Deploys the procurement smart contract to Stellar Testnet
# ──────────────────────────────────────────────────────

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║   StellarProcure — Contract Deployment           ║"
echo "║   Network: Stellar Testnet                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Configuration ──
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_DIR="contracts/procurement/contracts/procurement"
WASM_FILE="target/wasm32-unknown-unknown/release/procurement.wasm"

# ── Check Prerequisites ──
echo "🔍 Checking prerequisites..."

if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Install it:"
    echo "   cargo install --locked stellar-cli --features opt"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo (Rust toolchain) not found. Install from https://rustup.rs"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# ── Step 1: Build the Contract ──
echo "🔨 Step 1: Building Soroban smart contract..."
cd "$CONTRACT_DIR"
cargo build --target wasm32-unknown-unknown --release
cd -
echo "✅ Contract built: $WASM_FILE"
echo ""

# ── Step 2: Optimize the WASM (optional but recommended) ──
if command -v stellar &> /dev/null; then
    echo "📦 Step 2: Optimizing WASM..."
    stellar contract optimize --wasm "$WASM_FILE"
    echo "✅ WASM optimized"
    echo ""
fi

# ── Step 3: Set up deployer identity ──
echo "🔑 Step 3: Setting up deployer identity..."

# Check if deployer identity exists; if not, generate one
if ! stellar keys show deployer &> /dev/null 2>&1; then
    echo "   Creating new deployer identity..."
    stellar keys generate deployer --network $NETWORK
    echo "   Funding via Friendbot..."
    stellar keys fund deployer --network $NETWORK
fi

DEPLOYER_ADDRESS=$(stellar keys show deployer)
echo "   Deployer: $DEPLOYER_ADDRESS"
echo ""

# ── Step 4: Deploy Contract ──
echo "🚀 Step 4: Deploying contract to Stellar Testnet..."

CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source deployer \
    --network $NETWORK)

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Deployment Successful!                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "   Contract ID: $CONTRACT_ID"
echo "   Network:     Stellar Testnet"
echo "   Explorer:    https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📝 Update your .env.local with:"
echo "   NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "📝 Also update lib/stellar.ts CONTRACT_ID constant."
