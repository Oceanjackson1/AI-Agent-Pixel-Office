import { useEffect } from "react";
import { useAgentStore } from "./useAgentStore";
import {
  createOceanLeaderState,
  getOceanPatrolTask,
  OCEAN_LEADER_ID,
} from "../utils/oceanLeader";

const PATROL_REFRESH_MS = 2400;

export function useOceanLeader() {
  useEffect(() => {
    let step = 0;

    const refreshLeader = () => {
      const store = useAgentStore.getState();
      const current = store.agents[OCEAN_LEADER_ID];

      store.upsertAgent(
        createOceanLeaderState({
          ...current,
          current_task: getOceanPatrolTask(step),
        })
      );

      step += 1;
    };

    refreshLeader();
    const timerId = window.setInterval(refreshLeader, PATROL_REFRESH_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);
}
