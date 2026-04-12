/**
 * sync-abis.ts
 * Extracts ABI arrays from Hardhat artifacts and copies them into
 * contracts/shared/abis/ so the frontend can import them via @contracts.
 *
 * Run with: npm run sync-abis -w contracts
 *          (which calls: hardhat run scripts/sync-abis.ts)
 */
import * as fs from "fs";
import * as path from "path";

const CONTRACTS_TO_SYNC = [
  "MilestoneEscrow",
  "EscrowFactory",
  "MediatorRegistry",
  "MockERC20",
] as const;

async function main(): Promise<void> {
  const artifactsBase = path.join(__dirname, "../artifacts/contracts");
  const outputDir = path.join(__dirname, "../shared/abis");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const contractName of CONTRACTS_TO_SYNC) {
    const candidates = [
      path.join(artifactsBase, `${contractName}.sol`, `${contractName}.json`),
      path.join(
        artifactsBase,
        "mocks",
        `${contractName}.sol`,
        `${contractName}.json`
      ),
    ];

    const artifactPath = candidates.find(p => fs.existsSync(p));
    if (!artifactPath) {
      console.warn(`  [WARN] Artifact not found for ${contractName} — run 'npm run compile' first.`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
      abi: unknown[];
    };
    const outputPath = path.join(outputDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`  ✓ ${contractName}.json → shared/abis/`);
  }

  console.log("\nABI sync complete.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
