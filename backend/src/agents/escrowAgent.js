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
        ["event MilestoneReleased(uint256 jobId, uint256 milestoneId, uint256 amount, uint256 fee)"],
        provider
    );

    contract.on('MilestoneReleased', async (jobId, mId, amount, fee) => {
        console.log(`[Agent] Milestone Release Detected. Fee: ${ethers.formatEther(fee)} OKB`);
        
        try {
            const swapData = await dexClient.dex.getSwapData({
                chainId: '1952', 
                fromTokenAddress: '0x0000000000000000000000000000000000000000', 
                toTokenAddress: process.env.TESTNET_USDC_ADDR,
                amount: fee.toString(),
                slippage: '0.005',
                userWalletAddress: escrowAgent.address
            });

            console.log(`[Agent] Swap Quote Found. Executing onchain...`);
            
            const tx = await escrowAgent.sendTransaction({
                to: swapData.data[0].tx.to,
                data: swapData.data[0].tx.data,
                value: swapData.data[0].tx.value
            });

            console.log(`[Agent] Fee secured in USDC: ${tx.hash}`);
        } catch (error) {
            console.error(`[Agent] Swap failed: ${error.message}`);
        }
    });
};

monitorEscrow();