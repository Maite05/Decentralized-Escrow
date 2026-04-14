import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Network: ${network.name}`);

  // Set STAKE_TOKEN_ADDRESS in .env — address of the ERC-20 used for mediator stakes.
  const stakeTokenAddress = process.env.STAKE_TOKEN_ADDRESS;
  if (!stakeTokenAddress) {
    throw new Error("STAKE_TOKEN_ADDRESS is not set in .env");
  }

  // FEE_RECIPIENT: wallet that collects the 5% protocol fee on each milestone release.
  // Defaults to the deployer if not set.
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log(`Fee recipient: ${feeRecipient}`);

  console.log("\n[1/2] Deploying MediatorRegistry...");
  const RegistryFactory = await ethers.getContractFactory("MediatorRegistry");
  const registry = await RegistryFactory.deploy(
    stakeTokenAddress,
    deployer.address
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  MediatorRegistry deployed at: ${registryAddress}`);

  console.log("\n[2/2] Deploying EscrowFactory...");
  const FactoryFactory = await ethers.getContractFactory("EscrowFactory");
  const factory = await FactoryFactory.deploy(registryAddress, feeRecipient);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`  EscrowFactory deployed at: ${factoryAddress}`);

  const addresses = {
    mediatorRegistry: registryAddress,
    escrowFactory: factoryAddress,
    network: network.name,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../shared/addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`\nAddresses written to ${outputPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
