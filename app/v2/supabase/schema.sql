-- Momentum — Supabase schema v2
-- Run this in Supabase SQL Editor

-- ─── Habits ──────────────────────────────────────────────────────────────────

create table if not exists habits (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null check (char_length(name) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habits_user_id on habits (user_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger habits_updated_at
  before update on habits
  for each row execute function set_updated_at();

-- ─── Habit Logs ──────────────────────────────────────────────────────────────

create table if not exists habit_logs (
  id         uuid        primary key default gen_random_uuid(),
  habit_id   uuid        not null references habits(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_habit_log_per_day
  on habit_logs (habit_id, (created_at::date));

create index if not exists idx_habit_logs_habit on habit_logs (habit_id, created_at desc);
create index if not exists idx_habit_logs_user  on habit_logs (user_id,  created_at desc);

-- ─── Milestones ──────────────────────────────────────────────────────────────

create table if not exists milestones (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  target_date date        not null,
  td_days     int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_milestones_user_id on milestones (user_id);

-- ─── Snapshots (includes notes per day) ──────────────────────────────────────

create table if not exists snapshots (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  date       date        not null,
  yp         float       not null default 0,
  mp         float       not null default 0,
  wp         float       not null default 0,
  dp         float       not null default 0,
  pomo_count int         not null default 0,
  note       text        not null default '',
  updated_at timestamptz          default now(),
  unique (user_id, date)
);

create index if not exists idx_snapshots_user_date on snapshots (user_id, date desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table habits     enable row level security;
alter table habit_logs enable row level security;
alter table milestones enable row level security;
alter table snapshots  enable row level security;

create policy "habits: own"     on habits     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habit_logs: own" on habit_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "milestones: own" on milestones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "snapshots: own"  on snapshots  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
