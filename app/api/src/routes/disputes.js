import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { io } from '../index.js';
import { enqueueNotification } from '../jobs/notificationQueue.js';

const router = Router();

const createDisputeSchema = z.object({
  projectId: z.string().min(1),
  walletAdress: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  evidenceUrls: z.array(z.string().url()).default([]),
});

const resolveDisputeSchema = z.object({
  mediatorWallet: z.string().min(1),
  resolution: z.string().min(10, 'Resolution must be at least 10 characters'),
  winner: z.enum(['client', 'freelancer', 'split']),
});

// POST / — raise a dispute
router.post('/', async (req, res, next) => {
  try {
    const body = createDisputeSchema.parse(req.body);
    const wallet = body.walletAdress.toLowerCase();

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: { client: true, freelancer: true, dispute: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isParty =
      project.client.walletAddress === wallet ||
      project.freelancer.walletAddress === wallet;

    if (!isParty) {
      return res
        .status(403)
        .json({ error: 'Only project parties can raise a dispute' });
    }

    if (project.dispute && project.dispute.status === 'OPEN') {
      return res
        .status(409)
        .json({ error: 'An open dispute already exists for this project' });
    }

    if (project.status === 'COMPLETED') {
      return res
        .status(409)
        .json({ error: 'Cannot dispute a completed project' });
    }

    const [dispute] = await prisma.$transaction([
      prisma.dispute.upsert({
        where: { projectId: body.projectId },
        create: {
          projectId: body.projectId,
          reason: body.reason,
          evidenceUrls: body.evidenceUrls,
          status: 'OPEN',
        },
        update: {
          reason: body.reason,
          evidenceUrls: body.evidenceUrls,
          status: 'OPEN',
          resolution: null,
          mediatorId: null,
        },
      }),
      prisma.project.update({
        where: { id: body.projectId },
        data: { status: 'DISPUTED' },
      }),
      prisma.milestone.updateMany({
        where: {
          projectId: body.projectId,
          status: { in: ['LOCKED', 'DELIVERED'] },
        },
        data: { status: 'DISPUTED' },
      }),
    ]);

    const notifyTargets = [project.client, project.freelancer].filter(
      (u) => u.walletAddress !== wallet && u.email
    );
    await Promise.all(
      notifyTargets.map((u) =>
        enqueueNotification({
          type: 'DISPUTE_RAISED',
          to: u.email,
          data: { projectId: body.projectId, reason: body.reason },
        })
      )
    );

    io.to(`project:${body.projectId}`).emit('dispute:created', {
      projectId: body.projectId,
      disputeId: dispute.id,
      reason: body.reason,
      raisedBy: wallet,
    });

    res.status(201).json({ dispute });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// GET /:projectId — fetch dispute for a project
router.get('/:projectId', async (req, res, next) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { projectId: req.params.projectId },
      include: {
        project: {
          include: {
            client: { select: { id: true, walletAddress: true, email: true } },
            freelancer: {
              select: { id: true, walletAddress: true, email: true },
            },
            milestones: { orderBy: { milestoneIndex: 'asc' } },
          },
        },
        mediator: { select: { id: true, walletAddress: true, email: true } },
      },
    });

    if (!dispute) {
      return res
        .status(404)
        .json({ error: 'No dispute found for this project' });
    }

    res.json({ dispute });
  } catch (err) {
    next(err);
  }
});

// POST /:id/resolve — mediator resolves a dispute
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const body = resolveDisputeSchema.parse(req.body);
    const mediatorWallet = body.mediatorWallet.toLowerCase();

    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: { client: true, freelancer: true },
        },
      },
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status === 'RESOLVED') {
      return res.status(409).json({ error: 'Dispute is already resolved' });
    }

    const mediator = await prisma.user.findFirst({
      where: { walletAddress: mediatorWallet, role: 'MEDIATOR' },
    });

    if (!mediator) {
      return res
        .status(403)
        .json({ error: 'Wallet is not a registered mediator' });
    }

    let milestoneStatus = null;
    if (body.winner === 'client') {
      milestoneStatus = 'REFUNDED';
    } else if (body.winner === 'freelancer') {
      milestoneStatus = 'RELEASED';
    }
    // 'split' leaves milestoneStatus null — handled manually outside this route

    const updates = [
      prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: body.resolution,
          mediatorId: mediator.id,
        },
      }),
      prisma.project.update({
        where: { id: dispute.projectId },
        data: { status: body.winner === 'split' ? 'DISPUTED' : 'COMPLETED' },
      }),
    ];

    if (milestoneStatus) {
      updates.push(
        prisma.milestone.updateMany({
          where: { projectId: dispute.projectId, status: 'DISPUTED' },
          data: { status: milestoneStatus },
        })
      );
    }

    const [resolvedDispute] = await prisma.$transaction(updates);

    const { client, freelancer } = dispute.project;
    await Promise.all(
      [client, freelancer]
        .filter((u) => u.email)
        .map((u) =>
          enqueueNotification({
            type: 'DISPUTE_RESOLVED',
            to: u.email,
            data: {
              projectId: dispute.projectId,
              resolution: body.resolution,
              winner: body.winner,
            },
          })
        )
    );

    io.to(`project:${dispute.projectId}`).emit('dispute:resolved', {
      disputeId: dispute.id,
      projectId: dispute.projectId,
      resolution: body.resolution,
      winner: body.winner,
      mediator: mediatorWallet,
    });

    res.json({ dispute: resolvedDispute });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

export default router;
