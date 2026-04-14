import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  ? [
      process.env.DEPLOYER_PRIVATE_KEY.startsWith("0x")
        ? process.env.DEPLOYER_PRIVATE_KEY
        : `0x${process.env.DEPLOYER_PRIVATE_KEY}`,
    ]
  : [];

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    xlayer: {
      url: process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: deployerKey,
    },
    "xlayer-testnet": {
      url: process.env.XLAYER_TESTNET_RPC_URL || "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts: deployerKey,
    },
  },
  etherscan: {
    apiKey: {
      xlayer: process.env.OKLINK_API_KEY || "",
      "xlayer-testnet": process.env.OKLINK_API_KEY || "",
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL:
            "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
          browserURL: "https://www.oklink.com/xlayer",
        },
      },
      {
        network: "xlayer-testnet",
        chainId: 1952,
        urls: {
          apiURL:
            "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET",
          browserURL: "https://www.oklink.com/xlayer-testnet",
        },
      },
    ],
  },
};

export default config;
