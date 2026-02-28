"""
Lightweight heartbeat client for AI Agent processes.

Usage:
    from agent_sdk import AgentHeartbeat

    hb = AgentHeartbeat("agent-frontend-01", server_url="http://localhost:8000")
    hb.start()

    # Report status changes
    hb.report("working", current_task="实现登录页面")
    # ... do work ...
    hb.report("idle")

    hb.stop()
"""

import os
import threading
import time
from typing import Optional

import httpx


class AgentHeartbeat:
    def __init__(
        self,
        agent_id: str,
        server_url: str = "http://localhost:8000",
        interval: float = 3.0,
    ):
        self.agent_id = agent_id
        self.server_url = server_url.rstrip("/")
        self.interval = interval
        self._status = "sleeping"
        self._current_task: Optional[str] = None
        self._progress: Optional[float] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._client = httpx.Client(timeout=5.0)

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        self._client.close()

    def report(
        self,
        status: str,
        current_task: Optional[str] = None,
        progress: Optional[float] = None,
    ):
        self._status = status
        self._current_task = current_task
        self._progress = progress
        # Send immediately
        self._send_heartbeat()

    def _heartbeat_loop(self):
        while self._running:
            self._send_heartbeat()
            time.sleep(self.interval)

    def _send_heartbeat(self):
        try:
            self._client.post(
                f"{self.server_url}/api/agents/{self.agent_id}/heartbeat",
                json={
                    "status": self._status,
                    "current_task": self._current_task,
                    "progress": self._progress,
                    "pid": os.getpid(),
                },
            )
        except Exception:
            pass  # Silently ignore connection errors


def report_status(
    agent_id: str,
    status: str,
    current_task: Optional[str] = None,
    progress: Optional[float] = None,
    server_url: str = "http://localhost:8000",
):
    """One-shot status report (no background thread)."""
    try:
        httpx.post(
            f"{server_url}/api/agents/{agent_id}/heartbeat",
            json={
                "status": status,
                "current_task": current_task,
                "progress": progress,
                "pid": os.getpid(),
            },
            timeout=5.0,
        )
    except Exception:
        pass
