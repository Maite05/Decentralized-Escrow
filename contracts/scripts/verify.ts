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
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`  ✓ Verified`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Already Verified")) {
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

  // NOTE: initialOwner is the deployer address recorded at deploy time.
  // TODO: update deployer address below if ownership was transferred after deployment.
  const deployerAddress = process.env.DEPLOYER_ADDRESS ?? process.env.DEPLOYER_PRIVATE_KEY
    ? ""
    : (() => { throw new Error("Provide DEPLOYER_ADDRESS in .env"); })();

  await verifyContract(addresses.mediatorRegistry, [
    stakeTokenAddress,
    deployerAddress,
  ]);

  await verifyContract(addresses.escrowFactory, [
    addresses.mediatorRegistry,
  ]);

  console.log("\nAll contracts verified.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
