# AI-Agent-Pixel-Office 部署指南 (Vercel + Supabase)

目前的架构是 **React (Vite) + FastAPI (WebSocket)**。如果你希望将其迁移到 **Vercel + Supabase** 的现代化 Serverless 架构，这将是一个非常棒的选择。

以下是具体的架构改造思路和部署步骤：

## 为什么选择 Vercel + Supabase？

传统 FastAPI 的 WebSocket 需要持续保持长连接，而 Vercel 的 Serverless Function (无服务器函数) 存在最大执行时间限制，**天生不支持原生的长时间 WebSocket 保持**。
但通过引入 **Supabase Realtime**，我们可以完美解决这个问题，甚至连 FastAPI 都不需要了！

**改造后架构：**
1. **Frontend (Vercel)**: 托管基于 React + Pixi.js 的纯静态前端大屏。
2. **Database & Realtime (Supabase)**: 扮演注册中心和状态中转站。利用它的 Postgres 数据库持久化 Agent 信息，利用 Supabase Realtime 频道（Broadcast）平替 FastAPI 的 WebSocket 广播。

---

## 改造与部署步骤

### 第一阶段：配置 Supabase
1. **创建项目**: 登录 Supabase (supabase.com)，创建一个新项目。
2. **建表与开启 Realtime (核心步骤)**:
   进入 Supabase 左侧导航栏的 **SQL Editor**，粘贴并运行以下完整的 SQL 脚本。这段脚本会自动为你建表、设置 RLS（行级安全策略）以允许匿名访问，并最重要的是——**为这张表开启 Realtime 广播功能**，完全复刻原先 WebSocket 的能力：

   ```sql
   -- 1. 创建 agents 状态监控表
   CREATE TABLE agents (
     id TEXT PRIMARY KEY, -- Agent 的唯一标识 (对应之前的 agent_id)
     status TEXT NOT NULL, -- Enum: working, sleeping, idle, thinking
     current_task TEXT,
     progress NUMERIC,
     name TEXT,
     role TEXT,
     role_label_zh TEXT,
     character_sprite TEXT,
     updated_at TIMESTAMPTZ DEFAULT NOW() -- 每次心跳更新时间
   );

   -- 2. 启用行级安全防御 (RLS)
   ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

   -- 3. 创建访问策略：允许所有匿名端点 (我们的 Vercel 前端和任何脚本客户端) 读写心跳
   -- 注意：生产环境中，如果是机密数据，这里应改为认证写入。大屏展示可以放开。
   CREATE POLICY "Enable read access for all users" ON agents FOR SELECT USING (true);
   CREATE POLICY "Enable insert for all users" ON agents FOR INSERT WITH CHECK (true);
   CREATE POLICY "Enable update for all users" ON agents FOR UPDATE USING (true);

   -- 4. 自动更新 updated_at 的触发器函数
   CREATE OR REPLACE FUNCTION set_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- 5. 绑定触发器到 agents 表
   CREATE TRIGGER set_agents_updated_at
   BEFORE UPDATE ON agents
   FOR EACH ROW
   EXECUTE FUNCTION set_updated_at();

   -- 6. 【最重要】为 agents 表开启 Supabase Realtime！
   -- 这一步等价于我们之前的 FastAPI WebSocket 广播
   ALTER PUBLICATION supabase_realtime ADD TABLE agents;
   ```

3. **获取密钥**: 到 Project Settings -> API 中，拿到你的 `URL` 和 `anon` public 密钥。

### 第二阶段：重构前端连线 (React)
由于我们要脱离 FastAPI，前端需做如下修改：

1. **安装依赖**: 
   ```bash
   npm install @supabase/supabase-js
   ```
2. **初始化 Client**:
   在前端创建一个 `supabaseClient.ts`，填入你的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。
3. **替换 WebSocket Hook**:
   修改现有的 `useWebSocket.ts`，将原先的 WebSocket 改为监听 Supabase 的频道：
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   const supabase = createClient('URL', 'KEY')

   // 监听远端 Agent 发来的广播心跳
   supabase
     .channel('office-room')
     .on('broadcast', { event: 'heartbeat' }, (payload) => {
       // 更新到现有的 useAgentStore 状态仓库中
       const agentState = payload.payload; 
       useAgentStore.getState().updateAgent(agentState);
     })
     .subscribe()
   ```

### 第三阶段：Agent 端心跳改造
之前 Agent 是向 FastAPI 发送 HTTP POST 请求。现在，其它跑在云端或本地的 Agent 脚本，只需要直接通过 HTTP/REST 向 Supabase 发送数据更新数据库，或者通过 `supabase-js` / `supabase-py` 发送 Broadcast 即可。

**Python 示例**:
```python
from supabase import create_client

url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_KEY"
supabase = create_client(url, key)

# 发送心跳到大屏
supabase.realtime.channel("office-room").send(
    event="heartbeat",
    payload={
        "id": "cloud-user-1",
        "status": "working",
        "name": "云端小华",
        # ...其貌信息
    }
)
```

### 第四阶段：部署到 Vercel (一键上线)
前端改造完、所有 WebSocket 逻辑替换为 Supabase 后：

1. 登录 Vercel (vercel.com)，点击 **Add New -> Project**。
2. 绑定你的 GitHub Repo（即你刚刚 push 的 `AI-Agent-Pixel-Office`）。
3. Vercel 会自动识别出这是一个 Vite 项目。
4. 在 Environment Variables 中填入:
   - `VITE_SUPABASE_URL` = 你的链接
   - `VITE_SUPABASE_ANON_KEY` = 你的公钥
5. 点击 **Deploy**！

几十秒后，你就会得到一个全球 CDN 加速的生产级 HTTPS 链接，且通过 Supabase 处理海量并发的心跳长连接，完全无需自行运维服务器。
