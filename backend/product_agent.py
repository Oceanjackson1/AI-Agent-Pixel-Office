import os
import random
import time

from agent_sdk import AgentHeartbeat

SERVER_URL = os.environ.get("PIXEL_OFFICE_URL", "http://localhost:8000")
AGENT_ID = os.environ.get("PRODUCT_AGENT_ID", "product-agent-01")
AGENT_NAME = os.environ.get("PRODUCT_AGENT_NAME", "Mika")
ROLE_LABEL_ZH = os.environ.get("PRODUCT_AGENT_ROLE_LABEL_ZH", "产品")
CHARACTER_SPRITE = os.environ.get("PRODUCT_AGENT_SPRITE", "char-yellow")
HEARTBEAT_INTERVAL = float(os.environ.get("PRODUCT_AGENT_HEARTBEAT_INTERVAL", "3"))

PRODUCT_TASKS = [
    "梳理本周需求优先级",
    "准备版本评审材料",
    "分析用户反馈与投诉",
    "拆解下个迭代需求",
    "和设计确认交互方案",
]


heartbeat = AgentHeartbeat(
    agent_id=AGENT_ID,
    server_url=SERVER_URL,
    interval=HEARTBEAT_INTERVAL,
    name=AGENT_NAME,
    role="product",
    role_label_zh=ROLE_LABEL_ZH,
    character_sprite=CHARACTER_SPRITE,
)


def product_main_loop():
    cycle = 0
    while True:
        task = PRODUCT_TASKS[cycle % len(PRODUCT_TASKS)]
        heartbeat.report("working", current_task=task, progress=0.0)

        steps = random.randint(4, 7)
        for step in range(steps):
            time.sleep(random.uniform(1.0, 2.2))
            heartbeat.report(
                "working",
                current_task=task,
                progress=round((step + 1) / steps, 2),
            )

        heartbeat.report("thinking", current_task=f"复盘中: {task}", progress=None)
        time.sleep(random.uniform(2.0, 4.0))
        heartbeat.report("idle", current_task="等待新的需求输入", progress=None)
        time.sleep(random.uniform(2.0, 4.0))
        cycle += 1


if __name__ == "__main__":
    heartbeat.run(
        product_main_loop,
        startup_task="产品进程启动中",
        shutdown_task="产品进程已停止",
        exception_task="产品进程异常退出",
    )
