/**
 * Agentic Wallet — X Layer Testnet Guardian
 *
 * Uses two Onchain OS services:
 *   - Onchain OS Wallet API  — check balance, broadcast txns, query tx history
 *   - OKX DEX SDK            — get swap calldata (TradeSkill)
 *
 * On-chain identity: an ethers Wallet backed by AGENT_PRIVATE_KEY.
 * This wallet is the project's registered on-chain identity for all
 * escrow interactions (mediator registration, fee collection, swaps).
 *
 * Economy loop:
 *   escrow releases milestone → FeeCollected emitted →
 *   agent queries balance via Wallet API → swaps OKB→USDC via DEX SDK →
 *   USDC float grows → agent re-stakes as mediator (earn-pay-earn cycle)
 */

import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

// ─── Provider + Agentic Wallet identity ────────────────────────────────────
const provider = new ethers.JsonRpcProvider(
    process.env.XLAYER_TESTNET_RPC_URL || 'https://testrpc.xlayer.tech',
);

if (!process.env.AGENT_PRIVATE_KEY) {
    throw new Error('[Agent] AGENT_PRIVATE_KEY is required');
}

export const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
console.log(`[Agent] Agentic Wallet: ${agentWallet.address}`);
console.log(`[Agent] Network: X Layer Testnet (chainId 1952)`);

// ─── Onchain OS Wallet API helpers ─────────────────────────────────────────
const WALLET_API_BASE = 'https://www.okx.com/api/v5/wallet';
const XLAYER_TESTNET_CHAIN_ID = '1952';

function okxHeaders() {
    const ts = new Date().toISOString();
    // Note: production usage requires HMAC signing — see OKX Wallet API docs.
    return {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': process.env.OKX_API_KEY || '',
        'OK-ACCESS-TIMESTAMP': ts,
        'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE || '',
        'OK-ACCESS-PROJECT': process.env.OKX_PROJECT_ID || '',
    };
}

/** Onchain OS Wallet API — Check Balance for the agent wallet. */
async function getAgentBalance(tokenAddress) {
    try {
        const body = JSON.stringify({
            addresses: [{ chainIndex: XLAYER_TESTNET_CHAIN_ID, address: agentWallet.address }],
            tokenAddresses: tokenAddress ? [{ chainIndex: XLAYER_TESTNET_CHAIN_ID, tokenAddress }] : [],
        });
        const res = await fetch(`${WALLET_API_BASE}/asset/token-balances-by-address`, {
            method: 'POST',
            headers: okxHeaders(),
            body,
        });
        const json = await res.json();
        return json.data?.[0] ?? null;
    } catch (err) {
        console.warn('[Agent] Wallet API balance check failed:', err.message);
        return null;
    }
}

/** Onchain OS Wallet API — Broadcast Transaction. */
async function broadcastTx(signedTx) {
    try {
        const body = JSON.stringify({
            signedTx,
            chainIndex: XLAYER_TESTNET_CHAIN_ID,
            address: agentWallet.address,
        });
        const res = await fetch(`${WALLET_API_BASE}/pre-transaction/broadcast-transaction`, {
            method: 'POST',
            headers: okxHeaders(),
            body,
        });
        const json = await res.json();
        return json.data ?? null;
    } catch (err) {
        console.warn('[Agent] Wallet API broadcast failed:', err.message);
        return null;
    }
}

// ─── OKX DEX client (swap calldata) ────────────────────────────────────────
export const dexClient = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID,
});

// ─── Contract event listener ───────────────────────────────────────────────
const ESCROW_CONTRACT_ADDR = process.env.ESCROW_CONTRACT_ADDR;

if (!ESCROW_CONTRACT_ADDR) {
    console.warn('[Agent] ESCROW_CONTRACT_ADDR not set — event listener skipped');
} else {
    const contract = new ethers.Contract(
        ESCROW_CONTRACT_ADDR,
        [
            'event FeeCollected(uint256 indexed projectId, uint256 indexed milestoneId, address indexed feeRecipient, uint256 fee)',
            'event Released(uint256 indexed projectId, uint256 indexed milestoneId, address indexed freelancer, uint256 amount)',
            'event DisputeRaised(uint256 indexed projectId, uint256 indexed milestoneId, address raisedBy)',
        ],
        provider,
    );

    /**
     * FeeCollected — swap OKB fee to USDC.
     * Uses Onchain OS Wallet API to check balance first, then DEX SDK for swap calldata.
     */
    contract.on('FeeCollected', async (projectId, milestoneId, _feeRecipient, fee) => {
        console.log(
            `[Agent] FeeCollected — project ${projectId}, milestone ${milestoneId}, fee: ${ethers.formatEther(fee)} OKB`,
        );

        const usdcAddr = process.env.TESTNET_USDC_ADDR;
        if (!usdcAddr) {
            console.warn('[Agent] TESTNET_USDC_ADDR not set — skipping swap');
            return;
        }

        // Onchain OS Wallet API: check agent balance before swapping.
        const balance = await getAgentBalance(null);
        if (balance) {
            console.log(`[Agent] Wallet API balance: ${JSON.stringify(balance.tokenAssets?.[0])}`);
        }

        try {
            // OKX DEX SDK: get swap calldata.
            const swapData = await dexClient.dex.getSwapData({
                chainId: XLAYER_TESTNET_CHAIN_ID,
                fromTokenAddress: '0x0000000000000000000000000000000000000000',
                toTokenAddress: usdcAddr,
                amount: fee.toString(),
                slippage: '0.005',
                userWalletAddress: agentWallet.address,
            });

            const txRequest = {
                to: swapData.data[0].tx.to,
                data: swapData.data[0].tx.data,
                value: BigInt(swapData.data[0].tx.value || '0'),
            };

            // Sign locally, then broadcast via Onchain OS Wallet API.
            const signedTx = await agentWallet.signTransaction(txRequest);
            const broadcast = await broadcastTx(signedTx);

            if (broadcast?.orderId) {
                console.log(`[Agent] Swap broadcast via Wallet API. orderId: ${broadcast.orderId}`);
            } else {
                // Fallback: send directly via ethers.
                const tx = await agentWallet.sendTransaction(txRequest);
                console.log(`[Agent] Swap submitted via ethers: ${tx.hash}`);
                await tx.wait();
                console.log(`[Agent] Fee secured in USDC.`);
            }
        } catch (err) {
            console.error('[Agent] Swap failed:', err.message);
        }
    });

    contract.on('Released', async (projectId, milestoneId, freelancer, amount) => {
        console.log(
            `[Agent] Milestone ${milestoneId} released — project ${projectId}, freelancer: ${freelancer}, amount: ${ethers.formatUnits(amount, 6)} USDC`,
        );
        // Onchain OS Wallet API: log agent USDC balance after release.
        const usdcAddr = process.env.TESTNET_USDC_ADDR;
        if (usdcAddr) {
            const balance = await getAgentBalance(usdcAddr);
            if (balance) console.log(`[Agent] USDC balance after release: ${JSON.stringify(balance.tokenAssets?.[0])}`);
        }
    });

    contract.on('DisputeRaised', (projectId, milestoneId, raisedBy) => {
        console.log(
            `[Agent] Dispute on milestone ${milestoneId} (project ${projectId}) raised by ${raisedBy}`,
        );
    });

    console.log(`[Agent] Listening for escrow events at ${ESCROW_CONTRACT_ADDR}`);
}
