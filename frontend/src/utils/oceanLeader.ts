import type { AgentState } from "../types/agent";

export const OCEAN_LEADER_ID = "ocean-lead-01";

const OCEAN_DESK_POSITION: [number, number] = [44, 2];

const OCEAN_PATROL_TASKS = [
  "巡视办公室",
  "和团队同步进度",
  "检查本轮交付质量",
  "观察谁在摸鱼",
  "安排下一个冲刺任务",
];

export function getOceanPatrolTask(step = 0): string {
  return OCEAN_PATROL_TASKS[step % OCEAN_PATROL_TASKS.length];
}

export function createOceanLeaderState(
  overrides: Partial<AgentState> = {}
): AgentState {
  return {
    id: OCEAN_LEADER_ID,
    name: "Ocean",
    role: "lead",
    role_label_zh: "Boss",
    status: "thinking",
    current_task: getOceanPatrolTask(),
    progress: null,
    desk_position: OCEAN_DESK_POSITION,
    character_sprite: "char-lead",
    ...overrides,
  };
}
