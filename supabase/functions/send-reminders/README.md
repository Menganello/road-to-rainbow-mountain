# send-reminders

Checks once an hour whether it's time to send today's workout reminder email (Resend), based on
`settings.reminder_time`/`reminder_day_before`/`reminder_same_day`/`timezone`. Idempotent via
`settings.last_reminder_sent_date` — safe to invoke more than once an hour.

## Deploy

```
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set RESEND_API_KEY=<your-resend-api-key>
npx supabase functions deploy send-reminders
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the platform — no need to set them.

## Schedule (hourly, via pg_cron + pg_net)

Run once in the Supabase SQL Editor (enables the extensions if not already on):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.functions.supabase.co/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-service-role-key>',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## Test manually

```
npx supabase functions invoke send-reminders
```
