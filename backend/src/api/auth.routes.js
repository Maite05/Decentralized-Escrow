const express = require('express');
const router = express.Router();
const { verifyMessage } = require('ethers');


const sessions = {};

router.post('/login', async (req, res) => {
    const { address, signature, message } = req.body;

    try {
        const recoveredAddress = verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
            const token = Buffer.from(`${address}-${Date.now()}`).toString('base64');
            sessions[token] = address;
            
            return res.json({ success: true, token, address });
        }
        res.status(401).json({ error: "Invalid signature" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;