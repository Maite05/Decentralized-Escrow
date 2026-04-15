import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../lib/io.js';
import { enqueueNotification } from '../jobs/notificationQueue.js';
import { x402 } from '../lib/x402.js';

const router = Router();

const registerProjectSchema = z.object({
  escrowAddress: z.string().min(1),
  clientWallet: z.string().min(1),
  freelancerWallet: z.string().min(1),
  totalAmount: z.string().min(1),
});

const addMilestoneSchema = z.object({
  milestoneIndex: z.number().int().min(0),
  description: z.string().min(1),
  amount: z.string().min(1),
});

const milestoneActionSchema = z.object({
  escrowAddress: z.string().min(1),
  milestoneIndex: z.number().int().min(0),
  walletAddress: z.string().min(1),
  action: z.enum(['approve', 'deliver']),
});

const raiseDisputeSchema = z.object({
  escrowAddress: z.string().min(1),
  milestoneIndex: z.number().int().min(0),
  raisedBy: z.string().min(1),
});

const resolveDisputeSchema = z.object({
  resolution: z.string().min(1),
  mediatorWallet: z.string().min(1),
});

router.post('/projects', async (req, res, next) => {
  try {
    const body = registerProjectSchema.parse(req.body);
    const clientWallet = body.clientWallet.toLowerCase();
    const freelancerWallet = body.freelancerWallet.toLowerCase();
    const escrowAddress = body.escrowAddress.toLowerCase();

    const [client, freelancer] = await Promise.all([
      prisma.user.upsert({
        where: { walletAddress: clientWallet },
        create: { walletAddress: clientWallet, role: 'CLIENT' },
        update: {},
      }),
      prisma.user.upsert({
        where: { walletAddress: freelancerWallet },
        create: { walletAddress: freelancerWallet, role: 'FREELANCER' },
        update: {},
      }),
    ]);

    const project = await prisma.project.upsert({
      where: { escrowAddress },
      create: {
        escrowAddress,
        clientId: client.id,
        freelancerId: freelancer.id,
        status: 'ACTIVE',
      },
      update: {},
      include: {
        client: { select: { id: true, walletAddress: true } },
        freelancer: { select: { id: true, walletAddress: true } },
      },
    });

    res.status(201).json({ project });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.post('/projects/:escrowAddress/milestones', async (req, res, next) => {
  try {
    const body = addMilestoneSchema.parse(req.body);
    const escrowAddress = req.params.escrowAddress.toLowerCase();

    const project = await prisma.project.findUnique({ where: { escrowAddress } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found — POST /projects first' });
    }

    const milestone = await prisma.milestone.upsert({
      where: {
        projectId_milestoneIndex: {
          projectId: project.id,
          milestoneIndex: body.milestoneIndex,
        },
      },
      create: {
        projectId: project.id,
        milestoneIndex: body.milestoneIndex,
        description: body.description,
        amount: body.amount,
        status: 'LOCKED',
      },
      update: {},
    });

    res.status(201).json({ milestone });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.get('/projects/:wallet', async (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return res.json({ projects: [], total: 0 });

    const projects = await prisma.project.findMany({
      where: { OR: [{ clientId: user.id }, { freelancerId: user.id }] },
      include: {
        client: { select: { id: true, walletAddress: true, email: true } },
        freelancer: { select: { id: true, walletAddress: true, email: true } },
        milestones: { orderBy: { milestoneIndex: 'asc' } },
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

router.post('/milestones/approve', async (req, res, next) => {
  try {
    const body = milestoneActionSchema.parse(req.body);
    const wallet = body.walletAddress.toLowerCase();
    const escrowAddress = body.escrowAddress.toLowerCase();

    const project = await prisma.project.findUnique({
      where: { escrowAddress },
      include: { client: true, freelancer: true },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestone = await prisma.milestone.findUnique({
      where: {
        projectId_milestoneIndex: {
          projectId: project.id,
          milestoneIndex: body.milestoneIndex,
        },
      },
    });
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (project.status === 'DISPUTED') {
      return res.status(409).json({ error: 'Project is under dispute — approvals paused' });
    }

    const isClient = project.client.walletAddress === wallet;
    const isFreelancer = project.freelancer.walletAddress === wallet;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ error: 'Wallet is not a party to this project' });
    }

    let updateData = {};
    let notificationType = null;
    let notifyUser = null;

    if (body.action === 'deliver' && isFreelancer) {
      if (milestone.status !== 'LOCKED') {
        return res.status(409).json({ error: `Cannot deliver: status is ${milestone.status}` });
      }
      updateData = { freelancerDelivered: true, status: 'DELIVERED' };
      notificationType = 'MILESTONE_READY';
      notifyUser = project.client;
    } else if (body.action === 'approve' && isClient) {
      if (milestone.status !== 'DELIVERED') {
        return res.status(409).json({ error: `Cannot approve: status is ${milestone.status}` });
      }
      updateData = { clientApproved: true, status: 'RELEASED' };
      notificationType = 'FUNDS_RELEASED';
      notifyUser = project.freelancer;
    } else {
      return res.status(403).json({ error: `Action "${body.action}" not permitted for your role` });
    }

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: updateData,
    });

    if (updateData.status === 'RELEASED') {
      const remaining = await prisma.milestone.count({
        where: { projectId: project.id, status: { not: 'RELEASED' } },
      });
      if (remaining === 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'COMPLETED' },
        });
      }
    }

    getIO().to(`project:${project.id}`).emit('milestone:updated', {
      milestoneId: updated.id,
      milestoneIndex: updated.milestoneIndex,
      status: updated.status,
      clientApproved: updated.clientApproved,
      freelancerDelivered: updated.freelancerDelivered,
      action: body.action,
      triggeredBy: wallet,
    });

    if (notificationType && notifyUser?.email) {
      await enqueueNotification({
        type: notificationType,
        to: notifyUser.email,
        data: { projectId: project.id, milestoneIndex: milestone.milestoneIndex },
      });
    }

    res.json({ milestone: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});


router.post('/disputes', async (req, res, next) => {
  try {
    const body = raiseDisputeSchema.parse(req.body);
    const escrowAddress = body.escrowAddress.toLowerCase();
    const raisedBy = body.raisedBy.toLowerCase();

    const project = await prisma.project.findUnique({ where: { escrowAddress } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const dispute = await prisma.dispute.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        milestoneIndex: body.milestoneIndex,
        raisedBy,
        status: 'OPEN',
      },
      update: { milestoneIndex: body.milestoneIndex, status: 'OPEN' },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'DISPUTED' },
    });

    getIO().to(`project:${project.id}`).emit('dispute:updated', {
      disputeId: dispute.id,
      projectId: project.id,
      status: dispute.status,
    });

    res.status(201).json({ dispute });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.get('/disputes/:escrowAddress', async (req, res, next) => {
  try {
    const escrowAddress = req.params.escrowAddress.toLowerCase();
    const project = await prisma.project.findUnique({ where: { escrowAddress } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const dispute = await prisma.dispute.findUnique({
      where: { projectId: project.id },
      include: { mediator: { select: { id: true, walletAddress: true } } },
    });

    res.json({ dispute });
  } catch (err) {
    next(err);
  }
});

router.post('/disputes/:id/resolve', async (req, res, next) => {
  try {
    const body = resolveDisputeSchema.parse(req.body);
    const mediatorWallet = body.mediatorWallet.toLowerCase();

    const mediator = await prisma.user.findUnique({
      where: { walletAddress: mediatorWallet },
    });

    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolution: body.resolution,
        mediatorId: mediator?.id,
      },
    });

    await prisma.project.update({
      where: { id: dispute.projectId },
      data: { status: 'ACTIVE' },
    });

    getIO().to(`project:${dispute.projectId}`).emit('dispute:updated', {
      disputeId: dispute.id,
      projectId: dispute.projectId,
      status: dispute.status,
      resolution: dispute.resolution,
    });

    res.json({ dispute });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});


router.get('/ai/risk/:projectId', x402, async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: req.params.projectId },
          { escrowAddress: req.params.projectId.toLowerCase() },
        ],
      },
      include: { milestones: true, dispute: true },
    });

    if (!project) {
      return res.json({
        risk: 'Unknown',
        summary: 'Project not yet registered in the off-chain index.',
        projectId: req.params.projectId,
        assessedAt: new Date().toISOString(),
      });
    }

    res.json(assessRisk(project));
  } catch (err) {
    next(err);
  }
});

function assessRisk(project) {
  const total = project.milestones.length;
  const released = project.milestones.filter((m) => m.status === 'RELEASED').length;
  const disputed = project.milestones.filter((m) => m.status === 'DISPUTED').length;
  const refunded = project.milestones.filter((m) => m.status === 'REFUNDED').length;

  let risk, summary;

  if (project.dispute?.status === 'OPEN') {
    risk = 'High';
    summary = 'An active dispute is open. Funds are locked pending mediator resolution.';
  } else if (disputed > 0 || refunded > 0) {
    risk = 'Medium';
    summary = `${disputed + refunded} milestone(s) were disputed or refunded.`;
  } else if (total === 0) {
    risk = 'Medium';
    summary = 'No milestones defined yet. Project structure is incomplete.';
  } else {
    const pct = Math.round((released / total) * 100);
    risk = 'Low';
    summary = `${released} of ${total} milestones released (${pct}% complete). No disputes detected.`;
  }

  return {
    risk,
    summary,
    projectId: project.id,
    escrowAddress: project.escrowAddress,
    assessedAt: new Date().toISOString(),
  };
}

export default router;
