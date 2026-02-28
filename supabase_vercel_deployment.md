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
   进入 Supabase 左侧导航栏的 **SQL Editor**，粘贴并运行仓库里的 [`supabase/init.sql`](./supabase/init.sql)。
   这份脚本已经按当前代码对齐，补上了前端会读取的 `desk_position` 字段，并会默认插入 `ocean-lead-01` 这位常驻 Leader。
   如果你想直接从文档复制，也可以执行下面这份完整 SQL：

   ```sql
   create table if not exists public.agents (
     id text primary key,
     name text,
     role text not null default 'backend',
     role_label_zh text not null default '员工',
     status text not null default 'sleeping',
     current_task text,
     progress numeric,
     desk_position integer[],
     character_sprite text not null default 'char-blue',
     updated_at timestamptz not null default timezone('utc', now())
   );

   alter table public.agents add column if not exists name text;
   alter table public.agents add column if not exists role text;
   alter table public.agents add column if not exists role_label_zh text;
   alter table public.agents add column if not exists status text;
   alter table public.agents add column if not exists current_task text;
   alter table public.agents add column if not exists progress numeric;
   alter table public.agents add column if not exists desk_position integer[];
   alter table public.agents add column if not exists character_sprite text;
   alter table public.agents add column if not exists updated_at timestamptz;

   update public.agents
   set
     role = coalesce(role, 'backend'),
     role_label_zh = coalesce(role_label_zh, '员工'),
     status = coalesce(status, 'sleeping'),
     character_sprite = coalesce(character_sprite, 'char-blue'),
     updated_at = coalesce(updated_at, timezone('utc', now()));

   alter table public.agents alter column role set default 'backend';
   alter table public.agents alter column role_label_zh set default '员工';
   alter table public.agents alter column status set default 'sleeping';
   alter table public.agents alter column character_sprite set default 'char-blue';
   alter table public.agents alter column updated_at set default timezone('utc', now());

   alter table public.agents alter column role set not null;
   alter table public.agents alter column role_label_zh set not null;
   alter table public.agents alter column status set not null;
   alter table public.agents alter column character_sprite set not null;
   alter table public.agents alter column updated_at set not null;

   do $$
   begin
     if not exists (
       select 1 from pg_constraint where conname = 'agents_role_check'
     ) then
       alter table public.agents
         add constraint agents_role_check
         check (role in ('frontend', 'backend', 'design', 'product', 'qa', 'devops', 'data', 'lead'));
     end if;

     if not exists (
       select 1 from pg_constraint where conname = 'agents_status_check'
     ) then
       alter table public.agents
         add constraint agents_status_check
         check (status in ('working', 'idle', 'thinking', 'sleeping', 'offline'));
     end if;

     if not exists (
       select 1 from pg_constraint where conname = 'agents_progress_check'
     ) then
       alter table public.agents
         add constraint agents_progress_check
         check (progress is null or (progress >= 0 and progress <= 1));
     end if;

     if not exists (
       select 1 from pg_constraint where conname = 'agents_desk_position_check'
     ) then
       alter table public.agents
         add constraint agents_desk_position_check
         check (
           desk_position is null
           or (
             array_length(desk_position, 1) = 2
             and desk_position[1] is not null
             and desk_position[2] is not null
           )
         );
     end if;
   end $$;

   create or replace function public.set_agents_updated_at()
   returns trigger
   language plpgsql
   as $$
   begin
     new.updated_at = timezone('utc', now());
     return new;
   end;
   $$;

   drop trigger if exists set_agents_updated_at on public.agents;
   create trigger set_agents_updated_at
   before update on public.agents
   for each row
   execute function public.set_agents_updated_at();

   alter table public.agents enable row level security;

   do $$
   begin
     if not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'agents'
         and policyname = 'agents_select_all'
     ) then
       create policy agents_select_all
         on public.agents
         for select
         using (true);
     end if;

     if not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'agents'
         and policyname = 'agents_insert_all'
     ) then
       create policy agents_insert_all
         on public.agents
         for insert
         with check (true);
     end if;

     if not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'agents'
         and policyname = 'agents_update_all'
     ) then
       create policy agents_update_all
         on public.agents
         for update
         using (true)
         with check (true);
     end if;
   end $$;

   grant usage on schema public to anon, authenticated, service_role;
   grant select, insert, update on public.agents to anon, authenticated, service_role;

   do $$
   begin
     if not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'agents'
     ) then
       alter publication supabase_realtime add table public.agents;
     end if;
   end $$;

   insert into public.agents (
     id,
     name,
     role,
     role_label_zh,
     status,
     current_task,
     progress,
     desk_position,
     character_sprite
   )
   values (
     'ocean-lead-01',
     'Ocean',
     'lead',
     'Boss',
     'sleeping',
     null,
     null,
     array[23, 2],
     'char-lead'
   )
   on conflict (id) do update
   set
     name = excluded.name,
     role = excluded.role,
     role_label_zh = excluded.role_label_zh,
     desk_position = excluded.desk_position,
     character_sprite = excluded.character_sprite;
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
