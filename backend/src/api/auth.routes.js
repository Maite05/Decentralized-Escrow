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
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { walletAddress, message, signature } = verifySchema.parse(req.body);
    const address = walletAddress.toLowerCase();

    const valid = await verifyMessage({ address, message, signature });
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

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
  bio: z.string().max(1000).optional(),
  displayName: z.string().max(60).optional(),
  tagline: z.string().max(120).optional(),
  skills: z.array(z.string().max(40)).max(20).optional(),
  portfolioUrl: z.string().url().max(300).optional().or(z.literal('')),
  email: z.string().email().max(200).optional().or(z.literal('')),
  hourlyRate: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']).optional(),
});

const profileSelectPublic = {
  id: true,
  walletAddress: true,
  role: true,
  displayName: true,
  tagline: true,
  bio: true,
  skills: true,
  portfolioUrl: true,
  hourlyRate: true,
  availability: true,
  rating: true,
  completedProjects: true,
  totalEarned: true,
  createdAt: true,
  portfolioItems: { orderBy: { createdAt: 'desc' } },
  _count: { select: { freelancerProjects: true, applications: true } },
};

/**
 * GET /auth/profiles
 * List all freelancer profiles (for talent marketplace).
 */
router.get('/profiles', async (req, res, next) => {
  try {
    const { skill, availability, search } = req.query;

    const where = { role: 'FREELANCER' };

    if (availability) where.availability = availability;
    if (skill) where.skills = { has: String(skill) };
    if (search) {
      where.OR = [
        { displayName: { contains: String(search), mode: 'insensitive' } },
        { tagline: { contains: String(search), mode: 'insensitive' } },
        { bio: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: profileSelectPublic,
      orderBy: [{ completedProjects: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ profiles: users, total: users.length });
  } catch (err) {
    next(err);
  }
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
      select: profileSelectPublic,
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
 */
router.patch('/profile/:address', async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const body = profileSchema.parse(req.body);

    const updateData = {};
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.displayName !== undefined) updateData.displayName = body.displayName || null;
    if (body.tagline !== undefined) updateData.tagline = body.tagline || null;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.portfolioUrl !== undefined) updateData.portfolioUrl = body.portfolioUrl || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.hourlyRate !== undefined) updateData.hourlyRate = body.hourlyRate || null;
    if (body.availability !== undefined) updateData.availability = body.availability;

    const user = await prisma.user.upsert({
      where: { walletAddress: address },
      create: { walletAddress: address, role: 'FREELANCER', ...updateData },
      update: updateData,
      select: profileSelectPublic,
    });

    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// ── Portfolio Items ────────────────────────────────────────────────────────────

const portfolioItemSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  projectUrl: z.string().url().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().max(40)).max(10).default([]),
});

/**
 * POST /auth/profile/:address/portfolio
 * Add a portfolio item to a freelancer's profile.
 */
router.post('/profile/:address/portfolio', async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const body = portfolioItemSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { walletAddress: address } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const item = await prisma.portfolioItem.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        projectUrl: body.projectUrl || null,
        tags: body.tags,
      },
    });

    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

/**
 * DELETE /auth/profile/:address/portfolio/:itemId
 * Remove a portfolio item.
 */
router.delete('/profile/:address/portfolio/:itemId', async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const user = await prisma.user.findUnique({ where: { walletAddress: address } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.portfolioItem.deleteMany({
      where: { id: req.params.itemId, userId: user.id },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
