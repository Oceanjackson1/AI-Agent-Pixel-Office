from fastapi import APIRouter, HTTPException
from ..agent_registry import AgentRegistry
from ..ws_manager import WebSocketManager
from ..models import HeartbeatPayload

router = APIRouter(prefix="/api/agents", tags=["agents"])

# These will be set by main.py
registry: AgentRegistry = None  # type: ignore
ws_manager: WebSocketManager = None  # type: ignore


def init(r: AgentRegistry, w: WebSocketManager):
    global registry, ws_manager
    registry = r
    ws_manager = w


@router.get("")
async def list_agents():
    return registry.get_all_states_dict()


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    agent = registry.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.model_dump(mode="json")


@router.post("/{agent_id}/heartbeat")
async def heartbeat(agent_id: str, payload: HeartbeatPayload):
    old_status = registry.update_from_heartbeat(agent_id, payload)
    
    if old_status is None:
        # A new agent was dynamically registered. Send a full state snapshot so all clients get the new agent.
        await ws_manager.broadcast({
            "type": "state_snapshot",
            "data": {
                "agents": registry.get_all_states_dict(),
            },
        })
        return {"ok": True, "note": "new agent registered"}

    if old_status != payload.status:
        await ws_manager.broadcast({
            "type": "agent_status_change",
            "data": {
                "agent_id": agent_id,
                "previous_status": old_status.value,
                "status": payload.status.value,
                "current_task": payload.current_task,
            },
        })
    else:
        # If status didn't change but maybe task or identity changed, 
        # we can just send a task update or snapshot. 
        # The frontend updates task within agent_status_change usually.
        pass

    return {"ok": True}
