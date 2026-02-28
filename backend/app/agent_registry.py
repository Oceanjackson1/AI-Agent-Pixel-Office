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

    def _get_next_desk_position(self) -> tuple[int, int]:
        # Simple logical grid allocation for dynamic unconfigured agents
        cols = [2, 5, 8, 11, 14, 17, 20, 23, 26]
        rows = [2, 5, 8, 11, 14]
        
        idx = len(self._agents)
        col = cols[idx % len(cols)]
        row = rows[(idx // len(cols)) % len(rows)]
        return (col, row)

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
