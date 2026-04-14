require("dotenv").config();
const express = require ("express");
const cors = require ("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./auth.routes");
const escrowRoutes = require("./escrow.routes");
const { escrowAgent } = require("../agents/escrowAgent");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan("dev")); 
app.use(express.json()); 

app.get("/api/health", (req, res) => {
    res.json({ 
        status: "Active", 
        network: "X Layer Testnet",
        agentStatus: escrowAgent ? "Initialized" : "Offline"
    });
});

app.use("/api/auth", authRoutes);


app.use("/api/escrow", escrowRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong on the server!" });
});

const startServer = async () => {
    try {
        console.log("--- Initializing X Layer Escrow Backend ---");
        
        console.log(`[Agent] Identity: ${process.env.AGENT_WALLET_ADDRESS || 'Pending...'}`);
        
        app.listen(PORT, () => {
            console.log("Server running on http://localhost:${PORT}");
            console.log("Connected to X Layer Testnet (Chain ID: 1952)");
        });
    } catch (error) {
        console.error( "Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
