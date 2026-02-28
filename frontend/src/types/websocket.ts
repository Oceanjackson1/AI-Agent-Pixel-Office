import type { AgentState, AgentStatus } from "./agent";

export interface StateSnapshotEvent {
  type: "state_snapshot";
  data: {
    agents: AgentState[];
  };
}

export interface AgentStatusChangeEvent {
  type: "agent_status_change";
  data: {
    agent_id: string;
    previous_status: AgentStatus;
    status: AgentStatus;
    current_task: string | null;
  };
}

export interface AgentTaskProgressEvent {
  type: "agent_task_progress";
  data: {
    agent_id: string;
    task: string;
    progress: number;
  };
}

export interface AgentActivityEvent {
  type: "agent_activity";
  data: {
    agent_id: string;
    message: string;
    type: "info" | "warning" | "error";
  };
}

export interface PongEvent {
  type: "pong";
}

export type ServerEvent =
  | StateSnapshotEvent
  | AgentStatusChangeEvent
  | AgentTaskProgressEvent
  | AgentActivityEvent
  | PongEvent;
