import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Network: ${network.name}`);

  // Set STAKE_TOKEN_ADDRESS in .env — address of the ERC-20 used for mediator stakes.
  // On testnet, if not set, deploy MockERC20 and use its address automatically.
  let stakeTokenAddress = process.env.STAKE_TOKEN_ADDRESS;
  if (!stakeTokenAddress) {
    const isTestnet = network.name === "xlayerTestnet" || network.name === "hardhat" || network.name === "localhost";
    if (!isTestnet) {
      throw new Error("STAKE_TOKEN_ADDRESS is not set in .env — required for mainnet deploys");
    }
    console.log("\n[0/2] STAKE_TOKEN_ADDRESS not set — deploying MockERC20 for testnet...");
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mock = await MockERC20Factory.deploy("Mock USDC", "mUSDC", 6);
    await mock.waitForDeployment();
    stakeTokenAddress = await mock.getAddress();
    console.log(`  MockERC20 deployed at: ${stakeTokenAddress}`);
    console.log(`  Add to .env: STAKE_TOKEN_ADDRESS=${stakeTokenAddress}`);
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
