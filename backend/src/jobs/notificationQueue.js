/**
 * Notification queue backed by BullMQ + Redis.
 *
 * Required env vars:
 *   REDIS_HOST  — Redis hostname (default: localhost)
 *   REDIS_PORT  — Redis port     (default: 6379)
 *   REDIS_PASS  — Redis password (optional)
 *
 * Falls back to an in-memory queue when Redis is unavailable so the
 * backend can still run in development without a Redis instance.
 */

import { Queue, Worker } from 'bullmq';

const QUEUE_NAME = 'notifications';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASS ?? undefined,
  maxRetriesPerRequest: null,
};

// ── BullMQ Queue ──────────────────────────────────────────────────────────────

let queue = null;
let worker = null;
let usingInMemoryFallback = false;

function createQueue() {
  try {
    queue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        await deliver(job.data);
      },
      { connection: redisConnection, concurrency: 5 }
    );

    worker.on('completed', (job) => {
      console.log(`[NotificationQueue] Job ${job.id} (${job.data.type}) completed.`);
    });

    worker.on('failed', (job, err) => {
      console.error(
        `[NotificationQueue] Job ${job?.id} (${job?.data?.type}) failed: ${err.message}`
      );
    });

    queue.on('error', (err) => {
      console.error('[NotificationQueue] Queue error:', err.message);
    });

    console.log('[NotificationQueue] BullMQ queue connected to Redis.');
  } catch (err) {
    console.warn(
      '[NotificationQueue] Redis unavailable — falling back to in-memory queue.',
      err.message
    );
    enableInMemoryFallback();
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────────

const memQueue = [];
let processing = false;

function enableInMemoryFallback() {
  usingInMemoryFallback = true;
  queue = null;
  worker = null;
}

async function processMemQueue() {
  if (processing) return;
  processing = true;
  while (memQueue.length > 0) {
    const job = memQueue.shift();
    try {
      await deliver(job);
    } catch (err) {
      console.error(
        `[NotificationQueue] Failed ${job.type} → ${job.to}: ${err.message}`
      );
    }
  }
  processing = false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enqueue a notification job.
 * @param {{ type: string, to: string, data: object }} job
 */
export async function enqueueNotification(job) {
  if (usingInMemoryFallback) {
    memQueue.push(job);
    processMemQueue().catch((err) =>
      console.error('[NotificationQueue] Error:', err)
    );
    return;
  }

  if (!queue) createQueue();

  await queue.add(job.type, job, {
    jobId: `${job.type}-${job.to}-${Date.now()}`,
  });
}

/**
 * Gracefully close the queue and worker (call on server shutdown).
 */
export async function closeNotificationQueue() {
  await worker?.close();
  await queue?.close();
}

// ── Delivery ──────────────────────────────────────────────────────────────────

async function deliver({ type, to, data }) {
  // Swap in Resend / SendGrid / OneSignal here for production.
  console.log(`[Notification] ${type} → ${to}`, JSON.stringify(data));
}

// Initialise on module load.
createQueue();
