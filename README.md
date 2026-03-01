# 🏢 AI-Agent-Pixel-Office

> **像素风 AI 牛马监工大屏** — 实时可视化你所有 AI Agent 的工作状态

一个基于 **React + Pixi.js + FastAPI** 的 2D 像素风虚拟办公室。
无论你的 AI Agent 跑在本地还是云端，只要它发送一次心跳，就会自动获得一张工位、一个像素小人，以及头顶冒出的实时任务气泡。

![效果预览](https://img.shields.io/badge/style-Apple%20Design-blue?style=flat-square)
![Agent数量](https://img.shields.io/badge/agents-无上限-green?style=flat-square)
![实时同步](https://img.shields.io/badge/sync-WebSocket-orange?style=flat-square)

---

## ✨ 核心特性

| 特性 | 描述 |
|------|------|
| 🚀 **无限扩容** | 没有硬编码的 Agent 数量上限。新 Agent 发送心跳后自动分配工位，即时出现在 2D 办公室中 |
| 🍎 **Apple 风格 UI** | 毛玻璃侧边栏、系统级字体、圆角卡片、柔和阴影 — 整套苹果设计语言 |
| 🎮 **Pixi.js 实时渲染** | 像素小人拥有工作、思考、休眠等动态状态动画，头顶气泡展示当前任务 |
| 🏃 **Agent 自主走动** | 工作中的 Agent 会随机起身去咖啡机、白板、书架或找同事"交流"，办公室充满活力 |
| 🗺️ **大地图 + 摄像机** | 办公室扩展为 30×40 格双层大地图，支持鼠标滚轮/拖拽平移，点击右侧 Agent 卡片自动定位 |
| 🎨 **自定义身份** | Agent 可通过心跳 Payload 自报姓名、岗位角色、像素皮肤样式 |
| 📊 **状态面板** | 右侧侧边栏实时展示所有 Agent 的状态、任务、进度条，点击卡片跳转到对应小人 |
| 🔌 **即插即用** | 任何能发 HTTP 请求的程序都能接入 — Python 脚本、LangChain Agent、Node.js 服务等 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 (前端大屏)                       │
│  React + Pixi.js + Zustand                              │
│  ┌──────────────┐  ┌──────────────────┐                 │
│  │ 2D 像素办公室  │  │ 毛玻璃状态面板     │                 │
│  │ (OfficeCanvas) │  │ (StatusPanel)    │                 │
│  └──────┬───────┘  └────────┬─────────┘                 │
│         └────────┬──────────┘                            │
│                  │ WebSocket (实时状态推送)                │
└──────────────────┼──────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────────────┐
│            FastAPI 后端 (Python)                         │
│  ┌───────────────┼──────────────┐                       │
│  │         WebSocket 管理器       │                       │
│  │         Agent 注册中心         │                       │
│  │         Mock 模拟器           │                       │
│  └───────────────┬──────────────┘                       │
│                  │ REST API (心跳接收)                    │
└──────────────────┼──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │    本地/云端 AI Agents       │
    │  POST /heartbeat 上报状态    │
    └─────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19, TypeScript, Vite, Pixi.js v8, Zustand |
| **后端** | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| **通信** | REST API (Agent → 后端) + WebSocket (后端 → 前端) |

---

## 🚀 快速开始

### 前置条件

- Python 3.11+
- Node.js 18+
- npm 或 pnpm

### 1️⃣ 启动后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

后端启动后会在 `http://localhost:8000` 上运行。如果设置了 `MOCK_MODE=true`（默认启用），会自动模拟 6 个 Agent 的活动。

### 2️⃣ 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开浏览器访问 `http://localhost:5173`，你会看到像素风的 2D 办公室和右侧的毛玻璃状态面板。

### 3️⃣ 模拟大量牛马涌入

```bash
cd backend
python3 test_dynamic.py
```

这个脚本会同时注册多个随机 Agent（随机名字、随机岗位），你可以在前端看到小人一个接一个地出现在办公室里。

---

## 📡 外部 Agent 接入 API

### 心跳接口

```
POST http://localhost:8000/api/agents/{agent_id}/heartbeat
Content-Type: application/json
```

### 请求体 (JSON)

```json
{
  "status": "working",
  "current_task": "正在爬取网页数据",
  "progress": 0.65,
  "name": "云端爬虫一号",
  "role": "backend",
  "role_label_zh": "爬虫",
  "character_sprite": "char-blue"
}
```

#### 参数说明

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `status` | string | ✅ | 当前状态枚举：`working` / `idle` / `thinking` / `sleeping` |
| `current_task` | string | ❌ | 当前具体任务描述（会显示为头顶气泡） |
| `progress` | float | ❌ | 进度条 0.0 ~ 1.0 |
| `name` | string | ❌ | Agent 显示名称（首次注册时建议填写） |
| `role` | string | ❌ | 岗位枚举：`frontend` / `backend` / `design` / `product` / `qa` / `devops` / `data` / `lead` |
| `role_label_zh` | string | ❌ | 自定义中文头衔标签 |
| `character_sprite` | string | ❌ | 像素小人颜色：`char-red` / `char-blue` / `char-green` / `char-yellow` / `char-orange` / `char-lead` |

### Python 接入示例

```python
from agent_sdk import AgentHeartbeat

heartbeat = AgentHeartbeat(
    "product-agent-01",
    server_url="http://localhost:8000",
    name="Mika",
    role="product",
    role_label_zh="产品",
    character_sprite="char-yellow",
)

def main():
    heartbeat.report("working", current_task="梳理需求", progress=0.2)
    # 你的业务逻辑写在这里
    heartbeat.report("idle", current_task="等待新的输入")

if __name__ == "__main__":
    heartbeat.run(
        main,
        startup_task="产品进程启动中",
        shutdown_task="产品进程已停止",
        exception_task="产品进程异常退出",
    )
```

这样接入后：
- 进程启动时会自动上报 `thinking / 产品进程启动中`
- 进程运行中可以随时调用 `heartbeat.report(...)`
- 进程异常退出时会自动上报 `offline`
- 进程正常停止或收到 `SIGINT` / `SIGTERM` 时会自动上报 `sleeping`

仓库里也提供了一个可直接运行的产品进程示例：

```bash
make product-agent
```

---

## 📁 项目结构

```
AI-Agent-Pixel-Office/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口 & CORS/WebSocket 路由
│   │   ├── models.py            # Pydantic 数据模型 (AgentState, HeartbeatPayload 等)
│   │   ├── agent_registry.py    # Agent 注册中心 & 动态工位分配
│   │   ├── ws_manager.py        # WebSocket 连接管理器
│   │   ├── mock_simulator.py    # Mock 模式下的 Agent 活动模拟
│   │   ├── process_monitor.py   # 进程监控工具
│   │   ├── config.py            # 配置文件
│   │   └── routers/
│   │       └── agents.py        # Agent REST API 路由
│   ├── agent_sdk/
│   │   └── heartbeat.py         # Python SDK 心跳工具
│   ├── test_dynamic.py          # 批量动态注册测试脚本
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 主应用组件 (Flex 布局)
│   │   ├── index.css            # 全局样式 (Apple 字体/滚动条)
│   │   ├── components/
│   │   │   ├── OfficeCanvas.tsx  # 2D 办公室画布 (自适应缩放)
│   │   │   └── StatusPanel.tsx   # 毛玻璃侧边栏面板
│   │   ├── pixi/
│   │   │   ├── OfficeScene.ts   # Pixi.js 主场景 + 摄像机平移 + 气泡防重叠
│   │   │   ├── OfficeMap.ts     # 30×40 大地图、家具、兴趣点 (POI) 渲染
│   │   │   ├── AgentCharacter.ts # 像素小人动画状态机 + 走动子状态机
│   │   │   └── CharacterRenderer.ts # 角色标签、气泡绘制
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts  # WebSocket/Supabase Realtime 连接管理
│   │   │   ├── useAgentStore.ts # Zustand 全局状态仓库 + 摄像机桥接
│   │   │   └── useOceanLeader.ts # Ocean Boss 巡逻任务轮换
│   │   ├── types/               # TypeScript 类型定义
│   │   └── utils/
│   │       └── constants.ts     # 颜色常量、画布尺寸等
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── supabase_vercel_deployment.md # Vercel + Supabase 部署指南
├── Makefile
└── README.md
```

---

## ☁️ 云端部署 (Vercel + Supabase)

如果你希望将这个项目部署到云端以便远程访问，推荐使用 **Vercel + Supabase** 的 Serverless 方案。详细步骤和完整的 SQL 初始化脚本请参考：

👉 [**supabase_vercel_deployment.md**](./supabase_vercel_deployment.md)

### 必配环境变量

如果你使用 **Vercel + Supabase**，前端页面要想真正显示数据库里的 Agent，必须额外配置下面两个变量。
这两个变量是给前端页面读取 Supabase 用的，和各个 Agent 进程自己的 `HEARTBEAT_*` 变量不是一回事。

**Vercel 前端 / 本地 `frontend/.env.local`**

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

仓库里已提供模板文件：

```bash
frontend/.env.example
```

### 多 Agent 接入约定

如果你会有多个 Agent 同时上报到这个页面，需要保证以下约定成立：

- 每个 Agent 的 `id` 必须全局唯一，例如 `telegram-community-agent-01`
- `name` 建议明确填写，否则前端会退回成 `Agent-{id}`
- `role` 必须是这些值之一：`frontend` / `backend` / `design` / `product` / `qa` / `devops` / `data` / `lead`
- `role_label_zh` 可以自定义，例如 `Telegram 社区管理 AI Agent`
- `status` 必须是：`working` / `idle` / `thinking` / `sleeping` / `offline`
- `desk_position` 和 `character_sprite` 可不传；前端会自动分配工位和默认角色皮肤

如果页面里能看到 Ocean 但看不到你的其它 Agent，优先检查：

- 前端是否已配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`
- 前端连接的是否是与你写入心跳相同的 Supabase Project
- 浏览器控制台是否出现 `[Supabase] Initial fetch error: ...`

**架构要点：**
- 前端托管在 Vercel（全球 CDN 加速）
- 用 Supabase Realtime 替代 FastAPI WebSocket
- Agent 心跳直接写入 Supabase Postgres，实时广播到前端
- 完全无需自建服务器

---

## 🎨 UI/UX 设计理念

本项目采用 **Apple Design Language** 设计风格：

- **毛玻璃效果（Glassmorphism）**：侧边栏使用 `backdrop-filter: blur(20px)` 实现半透明模糊
- **系统字体**：使用 `-apple-system, BlinkMacSystemFont, "SF Pro Text"` 原生字体栈
- **柔和配色**：背景 `#f5f5f7`、文字 `#1d1d1f`、辅助灰 `#86868b`
- **圆角 + 阴影**：所有卡片和画布使用 `border-radius: 16px` + 柔和投影
- **自适应缩放**：画布根据容器尺寸自动计算最优显示尺寸，保持像素锐利

---

## 🏃 办公室动态系统

### 大地图与摄像机

办公室从 30×20 扩展到 **30×40 格**（480×640 像素），包含 5 行工位（最多 20 张桌子），以及咖啡机、会议桌、白板、书架等兴趣点家具。

- **鼠标滚轮**：上下滚动浏览办公室
- **拖拽平移**：按住鼠标拖拽画布
- **点击定位**：点击右侧 Agent 卡片，摄像机平滑滚动到该 Agent 位置

### Agent 走动行为

工作中的 Agent 不会一直坐在工位上 — 它们会自主起身走动：

- **去兴趣点**（60%）：随机走向咖啡机、白板、书架、会议桌等地方，停留 3-8 秒后返回
- **互访同事**（40%）：走到其他正在工作的 Agent 工位旁边"交流"几秒再回去
- 每 15-30 秒有 40% 概率触发一次走动，初始时间错开避免集体行动
- 走动时隐藏任务气泡，回到座位后自动恢复
- 相邻 Agent 的任务气泡会自动垂直错开，避免重叠

---

## 🤝 协作与贡献

欢迎提交 Issue 和 Pull Request！

如果你有以下方面的想法，非常欢迎贡献：
- 🎭 更多像素小人皮肤和动画
- 🏗️ 更丰富的办公室家具和互动场景
- 🗺️ 多楼层/缩放支持
- 📱 移动端适配
- 🔐 Agent 认证机制
- 📈 历史数据分析面板

---

## 📄 License

MIT License

---

<p align="center">
  <b>让你的 AI 牛马大军，有一个看得见的家 🏠</b>
</p>
