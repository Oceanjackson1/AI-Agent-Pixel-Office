export type AgentRole =
  | "frontend"
  | "backend"
  | "design"
  | "product"
  | "qa"
  | "devops"
  | "data"
  | "lead";

export type AgentStatus =
  | "working"
  | "idle"
  | "thinking"
  | "sleeping"
  | "offline";

export interface AgentState {
  id: string;
  name: string;
  role: AgentRole;
  role_label_zh: string;
  status: AgentStatus;
  current_task: string | null;
  progress: number | null;
  desk_position: [number, number];
  character_sprite: string;
}
