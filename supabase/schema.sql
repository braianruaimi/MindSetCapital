-- ============================================
-- MindSet Capital - Supabase Schema
-- Ejecutar en SQL Editor de Supabase
-- ============================================

create table if not exists public.clientes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.prestamos (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.pagos (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.config (
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.clientes enable row level security;
alter table public.prestamos enable row level security;
alter table public.pagos enable row level security;
alter table public.config enable row level security;

create policy if not exists "clientes_select_own" on public.clientes
for select using (auth.uid() = user_id);
create policy if not exists "clientes_insert_own" on public.clientes
for insert with check (auth.uid() = user_id);
create policy if not exists "clientes_update_own" on public.clientes
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "clientes_delete_own" on public.clientes
for delete using (auth.uid() = user_id);

create policy if not exists "prestamos_select_own" on public.prestamos
for select using (auth.uid() = user_id);
create policy if not exists "prestamos_insert_own" on public.prestamos
for insert with check (auth.uid() = user_id);
create policy if not exists "prestamos_update_own" on public.prestamos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "prestamos_delete_own" on public.prestamos
for delete using (auth.uid() = user_id);

create policy if not exists "pagos_select_own" on public.pagos
for select using (auth.uid() = user_id);
create policy if not exists "pagos_insert_own" on public.pagos
for insert with check (auth.uid() = user_id);
create policy if not exists "pagos_update_own" on public.pagos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "pagos_delete_own" on public.pagos
for delete using (auth.uid() = user_id);

create policy if not exists "config_select_own" on public.config
for select using (auth.uid() = user_id);
create policy if not exists "config_insert_own" on public.config
for insert with check (auth.uid() = user_id);
create policy if not exists "config_update_own" on public.config
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "config_delete_own" on public.config
for delete using (auth.uid() = user_id);
