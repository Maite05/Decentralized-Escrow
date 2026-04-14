import { TradeSkill, WalletSkill } from '@okx/onchainos-sdk';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

// ─── OKX DEX client (fallback swap path) ───────────────────────────────────
export const dexClient = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID,
});

// ─── Onchain OS skills ──────────────────────────────────────────────────────
const walletSkill = new WalletSkill({
    privateKey: process.env.AGENT_PRIVATE_KEY,
    network: {
        chainId: 1952,
        rpcUrl: process.env.XLAYER_TESTNET_RPC_URL || 'https://testrpc.xlayer.tech',
    },
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
});

const tradeSkill = new TradeSkill({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID,
});

const agentAddress = await walletSkill.getAddress();
console.log(`[Agent] Agentic Wallet: ${agentAddress}`);

// ─── Ethers provider + contract event listener ─────────────────────────────
const provider = new ethers.JsonRpcProvider(
    process.env.XLAYER_TESTNET_RPC_URL || 'https://testrpc.xlayer.tech',
);

const ESCROW_CONTRACT_ADDR = process.env.ESCROW_CONTRACT_ADDR;

if (!ESCROW_CONTRACT_ADDR) {
    console.warn('[Agent] ESCROW_CONTRACT_ADDR not set — skipping contract listener');
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

    // FeeCollected — swap protocol fee from OKB to USDC via Onchain OS TradeSkill.
    contract.on('FeeCollected', async (projectId, milestoneId, feeRecipient, fee) => {
        console.log(
            `[Agent] FeeCollected — project ${projectId}, milestone ${milestoneId}, fee: ${ethers.formatEther(fee)} OKB`,
        );

        try {
            await tradeSkill.swap({
                from: 'OKB',
                to: process.env.TESTNET_USDC_ADDR,
                amount: fee.toString(),
                chain: 'x-layer-testnet',
                slippage: '0.5',
            });
            console.log('[Agent] Fee swapped to USDC via TradeSkill.');
        } catch (err) {
            console.error('[Agent] TradeSkill swap failed, falling back to OKX DEX SDK:', err.message);
            try {
                const swapData = await dexClient.dex.getSwapData({
                    chainId: '1952',
                    fromTokenAddress: '0x0000000000000000000000000000000000000000',
                    toTokenAddress: process.env.TESTNET_USDC_ADDR,
                    amount: fee.toString(),
                    slippage: '0.005',
                    userWalletAddress: agentAddress,
                });
                const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
                const tx = await signer.sendTransaction({
                    to: swapData.data[0].tx.to,
                    data: swapData.data[0].tx.data,
                    value: swapData.data[0].tx.value,
                });
                console.log(`[Agent] Fallback swap tx: ${tx.hash}`);
            } catch (fallbackErr) {
                console.error('[Agent] Fallback swap also failed:', fallbackErr.message);
            }
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

    console.log(`[Agent] Listening for escrow events at ${ESCROW_CONTRACT_ADDR} on X Layer Testnet (chainId 1952)`);
}
