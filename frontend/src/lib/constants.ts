
import addresses from "@contracts/addresses.json";

import EscrowFactoryABI from "@contracts/abis/EscrowFactory.json";
import MilestoneEscrowABI from "@contracts/abis/MilestoneEscrow.json";
import ERC20ABI from "@contracts/abis/MockERC20.json";

export const FACTORY_ADDRESS = addresses.escrowFactory as `0x${string}`;
export const FACTORY_ABI = EscrowFactoryABI as readonly object[];
export const ESCROW_ABI = MilestoneEscrowABI as readonly object[];
export const ERC20_ABI = ERC20ABI as readonly object[];

// Set NEXT_PUBLIC_USDC_ADDRESS in .env to the USDC contract address on your target chain.
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "") as `0x${string}`;
