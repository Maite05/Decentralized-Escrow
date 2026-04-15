/**
 * Beta Testing Seed — Decentralized Escrow Platform
 *
 * Simulates realistic activity across Sepolia test wallets:
 *   • 3 clients, 5 freelancers
 *   • 8 jobs in various states (OPEN / IN_PROGRESS / CLOSED)
 *   • Applications with PENDING / SHORTLISTED / HIRED / REJECTED statuses
 *   • Completed projects with milestones
 *
 * Fee model (8% platform fee):
 *   Client   → pays budget + 8% service fee on job creation
 *   Freelancer → receives budget − 8% platform cut − estimated gas (0.00042 ETH)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Fee helpers ──────────────────────────────────────────────────────────────
const FEE_RATE = 0.08; // 8%
const GAS_ETH  = 0.00042; // Sepolia estimated gas per payout tx

function fees(budgetUSDC) {
  const budget       = Number(budgetUSDC);
  const clientFee    = +(budget * FEE_RATE).toFixed(2);
  const clientTotal  = +(budget + clientFee).toFixed(2);
  const freelancerFee = +(budget * FEE_RATE).toFixed(2);
  const freelancerNet = +(budget - freelancerFee).toFixed(2);
  return { budget, clientFee, clientTotal, freelancerFee, freelancerNet, gasEth: GAS_ETH };
}

// ─── Wallet addresses (Sepolia testnet) ──────────────────────────────────────
const WALLETS = {
  // Clients
  clientAlpha:   "0xA1b2C3d4E5f6A7B8c9D0e1F2a3B4c5D6e7F8a9B0",
  clientBeta:    "0xB2C3d4E5F6a7b8C9D0E1f2A3B4C5d6E7f8A9b0c1",
  clientGamma:   "0xC3D4e5F6a7B8c9D0E1F2a3b4C5D6E7f8a9B0c1D2",

  // Freelancers
  devDaniel:     "0xD4E5f6A7B8C9d0E1f2A3b4C5d6E7F8a9b0C1d2E3",
  devEve:        "0xE5F6a7b8C9D0e1F2A3B4c5D6e7F8A9B0C1d2E3f4",
  devFrank:      "0xF6a7B8C9d0E1f2A3b4C5d6E7F8A9b0c1D2E3f4A5",
  devGrace:      "0xa7B8c9D0E1F2a3B4C5D6e7f8A9b0C1D2e3F4A5b6",
  devHenry:      "0xb8C9D0e1F2A3b4c5D6E7F8A9b0C1d2e3F4A5B6c7",
};

async function main() {
  console.log("🌱  Seeding beta test data...\n");

  // ── 1. Upsert users ─────────────────────────────────────────────────────────
  const [cAlpha, cBeta, cGamma] = await Promise.all([
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.clientAlpha },
      update: {},
      create: {
        walletAddress: WALLETS.clientAlpha,
        role:  "CLIENT",
        email: "alpha@betacorp.io",
        bio:   "Building the next-gen DeFi protocol. Looking for top Solidity talent.",
        skills: ["DeFi", "Smart Contracts", "Token Design"],
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.clientBeta },
      update: {},
      create: {
        walletAddress: WALLETS.clientBeta,
        role:  "CLIENT",
        email: "beta@nftlaunch.xyz",
        bio:   "NFT marketplace founder. Hiring frontend & backend engineers.",
        skills: ["NFT", "Web3", "Marketplace"],
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.clientGamma },
      update: {},
      create: {
        walletAddress: WALLETS.clientGamma,
        role:  "CLIENT",
        email: "gamma@chain3games.io",
        bio:   "Web3 gaming studio. We build play-to-earn games on EVM chains.",
        skills: ["GameFi", "Unity", "EVM"],
      },
    }),
  ]);

  const [fDaniel, fEve, fFrank, fGrace, fHenry] = await Promise.all([
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.devDaniel },
      update: {},
      create: {
        walletAddress: WALLETS.devDaniel,
        role:  "FREELANCER",
        email: "daniel@0xdev.io",
        bio:   "Senior Solidity engineer, 6 yrs exp. Audited 30+ contracts. Specialises in DeFi vaults and gas optimisation.",
        skills: ["Solidity", "Hardhat", "DeFi", "ERC-20", "OpenZeppelin", "Foundry"],
        portfolioUrl: "https://github.com/0xDaniel",
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.devEve },
      update: {},
      create: {
        walletAddress: WALLETS.devEve,
        role:  "FREELANCER",
        email: "eve@web3ui.dev",
        bio:   "Full-stack Web3 developer. React + wagmi + Next.js. Open to long-term retainers.",
        skills: ["React", "Next.js", "wagmi", "TypeScript", "TailwindCSS", "ethers.js"],
        portfolioUrl: "https://github.com/0xEve",
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.devFrank },
      update: {},
      create: {
        walletAddress: WALLETS.devFrank,
        role:  "FREELANCER",
        email: "frank@chainback.dev",
        bio:   "Backend engineer specialising in Node.js APIs, subgraphs, and indexers for Web3 apps.",
        skills: ["Node.js", "GraphQL", "The Graph", "PostgreSQL", "Docker", "Redis"],
        portfolioUrl: "https://github.com/0xFrank",
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.devGrace },
      update: {},
      create: {
        walletAddress: WALLETS.devGrace,
        role:  "FREELANCER",
        email: "grace@tokenomix.io",
        bio:   "Token economist and whitepaper author. Helped design tokenomics for 12 mainnet launches.",
        skills: ["Tokenomics", "Whitepaper", "Game Theory", "Economic Modelling", "Python"],
        portfolioUrl: "https://github.com/0xGrace",
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: WALLETS.devHenry },
      update: {},
      create: {
        walletAddress: WALLETS.devHenry,
        role:  "FREELANCER",
        email: "henry@mobiledapp.dev",
        bio:   "React Native + Expo developer. Shipped 4 production Web3 mobile apps.",
        skills: ["React Native", "Expo", "iOS", "Android", "WalletConnect", "TypeScript"],
        portfolioUrl: "https://github.com/0xHenry",
      },
    }),
  ]);

  console.log("✓  Users created/updated");

  // ── 2. Jobs ──────────────────────────────────────────────────────────────────
  // Helper: past/future dates
  const daysAgo   = (n) => new Date(Date.now() - n * 86_400_000);
  const daysAhead = (n) => new Date(Date.now() + n * 86_400_000);

  // JOB 1 — CLOSED (completed, escrow released)
  const job1 = await prisma.job.upsert({
    where: { id: "seed_job_001" },
    update: {},
    create: {
      id:          "seed_job_001",
      clientId:    cAlpha.id,
      title:       "Smart Contract Audit — DeFi Yield Vault",
      description: "Audit our 3-contract DeFi yield vault. Scope: reentrancy, access control, arithmetic overflow, flash-loan attack surface. Deliverable: written report with severity ratings and PoC exploits for all criticals.",
      budget:      "2000",
      skills:      ["Solidity", "Security", "Foundry", "DeFi"],
      status:      "CLOSED",
      escrowAddress: "0xEsc001A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F",
      deadline:    daysAgo(5),
      createdAt:   daysAgo(30),
    },
  });

  // JOB 2 — IN_PROGRESS (Eve hired, escrow active)
  const job2 = await prisma.job.upsert({
    where: { id: "seed_job_002" },
    update: {},
    create: {
      id:          "seed_job_002",
      clientId:    cBeta.id,
      title:       "React Frontend — NFT Marketplace",
      description: "Build a fully responsive NFT marketplace frontend using React, Next.js, and wagmi. Must support listing, bidding, and lazy-minting flows. Figma designs provided.",
      budget:      "1500",
      skills:      ["React", "Next.js", "wagmi", "TypeScript", "TailwindCSS"],
      status:      "IN_PROGRESS",
      escrowAddress: "0xEsc002B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9",
      deadline:    daysAhead(21),
      createdAt:   daysAgo(14),
    },
  });

  // JOB 3 — OPEN (taking applications)
  const job3 = await prisma.job.upsert({
    where: { id: "seed_job_003" },
    update: {},
    create: {
      id:          "seed_job_003",
      clientId:    cAlpha.id,
      title:       "Solidity — ERC-4626 Vault with Auto-Compounding",
      description: "Implement an ERC-4626 tokenised vault with auto-compounding strategy. Must integrate with Aave v3 for yield. Full test suite expected (Foundry). Deployment to X Layer testnet included.",
      budget:      "3500",
      skills:      ["Solidity", "ERC-4626", "Aave", "Foundry", "DeFi"],
      status:      "OPEN",
      deadline:    daysAhead(45),
      createdAt:   daysAgo(3),
    },
  });

  // JOB 4 — IN_PROGRESS (Frank hired)
  const job4 = await prisma.job.upsert({
    where: { id: "seed_job_004" },
    update: {},
    create: {
      id:          "seed_job_004",
      clientId:    cGamma.id,
      title:       "Backend API + Subgraph for Web3 Game",
      description: "Build a REST API (Node.js / Express) and The Graph subgraph to index on-chain game events. Endpoints needed: leaderboard, player inventory, match history. Redis caching required.",
      budget:      "800",
      skills:      ["Node.js", "The Graph", "PostgreSQL", "Redis", "GraphQL"],
      status:      "IN_PROGRESS",
      escrowAddress: "0xEsc004C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
      deadline:    daysAhead(14),
      createdAt:   daysAgo(7),
    },
  });

  // JOB 5 — OPEN
  const job5 = await prisma.job.upsert({
    where: { id: "seed_job_005" },
    update: {},
    create: {
      id:          "seed_job_005",
      clientId:    cBeta.id,
      title:       "Token Economics Design & Whitepaper",
      description: "Design token distribution, vesting schedules, staking mechanics, and governance model for our NFT platform token. Deliver a 20-page whitepaper and tokenomics spreadsheet.",
      budget:      "1200",
      skills:      ["Tokenomics", "Whitepaper", "Game Theory", "Economic Modelling"],
      status:      "OPEN",
      deadline:    daysAhead(30),
      createdAt:   daysAgo(2),
    },
  });

  // JOB 6 — OPEN (high budget)
  const job6 = await prisma.job.upsert({
    where: { id: "seed_job_006" },
    update: {},
    create: {
      id:          "seed_job_006",
      clientId:    cGamma.id,
      title:       "React Native Mobile DApp — Play-to-Earn Game Client",
      description: "Full mobile app (iOS + Android) for our P2E game. WalletConnect integration, in-game NFT inventory UI, live match feed via WebSockets. Expo-managed workflow preferred.",
      budget:      "4000",
      skills:      ["React Native", "Expo", "WalletConnect", "TypeScript", "WebSockets"],
      status:      "OPEN",
      deadline:    daysAhead(60),
      createdAt:   daysAgo(1),
    },
  });

  // JOB 7 — CLOSED (completed, payout done)
  const job7 = await prisma.job.upsert({
    where: { id: "seed_job_007" },
    update: {},
    create: {
      id:          "seed_job_007",
      clientId:    cGamma.id,
      title:       "Smart Contract Security Penetration Testing",
      description: "Manual + automated pentest of 5 Solidity contracts. Tools: Slither, Mythril, Echidna. Deliverable: executive summary + detailed findings report.",
      budget:      "2500",
      skills:      ["Solidity", "Security", "Slither", "Mythril", "Echidna"],
      status:      "CLOSED",
      escrowAddress: "0xEsc007D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1",
      deadline:    daysAgo(10),
      createdAt:   daysAgo(45),
    },
  });

  // JOB 8 — IN_PROGRESS (Grace hired)
  const job8 = await prisma.job.upsert({
    where: { id: "seed_job_008" },
    update: {},
    create: {
      id:          "seed_job_008",
      clientId:    cAlpha.id,
      title:       "Technical Documentation & Developer Docs Site",
      description: "Write developer documentation for our smart contract suite: inline NatSpec, API reference in Docusaurus, integration guide, and 3 code tutorials.",
      budget:      "600",
      skills:      ["Technical Writing", "Docusaurus", "Solidity", "NatSpec"],
      status:      "IN_PROGRESS",
      escrowAddress: "0xEsc008E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2",
      deadline:    daysAhead(10),
      createdAt:   daysAgo(10),
    },
  });

  console.log("✓  Jobs created/updated");

  // ── 3. Applications ──────────────────────────────────────────────────────────
  const apps = [
    // Job 1 (CLOSED) — Daniel hired, Eve rejected
    { id: "seed_app_001", jobId: job1.id, freelancerId: fDaniel.id, status: "HIRED",
      coverLetter: "I've audited 30+ DeFi contracts including yield vaults similar to yours. I use Foundry fuzz testing and will provide a full report with PoC exploits. Available to start immediately." },
    { id: "seed_app_002", jobId: job1.id, freelancerId: fEve.id, status: "REJECTED",
      coverLetter: "While my primary expertise is frontend, I have reviewed Solidity code and can assist with the audit. I recently completed a security course focused on EVM vulnerabilities." },

    // Job 2 (IN_PROGRESS) — Eve hired, Frank shortlisted, Henry rejected
    { id: "seed_app_003", jobId: job2.id, freelancerId: fEve.id, status: "HIRED",
      coverLetter: "I've built 4 NFT marketplace frontends with React and wagmi. I'm familiar with lazy-minting via EIP-712 signatures and can replicate your Figma designs pixel-perfect." },
    { id: "seed_app_004", jobId: job2.id, freelancerId: fFrank.id, status: "SHORTLISTED",
      coverLetter: "I specialise in full-stack Web3 apps. While my focus is backend, I have strong React skills and can deliver the frontend you need within the timeframe." },
    { id: "seed_app_005", jobId: job2.id, freelancerId: fHenry.id, status: "REJECTED",
      coverLetter: "Experienced with React Native but keen to expand into web frontend. My component architecture skills transfer well and I'm a fast learner." },

    // Job 3 (OPEN) — multiple pending
    { id: "seed_app_006", jobId: job3.id, freelancerId: fDaniel.id, status: "SHORTLISTED",
      coverLetter: "ERC-4626 is my speciality. I've built two auto-compounding vaults integrating with Aave v3 on mainnet. I can deliver clean, gas-optimised Solidity with 100% Foundry coverage." },
    { id: "seed_app_007", jobId: job3.id, freelancerId: fFrank.id, status: "PENDING",
      coverLetter: "I have worked on vault integrations using Aave and Compound. My Solidity skills are solid and I can write a comprehensive test suite using Foundry." },

    // Job 4 (IN_PROGRESS) — Frank hired, Daniel pending
    { id: "seed_app_008", jobId: job4.id, freelancerId: fFrank.id, status: "HIRED",
      coverLetter: "I've built The Graph subgraphs for 3 gaming projects and have production Node.js APIs with Redis caching running at scale. I can deliver this within your timeline." },
    { id: "seed_app_009", jobId: job4.id, freelancerId: fDaniel.id, status: "REJECTED",
      coverLetter: "I have backend experience alongside my Solidity work and can handle the API and subgraph. Happy to discuss the architecture in detail." },

    // Job 5 (OPEN) — Grace shortlisted, Henry pending
    { id: "seed_app_010", jobId: job5.id, freelancerId: fGrace.id, status: "SHORTLISTED",
      coverLetter: "Tokenomics is my core expertise. I've designed token models for 12 mainnet projects including staking, vesting, and governance. Happy to share samples of past whitepapers." },
    { id: "seed_app_011", jobId: job5.id, freelancerId: fHenry.id, status: "PENDING",
      coverLetter: "I have studied token economic models extensively and written economic sections of two project whitepapers. Eager to take on a dedicated tokenomics role." },

    // Job 6 (OPEN) — Henry shortlisted, Eve pending
    { id: "seed_app_012", jobId: job6.id, freelancerId: fHenry.id, status: "SHORTLISTED",
      coverLetter: "4 production React Native apps on the App Store — 2 of them Web3 with WalletConnect. I've implemented WebSocket live feeds and NFT inventory UIs before. Can start next week." },
    { id: "seed_app_013", jobId: job6.id, freelancerId: fEve.id, status: "PENDING",
      coverLetter: "While my main stack is React web, I have Expo experience and I'm actively expanding into mobile. This project would be an excellent fit for my trajectory." },

    // Job 7 (CLOSED) — Daniel hired, Grace rejected
    { id: "seed_app_014", jobId: job7.id, freelancerId: fDaniel.id, status: "HIRED",
      coverLetter: "Security pentesting is the natural extension of my audit work. I use Slither, Mythril, and Echidna daily. I'll deliver within 2 weeks with a full exec summary." },
    { id: "seed_app_015", jobId: job7.id, freelancerId: fGrace.id, status: "REJECTED",
      coverLetter: "I have reviewed contracts for economic vulnerabilities and can contribute to the pentest with a focus on game-theoretic and MEV attack vectors." },

    // Job 8 (IN_PROGRESS) — Grace hired
    { id: "seed_app_016", jobId: job8.id, freelancerId: fGrace.id, status: "HIRED",
      coverLetter: "I've written NatSpec for 5 contract suites and built two Docusaurus sites for DeFi protocols. Technical writing is something I genuinely enjoy and I deliver clean, developer-friendly docs." },
  ];

  for (const app of apps) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: { status: app.status },
      create: {
        id:           app.id,
        jobId:        app.jobId,
        freelancerId: app.freelancerId,
        coverLetter:  app.coverLetter,
        status:       app.status,
      },
    });
  }

  console.log("✓  Applications created/updated");

  // ── 4. Projects & Milestones (for IN_PROGRESS / CLOSED jobs) ─────────────────
  const projectDefs = [
    // Job 1 → COMPLETED (Daniel)
    {
      id: "seed_proj_001",
      escrowAddress: job1.escrowAddress,
      clientId: cAlpha.id,
      freelancerId: fDaniel.id,
      status: "COMPLETED",
      deadline: job1.deadline,
      milestones: [
        { idx: 0, desc: "Automated scan + initial findings report", amount: "800",  status: "RELEASED", daysAgo: 20 },
        { idx: 1, desc: "Manual review + PoC exploits for criticals",   amount: "800",  status: "RELEASED", daysAgo: 12 },
        { idx: 2, desc: "Final report + remediation verification",       amount: "400",  status: "RELEASED", daysAgo: 5  },
      ],
    },
    // Job 2 → ACTIVE (Eve)
    {
      id: "seed_proj_002",
      escrowAddress: job2.escrowAddress,
      clientId: cBeta.id,
      freelancerId: fEve.id,
      status: "ACTIVE",
      deadline: job2.deadline,
      milestones: [
        { idx: 0, desc: "Design system, routing, wallet connection",  amount: "500",  status: "RELEASED",  daysAgo: 5 },
        { idx: 1, desc: "Listing, search, and filter pages",          amount: "500",  status: "DELIVERED", daysAgo: 1 },
        { idx: 2, desc: "Bidding + lazy-minting + final QA",          amount: "500",  status: "LOCKED",    daysAgo: null },
      ],
    },
    // Job 4 → ACTIVE (Frank)
    {
      id: "seed_proj_004",
      escrowAddress: job4.escrowAddress,
      clientId: cGamma.id,
      freelancerId: fFrank.id,
      status: "ACTIVE",
      deadline: job4.deadline,
      milestones: [
        { idx: 0, desc: "Subgraph schema + event indexing",     amount: "300",  status: "RELEASED",  daysAgo: 4 },
        { idx: 1, desc: "REST API endpoints + Redis caching",   amount: "300",  status: "LOCKED",    daysAgo: null },
        { idx: 2, desc: "Leaderboard + integration tests",      amount: "200",  status: "LOCKED",    daysAgo: null },
      ],
    },
    // Job 7 → COMPLETED (Daniel)
    {
      id: "seed_proj_007",
      escrowAddress: job7.escrowAddress,
      clientId: cGamma.id,
      freelancerId: fDaniel.id,
      status: "COMPLETED",
      deadline: job7.deadline,
      milestones: [
        { idx: 0, desc: "Automated scan (Slither, Mythril, Echidna)",  amount: "1000", status: "RELEASED", daysAgo: 25 },
        { idx: 1, desc: "Manual review + attack simulation",           amount: "1000", status: "RELEASED", daysAgo: 15 },
        { idx: 2, desc: "Executive summary + remediation guide",       amount: "500",  status: "RELEASED", daysAgo: 10 },
      ],
    },
    // Job 8 → ACTIVE (Grace)
    {
      id: "seed_proj_008",
      escrowAddress: job8.escrowAddress,
      clientId: cAlpha.id,
      freelancerId: fGrace.id,
      status: "ACTIVE",
      deadline: job8.deadline,
      milestones: [
        { idx: 0, desc: "NatSpec for all contracts",              amount: "200",  status: "DELIVERED", daysAgo: 2 },
        { idx: 1, desc: "Docusaurus site + API reference",        amount: "200",  status: "LOCKED",    daysAgo: null },
        { idx: 2, desc: "3 integration tutorials",                amount: "200",  status: "LOCKED",    daysAgo: null },
      ],
    },
  ];

  for (const proj of projectDefs) {
    await prisma.project.upsert({
      where: { escrowAddress: proj.escrowAddress },
      update: { status: proj.status },
      create: {
        id:            proj.id,
        escrowAddress: proj.escrowAddress,
        clientId:      proj.clientId,
        freelancerId:  proj.freelancerId,
        status:        proj.status,
        deadline:      proj.deadline,
      },
    });

    for (const m of proj.milestones) {
      const project = await prisma.project.findUnique({ where: { escrowAddress: proj.escrowAddress } });
      await prisma.milestone.upsert({
        where: { projectId_milestoneIndex: { projectId: project.id, milestoneIndex: m.idx } },
        update: { status: m.status },
        create: {
          projectId:           project.id,
          milestoneIndex:      m.idx,
          description:         m.desc,
          amount:              m.amount,
          status:              m.status,
          freelancerDelivered: m.status === "DELIVERED" || m.status === "RELEASED",
          clientApproved:      m.status === "RELEASED",
          dueDate:             m.daysAgo ? daysAgo(m.daysAgo - 3) : daysAhead(7),
        },
      });
    }
  }

  console.log("✓  Projects & milestones created/updated");

  // ── 5. Fee & payout summary (printed to console) ─────────────────────────────
  const completedJobs = [
    { title: "Smart Contract Audit",        budget: "2000", freelancer: "0xD4E5…d2E3", gasTxCount: 3 },
    { title: "Security Penetration Testing",budget: "2500", freelancer: "0xD4E5…d2E3", gasTxCount: 3 },
  ];

  const activeJobs = [
    { title: "React Frontend — NFT Marketplace",        budget: "1500", releasedMilestones: 1, totalMilestones: 3 },
    { title: "Backend API + Subgraph",                  budget: "800",  releasedMilestones: 1, totalMilestones: 3 },
    { title: "Technical Documentation & Dev Docs Site", budget: "600",  releasedMilestones: 0, totalMilestones: 3 },
  ];

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  8% Platform Fee Simulation — Beta Test Summary");
  console.log("════════════════════════════════════════════════════════════\n");

  console.log("COMPLETED PAYOUTS\n");
  for (const j of completedJobs) {
    const f = fees(j.budget);
    const totalGas = (GAS_ETH * j.gasTxCount).toFixed(5);
    console.log(`  Job:              ${j.title}`);
    console.log(`  Freelancer:       ${j.freelancer}`);
    console.log(`  Budget:           ${f.budget.toFixed(2)} USDC`);
    console.log(`  ─── Client ───────────────────────────────`);
    console.log(`  Service fee (8%): +${f.clientFee.toFixed(2)} USDC`);
    console.log(`  Client pays:      ${f.clientTotal.toFixed(2)} USDC total`);
    console.log(`  ─── Freelancer ───────────────────────────`);
    console.log(`  Platform cut (8%):−${f.freelancerFee.toFixed(2)} USDC`);
    console.log(`  Gas fees:         −${totalGas} ETH (${j.gasTxCount} tx × ${GAS_ETH} ETH, Sepolia)`);
    console.log(`  Net payout:        ${f.freelancerNet.toFixed(2)} USDC − ${totalGas} ETH gas`);
    console.log();
  }

  console.log("ACTIVE ESCROWS\n");
  for (const j of activeJobs) {
    const f = fees(j.budget);
    const perMilestone = (f.freelancerNet / j.totalMilestones).toFixed(2);
    const released = (f.freelancerNet / j.totalMilestones * j.releasedMilestones).toFixed(2);
    console.log(`  Job:              ${j.title}`);
    console.log(`  Budget (escrow):  ${f.budget.toFixed(2)} USDC`);
    console.log(`  Client paid:      ${f.clientTotal.toFixed(2)} USDC (incl. 8% fee)`);
    console.log(`  Freelancer net:   ${f.freelancerNet.toFixed(2)} USDC after platform cut`);
    console.log(`  Per milestone:    ~${perMilestone} USDC`);
    console.log(`  Released so far:  ${released} USDC (${j.releasedMilestones}/${j.totalMilestones} milestones)`);
    console.log(`  Remaining locked: ${(f.freelancerNet - Number(released)).toFixed(2)} USDC`);
    console.log();
  }

  console.log("OPEN JOBS (pending applications)\n");
  const openJobs = [
    { title: "Solidity — ERC-4626 Vault",          budget: "3500", applicants: 2 },
    { title: "Token Economics Design & Whitepaper", budget: "1200", applicants: 2 },
    { title: "React Native Mobile DApp",            budget: "4000", applicants: 2 },
  ];
  for (const j of openJobs) {
    const f = fees(j.budget);
    console.log(`  Job:              ${j.title}`);
    console.log(`  Budget:           ${f.budget.toFixed(2)} USDC`);
    console.log(`  Client will pay:  ${f.clientTotal.toFixed(2)} USDC (incl. 8% fee on escrow deposit)`);
    console.log(`  Freelancer nets:  ${f.freelancerNet.toFixed(2)} USDC (after 8% platform cut + gas)`);
    console.log(`  Applicants:       ${j.applicants}`);
    console.log();
  }

  console.log("════════════════════════════════════════════════════════════\n");

  // ── 6. Alice's demo projects (spec-required seed) ─────────────────────────
  // These make the dashboard work out-of-the-box for:
  //   Alice (client):   0x742d35Cc6634C0532925a3b844Bc454e4438f44e
  //   Bob (freelancer): 0x1234567890abcdef1234567890abcdef12345678
  //   Carol (mediator): 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

  const ALICE   = "0x742d35cc6634c0532925a3b844bc454e4438f44e";
  const BOB     = "0x1234567890abcdef1234567890abcdef12345678";
  const CAROL   = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where:  { walletAddress: ALICE },
      update: {},
      create: {
        walletAddress: ALICE,
        role:          "CLIENT",
        email:         "alice@demo.escrow",
        bio:           "Alice — demo client account. Used for testing the escrow platform.",
        skills:        ["Product Management", "Web3"],
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: BOB },
      update: {},
      create: {
        walletAddress: BOB,
        role:          "FREELANCER",
        email:         "bob@demo.escrow",
        bio:           "Bob — demo freelancer. Full-stack developer and Solidity engineer.",
        skills:        ["React", "Next.js", "Solidity", "TypeScript"],
        portfolioUrl:  "https://github.com/0xBob",
      },
    }),
    prisma.user.upsert({
      where:  { walletAddress: CAROL },
      update: {},
      create: {
        walletAddress: CAROL,
        role:          "MEDIATOR",
        email:         "carol@demo.escrow",
        bio:           "Carol — registered mediator for dispute resolution.",
        skills:        ["Dispute Resolution", "Smart Contracts"],
      },
    }),
  ]);

  console.log("✓  Demo users (Alice / Bob / Carol) created");

  // ── Project 1: E-Commerce Platform MVP — ACTIVE, $2500, 3 milestones ─────
  const ESCROW_1 = "0xdemo0000000000000000000000000000000000001";
  await prisma.project.upsert({
    where:  { escrowAddress: ESCROW_1 },
    update: { status: "ACTIVE" },
    create: {
      id:              "demo_proj_001",
      escrowAddress:   ESCROW_1,
      clientId:        alice.id,
      freelancerId:    bob.id,
      mediatorAddress: CAROL,
      status:          "ACTIVE",
      title:           "E-Commerce Platform MVP",
      description:     "Full-stack e-commerce platform with Web3 payments and NFT-gated access.",
      totalAmount:     "2500.00",
      deadline:        daysAhead(60),
    },
  });
  const p1 = await prisma.project.findUnique({ where: { escrowAddress: ESCROW_1 } });
  const p1Milestones = [
    { idx: 0, desc: "UI design system, auth, product catalogue",   amount: "833.33", status: "RELEASED",  fl: true,  ca: true,  createdDaysAgo: 30 },
    { idx: 1, desc: "Cart, checkout, and Stripe/USDC payment flow", amount: "833.33", status: "DELIVERED", fl: true,  ca: false, createdDaysAgo: 10 },
    { idx: 2, desc: "Admin dashboard, analytics, and deployment",   amount: "833.34", status: "LOCKED",    fl: false, ca: false, createdDaysAgo: 3  },
  ];
  for (const m of p1Milestones) {
    await prisma.milestone.upsert({
      where:  { projectId_milestoneIndex: { projectId: p1.id, milestoneIndex: m.idx } },
      update: { status: m.status, freelancerDelivered: m.fl, clientApproved: m.ca },
      create: {
        projectId:           p1.id,
        milestoneIndex:      m.idx,
        description:         m.desc,
        amount:              m.amount,
        status:              m.status,
        freelancerDelivered: m.fl,
        clientApproved:      m.ca,
        dueDate:             daysAhead(30 - m.createdDaysAgo + 20),
      },
    });
  }

  // ── Project 2: Brand Identity Design — COMPLETED, $800, 2 milestones ─────
  const ESCROW_2 = "0xdemo0000000000000000000000000000000000002";
  await prisma.project.upsert({
    where:  { escrowAddress: ESCROW_2 },
    update: { status: "COMPLETED" },
    create: {
      id:            "demo_proj_002",
      escrowAddress: ESCROW_2,
      clientId:      alice.id,
      freelancerId:  bob.id,
      status:        "COMPLETED",
      title:         "Brand Identity Design",
      description:   "Complete brand identity package: logo, colour palette, typography, and style guide.",
      totalAmount:   "800.00",
      deadline:      daysAgo(5),
    },
  });
  const p2 = await prisma.project.findUnique({ where: { escrowAddress: ESCROW_2 } });
  const p2Milestones = [
    { idx: 0, desc: "Logo concepts, moodboard, and colour palette",  amount: "400.00", status: "RELEASED", fl: true, ca: true, createdDaysAgo: 25 },
    { idx: 1, desc: "Final logo, style guide, and asset delivery",   amount: "400.00", status: "RELEASED", fl: true, ca: true, createdDaysAgo: 10 },
  ];
  for (const m of p2Milestones) {
    await prisma.milestone.upsert({
      where:  { projectId_milestoneIndex: { projectId: p2.id, milestoneIndex: m.idx } },
      update: { status: m.status, freelancerDelivered: m.fl, clientApproved: m.ca },
      create: {
        projectId:           p2.id,
        milestoneIndex:      m.idx,
        description:         m.desc,
        amount:              m.amount,
        status:              m.status,
        freelancerDelivered: m.fl,
        clientApproved:      m.ca,
        dueDate:             daysAgo(m.createdDaysAgo - 5),
      },
    });
  }

  // ── Project 3: Smart Contract Audit — DISPUTED, $1200, 1 milestone ───────
  const ESCROW_3 = "0xdemo0000000000000000000000000000000000003";
  await prisma.project.upsert({
    where:  { escrowAddress: ESCROW_3 },
    update: { status: "DISPUTED" },
    create: {
      id:              "demo_proj_003",
      escrowAddress:   ESCROW_3,
      clientId:        alice.id,
      freelancerId:    bob.id,
      mediatorAddress: CAROL,
      status:          "DISPUTED",
      title:           "Smart Contract Audit",
      description:     "Security audit of a 4-contract DeFi protocol including reentrancy, access control, and oracle manipulation checks.",
      totalAmount:     "1200.00",
      deadline:        daysAhead(7),
    },
  });
  const p3 = await prisma.project.findUnique({ where: { escrowAddress: ESCROW_3 } });
  await prisma.milestone.upsert({
    where:  { projectId_milestoneIndex: { projectId: p3.id, milestoneIndex: 0 } },
    update: { status: "DELIVERED", freelancerDelivered: true, clientApproved: false },
    create: {
      projectId:           p3.id,
      milestoneIndex:      0,
      description:         "Full audit report with findings, severity ratings, and PoC exploits",
      amount:              "1200.00",
      status:              "DELIVERED",
      freelancerDelivered: true,
      clientApproved:      false,
      dueDate:             daysAhead(7),
    },
  });
  // Upsert dispute record for Project 3
  await prisma.dispute.upsert({
    where:  { projectId: p3.id },
    update: { status: "OPEN" },
    create: {
      projectId:      p3.id,
      milestoneIndex: 0,
      raisedBy:       ALICE,
      mediatorId:     carol.id,
      status:         "OPEN",
    },
  });

  console.log("✓  Alice demo projects (E-Commerce MVP / Brand Identity / Smart Contract Audit) created");

  // ── 7. Demo wallet profiles (wallet simulation mode) ─────────────────────
  // These addresses match the DEMO_WALLETS list in frontend/src/contexts/DemoWallet.tsx
  const DEMO = {
    alice:    "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    priya:    "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
    bob:      "0x1234567890123456789012345678901234567890",
    carol:    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    dave:     "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    elena:    "0x5b38da6a701c568545dcfcb03fcb875f56beddc4",
    mediator: "0x4b20993bc481177ec7e8f571cecae8a9e22c02db",
  };

  await Promise.all([
    // Alice — already seeded above, update with richer profile
    prisma.user.upsert({
      where:  { walletAddress: DEMO.alice },
      update: {
        displayName:       "Alice Chen",
        tagline:           "DeFi product lead & Web3 builder",
        availability:      "AVAILABLE",
        completedProjects: 3,
        rating:            4.9,
        totalEarned:       "0",
      },
      create: {
        walletAddress:     DEMO.alice,
        role:              "CLIENT",
        email:             "alice@demo.escrow",
        bio:               "Alice — demo client. I'm a DeFi product lead looking for top Web3 talent to build the future of decentralised finance.",
        skills:            ["Product Management", "Web3", "DeFi", "Token Design"],
        displayName:       "Alice Chen",
        tagline:           "DeFi product lead & Web3 builder",
        availability:      "AVAILABLE",
        completedProjects: 3,
        rating:            4.9,
        totalEarned:       "0",
      },
    }),

    // Priya — second client
    prisma.user.upsert({
      where:  { walletAddress: DEMO.priya },
      update: {
        displayName:       "Priya Kapoor",
        tagline:           "NFT marketplace founder & community builder",
        availability:      "AVAILABLE",
        completedProjects: 5,
        rating:            4.8,
        totalEarned:       "0",
      },
      create: {
        walletAddress:     DEMO.priya,
        role:              "CLIENT",
        email:             "priya@demo.escrow",
        bio:               "Priya — demo client. Founder of an NFT marketplace. I hire designers, frontend developers, and smart contract engineers.",
        skills:            ["NFT", "Community", "Marketplace", "Solidity"],
        displayName:       "Priya Kapoor",
        tagline:           "NFT marketplace founder & community builder",
        availability:      "AVAILABLE",
        completedProjects: 5,
        rating:            4.8,
        totalEarned:       "0",
      },
    }),

    // Bob — senior full-stack freelancer
    prisma.user.upsert({
      where:  { walletAddress: DEMO.bob },
      update: {
        displayName:       "Bob Martinez",
        tagline:           "Full-stack Web3 developer · Next.js + Solidity",
        hourlyRate:        "120",
        availability:      "AVAILABLE",
        completedProjects: 12,
        rating:            4.7,
        totalEarned:       "45600",
        portfolioUrl:      "https://github.com/0xBobMartinez",
      },
      create: {
        walletAddress:     DEMO.bob,
        role:              "FREELANCER",
        email:             "bob@demo.escrow",
        bio:               "5 years of full-stack Web3 development. I build end-to-end dApps: React/Next.js frontends, Node.js backends, and Solidity smart contracts. Delivered 12 projects on-time and on-budget.",
        skills:            ["React", "Next.js", "Solidity", "TypeScript", "Node.js", "Hardhat"],
        displayName:       "Bob Martinez",
        tagline:           "Full-stack Web3 developer · Next.js + Solidity",
        hourlyRate:        "120",
        availability:      "AVAILABLE",
        completedProjects: 12,
        rating:            4.7,
        totalEarned:       "45600",
        portfolioUrl:      "https://github.com/0xBobMartinez",
      },
    }),

    // Carol — UI/UX designer
    prisma.user.upsert({
      where:  { walletAddress: DEMO.carol },
      update: {
        displayName:       "Carol Nguyen",
        tagline:           "UI/UX designer for Web3 — Figma to production",
        hourlyRate:        "95",
        availability:      "BUSY",
        completedProjects: 8,
        rating:            4.9,
        totalEarned:       "28000",
        portfolioUrl:      "https://dribbble.com/0xCarol",
      },
      create: {
        walletAddress:     DEMO.carol,
        role:              "FREELANCER",
        email:             "carol@demo.escrow",
        bio:               "I design beautiful, user-friendly interfaces for Web3 products. From wallet UX flows to DeFi dashboards — I bridge the gap between complex blockchain interactions and delightful user experiences.",
        skills:            ["UI/UX", "Figma", "React", "Tailwind CSS", "Design Systems", "Web3 UX"],
        displayName:       "Carol Nguyen",
        tagline:           "UI/UX designer for Web3 — Figma to production",
        hourlyRate:        "95",
        availability:      "BUSY",
        completedProjects: 8,
        rating:            4.9,
        totalEarned:       "28000",
        portfolioUrl:      "https://dribbble.com/0xCarol",
      },
    }),

    // Dave — Solidity / smart contract specialist
    prisma.user.upsert({
      where:  { walletAddress: DEMO.dave },
      update: {
        displayName:       "Dave Okafor",
        tagline:           "Solidity engineer & DeFi protocol architect",
        hourlyRate:        "150",
        availability:      "AVAILABLE",
        completedProjects: 20,
        rating:            5.0,
        totalEarned:       "112000",
        portfolioUrl:      "https://github.com/0xDaveOkafor",
      },
      create: {
        walletAddress:     DEMO.dave,
        role:              "FREELANCER",
        email:             "dave@demo.escrow",
        bio:               "Senior Solidity engineer with 7 years of EVM experience. I have audited 40+ contracts and built production DeFi protocols managing $50M+ TVL. Specialities: yield vaults, AMMs, cross-chain bridges, and gas optimisation.",
        skills:            ["Solidity", "Foundry", "DeFi", "ERC-20", "ERC-4626", "Auditing", "OpenZeppelin", "Hardhat"],
        displayName:       "Dave Okafor",
        tagline:           "Solidity engineer & DeFi protocol architect",
        hourlyRate:        "150",
        availability:      "AVAILABLE",
        completedProjects: 20,
        rating:            5.0,
        totalEarned:       "112000",
        portfolioUrl:      "https://github.com/0xDaveOkafor",
      },
    }),

    // Elena — Python / data / backend
    prisma.user.upsert({
      where:  { walletAddress: DEMO.elena },
      update: {
        displayName:       "Elena Vasquez",
        tagline:           "Python engineer & blockchain data analyst",
        hourlyRate:        "110",
        availability:      "AVAILABLE",
        completedProjects: 9,
        rating:            4.6,
        totalEarned:       "38500",
        portfolioUrl:      "https://github.com/0xElenaV",
      },
      create: {
        walletAddress:     DEMO.elena,
        role:              "FREELANCER",
        email:             "elena@demo.escrow",
        bio:               "I build backend systems and on-chain data pipelines for Web3 companies. Specialities include The Graph subgraphs, event indexing, Python analytics, and REST/GraphQL APIs at scale.",
        skills:            ["Python", "The Graph", "Node.js", "GraphQL", "PostgreSQL", "Data Engineering", "Web3.py"],
        displayName:       "Elena Vasquez",
        tagline:           "Python engineer & blockchain data analyst",
        hourlyRate:        "110",
        availability:      "AVAILABLE",
        completedProjects: 9,
        rating:            4.6,
        totalEarned:       "38500",
        portfolioUrl:      "https://github.com/0xElenaV",
      },
    }),

    // Mediator — dispute resolution
    prisma.user.upsert({
      where:  { walletAddress: DEMO.mediator },
      update: {
        displayName:       "Mediator (Platform)",
        tagline:           "Certified dispute mediator — neutral & impartial",
        availability:      "AVAILABLE",
        completedProjects: 47,
        rating:            4.95,
        totalEarned:       "0",
      },
      create: {
        walletAddress:     DEMO.mediator,
        role:              "MEDIATOR",
        email:             "mediator@demo.escrow",
        bio:               "Certified Web3 dispute mediator. I provide neutral, fair resolution for escrow disagreements. Response time under 24 h. 47 disputes resolved with a 94% satisfaction rate.",
        skills:            ["Dispute Resolution", "Smart Contracts", "Arbitration", "DeFi", "Legal"],
        displayName:       "Mediator (Platform)",
        tagline:           "Certified dispute mediator — neutral & impartial",
        availability:      "AVAILABLE",
        completedProjects: 47,
        rating:            4.95,
        totalEarned:       "0",
      },
    }),
  ]);

  // Portfolio items for Bob
  const bobUser = await prisma.user.findUnique({ where: { walletAddress: DEMO.bob } });
  if (bobUser) {
    const bobPortfolio = [
      {
        title:       "DeFi Lending Protocol",
        description: "Built a full-stack lending protocol with React frontend and Solidity smart contracts. Supports collateralised loans, liquidations, and live APY feeds.",
        imageUrl:    null,
        projectUrl:  "https://github.com/0xBobMartinez/defi-lending",
        tags:        ["Solidity", "React", "DeFi"],
      },
      {
        title:       "NFT Mint Launchpad",
        description: "Launchpad for ERC-721 collections with allow-list minting, reveal mechanics, and a Merkle-proof whitelist.",
        imageUrl:    null,
        projectUrl:  "https://github.com/0xBobMartinez/nft-launchpad",
        tags:        ["NFT", "Solidity", "Next.js"],
      },
    ];
    for (const item of bobPortfolio) {
      const exists = await prisma.portfolioItem.findFirst({
        where: { userId: bobUser.id, title: item.title },
      });
      if (!exists) {
        await prisma.portfolioItem.create({ data: { userId: bobUser.id, ...item } });
      }
    }
  }

  // Portfolio items for Dave
  const daveUser = await prisma.user.findUnique({ where: { walletAddress: DEMO.dave } });
  if (daveUser) {
    const davePortfolio = [
      {
        title:       "ERC-4626 Yield Vault",
        description: "Auto-compounding vault integrating with Aave v3 and Compound. Fully audited with 100% Foundry fuzz test coverage. Manages $8M TVL on mainnet.",
        imageUrl:    null,
        projectUrl:  "https://github.com/0xDaveOkafor/yield-vault",
        tags:        ["Solidity", "DeFi", "Foundry", "ERC-4626"],
      },
      {
        title:       "Cross-chain Bridge",
        description: "LayerZero-powered bridge enabling USDC transfers between Ethereum, Arbitrum, and Polygon with message verification and replay protection.",
        imageUrl:    null,
        projectUrl:  "https://github.com/0xDaveOkafor/xchain-bridge",
        tags:        ["Solidity", "LayerZero", "Cross-chain"],
      },
    ];
    for (const item of davePortfolio) {
      const exists = await prisma.portfolioItem.findFirst({
        where: { userId: daveUser.id, title: item.title },
      });
      if (!exists) {
        await prisma.portfolioItem.create({ data: { userId: daveUser.id, ...item } });
      }
    }
  }

  console.log("✓  Demo wallet profiles (Alice / Priya / Bob / Carol / Dave / Elena / Mediator) seeded");
  console.log("\n🌱  Seed complete.\n");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
