-- ============================================================
-- 汇普报价系统 · Supabase 数据表 + 行级安全策略（RLS）
-- 用法：登录 Supabase 控制台 → 左侧 SQL Editor → 粘贴本脚本 → 右上角 Run
-- 只需执行一次。表结构必须与 app 中的 cloud.database.from("表名") 完全一致。
-- ============================================================

-- 1) 工作区成员（谁属于这个工厂工作区、什么权限）
create table if not exists public.quotation_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id uuid not null,
  role text not null default 'editor',
  perms jsonb,
  status text not null default 'active',
  invited_by text,
  joined_at timestamptz default now()
);
create unique index if not exists idx_qm_ws_user
  on public.quotation_members(workspace_id, user_id);

-- 2) 工作区共享状态（报价参数 / 资料库 / 常用参数快照，管理员维护、员工实时同步）
create table if not exists public.quotation_state (
  workspace_id text primary key,
  owner_id uuid,
  data jsonb,
  updated_at timestamptz default now()
);

-- 3) 报价单保存记录（员工每次保存的报价单）
create table if not exists public.quotation_saves (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id uuid,
  user_name text,
  title text,
  created_at timestamptz default now(),
  data jsonb
);

-- 4) 邀请令牌（管理员生成的加入链接令牌）
create table if not exists public.quotation_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  workspace_id text not null,
  role text not null default 'editor',
  perms jsonb,
  status text not null default 'open',
  created_by text,
  created_at timestamptz default now()
);

-- ===================== 行级安全（RLS）=====================
-- 说明：这是工厂内部协作工具，登录用户之间互信。
-- 下面策略 = 任何已登录用户对本工作区数据可读写；如需更严格（例如员工只能看自己的报价单），
-- 可后续收紧。先保证「能登录、能同步」跑通。
alter table public.quotation_members enable row level security;
alter table public.quotation_state  enable row level security;
alter table public.quotation_saves   enable row level security;
alter table public.quotation_invites enable row level security;

drop policy if exists auth_all_members  on public.quotation_members;
drop policy if exists auth_all_state    on public.quotation_state;
drop policy if exists auth_all_saves    on public.quotation_saves;
drop policy if exists auth_all_invites  on public.quotation_invites;

create policy auth_all_members  on public.quotation_members for all to authenticated using (true) with check (true);
create policy auth_all_state    on public.quotation_state  for all to authenticated using (true) with check (true);
create policy auth_all_saves    on public.quotation_saves   for all to authenticated using (true) with check (true);
create policy auth_all_invites  on public.quotation_invites for all to authenticated using (true) with check (true);
