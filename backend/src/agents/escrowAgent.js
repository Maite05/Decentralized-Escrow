import { OnchainOS, TradeSkill, WalletSkill } from '@okx/onchainos-skill';


export const escrowAgent = new OnchainOS({
    name: "X-Layer-Testnet-Guardian",
    description: "Autonomous mediator testing environment on X Layer Testnet.",
    
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
        apiKey: process.env.OKX_OS_API_KEY,
        secretKey: process.env.OKX_OS_SECRET
    }
});

// Listener
escrowAgent.on('contract_event', async (event) => {
    if (event.address === process.env.ESCROW_CONTRACT_ADDR) {
        console.log(`[Testnet Agent] Event detected: ${event.name}`);
        
        if (event.name === 'MilestoneReleased') {
            await escrowAgent.use(TradeSkill).swap({
                from: "OKB", 
                to: process.env.TESTNET_USDC_ADDR,
                amount: event.args.fee,
                chain: "x-layer-testnet"
            });
        }
    }
});