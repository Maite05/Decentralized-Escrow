import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface Addresses {
  mediatorRegistry: string;
  escrowFactory: string;
  network: string;
  deployedAt: string;
}

async function verifyContract(
  address: string,
  constructorArgs: unknown[]
): Promise<void> {
  console.log(`\nVerifying ${address} ...`);
  try {
    await run("okverify", {
      address,
      constructorArgsParams: constructorArgs.map(String),
    });
    console.log(`  ✓ Verified`);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes("Already Verified") ||
        err.message.includes("already verified"))
    ) {
      console.log("  Already verified — skipping.");
    } else {
      throw err;
    }
  }
}

async function main(): Promise<void> {
  const addressesPath = path.join(__dirname, "../shared/addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "shared/addresses.json not found. Run the deploy script first."
    );
  }

  const addresses: Addresses = JSON.parse(
    fs.readFileSync(addressesPath, "utf8")
  );

  console.log(`Verifying contracts on network: ${addresses.network}`);

  const stakeTokenAddress = process.env.STAKE_TOKEN_ADDRESS;
  if (!stakeTokenAddress) {
    throw new Error("STAKE_TOKEN_ADDRESS is not set in .env");
  }

  // DEPLOYER_ADDRESS must be the address that was the initialOwner at deploy time.
  // If ownership was transferred after deployment, set this to the original deployer
  // address (not the current owner) so the constructor args still match.
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  if (!deployerAddress) {
    throw new Error("Set DEPLOYER_ADDRESS in .env — the wallet address used to deploy the contracts");
  }

  // FEE_RECIPIENT must match the value passed to EscrowFactory at deploy time.
  const feeRecipient = process.env.FEE_RECIPIENT || deployerAddress;

  await verifyContract(addresses.mediatorRegistry, [
    stakeTokenAddress,
    deployerAddress,
  ]);

  await verifyContract(addresses.escrowFactory, [
    addresses.mediatorRegistry,
    feeRecipient,
  ]);

  console.log("\nAll contracts verified.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
