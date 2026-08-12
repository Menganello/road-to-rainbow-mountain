-- Allow more than one workout (e.g. a bonus/extra session) on the same calendar day.
drop index if exists public.scheduled_workouts_user_date_uk;
