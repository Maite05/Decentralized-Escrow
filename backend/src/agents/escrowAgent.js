import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

export const dexClient = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
});

const provider = new ethers.JsonRpcProvider(process.env.XLAYER_TESTNET_RPC_URL);
export const escrowAgent = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);

console.log(`[Agent] Identity Initialized: ${escrowAgent.address}`);

const monitorEscrow = () => {
    const contract = new ethers.Contract(
        process.env.ESCROW_CONTRACT_ADDR,
        [
            // Correct event signatures from MilestoneEscrow.sol
            "event FeeCollected(uint256 indexed projectId, uint256 indexed milestoneId, address indexed feeRecipient, uint256 fee)",
            "event Released(uint256 indexed projectId, uint256 indexed milestoneId, address indexed freelancer, uint256 amount)",
            "event DisputeRaised(uint256 indexed projectId, uint256 indexed milestoneId, address raisedBy)",
        ],
        provider
    );

    // FeeCollected — swap protocol fee from OKB to USDC
    contract.on('FeeCollected', async (projectId, milestoneId, feeRecipient, fee) => {
        console.log(`[Agent] FeeCollected — project ${projectId}, milestone ${milestoneId}, fee: ${ethers.formatEther(fee)} OKB`);

        try {
            const swapData = await dexClient.dex.getSwapData({
                chainId: '1952',
                fromTokenAddress: '0x0000000000000000000000000000000000000000',
                toTokenAddress: process.env.TESTNET_USDC_ADDR,
                amount: fee.toString(),
                slippage: '0.005',
                userWalletAddress: escrowAgent.address,
            });

            console.log(`[Agent] Swap quote found. Executing on-chain...`);

            const tx = await escrowAgent.sendTransaction({
                to: swapData.data[0].tx.to,
                data: swapData.data[0].tx.data,
                value: swapData.data[0].tx.value,
            });

            console.log(`[Agent] Fee secured in USDC: ${tx.hash}`);
        } catch (error) {
            console.error(`[Agent] Swap failed: ${error.message}`);
        }
    });

    // Released — log milestone payment
    contract.on('Released', async (projectId, milestoneId, freelancer, amount) => {
        console.log(`[Agent] Milestone ${milestoneId} released — project ${projectId}, freelancer: ${freelancer}, amount: ${ethers.formatEther(amount)}`);
    });

    // DisputeRaised — log dispute
    contract.on('DisputeRaised', async (projectId, milestoneId, raisedBy) => {
        console.log(`[Agent] Dispute on milestone ${milestoneId} (project ${projectId}) by ${raisedBy}`);
    });
};

monitorEscrow();
