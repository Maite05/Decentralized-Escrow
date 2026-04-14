import { OnchainOS, TradeSkill, WalletSkill } from '@okx/onchainos-sdk';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

export const dexClient = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID,
});

export const escrowAgent = new OnchainOS({
    name: "X-Layer-Testnet-Guardian",
    description: "Autonomous mediator for freelance escrow on X Layer Testnet.",

    network: {
        chainId: 1952,
        rpcUrl: process.env.XLAYER_TESTNET_RPC_URL || "https://testrpc.xlayer.tech",
    },

    skills: [
        new WalletSkill(),
        new TradeSkill(),
    ],

    config: {
        authType: "TEE_ENCLAVE",
        apiKey: process.env.OKX_API_KEY,
        secretKey: process.env.OKX_SECRET_KEY,
    },
});

// FeeCollected(projectId, milestoneId, feeRecipient, fee) — emitted by MilestoneEscrow
escrowAgent.on('FeeCollected', async (event) => {
    if (event.address.toLowerCase() !== process.env.ESCROW_CONTRACT_ADDR?.toLowerCase()) return;
    const feeAmount = event.args.fee;
    console.log(`[Agent] FeeCollected. Swapping ${ethers.formatEther(feeAmount)} OKB to USDC...`);

    try {
        await escrowAgent.use(TradeSkill).swap({
            from: "OKB",
            to: process.env.TESTNET_USDC_ADDR,
            amount: feeAmount.toString(),
            chain: "x-layer-testnet",
            slippage: "0.5",
        });
        console.log("[Agent] Swap success.");
    } catch (err) {
        console.error("[Agent] Swap error:", err.message);
    }
});

// Released(projectId, milestoneId, freelancer, amount) — emitted by MilestoneEscrow
escrowAgent.on('Released', async (event) => {
    if (event.address.toLowerCase() !== process.env.ESCROW_CONTRACT_ADDR?.toLowerCase()) return;
    const { projectId, milestoneId } = event.args;
    console.log(`[Agent] Milestone ${milestoneId} released for project ${projectId}.`);
});

// DisputeRaised(projectId, milestoneId, raisedBy) — emitted by MilestoneEscrow
escrowAgent.on('DisputeRaised', async (event) => {
    if (event.address.toLowerCase() !== process.env.ESCROW_CONTRACT_ADDR?.toLowerCase()) return;
    const { projectId, milestoneId, raisedBy } = event.args;
    console.log(`[Agent] Dispute raised on milestone ${milestoneId} (project ${projectId}) by ${raisedBy}.`);
});
