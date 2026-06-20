#!/bin/bash
# ──────────────────────────────────────────────────────
# StellarProcure — Local Development Setup Script
# Sets up a local deployer account and funds it via Friendbot
# ──────────────────────────────────────────────────────

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║   StellarProcure — Development Setup             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Check Prerequisites ──
echo "🔍 Checking prerequisites..."

if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found."
    echo "   Install: cargo install --locked stellar-cli --features opt"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# ── Step 1: Install Rust wasm32 target ──
echo "🔧 Step 1: Adding wasm32 compilation target..."
rustup target add wasm32-unknown-unknown 2>/dev/null || true
echo "✅ wasm32-unknown-unknown target available"
echo ""

# ── Step 2: Generate developer identities ──
echo "🔑 Step 2: Generating test identities..."

# Buyer account
if ! stellar keys show buyer &> /dev/null 2>&1; then
    stellar keys generate buyer --network testnet
    echo "   Created: buyer"
    stellar keys fund buyer --network testnet
    echo "   Funded: buyer"
else
    echo "   Exists: buyer"
fi

# Vendor account
if ! stellar keys show vendor &> /dev/null 2>&1; then
    stellar keys generate vendor --network testnet
    echo "   Created: vendor"
    stellar keys fund vendor --network testnet
    echo "   Funded: vendor"
else
    echo "   Exists: vendor"
fi

BUYER_ADDR=$(stellar keys show buyer)
VENDOR_ADDR=$(stellar keys show vendor)
echo ""
echo "   Buyer:  $BUYER_ADDR"
echo "   Vendor: $VENDOR_ADDR"
echo ""

# ── Step 3: Install Node dependencies ──
echo "📦 Step 3: Installing Node.js dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# ── Step 4: Create .env.local ──
echo "📝 Step 4: Creating .env.local..."
if [ ! -f .env.local ]; then
cat > .env.local << EOF
# StellarProcure Environment Variables
NEXT_PUBLIC_CONTRACT_ID=CCCG3FK5DHPLRAARER6LOSV2BLTR4HBHG54N6G5BVT7G3PY5Z2I6UXNL
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_NATIVE_TOKEN_ID=CDLZFC3SYJYDATH7K42SBVS4M2ZEDFGEKZWUW4T75W5NZIG3J5Z3W2W3
EOF
    echo "✅ .env.local created"
else
    echo "⏭  .env.local already exists, skipping"
fi
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "   Run:  npm run dev                               "
echo "   Open: http://localhost:3000                      "
echo "╚══════════════════════════════════════════════════╝"
