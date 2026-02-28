import { useEffect, useRef } from "react";
import { useAgentStore } from "./useAgentStore";
import type { ServerEvent } from "../types/websocket";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/office";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;
    const { setAllAgents, updateAgentStatus, updateAgentProgress } =
      useAgentStore.getState();

    function handleMessage(event: MessageEvent) {
      try {
        const msg: ServerEvent = JSON.parse(event.data);
        switch (msg.type) {
          case "state_snapshot":
            setAllAgents(msg.data.agents);
            break;
          case "agent_status_change":
            updateAgentStatus(
              msg.data.agent_id,
              msg.data.status,
              msg.data.current_task
            );
            break;
          case "agent_task_progress":
            updateAgentProgress(msg.data.agent_id, msg.data.progress);
            break;
        }
      } catch {
        // Ignore parse errors
      }
    }

    function connect() {
      if (disposed) return;

      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("[WS] Connected to office server");
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        if (disposed) return;
        console.log(
          `[WS] Disconnected. Reconnecting in ${reconnectDelayRef.current}ms...`
        );
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            30000
          );
          connect();
        }, reconnectDelayRef.current);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []); // Stable — no dependencies, runs once

  return wsRef;
}
