-- Road to Rainbow Mountain — initial schema.
-- Single-user app: every table carries user_id so every RLS policy is the
-- identical one-liner `user_id = auth.uid()`, no joins/subqueries needed.

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  position integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name text not null,
  sets integer not null,
  reps text not null,
  weight numeric,
  rest_seconds integer not null default 60,
  notes text not null default '',
  position integer not null default 0
);
create index exercises_workout_position_idx on public.exercises(workout_id, position);

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete restrict,
  date date not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'missed')),
  created_at timestamptz not null default now()
);
create unique index scheduled_workouts_user_date_uk on public.scheduled_workouts(user_id, date);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete restrict,
  scheduled_workout_id uuid references public.scheduled_workouts(id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz
);

create table public.set_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric,
  reps integer,
  unique (session_id, exercise_id, set_number)
);
create index set_results_session_idx on public.set_results(session_id);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  preferred_days integer[] not null default '{1,3,6}' check (cardinality(preferred_days) = 3),
  reminder_time time not null default '20:00',
  reminder_day_before boolean not null default true,
  reminder_same_day boolean not null default false,
  timezone text not null default 'Europe/Rome',
  last_reminder_sent_date date,
  updated_at timestamptz not null default now()
);

alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_results enable row level security;
alter table public.settings enable row level security;

create policy "own rows" on public.workouts for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.exercises for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.scheduled_workouts for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.workout_sessions for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.set_results for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.settings for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
