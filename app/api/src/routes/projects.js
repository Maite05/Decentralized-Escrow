import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /:wallet — all projects for a wallet address (client or freelancer)
router.get('/:wallet', async (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return res.json({ projects: [] });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [{ clientId: user.id }, { freelancerId: user.id }],
      },
      include: {
        client: {
          select: { id: true, walletAddress: true, email: true, role: true },
        },
        freelancer: {
          select: { id: true, walletAddress: true, email: true, role: true },
        },
        milestones: {
          orderBy: { milestoneIndex: 'asc' },
        },
        dispute: true,
        _count: { select: { milestones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects, total: projects.length });
  } catch (err) {
    next(err);
  }
});

// GET /:id/detail — full project detail with stats
router.get('/:id/detail', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: { id: true, walletAddress: true, email: true, role: true },
        },
        freelancer: {
          select: { id: true, walletAddress: true, email: true, role: true },
        },
        milestones: { orderBy: { milestoneIndex: 'asc' } },
        dispute: {
          include: {
            mediator: {
              select: { id: true, walletAddress: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = {
      totalMilestones: project.milestones.length,
      releasedMilestones: project.milestones.filter(
        (m) => m.status === 'RELEASED'
      ).length,
      totalReleased: project.milestones
        .filter((m) => m.status === 'RELEASED')
        .reduce((sum, m) => sum + Number(m.amount), 0),
      pendingAmount: project.milestones
        .filter((m) => m.status !== 'RELEASED' && m.status !== 'REFUNDED')
        .reduce((sum, m) => sum + Number(m.amount), 0),
    };

    res.json({ project, stats });
  } catch (err) {
    next(err);
  }
});

export default router;
