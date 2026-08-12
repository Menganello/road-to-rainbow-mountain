-- Circuit workouts: one round = one "set" of every exercise back to back,
-- rest happens between rounds instead of between sets of the same exercise.
alter table public.workouts
  add column is_circuit boolean not null default false;
