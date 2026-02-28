import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .agent_registry import AgentRegistry
from .ws_manager import WebSocketManager
from .process_monitor import ProcessMonitor
from .mock_simulator import MockSimulator
from .routers import agents as agents_router
from .config import MONITOR_CHECK_INTERVAL

registry = AgentRegistry()
ws_manager = WebSocketManager()
monitor = ProcessMonitor(registry, ws_manager)
mock_sim = MockSimulator(registry, ws_manager)

USE_MOCK = os.environ.get("MOCK", "0") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if USE_MOCK:
        print("🎮 Mock mode enabled - simulating agent activity")
        asyncio.create_task(mock_sim.start())
    else:
        print("🔍 Production mode - monitoring real agent processes")
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
