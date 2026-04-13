import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { io } from "../index.js";
import { enqueueNotification } from "../jobs/notificationQueue.js";
 
const router = Router();
 
const approveSchema = z.object({
  milestoneId: z.string().min(1),
  walletAddress: z.string().min(1),
  action: z.enum(["approve", "deliver"]),
});
 
router.post("/approve", async (req, res, next) => {
  try {
    const body = approveSchema.parse(req.body);
    const wallet = body.walletAddress.toLowerCase();
 
    const milestone = await prisma.milestone.findUnique({
      where: { id: body.milestoneId },
      include: {
        project: {
          include: {
            client: true,
            freelancer: true,
          },
        },
      },
    });
 
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
 
    const { project } = milestone;
 
    if (project.status === "DISPUTED") {
      return res.status(409).json({ error: "Project is under dispute — approvals paused" });
    }
 
    const isClient = project.client.walletAddress === wallet;
    const isFreelancer = project.freelancer.walletAddress === wallet;
 
    if (!isClient && !isFreelancer) {
      return res.status(403).json({ error: 'Wallet is not a party to this project' });
    }
 
    let updateData = {};
    let notificationType = null;
    let notifyUser = null;
 
    if (body.action === "deliver" && isFreelancer) {
      if (milestone.status !== "LOCKED") {
        return res.status(409).json({ error: "Cannot deliver milestone in status: ${milestone.status}" });
      }
      updateData = { freelancerDelivered: true, status: "DELIVERED" };
      notificationType = "MILESTONE_READY";
      notifyUser = project.client;
    } else if (body.action === "approve" && isClient) {
      if (milestone.status !== "DELIVERED") {
        return res.status(409).json({ error: "Cannot approve milestone in status: ${milestone.status}" });
      }
      updateData = { clientApproved: true, status: "RELEASED" };
      notificationType = "FUNDS_RELEASED";
      notifyUser = project.freelancer;
    } else {
      return res.status(403).json({
        error: "Action" ${body.action}"not permitted for your role on this project",
      });
    }
 
    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: updateData,
    });
 
    if (updateData.status === "RELEASED") {
      const remaining = await prisma.milestone.count({
        where: {
          projectId: project.id,
          status: { not: "RELEASED" },
        },
      });
      if (remaining === 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: { status: "COMPLETED" },
        });
      }
    }
 
    io.to(`project:${project.id}`).emit("milestone:updated", {
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
        data: {
          projectId: project.id,
          milestoneIndex: milestone.milestoneIndex,
          amount: milestone.amount.toString(),
        },
      });
    }
 
    res.json({ milestone: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    next(err);
  }
});
 
export default router;
 