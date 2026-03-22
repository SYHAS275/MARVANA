-- Run this in your Supabase SQL editor

create table if not exists public.calls (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references auth.users(id) on delete cascade,
  to_id       uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'voice' check (type in ('voice', 'video')),
  status      text not null default 'ringing' check (status in ('ringing', 'active', 'declined', 'ended', 'missed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast incoming call lookups
create index if not exists calls_to_id_status_idx on public.calls (to_id, status, created_at desc);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger calls_updated_at
  before update on public.calls
  for each row execute function public.handle_updated_at();

-- Row Level Security
alter table public.calls enable row level security;

-- Users can see calls they are part of
create policy "calls_select" on public.calls
  for select using (auth.uid() = from_id or auth.uid() = to_id);

-- Only the caller can insert
create policy "calls_insert" on public.calls
  for insert with check (auth.uid() = from_id);

-- Both parties can update (answer, decline, end)
create policy "calls_update" on public.calls
  for update using (auth.uid() = from_id or auth.uid() = to_id);
