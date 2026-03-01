"""
Lightweight heartbeat client for AI Agent processes.
"""

import atexit
import os
import signal
import threading
from typing import Any, Callable, Optional, TypeVar

import httpx

F = TypeVar("F", bound=Callable[..., Any])


class AgentHeartbeat:
    def __init__(
        self,
        agent_id: str,
        server_url: str = "http://localhost:8000",
        interval: float = 3.0,
        *,
        name: Optional[str] = None,
        role: Optional[str] = None,
        role_label_zh: Optional[str] = None,
        character_sprite: Optional[str] = None,
        client: Optional[httpx.Client] = None,
    ):
        self.agent_id = agent_id
        self.server_url = server_url.rstrip("/")
        self.interval = interval
        self.name = name
        self.role = role
        self.role_label_zh = role_label_zh
        self.character_sprite = character_sprite
        self._status = "sleeping"
        self._current_task: Optional[str] = None
        self._progress: Optional[float] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._client = client or httpx.Client(timeout=5.0)
        self._closed = False
        self._hooks_registered = False
        self._lock = threading.Lock()
        self._signal_handlers: dict[int, Any] = {}

    def start(
        self,
        startup_status: str = "thinking",
        current_task: Optional[str] = "进程启动中",
    ):
        with self._lock:
            if self._running or self._closed:
                return
            self._running = True
            self._stop_event.clear()
            self._register_lifecycle_hooks()
            self._thread = threading.Thread(
                target=self._heartbeat_loop,
                daemon=True,
                name=f"{self.agent_id}-heartbeat",
            )

        self.report(startup_status, current_task=current_task)
        assert self._thread is not None
        self._thread.start()

    def stop(
        self,
        final_status: str = "sleeping",
        current_task: Optional[str] = "进程已停止",
    ):
        self._shutdown(final_status=final_status, current_task=current_task)

    def close(self):
        self._shutdown(final_status=None, current_task=None)

    def report(
        self,
        status: str,
        current_task: Optional[str] = None,
        progress: Optional[float] = None,
    ):
        self._status = status
        self._current_task = current_task
        self._progress = progress
        self._send_heartbeat()

    def report_exception(
        self,
        exc: BaseException,
        current_task: Optional[str] = None,
    ):
        task = current_task or f"进程异常退出: {exc.__class__.__name__}"
        self.report("offline", current_task=task, progress=None)

    def run(
        self,
        target: Callable[..., Any],
        *args: Any,
        startup_status: str = "thinking",
        startup_task: Optional[str] = "进程启动中",
        shutdown_status: str = "sleeping",
        shutdown_task: Optional[str] = "进程已停止",
        exception_task: Optional[str] = None,
        **kwargs: Any,
    ) -> Any:
        self.start(startup_status=startup_status, current_task=startup_task)
        try:
            result = target(*args, **kwargs)
        except BaseException as exc:
            self.report_exception(exc, current_task=exception_task)
            self.close()
            raise
        self.stop(final_status=shutdown_status, current_task=shutdown_task)
        return result

    def wrap(
        self,
        target: F,
        *,
        startup_status: str = "thinking",
        startup_task: Optional[str] = "进程启动中",
        shutdown_status: str = "sleeping",
        shutdown_task: Optional[str] = "进程已停止",
        exception_task: Optional[str] = None,
    ) -> F:
        def wrapped(*args: Any, **kwargs: Any):
            return self.run(
                target,
                *args,
                startup_status=startup_status,
                startup_task=startup_task,
                shutdown_status=shutdown_status,
                shutdown_task=shutdown_task,
                exception_task=exception_task,
                **kwargs,
            )

        return wrapped  # type: ignore[return-value]

    def _shutdown(
        self,
        *,
        final_status: Optional[str],
        current_task: Optional[str],
    ):
        with self._lock:
            if self._closed:
                return
            self._running = False
            self._closed = True
            self._stop_event.set()

        if final_status is not None:
            self._status = final_status
            self._current_task = current_task
            self._progress = None
            self._send_heartbeat()

        if self._thread:
            self._thread.join(timeout=5)
        self._client.close()

    def _heartbeat_loop(self):
        while not self._stop_event.wait(self.interval):
            self._send_heartbeat()

    def _register_lifecycle_hooks(self):
        if self._hooks_registered:
            return
        self._hooks_registered = True
        atexit.register(self._handle_exit)

        if threading.current_thread() is not threading.main_thread():
            return

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                previous = signal.getsignal(sig)
                self._signal_handlers[sig] = previous
                signal.signal(sig, self._build_signal_handler(sig, previous))
            except Exception:
                continue

    def _build_signal_handler(self, sig: int, previous: Any):
        def handler(signum: int, frame: Any):
            sig_name = signal.Signals(signum).name
            self.stop(
                final_status="sleeping",
                current_task=f"收到 {sig_name}，进程停止",
            )
            if callable(previous):
                previous(signum, frame)
            elif previous == signal.SIG_DFL:
                raise SystemExit(128 + signum)

        return handler

    def _handle_exit(self):
        if not self._closed:
            self.stop(final_status="sleeping", current_task="进程退出")

    def _build_payload(self) -> dict[str, Any]:
        return {
            "status": self._status,
            "current_task": self._current_task,
            "progress": self._progress,
            "pid": os.getpid(),
            "name": self.name,
            "role": self.role,
            "role_label_zh": self.role_label_zh,
            "character_sprite": self.character_sprite,
        }

    def _send_heartbeat(self):
        try:
            self._client.post(
                f"{self.server_url}/api/agents/{self.agent_id}/heartbeat",
                json=self._build_payload(),
            )
        except Exception:
            pass


def report_status(
    agent_id: str,
    status: str,
    current_task: Optional[str] = None,
    progress: Optional[float] = None,
    server_url: str = "http://localhost:8000",
    name: Optional[str] = None,
    role: Optional[str] = None,
    role_label_zh: Optional[str] = None,
    character_sprite: Optional[str] = None,
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
                "name": name,
                "role": role,
                "role_label_zh": role_label_zh,
                "character_sprite": character_sprite,
            },
            timeout=5.0,
        )
    except Exception:
        pass
