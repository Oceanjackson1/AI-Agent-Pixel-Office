-- AI-Agent-Pixel-Office
-- Paste this file into Supabase SQL Editor and run it once.
-- It is intentionally idempotent so it can also repair an older table
-- created from the previous documentation.

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
    select 1
    from pg_constraint
    where conname = 'agents_role_check'
  ) then
    alter table public.agents
      add constraint agents_role_check
      check (role in ('frontend', 'backend', 'design', 'product', 'qa', 'devops', 'data', 'lead'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_status_check'
  ) then
    alter table public.agents
      add constraint agents_status_check
      check (status in ('working', 'idle', 'thinking', 'sleeping', 'offline'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_progress_check'
  ) then
    alter table public.agents
      add constraint agents_progress_check
      check (progress is null or (progress >= 0 and progress <= 1));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_desk_position_check'
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
