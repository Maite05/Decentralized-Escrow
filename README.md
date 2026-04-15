# Decentralized Escrow — X Layer Hackathon Submission

A trustless, milestone-based freelance escrow protocol built on **X Layer**, powered by an AI risk layer and an Agentic Wallet for autonomous on-chain actions.

---

## Table of Contents

- [Project Introduction](#project-introduction)
- [Architecture Overview](#architecture-overview)
- [Deployment Addresses](#deployment-addresses)
- [Onchain OS / Uniswap Skill Usage](#onchain-os--uniswap-skill-usage)
- [Working Mechanics](#working-mechanics)
- [X Layer Ecosystem Positioning](#x-layer-ecosystem-positioning)
- [Team](#team)

---

## Project Introduction

Freelance work suffers from a fundamental trust problem: clients fear paying before delivery, freelancers fear working before payment. Centralised escrow platforms (Upwork, Fiverr) charge 10–20 % fees and are single points of failure.

**Decentralized Escrow** removes the middleman. Funds are locked on-chain in a `MilestoneEscrow` contract. Each deliverable is a discrete milestone — the client only releases payment when they approve a milestone. Disputes go to a staked mediator drawn from `MediatorRegistry`, not a platform employee. The AI risk panel gives both parties real-time insight into contract health before they commit funds.

Built for the **X Layer Arena** track, the project showcases:

- **Agentic Wallet** via Onchain OS as the project's on-chain identity, used to automate escrow funding and milestone approval transactions.
- **Onchain OS MCP skill** for AI-powered dispute-risk scoring surfaced in the frontend.
- **x402 payment flow** to pay per risk-assessment API call, qualifying for the Best x402 Application special prize.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                 │
│  wagmi v2 · viem v2 · @tanstack/react-query · Tailwind CSS  │
│                                                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ WalletButton │  │  CreateEscrow   │  │ AIInsightPanel │  │
│  │ MilestoneCard│  │  (2-step flow)  │  │  (60 s poll)   │  │
│  │ TxLog        │  └─────────────────┘  └────────┬───────┘  │
│  └──────────────┘                                │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   │ x402 payment
                                          ┌────────▼────────┐
                                          │  AI Backend API  │
                                          │  /ai/risk/:id    │
                                          │  (Onchain OS     │
                                          │   MCP skill)     │
                                          └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     X Layer (EVM L2)                         │
│                                                              │
│  ┌─────────────────┐    deploys    ┌───────────────────┐    │
│  │  EscrowFactory  │──────────────▶│  MilestoneEscrow  │    │
│  │                 │               │                   │    │
│  │ byClient[]      │               │  State machine:   │    │
│  │ byFreelancer[]  │               │  LOCKED           │    │
│  └────────┬────────┘               │  DELIVERED        │    │
│           │                        │  RELEASED         │    │
│  ┌────────▼────────┐               │  DISPUTED         │    │
│  │MediatorRegistry │◀──isApproved──│  REFUNDED         │    │
│  │                 │               └───────────────────┘    │
│  │ approved[]      │                                        │
│  │ stake[]         │  ┌──────────────────────────────────┐  │
│  └─────────────────┘  │  Agentic Wallet (Onchain OS)     │  │
│                       │  · Auto-approves funded escrows  │  │
│                       │  · Signs milestone txns          │  │
│                       │  · Pays x402 AI calls on-chain   │  │
│                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Contract layer

| Contract | Responsibility |
|---|---|
| `EscrowFactory` | Deploys one `MilestoneEscrow` per project; indexes by client and freelancer |
| `MilestoneEscrow` | Holds ERC-20 funds; enforces state machine per milestone; emits audit events |
| `MediatorRegistry` | Registers staked mediators; `isApproved()` called by escrow before dispute resolution |
| `MockERC20` | Mintable token for local testing only |

### Frontend layer

- **`useEscrow.ts`** — reads contract state with 5-second polling (wagmi v2 `useReadContract`)
- **`useEscrowWrite.ts`** — wraps `useWriteContract` + `useWaitForTransactionReceipt`; returns `isPending / isConfirming / isConfirmed`
- **`useEscrowEvents.ts`** — live event feed via `useWatchContractEvent`
- **`AIInsightPanel`** — fetches `/ai/risk/:projectId` every 60 s; falls back to mock when backend is offline

### Monorepo layout

```
Decentralized-Escrow/
├── contracts/              # Hardhat workspace
│   ├── contracts/          # Solidity source
│   ├── test/               # Hardhat + ethers-v6 tests
│   ├── scripts/            # deploy, verify, sync-abis
│   └── shared/             # addresses.json + ABI outputs
└── frontend/               # Next.js workspace
    └── src/
        ├── hooks/
        ├── components/
        └── pages/
```

---

## Deployment Addresses

> Deployed on **X Layer Testnet** (Chain ID: 1952) on 2026-04-15.

| Contract | Address |
|---|---|
| `MediatorRegistry` | [`0x152f000db4B13053462C9068f0532819461469f0`](https://www.okx.com/explorer/xlayer-test/address/0x152f000db4B13053462C9068f0532819461469f0) |
| `EscrowFactory` | [`0x460869Ff5601578e1b84D720103BcF03D3d9fcf7`](https://www.okx.com/explorer/xlayer-test/address/0x460869Ff5601578e1b84D720103BcF03D3d9fcf7) |

Network details:

```
Network:  X Layer Testnet
Chain ID: 1952
RPC:      https://testrpc.xlayer.tech
Explorer: https://www.okx.com/explorer/xlayer-test
```

---

## Onchain OS / Uniswap Skill Usage

### 1. Agentic Wallet — project on-chain identity

The project uses an **Onchain OS Agentic Wallet** as its deployed on-chain identity. The wallet:

- Signs the initial `EscrowFactory.createProject()` transactions so that all escrow deployments are traceable to a single agent identity.
- Holds a small USDC float to auto-fund test escrows during demos, demonstrating the earn-pay-earn cycle required for the Best Economy Loop prize.
- Acts as a mediator registered in `MediatorRegistry` for the demo flow, staking tokens and resolving disputes without human intervention.

### 2. Onchain OS MCP skill — AI risk scoring

The `AIInsightPanel` component consumes an Onchain OS MCP skill endpoint (`/ai/risk/:projectId`) that:

1. Reads on-chain milestone states, payment history, and counterparty reputation from X Layer.
2. Returns a risk score (`Low / Medium / High`) and a natural-language summary.
3. Refreshes every 60 seconds to reflect new contract state.

The skill is registered on the **Onchain OS Plugin Store** under the name `escrow-risk-scorer`.

### 3. x402 micropayment for AI calls

Each `/ai/risk/:projectId` request is gated by an **x402 payment header**. The frontend sends a signed ERC-20 microtransaction (0.01 USDC on X Layer) before each AI call, demonstrating the x402 protocol for agentic pay-per-use access — qualifying for the **Best x402 Application** special prize.

---

## Working Mechanics

### Creating an escrow (client)

1. Client connects wallet and navigates to `/create`.
2. `CreateEscrow` component runs a **two-step flow**:
   - **Step 1 — Approve USDC**: calls `USDC.approve(factory, amount)`.
   - **Step 2 — Deploy escrow**: calls `EscrowFactory.createProject(freelancer, token, amount)`.
3. A unique `MilestoneEscrow` contract is deployed; the escrow address appears in the client's dashboard.
4. Client calls `addMilestone(amount, description)` for each deliverable.

### Completing a milestone (freelancer)

1. Freelancer opens the escrow detail page (`/escrow/[id]`).
2. `MilestoneCard` detects the freelancer's wallet address and shows **Mark Delivered**.
3. Freelancer calls `markDelivered(milestoneId)` — state transitions `LOCKED → DELIVERED`.
4. Client reviews and calls `approveMilestone(milestoneId)` — payment is released, state → `RELEASED`.

### Raising and resolving a dispute

1. Either party calls `raiseDispute(milestoneId)` — state → `DISPUTED`.
2. An approved mediator (staked in `MediatorRegistry`) calls `resolveDispute(milestoneId, freelancerShare, clientShare)`.
   - Shares must sum to the milestone amount — enabling proportional splits (e.g., 60 / 40).
   - Full freelancer award (`amount, 0`) → state → `RELEASED`.
   - Full client refund (`0, amount`) → state → `REFUNDED`.
3. The Agentic Wallet mediator can resolve disputes autonomously based on on-chain evidence surfaced by the Onchain OS MCP skill.

### AI risk panel

The `AIInsightPanel` polls the Onchain OS skill every 60 seconds. If the backend is unavailable, it renders a mock insight so the UI never breaks. Each live request is paid via x402 (0.01 USDC microtransaction on X Layer).

### Event log

`TxLog` subscribes to `Released` and `DisputeRaised` events in real time via `useWatchContractEvent`. New events are prepended to the list as they arrive, giving both parties an auditable transaction history without leaving the page.

---

## X Layer Ecosystem Positioning

| Aspect | Detail |
|---|---|
| **Target users** | Freelancers and clients transacting in the Web3 economy |
| **Token used** | USDC (bridged via X Layer bridge from Ethereum mainnet) |
| **On-chain volume driver** | Every milestone approval + dispute resolution is an on-chain transaction, generating consistent X Layer activity |
| **Agentic loop** | Agentic Wallet earns mediator fees → stakes in MediatorRegistry → earns more fees (earn-pay-earn cycle) |
| **Composability** | `EscrowFactory` address is public; any frontend or agent can deploy escrows and integrate the same contracts |
| **x402 payments** | AI risk calls are paid in USDC on X Layer, demonstrating real micropayment use cases |

---

## Team

| Name | Role |
|---|---|
| Sanenelisiwe Zwane | Smart contract + full-stack development |

| Name | Role |
|---|---|
| Maite Lemekoana | Smart contract + full-stack development |

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy and populate environment variables
cp .env.example .env

# 3. Compile contracts and generate TypeChain types
npm run compile -w contracts

# 4. Sync ABIs to frontend
npm run sync-abis -w contracts

# 5. Run the frontend
npm run dev -w frontend

#6. Run the backend 
 
cd backend 
  #-Database Setup (Prisma)
  #-Generate Prisma Client
  npx prisma generate
  
  npm run dev
   
```

## Deploying to X Layer

```bash
# Add to .env:
# XLAYER_RPC_URL=https://rpc.xlayer.tech
# DEPLOYER_PRIVATE_KEY=<your key>
# STAKE_TOKEN_ADDRESS=<USDC on X Layer>

npm run deploy -w contracts
# → writes addresses to contracts/shared/addresses.json

npm run sync-abis -w contracts
# → copies ABIs to contracts/shared/abis/
```

## Running Tests

```bash
npm run test -w contracts
```
