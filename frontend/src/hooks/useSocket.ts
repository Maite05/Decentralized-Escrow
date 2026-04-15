import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface MilestoneUpdatedEvent {
  milestoneId: string;
  milestoneIndex: number;
  status: string;
  clientApproved: boolean;
  freelancerDelivered: boolean;
  action: string;
  triggeredBy: string;
}

export interface DisputeUpdatedEvent {
  disputeId: string;
  projectId: string;
  status: string;
  resolution?: string;
}

/**
 * Opens a Socket.io connection and joins the given project room.
 * Returns the latest real-time events received for that project.
 *
 * The socket is disconnected when the component unmounts or projectId changes.
 */
export function useSocket(projectId: string | null | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [milestoneEvent, setMilestoneEvent] =
    useState<MilestoneUpdatedEvent | null>(null);
  const [disputeEvent, setDisputeEvent] =
    useState<DisputeUpdatedEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:project", projectId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("milestone:updated", (data: MilestoneUpdatedEvent) => {
      setMilestoneEvent(data);
    });

    socket.on("dispute:updated", (data: DisputeUpdatedEvent) => {
      setDisputeEvent(data);
    });

    return () => {
      socket.emit("leave:project", projectId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [projectId]);

  return { connected, milestoneEvent, disputeEvent };
}
