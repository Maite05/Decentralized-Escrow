const express = require('express');
const router = express.Router();
const { escrowAgent } = require('../agents/main');
const { swapFeesToStable } = require('../utils/uniswapModule');

router.post('/create-job', async (req, res) => {
    const { freelancer, milestones } = req.body;
    const client = req.user.address; 

    try {
        const tx = await escrowAgent.wallet.prepareContractCall({
            contractAddress: process.env.ESCROW_CONTRACT_ADDR,
            method: "createJob",
            params: [freelancer, milestones],
            value: calculateTotal(milestones) 
        });

        res.json({ success: true, transactionData: tx });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/release/:jobId/:mId', async (req, res) => {
    const { jobId, mId } = req.params;

    try {
        const receipt = await escrowAgent.wallet.execute({
            to: process.env.ESCROW_CONTRACT_ADDR,
            data: encodeReleaseData(jobId, mId)
        });

        const feeAmount = await getFeeFromReceipt(receipt);
        swapFeesToStable(feeAmount);

        res.json({ success: true, txHash: receipt.hash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;