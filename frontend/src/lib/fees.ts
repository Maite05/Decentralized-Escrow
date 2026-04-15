export const SERVICE_FEE_RATE = 0.08; // 8% on both sides
export const SEPOLIA_GAS_FEE_USD = 3.5; // $3.50 per milestone payout

export interface FeeBreakdown {
  grossAmount: number;    // the milestone/job amount in USDC
  platformFee: number;    // 8% of grossAmount
  gasFeeSepolia: number;  // $3.50 fixed
  netPayout: number;      // freelancer receives: gross - 8% - $3.50
  clientPays: number;     // client pays: gross + 8%
  clientFee: number;      // extra the client pays (8% of gross)
}

/**
 * Calculate all fee components for a given USDC amount.
 * @param amount - Gross milestone amount as a number or string
 */
export function calcFees(amount: number | string): FeeBreakdown {
  const gross = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  const platformFee = Math.round(gross * SERVICE_FEE_RATE * 100) / 100;
  const gasFeeSepolia = SEPOLIA_GAS_FEE_USD;
  const netPayout = Math.round((gross - platformFee - gasFeeSepolia) * 100) / 100;
  const clientPays = Math.round((gross + platformFee) * 100) / 100;
  const clientFee = platformFee;

  return {
    grossAmount: gross,
    platformFee,
    gasFeeSepolia,
    netPayout: Math.max(0, netPayout),
    clientPays,
    clientFee,
  };
}

/**
 * Format a number as a USDC string with 2 decimal places.
 */
export function fmtUSDC(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
