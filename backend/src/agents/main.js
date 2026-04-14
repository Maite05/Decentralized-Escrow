import { OnchainOS, TradeSkill, WalletSkill } from '@okx/onchainos-sdk';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { ethers } from 'ethers';

export const dexClient = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID
});

export const escrowAgent = new OnchainOS({
    name: "X-Layer-Testnet-Guardian",
    description: "Autonomous mediator for freelance escrow on X Layer Testnet.",
    
    network: {
        chainId: 1952, 
        rpcUrl: process.env.XLAYER_TESTNET_RPC_URL || "https://testrpc.xlayer.tech"
    },

    skills: [
        new WalletSkill(), 
        new TradeSkill()   
    ],

    config: {
        authType: "TEE_ENCLAVE",
        apiKey: process.env.OKX_API_KEY,
        secretKey: process.env.OKX_SECRET_KEY
    }
});


escrowAgent.on("contract_event", async (event) => {
    if (event.address.toLowerCase() === process.env.ESCROW_CONTRACT_ADDR.toLowerCase()) {
        console.log("[Agent] Event detected: ${event.name}");
        
        if (event.name === 'MilestoneReleased') {
            const feeAmount = event.args.fee;
            console.log(`[Agent] Swapping fee: ${ethers.formatEther(feeAmount)} OKB`);

            try {
                await escrowAgent.use(TradeSkill).swap({
                    from: "OKB", 
                    to: process.env.TESTNET_USDC_ADDR,
                    amount: feeAmount.toString(),
                    chain: "x-layer-testnet",
                    slippage: "0.5"
                });
                console.log("--- Swap Success ---");
            } catch (err) {
                console.error("[Agent] Swap Error:", err.message);
            }
        }
    }
});