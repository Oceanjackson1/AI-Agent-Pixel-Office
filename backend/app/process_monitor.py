import asyncio
from datetime import datetime, timedelta
from .agent_registry import AgentRegistry
from .ws_manager import WebSocketManager
from .models import AgentStatus
from .config import HEARTBEAT_TIMEOUT_SECONDS


class ProcessMonitor:
    def __init__(self, registry: AgentRegistry, ws_manager: WebSocketManager):
        self.registry = registry
        self.ws_manager = ws_manager
        self.heartbeat_timeout = timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)

    async def run_check_loop(self, interval: float = 3.0):
        while True:
            await self._check_all_agents()
            await asyncio.sleep(interval)

    async def _check_all_agents(self):
        now = datetime.utcnow()
        for agent in self.registry.get_all():
            if agent.last_heartbeat and (now - agent.last_heartbeat) > self.heartbeat_timeout:
                if agent.status not in (AgentStatus.SLEEPING, AgentStatus.OFFLINE):
                    old_status = agent.status
                    agent.status = AgentStatus.SLEEPING
                    agent.current_task = None
                    agent.progress = None
                    await self.ws_manager.broadcast({
                        "type": "agent_status_change",
                        "data": {
                            "agent_id": agent.id,
                            "previous_status": old_status.value,
                            "status": AgentStatus.SLEEPING.value,
                            "current_task": None,
                        },
                    })
