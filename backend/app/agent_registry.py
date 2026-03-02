from datetime import datetime
from typing import Optional
from .models import AgentConfig, AgentState, AgentStatus, HeartbeatPayload, AgentRole
from .config import AGENTS


class AgentRegistry:
    def __init__(self):
        self._agents: dict[str, AgentState] = {}
        self._init_from_config()

    def _init_from_config(self):
        for cfg in AGENTS:
            self._agents[cfg.id] = AgentState(
                id=cfg.id,
                name=cfg.name,
                role=cfg.role,
                role_label_zh=cfg.role_label_zh,
                status=AgentStatus.SLEEPING,
                desk_position=cfg.desk_position,
                character_sprite=cfg.character_sprite,
            )

    _DESK_GRID: list[tuple[int, int]] = [
        # Row 1 (y=4): 6 desks
        (3, 4), (10, 4), (17, 4), (24, 4), (31, 4), (38, 4),
        # Row 2 (y=10): 6 desks
        (3, 10), (10, 10), (17, 10), (24, 10), (31, 10), (38, 10),
        # Row 3 (y=16): 6 desks
        (3, 16), (10, 16), (17, 16), (24, 16), (31, 16), (38, 16),
    ]

    def _get_next_desk_position(self) -> tuple[int, int]:
        idx = len(self._agents)
        grid = self._DESK_GRID
        if idx < len(grid):
            return grid[idx]
        # Overflow: share desks with +1 x-offset (second seat)
        base = grid[(idx - len(grid)) % len(grid)]
        return (base[0] + 1, base[1])

    def get(self, agent_id: str) -> Optional[AgentState]:
        return self._agents.get(agent_id)

    def get_status(self, agent_id: str) -> Optional[AgentStatus]:
        agent = self._agents.get(agent_id)
        return agent.status if agent else None

    def get_all(self) -> list[AgentState]:
        return list(self._agents.values())

    def get_all_states_dict(self) -> list[dict]:
        return [agent.model_dump(mode="json") for agent in self._agents.values()]

    def update_from_heartbeat(self, agent_id: str, payload: HeartbeatPayload) -> Optional[AgentStatus]:
        agent = self._agents.get(agent_id)
        if not agent:
            # Dynamic Registration
            agent_name = payload.name if payload.name else f"Agent-{agent_id[:4]}"
            agent_role = payload.role if payload.role else AgentRole.BACKEND
            agent_role_label = payload.role_label_zh if payload.role_label_zh else ("后端" if agent_role == AgentRole.BACKEND else agent_role.value)
            agent_sprite = payload.character_sprite if payload.character_sprite else "char-blue"
            
            agent = AgentState(
                id=agent_id,
                name=agent_name,
                role=agent_role,
                role_label_zh=agent_role_label,
                status=payload.status,
                desk_position=self._get_next_desk_position(),
                character_sprite=agent_sprite,
            )
            self._agents[agent_id] = agent
            agent.current_task = payload.current_task
            agent.progress = payload.progress
            agent.last_heartbeat = datetime.utcnow()
            return None # Return None to signify it's a NEW agent

        old_status = agent.status
        agent.status = payload.status
        agent.current_task = payload.current_task
        agent.progress = payload.progress
        agent.last_heartbeat = datetime.utcnow()
        
        # Update optional identity params if provided
        if payload.name: agent.name = payload.name
        if payload.role: agent.role = payload.role
        if payload.role_label_zh: agent.role_label_zh = payload.role_label_zh
        if payload.character_sprite: agent.character_sprite = payload.character_sprite
        
        return old_status

    def set_status(self, agent_id: str, status: AgentStatus):
        agent = self._agents.get(agent_id)
        if agent:
            agent.status = status
