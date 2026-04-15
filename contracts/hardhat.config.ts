import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@okxweb3/hardhat-explorer-verify";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ?? "0".repeat(64);
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL ?? "";
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL ?? "";
const XLAYER_RPC_URL =
  process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech";
const XLAYER_TESTNET_RPC_URL =
  process.env.XLAYER_TESTNET_RPC_URL ?? "https://testrpc.xlayer.tech";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY ?? "";
const OKLINK_API_KEY = process.env.OKLINK_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    xlayer: {
      url: XLAYER_RPC_URL,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 196,
    },
    xlayerTestnet: {
      url: XLAYER_TESTNET_RPC_URL,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 1952,
    },
    polygonMumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 80001,
    },
    polygon: {
      url: POLYGON_RPC_URL,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      xlayer: OKLINK_API_KEY,
      xlayerTestnet: OKLINK_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL:
            "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
          browserURL: "https://www.okx.com/explorer/xlayer",
        },
      },
      {
        network: "xlayerTestnet",
        chainId: 1952,
        urls: {
          apiURL:
            "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TEST",
          browserURL: "https://www.okx.com/explorer/xlayer-test",
        },
      },
      {
        network: "polygonMumbai",
        chainId: 80001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://mumbai.polygonscan.com",
        },
      },
    ],
  },
  okxweb3explorer: {
    apiKey: OKLINK_API_KEY,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
