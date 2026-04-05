-- Momentum — Supabase schema
-- Run this in Supabase SQL Editor

-- Daily snapshots (time progress + note + pomodoro)
create table if not exists snapshots (
  date        date primary key,
  yp          float not null default 0,
  mp          float not null default 0,
  wp          float not null default 0,
  dp          float not null default 0,
  pomo_count  int   not null default 0,
  note        text  not null default '',
  updated_at  timestamptz default now()
);

-- Habits
create table if not exists habits (
  id          bigint primary key,
  name        text   not null,
  position    int    not null default 0,
  created_at  timestamptz default now()
);

-- Habit completions per day
create table if not exists habit_logs (
  habit_id  bigint references habits(id) on delete cascade,
  date      date   not null,
  primary key (habit_id, date)
);

-- Milestones
create table if not exists milestones (
  id           bigint primary key,
  name         text not null,
  target_date  date not null,
  td_days      int  not null default 0,
  created_at   timestamptz default now()
);

-- Allow public read/write (personal app, no auth)
alter table snapshots  enable row level security;
alter table habits     enable row level security;
alter table habit_logs enable row level security;
alter table milestones enable row level security;

create policy "public all" on snapshots  for all using (true) with check (true);
create policy "public all" on habits     for all using (true) with check (true);
create policy "public all" on habit_logs for all using (true) with check (true);
create policy "public all" on milestones for all using (true) with check (true);
