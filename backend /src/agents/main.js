import { OnchainOS, TradeSkill } from '@okx/onchainos-sdk';

// Define the Agent
export const escrowAgent = new OnchainOS({
    name: "X-Escrow-Guardian",
    skills: [new TradeSkill()], // Enables Uniswap/DEX functionality
    walletType: "TEE",          // Secure Execution Environment
    network: "x-layer-mainnet"
});

// The Agent's job: Monitor and Swap
escrowAgent.on('FeeReceived', async (amount) => {
    console.log("5% Fee detected. Executing Uniswap swap to USDC...");
    await escrowAgent.trade.swap({
        from: "OKB",
        to: "USDC",
        amount: amount
    });
});