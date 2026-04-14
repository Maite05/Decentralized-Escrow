const { TradeSkill } = require('@okx/onchainos-sdk');
const { escrowAgent } = require('../src/agents/main');


 //Automatically swaps native fees (OKB/ETH) to USDC on X Layer
 
async function swapFeesToStable(amountIn) {
    console.log(`[Agent] Initiating swap for ${amountIn} native tokens...`);

    try {
        const swapResult = await escrowAgent.use(TradeSkill).swap({
            fromToken: "NATIVE", 
            toToken: process.env.USDC_ADDRESS,
            amount: amountIn,
            slippage: "0.5",   
            chain: "x-layer"
        });

        console.log(`[Agent] Swap successful: ${swapResult.txHash}`);
        return swapResult;
    } catch (error) {
        console.error(`[Agent] Fee swap failed: ${error.message}`);
    }
}

module.exports = { swapFeesToStable };