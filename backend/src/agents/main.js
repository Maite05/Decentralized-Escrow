/**
 * Agentic Wallet — X Layer Testnet Guardian
 *
 * This is the project's on-chain identity. It:
 *   1. Monitors MilestoneEscrow events in real time.
 *   2. On FeeCollected: swaps the protocol fee from OKB to USDC via the OKX DEX API
 *      (TradeSkill equivalent — powered by @okx-dex/okx-dex-sdk).
 *   3. On Released / DisputeRaised: logs audit events.
 *
 * Onchain OS integration: the OKX DEX SDK provides the swap (TradeSkill) and
 * wallet-signing (WalletSkill) capabilities used here. The agent runs as an
 * autonomous signer with its own private key — the Agentic Wallet identity.
 */

import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

// ─── Agentic Wallet (WalletSkill equivalent) ───────────────────────────────
const provider = new ethers.JsonRpcProvider(
    process.env.XLAYER_TESTNET_RPC_URL || 'https://testrpc.xlayer.tech',
);

if (!process.env.AGENT_PRIVATE_KEY) {
    throw new Error('[Agent] AGENT_PRIVATE_KEY is required');
}

export const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
console.log(`[Agent] Agentic Wallet initialised: ${agentWallet.address}`);
console.log(`[Agent] Network: X Layer Testnet (chainId 1952)`);

// ─── OKX DEX client (TradeSkill equivalent) ────────────────────────────────
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
     * FeeCollected — swap OKB fee to USDC via OKX DEX API (TradeSkill).
     * This demonstrates the earn-pay-earn economy loop:
     *   escrow releases → fee collected → agent swaps to USDC → float grows.
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

        try {
            // Fetch swap calldata from OKX DEX API.
            const swapData = await dexClient.dex.getSwapData({
                chainId: '1952',
                fromTokenAddress: '0x0000000000000000000000000000000000000000', // native OKB
                toTokenAddress: usdcAddr,
                amount: fee.toString(),
                slippage: '0.005',
                userWalletAddress: agentWallet.address,
            });

            const tx = await agentWallet.sendTransaction({
                to: swapData.data[0].tx.to,
                data: swapData.data[0].tx.data,
                value: BigInt(swapData.data[0].tx.value || '0'),
            });

            console.log(`[Agent] Fee swap submitted: ${tx.hash}`);
            await tx.wait();
            console.log(`[Agent] Fee secured in USDC.`);
        } catch (err) {
            console.error('[Agent] Swap failed:', err.message);
        }
    });

    contract.on('Released', (projectId, milestoneId, freelancer, amount) => {
        console.log(
            `[Agent] Milestone ${milestoneId} released — project ${projectId}, freelancer: ${freelancer}, amount: ${ethers.formatUnits(amount, 6)} USDC`,
        );
    });

    contract.on('DisputeRaised', (projectId, milestoneId, raisedBy) => {
        console.log(
            `[Agent] Dispute on milestone ${milestoneId} (project ${projectId}) raised by ${raisedBy}`,
        );
    });

    console.log(`[Agent] Listening for escrow events at ${ESCROW_CONTRACT_ADDR}`);
}
