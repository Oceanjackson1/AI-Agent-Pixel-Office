import { useEffect, useRef } from "react";
import { useAgentStore } from "./useAgentStore";
import { supabase, isSupabaseMode } from "../utils/supabaseClient";
import type { ServerEvent } from "../types/websocket";
import type { AgentState } from "../types/agent";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/office";

// ---------------------------------------------------------------------------
// Desk position allocation (mirrors backend logic for Supabase-only mode)
// ---------------------------------------------------------------------------
const DESK_POSITIONS: [number, number][] = [
  // Row 1 (y=4): 6 desks
  [3, 4], [10, 4], [17, 4], [24, 4], [31, 4], [38, 4],
  // Row 2 (y=10): 6 desks
  [3, 10], [10, 10], [17, 10], [24, 10], [31, 10], [38, 10],
  // Row 3 (y=16): 6 desks
  [3, 16], [10, 16], [17, 16], [24, 16], [31, 16], [38, 16],
];

function getDeskPosition(index: number): [number, number] {
  if (index < DESK_POSITIONS.length) return DESK_POSITIONS[index];
  // Overflow: share desks with a +1 x-offset (second seat)
  const baseIndex = (index - DESK_POSITIONS.length) % DESK_POSITIONS.length;
  const base = DESK_POSITIONS[baseIndex];
  return [base[0] + 1, base[1]];
}

// Default character sprites for auto-generated positions
const SPRITES = [
  "char-red", "char-blue", "char-green",
  "char-yellow", "char-orange", "char-lead",
];

// ---------------------------------------------------------------------------
// Supabase row → AgentState mapper
// ---------------------------------------------------------------------------
function rowToAgentState(
  row: Record<string, unknown>,
  index: number
): AgentState {
  return {
    id: row.id as string,
    name: (row.name as string) || `Agent-${row.id}`,
    role: (row.role as AgentState["role"]) || "backend",
    role_label_zh: (row.role_label_zh as string) || "员工",
    status: (row.status as AgentState["status"]) || "idle",
    current_task: (row.current_task as string) || null,
    progress: row.progress != null ? Number(row.progress) : null,
    desk_position:
      (row.desk_position as [number, number]) || getDeskPosition(index),
    character_sprite:
      (row.character_sprite as string) || SPRITES[index % SPRITES.length],
  };
}

// ---------------------------------------------------------------------------
// Hook — works in two modes depending on env vars
// ---------------------------------------------------------------------------
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;
    const { setAllAgents, updateAgentStatus, updateAgentProgress, upsertAgent } =
      useAgentStore.getState();

    // ───────────────────────────────────────────────
    // MODE A: Supabase Realtime (Vercel / cloud)
    // ───────────────────────────────────────────────
    if (isSupabaseMode && supabase) {
      console.log("[Supabase] Cloud mode — connecting to Supabase Realtime");

      // 1. Initial fetch — load all existing agents from the DB
      supabase
        .from("agents")
        .select("*")
        .then(({ data, error }) => {
          if (disposed) return;
          if (error) {
            console.error("[Supabase] Initial fetch error:", error);
            return;
          }
          if (data && data.length > 0) {
            const agents = data.map((row, i) => rowToAgentState(row, i));
            setAllAgents(agents);
          }
        });

      // 2. Subscribe to live changes (INSERT / UPDATE)
      const channel = supabase
        .channel("agents-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agents" },
          (payload) => {
            if (disposed) return;
            const row = payload.new as Record<string, unknown>;
            if (!row || !row.id) return;

            // Determine an index for desk position
            const currentAgents = useAgentStore.getState().agents;
            const existingIndex = Object.keys(currentAgents).indexOf(
              row.id as string
            );
            const idx =
              existingIndex >= 0
                ? existingIndex
                : Object.keys(currentAgents).length;

            const agent = rowToAgentState(row, idx);
            upsertAgent(agent);
          }
        )
        .subscribe((status) => {
          console.log("[Supabase] Realtime subscription status:", status);
        });

      return () => {
        disposed = true;
        supabase!.removeChannel(channel);
      };
    }

    // ───────────────────────────────────────────────
    // MODE B: Native WebSocket (local FastAPI dev)
    // ───────────────────────────────────────────────
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
