<img width="1918" height="900" alt="Screenshot 2026-06-21 025058" src="https://github.com/user-attachments/assets/e531929f-62b9-47c9-bae0-9debd38d452c" />
# Stellar On-Chain Procurement System

A polished React frontend for a Soroban smart contract that lets teams create RFPs, place bids, escrow funds, and track everything on-chain from one dashboard.

React 19 Next.js 15 Stellar Soroban Testnet Freighter wallet

## Hackathon Submission Details
- **Live Demo Link:** [Add your Vercel/Netlify link here]
- **Wallet Options Screenshot:** 
  *(Please replace this placeholder with your actual screenshot)*
  ![Wallet Options Screenshot](./public/wallet-options.png)
- **Deployed Contract ID:** `CABYZJQCDECRTGDY6UP2RD2ESBF6CTUSKABVRWZUGVATXR3MHSGEZHQO`
- **Transaction Hash (Contract Call):** `fd1b812f6b9301ce3cb94d412e7bdffcabfe1c37fbe679e086a60816ca0b1f39` ([View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/fd1b812f6b9301ce3cb94d412e7bdffcabfe1c37fbe679e086a60816ca0b1f39))

## Contract Explorer
Freighter wallet ID: GA7RWV6IBWMP5JLWNXMBK2RIJFCMSX56RPSIHBSWRGMOX7S3ONAEDKLH

## Overview
This project combines:
- A Soroban smart contract for procurement requests, bidding, and escrow management
- A React + Next.js dashboard for interacting with the contract
- Freighter wallet integration for authenticated write actions
- Read-only contract calls for request lookup, bid listing, and state sync

The current frontend is designed as a clean operator console with live status output, wallet visibility, request/bid summaries, and responsive cards for desktop and mobile.

## What You Can Do
- Create a new procurement request with title, description, and budget (locks funds in escrow)
- Place a bid as a vendor on an open request
- Select a winning bid (buyer only)
- Mark a request as completed to release escrow to the vendor and refund any surplus
- Cancel a request to refund the buyer
- Read details of a specific request or bid
- List all requests and bids for a specific request

## Smart Contract Behavior
The Soroban contract stores requests and bids with:

Request: buyer, token, title, description, budget, status, selected_bid_id, created_at
Bid: request_id, vendor, amount, delivery_time, description, status, created_at

Exposed contract methods:
- create_request
- place_bid
- select_bid
- mark_completed
- cancel_request
- get_request
- get_bid
- get_request_bids
- get_all_requests

## Frontend Highlights
- Freighter wallet connect flow for authenticated transactions
- Live contract response panels and toast notifications for transaction results
- Modern UI with human-readable timestamps and XLM formatting
- Auto-sync of requests and bids on load and after interaction
- Responsive dashboard layout with separate setup, active requests, wallet, and history panels

## Tech Stack
- React 19
- Next.js 15
- @stellar/stellar-sdk
- @creit.tech/stellar-wallets-kit
- Soroban smart contract in Rust

## Project Structure
```text
.
|-- app/
|   |-- dashboard/
|   |-- procurement/
|   |-- history/
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   `-- (UI components like navbar, toast, providers)
|-- contracts/
|   `-- procurement/
|       |-- src/lib.rs
|       `-- Cargo.toml
|-- hooks/
|   `-- useProcurement.ts
|-- lib/
|   |-- stellar.ts
|   |-- store.ts
|   `-- wallet.ts
`-- README.md
```

## Local Setup

### Prerequisites
- Node.js installed
- npm installed
- Freighter wallet extension
- Access to Stellar Soroban testnet

### Install
```bash
npm install
```

### Run The App
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## How The App Talks To Stellar
Write actions are signed with Freighter or other supported wallets:
- create_request
- place_bid
- select_bid
- mark_completed
- cancel_request

Read actions are simulated against the configured Soroban RPC endpoint:
- get_request
- get_bid
- get_request_bids
- get_all_requests

Configuration currently lives in lib/stellar.ts, including:
- CONTRACT_ID
- NATIVE_TOKEN_ID
- Soroban testnet RPC URL
- network passphrase

## User Flow
1. Connect Freighter or a supported wallet.
2. Fill in procurement details to create a request (locks XLM in escrow).
3. Vendors connect and place bids on the open request.
4. Buyer selects a winning bid (marks others as rejected).
5. Buyer marks the request as completed to disburse funds.
6. Check history and activity panels to view on-chain state.

## Notes
- The project is currently wired to Stellar testnet.
- Write actions require Freighter/wallet authorization.
- Read actions do not require an active wallet signature.
- If the queries fail, check the contract configuration in lib/stellar.ts.
