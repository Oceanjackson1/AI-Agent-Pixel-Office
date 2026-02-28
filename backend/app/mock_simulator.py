import asyncio
import random
from .agent_registry import AgentRegistry
from .ws_manager import WebSocketManager
from .models import AgentStatus

MOCK_TASKS = {
    "frontend": [
        "实现登录页面组件",
        "优化首页加载速度",
        "修复移动端布局问题",
        "开发用户设置面板",
        "编写单元测试",
        "重构导航栏组件",
    ],
    "backend": [
        "优化数据库查询",
        "实现用户认证 API",
        "编写数据迁移脚本",
        "修复并发请求 Bug",
        "添加缓存层",
        "实现消息队列",
    ],
    "design": [
        "设计新功能原型图",
        "优化配色方案",
        "制作图标素材",
        "设计引导页面",
        "更新设计系统组件",
        "制作动效方案",
    ],
    "product": [
        "撰写需求文档",
        "分析用户反馈",
        "规划下一版本功能",
        "整理竞品分析报告",
        "准备产品评审材料",
        "更新产品路线图",
    ],
    "qa": [
        "执行回归测试",
        "编写自动化测试",
        "验证修复后的 Bug",
        "测试新功能流程",
        "编写测试报告",
        "性能压力测试",
    ],
    "lead": [
        "Review 代码提交",
        "协调团队任务分配",
        "制定技术方案",
        "准备周会汇报",
        "一对一沟通",
        "评估技术债务",
    ],
}


class MockSimulator:
    def __init__(self, registry: AgentRegistry, ws_manager: WebSocketManager):
        self.registry = registry
        self.ws_manager = ws_manager
        self._running = False

    async def start(self):
        self._running = True
        # Give each agent its own loop
        tasks = []
        for agent in self.registry.get_all():
            tasks.append(asyncio.create_task(self._agent_loop(agent.id, agent.role.value)))
        await asyncio.gather(*tasks)

    async def _agent_loop(self, agent_id: str, role: str):
        # Start with a random delay so agents don't all sync up
        await asyncio.sleep(random.uniform(1, 5))

        while self._running:
            agent = self.registry.get(agent_id)
            if not agent:
                break

            if agent.status == AgentStatus.SLEEPING:
                # Wake up and start working
                task = random.choice(MOCK_TASKS.get(role, MOCK_TASKS["backend"]))
                old_status = agent.status
                agent.status = AgentStatus.WORKING
                agent.current_task = task
                agent.progress = 0.0

                await self.ws_manager.broadcast({
                    "type": "agent_status_change",
                    "data": {
                        "agent_id": agent_id,
                        "previous_status": old_status.value,
                        "status": "working",
                        "current_task": task,
                    },
                })

                # Work for 10-30 seconds with progress updates
                work_duration = random.uniform(10, 30)
                steps = random.randint(3, 8)
                for i in range(steps):
                    await asyncio.sleep(work_duration / steps)
                    if not self._running:
                        break
                    agent.progress = (i + 1) / steps
                    await self.ws_manager.broadcast({
                        "type": "agent_task_progress",
                        "data": {
                            "agent_id": agent_id,
                            "task": agent.current_task,
                            "progress": agent.progress,
                        },
                    })

                # Sometimes go to thinking state
                if random.random() < 0.3:
                    agent.status = AgentStatus.THINKING
                    await self.ws_manager.broadcast({
                        "type": "agent_status_change",
                        "data": {
                            "agent_id": agent_id,
                            "previous_status": "working",
                            "status": "thinking",
                            "current_task": agent.current_task,
                        },
                    })
                    await asyncio.sleep(random.uniform(5, 10))

                # Go idle then sleep
                agent.status = AgentStatus.IDLE
                agent.current_task = None
                agent.progress = None
                await self.ws_manager.broadcast({
                    "type": "agent_status_change",
                    "data": {
                        "agent_id": agent_id,
                        "previous_status": "working",
                        "status": "idle",
                        "current_task": None,
                    },
                })

                await asyncio.sleep(random.uniform(3, 8))

                # Fall asleep
                agent.status = AgentStatus.SLEEPING
                await self.ws_manager.broadcast({
                    "type": "agent_status_change",
                    "data": {
                        "agent_id": agent_id,
                        "previous_status": "idle",
                        "status": "sleeping",
                        "current_task": None,
                    },
                })

                # Sleep for a while before next cycle
                await asyncio.sleep(random.uniform(5, 15))
            else:
                await asyncio.sleep(1)

    def stop(self):
        self._running = False
