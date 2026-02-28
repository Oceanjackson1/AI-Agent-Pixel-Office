import { create } from "zustand";
import type { AgentState, AgentStatus } from "../types/agent";

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

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {},

  setAllAgents: (agents) => {
    const record: Record<string, AgentState> = {};
    for (const agent of agents) {
      record[agent.id] = agent;
    }
    set({ agents: record });
  },

  updateAgentStatus: (agentId, status, currentTask) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
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
        [agent.id]: {
          ...(state.agents[agent.id] || {}),
          ...agent,
        },
      },
    }));
  },

  getAgentList: () => Object.values(get().agents),
}));

