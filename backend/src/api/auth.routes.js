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

const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  skills: z.array(z.string().max(40)).max(20).optional(),
  portfolioUrl: z.string().url().max(300).optional().or(z.literal('')),
  email: z.string().email().max(200).optional().or(z.literal('')),
});

/**
 * GET /auth/profile/:address
 * Returns public profile data for any wallet address.
 */
router.get('/profile/:address', async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        bio: true,
        skills: true,
        portfolioUrl: true,
        createdAt: true,
        _count: { select: { freelancerProjects: true, applications: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /auth/profile/:address
 * Updates the freelancer profile for the given wallet.
 * No auth guard for the hackathon — production should verify a signature.
 */
router.patch('/profile/:address', async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const body = profileSchema.parse(req.body);

    const updateData = {};
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.portfolioUrl !== undefined) updateData.portfolioUrl = body.portfolioUrl || null;
    if (body.email !== undefined) updateData.email = body.email || null;

    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      create: { walletAddress: address, role: 'FREELANCER', ...updateData },
      update: updateData,
    });

    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

export default router;
