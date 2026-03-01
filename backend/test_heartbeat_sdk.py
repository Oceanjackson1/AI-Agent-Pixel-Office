import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent_sdk.heartbeat import AgentHeartbeat, report_status


class FakeClient:
    def __init__(self):
        self.posts = []
        self.closed = False

    def post(self, url, json):
        self.posts.append({"url": url, "json": json})

    def close(self):
        self.closed = True


class AgentHeartbeatTests(unittest.TestCase):
    def test_report_includes_identity_fields(self):
        client = FakeClient()
        hb = AgentHeartbeat(
            "product-agent-01",
            server_url="http://localhost:8000",
            interval=60,
            name="Mika",
            role="product",
            role_label_zh="产品",
            character_sprite="char-yellow",
            client=client,
        )

        hb.report("working", current_task="梳理需求", progress=0.4)

        self.assertEqual(len(client.posts), 1)
        payload = client.posts[0]["json"]
        self.assertEqual(payload["status"], "working")
        self.assertEqual(payload["current_task"], "梳理需求")
        self.assertEqual(payload["progress"], 0.4)
        self.assertEqual(payload["name"], "Mika")
        self.assertEqual(payload["role"], "product")
        self.assertEqual(payload["role_label_zh"], "产品")
        self.assertEqual(payload["character_sprite"], "char-yellow")

    def test_run_reports_start_and_stop(self):
        client = FakeClient()
        hb = AgentHeartbeat(
            "product-agent-01",
            interval=60,
            client=client,
            role="product",
        )

        def work():
            hb.report("working", current_task="准备评审", progress=1.0)
            return "ok"

        result = hb.run(
            work,
            startup_task="产品进程启动中",
            shutdown_task="产品进程已停止",
        )

        self.assertEqual(result, "ok")
        statuses = [item["json"]["status"] for item in client.posts]
        self.assertEqual(statuses, ["thinking", "working", "sleeping"])
        self.assertTrue(client.closed)

    def test_run_reports_exception_as_offline(self):
        client = FakeClient()
        hb = AgentHeartbeat(
            "product-agent-01",
            interval=60,
            client=client,
            role="product",
        )

        def broken():
            raise RuntimeError("boom")

        with self.assertRaises(RuntimeError):
            hb.run(broken, exception_task="产品进程异常退出")

        statuses = [item["json"]["status"] for item in client.posts]
        self.assertEqual(statuses, ["thinking", "offline"])
        self.assertTrue(client.closed)

    def test_report_status_supports_identity_fields(self):
        client = FakeClient()

        original_post = __import__("agent_sdk.heartbeat", fromlist=["httpx"]).httpx.post

        def fake_post(url, json, timeout):
            client.post(url, json)

        module = __import__("agent_sdk.heartbeat", fromlist=["httpx"])
        module.httpx.post = fake_post
        try:
            report_status(
                "product-agent-01",
                "idle",
                current_task="等待输入",
                server_url="http://localhost:8000",
                name="Mika",
                role="product",
                role_label_zh="产品",
                character_sprite="char-yellow",
            )
        finally:
            module.httpx.post = original_post

        self.assertEqual(len(client.posts), 1)
        payload = client.posts[0]["json"]
        self.assertEqual(payload["role"], "product")
        self.assertEqual(payload["character_sprite"], "char-yellow")


if __name__ == "__main__":
    unittest.main()
