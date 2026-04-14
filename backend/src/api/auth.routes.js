import { Router } from 'express';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { prisma } from '../lib/prisma.js';

const router = Router();

const verifySchema = z.object({
  walletAddress: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * POST /auth/verify
 * Verifies an EIP-191 personal_sign signature.
 * The frontend signs a challenge message and sends the signature here.
 * Returns the user record (creates it if it doesn't exist).
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { walletAddress, message, signature } = verifySchema.parse(req.body);
    const address = walletAddress.toLowerCase();

    const valid = await verifyMessage({
      address: address,
      message,
      signature,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      create: { walletAddress: address },
      update: {},
    });

    res.json({ user, verified: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

export default router;
