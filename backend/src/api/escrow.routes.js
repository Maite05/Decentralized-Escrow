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

/**
 * POST /escrow/projects/:escrowAddress/accept
 * Freelancer confirms they accept the escrow terms and are ready to start work.
 */
router.post('/projects/:escrowAddress/accept', async (req, res, next) => {
  try {
    const { freelancerWallet } = z.object({
      freelancerWallet: z.string().min(1),
    }).parse(req.body);

    const escrowAddress = req.params.escrowAddress.toLowerCase();
    const wallet = freelancerWallet.toLowerCase();

    const project = await prisma.project.findUnique({
      where: { escrowAddress },
      include: { freelancer: true },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.freelancer.walletAddress !== wallet) {
      return res.status(403).json({ error: 'Only the assigned freelancer can accept this escrow' });
    }

    const updated = await prisma.project.update({
      where: { escrowAddress },
      data: { freelancerAccepted: true },
    });

    getIO().to(`escrow:${escrowAddress}`).emit('project:accepted', {
      escrowAddress,
      freelancerWallet: wallet,
    });

    res.json({ project: updated });
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


router.get('/dashboard/:wallet', async (req, res, next) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });

    if (!user) {
      return res.json({
        totalLockedUSDC: '0.00',
        activeCount: 0,
        completedCount: 0,
        disputedCount: 0,
        asClientTotal: 0,
        asFreelancerTotal: 0,
        recentActivity: [],
        projects: [],
      });
    }

    const projects = await prisma.project.findMany({
      where: { OR: [{ clientId: user.id }, { freelancerId: user.id }] },
      include: {
        client: { select: { id: true, walletAddress: true } },
        freelancer: { select: { id: true, walletAddress: true } },
        milestones: { orderBy: { milestoneIndex: 'asc' } },
        dispute: true,
        _count: { select: { milestones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute totalAmount from milestones if not stored on the project
    projects.forEach((p) => {
      if (!p.totalAmount && p.milestones.length > 0) {
        p.totalAmount = p.milestones
          .reduce((s, m) => s + parseFloat(m.amount || '0'), 0)
          .toFixed(2);
      }
    });

    const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
    const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
    const disputedCount = projects.filter((p) => p.status === 'DISPUTED').length;
    const asClientTotal = projects.filter((p) => p.clientId === user.id).length;
    const asFreelancerTotal = projects.filter((p) => p.freelancerId === user.id).length;

    const lockedMilestones = projects.flatMap((p) =>
      p.milestones.filter((m) => m.status === 'LOCKED' || m.status === 'DELIVERED'),
    );
    const totalLockedUSDC = lockedMilestones
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0)
      .toFixed(2);

    // Build recent activity from milestone state changes
    const recentActivity = projects
      .flatMap((p) =>
        p.milestones
          .filter((m) => m.status !== 'LOCKED')
          .map((m) => ({
            type:
              m.status === 'RELEASED'
                ? 'MILESTONE_RELEASED'
                : m.status === 'DELIVERED'
                ? 'MILESTONE_DELIVERED'
                : m.status === 'DISPUTED'
                ? 'DISPUTE_RAISED'
                : 'MILESTONE_DELIVERED',
            projectId: p.id,
            escrowAddress: p.escrowAddress,
            description: `Milestone #${m.milestoneIndex + 1} ${m.status.toLowerCase()} on ${p.escrowAddress.slice(0, 6)}…${p.escrowAddress.slice(-4)}`,
            timestamp: m.updatedAt || m.createdAt,
            txHash: null,
          })),
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({
      totalLockedUSDC,
      activeCount,
      completedCount,
      disputedCount,
      asClientTotal,
      asFreelancerTotal,
      recentActivity,
      projects,
    });
  } catch (err) {
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
  const delivered = project.milestones.filter((m) => m.status === 'DELIVERED').length;
  const disputed = project.milestones.filter((m) => m.status === 'DISPUTED').length;
  const refunded = project.milestones.filter((m) => m.status === 'REFUNDED').length;

  const signals = [];
  let score = 20; // baseline low-risk

  if (project.dispute?.status === 'OPEN') {
    score += 55;
    signals.push({ type: 'ACTIVE_DISPUTE', confidence: 98, description: 'An active dispute is open — funds locked pending mediator.' });
  }
  if (disputed > 0) {
    score += disputed * 15;
    signals.push({ type: 'PAST_DISPUTE', confidence: 85, description: `${disputed} milestone(s) previously raised a dispute.` });
  }
  if (refunded > 0) {
    score += refunded * 10;
    signals.push({ type: 'REFUNDED', confidence: 75, description: `${refunded} milestone(s) were refunded to the client.` });
  }
  if (total === 0) {
    score += 25;
    signals.push({ type: 'NO_MILESTONES', confidence: 90, description: 'No milestones defined — project structure is incomplete.' });
  }
  if (delivered > 0) {
    signals.push({ type: 'AWAITING_APPROVAL', confidence: 70, description: `${delivered} milestone(s) delivered and awaiting client approval.` });
  }
  if (total > 0 && released === total) {
    score = Math.max(score - 10, 5);
    signals.push({ type: 'ALL_RELEASED', confidence: 99, description: 'All milestones successfully released — contract fulfilled.' });
  }

  score = Math.min(score, 100);

  let suggestion;
  if (score >= 70) {
    suggestion = 'Immediate mediator intervention recommended. Review dispute evidence before releasing funds.';
  } else if (score >= 40) {
    suggestion = 'Monitor closely. Ensure deliverables meet spec before approving the next milestone.';
  } else {
    suggestion = 'Project is progressing normally. Continue milestone reviews on schedule.';
  }

  return {
    score,
    signals,
    suggestion,
    projectId: project.id,
    escrowAddress: project.escrowAddress,
    assessedAt: new Date().toISOString(),
  };
}

export default router;
