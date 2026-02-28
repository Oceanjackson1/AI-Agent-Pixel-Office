import asyncio
import os
import random
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .agent_registry import AgentRegistry
from .ws_manager import WebSocketManager
from .process_monitor import ProcessMonitor
from .mock_simulator import MockSimulator
from .models import AgentStatus
from .routers import agents as agents_router
from .config import MONITOR_CHECK_INTERVAL

registry = AgentRegistry()
ws_manager = WebSocketManager()
monitor = ProcessMonitor(registry, ws_manager)
mock_sim = MockSimulator(registry, ws_manager)

USE_MOCK = os.environ.get("MOCK", "0") == "1"

OCEAN_TASKS = [
    "Review 团队 PR",
    "规划下周迭代目标",
    "一对一沟通",
    "制定技术架构方案",
    "评估产品路线图",
    "整理周会议程",
]


async def ocean_leader_loop():
    """Keep Ocean (the permanent leader) always visible and active in the office."""
    OCEAN_ID = "ocean-lead-01"
    await asyncio.sleep(2)  # Wait for registry to be fully ready

    while True:
        agent = registry.get(OCEAN_ID)
        if not agent:
            await asyncio.sleep(5)
            continue

        # Pick a task and go working
        task = random.choice(OCEAN_TASKS)
        agent.status = AgentStatus.WORKING
        agent.current_task = task
        agent.progress = 0.0

        await ws_manager.broadcast({
            "type": "agent_status_change",
            "data": {
                "agent_id": OCEAN_ID,
                "previous_status": "idle",
                "status": "working",
                "current_task": task,
            },
        })

        # Work with progress updates
        duration = random.uniform(20, 45)
        steps = random.randint(4, 8)
        for i in range(steps):
            await asyncio.sleep(duration / steps)
            agent.progress = (i + 1) / steps
            await ws_manager.broadcast({
                "type": "agent_task_progress",
                "data": {
                    "agent_id": OCEAN_ID,
                    "task": task,
                    "progress": agent.progress,
                },
            })

        # Brief thinking pause
        agent.status = AgentStatus.THINKING
        await ws_manager.broadcast({
            "type": "agent_status_change",
            "data": {
                "agent_id": OCEAN_ID,
                "previous_status": "working",
                "status": "thinking",
                "current_task": task,
            },
        })
        await asyncio.sleep(random.uniform(5, 12))

        # Go idle briefly
        agent.current_task = None
        agent.progress = None
        await ws_manager.broadcast({
            "type": "agent_status_change",
            "data": {
                "agent_id": OCEAN_ID,
                "previous_status": "thinking",
                "status": "idle",
                "current_task": None,
            },
        })
        await asyncio.sleep(random.uniform(5, 15))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ocean is always present and active
    asyncio.create_task(ocean_leader_loop())

    if USE_MOCK:
        print("🎮 Mock mode enabled - simulating agent activity")
        asyncio.create_task(mock_sim.start())
    else:
        print("🔍 Production mode - Ocean is watching over the office")
        asyncio.create_task(monitor.run_check_loop(interval=MONITOR_CHECK_INTERVAL))
    yield
    # Shutdown
    mock_sim.stop()


app = FastAPI(title="AI Office Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init routers
agents_router.init(registry, ws_manager)
app.include_router(agents_router.router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "mock_mode": USE_MOCK,
        "connected_clients": ws_manager.connection_count,
    }


@app.websocket("/ws/office")
async def office_websocket(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Send initial snapshot
    try:
        await websocket.send_json({
            "type": "state_snapshot",
            "data": {
                "agents": registry.get_all_states_dict(),
            },
        })
    except Exception:
        ws_manager.disconnect(websocket)
        return

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "request_snapshot":
                await websocket.send_json({
                    "type": "state_snapshot",
                    "data": {
                        "agents": registry.get_all_states_dict(),
                    },
                })
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
