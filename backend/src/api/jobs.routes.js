import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../lib/io.js';

const router = Router();

const createJobSchema = z.object({
  clientWallet: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  budget: z.string().min(1),
  skills: z.array(z.string()).default([]),
  deadline: z.string().datetime().optional(),
});

const applySchema = z.object({
  freelancerWallet: z.string().min(1),
  coverLetter: z.string().min(10),
  proposedMilestones: z.array(z.object({
    description: z.string().min(1),
    amount: z.string().min(1),
    dueDate: z.string().optional(),
  })).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { skills, search } = req.query;

    const where = { status: 'OPEN' };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { walletAddress: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = skills
      ? jobs.filter((j) =>
          String(skills)
            .split(',')
            .every((s) => j.skills.includes(s.trim()))
        )
      : jobs;

    res.json({ jobs: filtered, total: filtered.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { walletAddress: true } },
        applications: {
          include: {
            freelancer: { select: { walletAddress: true, bio: true, skills: true, portfolioUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = createJobSchema.parse(req.body);
    const wallet = body.clientWallet.toLowerCase();

    const client = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet, role: 'CLIENT' },
      update: {},
    });

    const job = await prisma.job.create({
      data: {
        clientId: client.id,
        title: body.title,
        description: body.description,
        budget: body.budget,
        skills: body.skills,
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
      include: {
        client: { select: { walletAddress: true } },
        _count: { select: { applications: true } },
      },
    });

    getIO().emit('job:created', { jobId: job.id, title: job.title });
    res.status(201).json({ job });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.post('/:id/apply', async (req, res, next) => {
  try {
    const body = applySchema.parse(req.body);
    const wallet = body.freelancerWallet.toLowerCase();

    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'OPEN') {
      return res.status(409).json({ error: 'Job is no longer accepting applications' });
    }

    const freelancer = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet, role: 'FREELANCER' },
      update: {},
    });

    const application = await prisma.application.upsert({
      where: { jobId_freelancerId: { jobId: job.id, freelancerId: freelancer.id } },
      create: {
        jobId: job.id,
        freelancerId: freelancer.id,
        coverLetter: body.coverLetter,
        proposedMilestones: body.proposedMilestones ?? undefined,
      },
      update: {
        coverLetter: body.coverLetter,
        proposedMilestones: body.proposedMilestones ?? undefined,
      },
    });

    res.status(201).json({ application });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.post('/:id/hire', async (req, res, next) => {
  try {
    const { freelancerWallet, escrowAddress, deadline } = z.object({
      freelancerWallet: z.string().min(1),
      escrowAddress: z.string().min(1),
      deadline: z.string().datetime().optional(),
    }).parse(req.body);

    const wallet = freelancerWallet.toLowerCase();

    // Mark the hired application as HIRED, others as REJECTED.
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        applications: { include: { freelancer: true } },
      },
    });

    if (job) {
      const hiredApp = job.applications.find(
        (a) => a.freelancer.walletAddress === wallet,
      );
      if (hiredApp) {
        await prisma.application.update({
          where: { id: hiredApp.id },
          data: { status: 'HIRED' },
        });
        // Reject all other open applications.
        await prisma.application.updateMany({
          where: {
            jobId: req.params.id,
            id: { not: hiredApp.id },
            status: { in: ['PENDING', 'SHORTLISTED', 'INTERVIEWING'] },
          },
          data: { status: 'REJECTED' },
        });
      }
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        escrowAddress: escrowAddress.toLowerCase(),
        deadline: deadline ? new Date(deadline) : undefined,
      },
    });

    res.json({ job: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

/**
 * PATCH /jobs/:id/applications/:appId
 * Shortlist or reject a specific application.
 * Body: { status: 'SHORTLISTED' | 'REJECTED', clientWallet: string }
 */
router.patch('/:id/applications/:appId', async (req, res, next) => {
  try {
    const { status, clientWallet, interviewNote } = z.object({
      status: z.enum(['SHORTLISTED', 'INTERVIEWING', 'REJECTED']),
      clientWallet: z.string().min(1),
      interviewNote: z.string().optional(),
    }).parse(req.body);

    const wallet = clientWallet.toLowerCase();
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.client.walletAddress !== wallet) {
      return res.status(403).json({ error: 'Only the client can manage applications' });
    }

    // Limit shortlisted to 3.
    if (status === 'SHORTLISTED') {
      const shortlisted = await prisma.application.count({
        where: { jobId: req.params.id, status: { in: ['SHORTLISTED', 'INTERVIEWING'] } },
      });
      if (shortlisted >= 3) {
        return res.status(409).json({ error: 'Maximum 3 candidates can be shortlisted' });
      }
    }

    const application = await prisma.application.update({
      where: { id: req.params.appId },
      data: { status, ...(interviewNote !== undefined ? { interviewNote } : {}) },
      include: { freelancer: { select: { walletAddress: true } } },
    });

    getIO().to(`job:${req.params.id}`).emit('application:updated', {
      applicationId: application.id,
      status: application.status,
      freelancerWallet: application.freelancer.walletAddress,
    });

    res.json({ application });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { clientWallet } = z.object({ clientWallet: z.string().min(1) }).parse(req.body);
    const wallet = clientWallet.toLowerCase();

    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.client.walletAddress !== wallet) {
      return res.status(403).json({ error: 'Only the client who posted this job can close it' });
    }

    await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

export default router;
