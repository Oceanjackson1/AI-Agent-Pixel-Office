import { create } from "zustand";
import type { AgentState, AgentStatus } from "../types/agent";
import {
  createOceanLeaderState,
  OCEAN_LEADER_ID,
} from "../utils/oceanLeader";

interface AgentStore {
  agents: Record<string, AgentState>;
  setAllAgents: (agents: AgentState[]) => void;
  updateAgentStatus: (
    agentId: string,
    status: AgentStatus,
    currentTask: string | null
  ) => void;
  updateAgentProgress: (agentId: string, progress: number) => void;
  upsertAgent: (agent: AgentState) => void;
  getAgentList: () => AgentState[];
}

function normalizeOceanLeader(agent?: Partial<AgentState>): AgentState {
  return createOceanLeaderState({
    ...agent,
    status: "thinking",
    progress: null,
    current_task: agent?.current_task || createOceanLeaderState().current_task,
  });
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {
    [OCEAN_LEADER_ID]: createOceanLeaderState(),
  },

  setAllAgents: (agents) => {
    set((state) => {
      const record: Record<string, AgentState> = {};
      for (const agent of agents) {
        record[agent.id] =
          agent.id === OCEAN_LEADER_ID ? normalizeOceanLeader(agent) : agent;
      }

      record[OCEAN_LEADER_ID] = normalizeOceanLeader(
        record[OCEAN_LEADER_ID] || state.agents[OCEAN_LEADER_ID]
      );

      return { agents: record };
    });
  },

  updateAgentStatus: (agentId, status, currentTask) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent && agentId !== OCEAN_LEADER_ID) return state;

      if (agentId === OCEAN_LEADER_ID) {
        return {
          agents: {
            ...state.agents,
            [OCEAN_LEADER_ID]: normalizeOceanLeader({
              ...state.agents[OCEAN_LEADER_ID],
              current_task: currentTask || state.agents[OCEAN_LEADER_ID]?.current_task,
            }),
          },
        };
      }

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            status,
            current_task: currentTask,
          },
        },
      };
    });
  },

  updateAgentProgress: (agentId, progress) => {
    set((state) => {
      if (agentId === OCEAN_LEADER_ID) {
        return state;
      }

      const agent = state.agents[agentId];
      if (!agent) return state;
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, progress },
        },
      };
    });
  },

  upsertAgent: (agent) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agent.id]:
          agent.id === OCEAN_LEADER_ID
            ? normalizeOceanLeader({
                ...(state.agents[agent.id] || {}),
                ...agent,
              })
            : {
                ...(state.agents[agent.id] || {}),
                ...agent,
              },
      },
    }));
  },

  getAgentList: () => Object.values(get().agents),
}));
