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
});

const applySchema = z.object({
  freelancerWallet: z.string().min(1),
  coverLetter: z.string().min(10),
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
          include: { freelancer: { select: { walletAddress: true } } },
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
      create: { jobId: job.id, freelancerId: freelancer.id, coverLetter: body.coverLetter },
      update: { coverLetter: body.coverLetter },
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
    const { freelancerWallet, escrowAddress } = z.object({
      freelancerWallet: z.string().min(1),
      escrowAddress: z.string().min(1),
    }).parse(req.body);

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        escrowAddress: escrowAddress.toLowerCase(),
      },
    });

    res.json({ job });
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
