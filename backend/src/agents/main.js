import { OnchainOS, TradeSkill } from '@okx/onchainos-sdk';


export const escrowAgent = new OnchainOS({
    name: "X-Escrow-Guardian",
    skills: [new TradeSkill()],  
    walletType: "TEE",          
    network: "x-layer-mainnet"
});


escrowAgent.on('FeeReceived', async (amount) => {
    console.log("5% Fee detected. Executing Uniswap swap to USDC...");
    await escrowAgent.trade.swap({
        from: "OKB",
        to: "USDC",
        amount: amount
    });
});