/**
 * x402 payment middleware for the AI risk endpoint.
 *
 * Protocol flow:
 *   1. Client calls GET /escrow/ai/risk/:id with no X-Payment header.
 *   2. Server returns HTTP 402 with X-Payment-Required header (base64 JSON).
 *   3. Client sends 0.01 USDC to feeRecipient on X Layer.
 *   4. Client retries with X-Payment: <base64 JSON { txHash, chainId }>.
 *   5. Server verifies the USDC Transfer log on-chain and grants access.
 *
 * Reference: https://x402.org
 */

import { createPublicClient, http, parseUnits } from 'viem';

const CHAINS = {
  196: {
    id: 196,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  },
  1952: {
    id: 1952,
    name: 'X Layer Testnet',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
  },
};

const USDC_DECIMALS = 6;
// 0.01 USDC in smallest units
const AI_CALL_PRICE = parseUnits('0.01', USDC_DECIMALS);

// ERC-20 Transfer(address indexed from, address indexed to, uint256 value) topic
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function getActiveChain() {
  const chainId = parseInt(process.env.NEXT_PUBLIC_TARGET_CHAIN_ID || '1952', 10);
  return CHAINS[chainId] || CHAINS[1952];
}

function buildPaymentRequirements() {
  const chain = getActiveChain();
  const feeRecipient = (process.env.FEE_RECIPIENT || process.env.DEPLOYER_ADDRESS || '').toLowerCase();
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '').toLowerCase();

  return {
    scheme: 'exact',
    network: `eip155:${chain.id}`,
    maxAmountRequired: AI_CALL_PRICE.toString(),
    resource: '/escrow/ai/risk',
    description: 'AI escrow risk assessment — 0.01 USDC per call on X Layer',
    mimeType: 'application/json',
    payTo: feeRecipient,
    asset: usdcAddress,
    extra: { name: 'USD Coin', decimals: USDC_DECIMALS },
  };
}

async function verifyPaymentHeader(headerValue) {
  if (!headerValue) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(headerValue, 'base64').toString('utf8'));
  } catch {
    return false;
  }

  const { txHash, chainId } = payload;
  if (!txHash || !chainId) return false;

  const chain = getActiveChain();
  if (parseInt(chainId, 10) !== chain.id) return false;

  const feeRecipient = (process.env.FEE_RECIPIENT || process.env.DEPLOYER_ADDRESS || '').toLowerCase();
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '').toLowerCase();

  // In dev (no fee recipient / USDC configured), accept any well-formed proof.
  if (!feeRecipient || !usdcAddress) {
    console.warn('[x402] FEE_RECIPIENT or NEXT_PUBLIC_USDC_ADDRESS not set — accepting payment in dev mode');
    return true;
  }

  try {
    const client = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== 'success') return false;

    // Find a USDC Transfer log to the fee recipient for >= 0.01 USDC.
    const transferLog = receipt.logs.find((log) => {
      if (log.topics.length < 3) return false;
      const toAddr = '0x' + log.topics[2].slice(26);
      return (
        log.address.toLowerCase() === usdcAddress &&
        log.topics[0] === TRANSFER_TOPIC &&
        toAddr.toLowerCase() === feeRecipient
      );
    });

    if (!transferLog) return false;

    return BigInt(transferLog.data) >= AI_CALL_PRICE;
  } catch (err) {
    console.error('[x402] On-chain verification failed:', err.message);
    return false;
  }
}

/**
 * Express middleware that gates the route behind an x402 payment.
 *
 * On missing/invalid payment:
 *   → HTTP 402 with X-Payment-Required: <base64 JSON requirements>
 *
 * On valid payment:
 *   → calls next()
 */
export async function x402(req, res, next) {
  const valid = await verifyPaymentHeader(req.headers['x-payment']);

  if (!valid) {
    const requirements = buildPaymentRequirements();
    res.setHeader(
      'X-Payment-Required',
      Buffer.from(JSON.stringify(requirements)).toString('base64'),
    );
    return res.status(402).json({
      error: 'Payment required',
      paymentRequired: requirements,
    });
  }

  next();
}
