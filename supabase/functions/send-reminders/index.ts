// Deno edge function — runs on an hourly cron (see supabase/functions/send-reminders/README.md).
// Compares the current hour, in the user's stored timezone, to their reminder_time; sends at
// most one email per day (guarded by settings.last_reminder_sent_date).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SettingsRow {
  user_id: string;
  reminder_time: string;
  reminder_day_before: boolean;
  reminder_same_day: boolean;
  timezone: string;
  last_reminder_sent_date: string | null;
}

interface ScheduledRow {
  id: string;
  workout_id: string;
  date: string;
  status: string;
}

function partsInTimezone(date: Date, timeZone: string): { dateStr: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function estimateMinutes(exercises: { sets: number; rest_seconds: number }[]): number {
  const totalSeconds = exercises.reduce((sum, ex) => sum + ex.sets * 35 + Math.max(0, ex.sets - 1) * ex.rest_seconds, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return new Response("Missing RESEND_API_KEY secret", { status: 500 });

  const client = createClient(supabaseUrl, serviceRoleKey);

  const { data: settingsRow, error: settingsError } = await client
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle<SettingsRow>();
  if (settingsError) return new Response(settingsError.message, { status: 500 });
  if (!settingsRow) return new Response("No settings row yet", { status: 200 });

  const { dateStr: todayStr, hour } = partsInTimezone(new Date(), settingsRow.timezone);
  const reminderHour = Number(settingsRow.reminder_time.slice(0, 2));

  if (hour !== reminderHour) return new Response("Not the reminder hour yet", { status: 200 });
  if (settingsRow.last_reminder_sent_date === todayStr) return new Response("Already sent today", { status: 200 });

  const tomorrowStr = addDaysStr(todayStr, 1);
  const targetDates: string[] = [];
  if (settingsRow.reminder_same_day) targetDates.push(todayStr);
  if (settingsRow.reminder_day_before) targetDates.push(tomorrowStr);

  if (targetDates.length > 0) {
    const { data: scheduledRows, error: schedError } = await client
      .from("scheduled_workouts")
      .select("*")
      .in("date", targetDates)
      .eq("status", "planned")
      .returns<ScheduledRow[]>();
    if (schedError) return new Response(schedError.message, { status: 500 });

    const { data: usersData, error: usersError } = await client.auth.admin.listUsers();
    if (usersError) return new Response(usersError.message, { status: 500 });
    const email = usersData.users[0]?.email;

    if (email) {
      for (const row of scheduledRows ?? []) {
        const [{ data: workout }, { data: exercises }] = await Promise.all([
          client.from("workouts").select("name").eq("id", row.workout_id).single(),
          client.from("exercises").select("sets, rest_seconds").eq("workout_id", row.workout_id),
        ]);
        const minutes = estimateMinutes(exercises ?? []);
        const dayLabel = row.date === todayStr ? "Today" : "Tomorrow";
        const workoutName = (workout as { name?: string } | null)?.name ?? "your workout";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Road to Rainbow Mountain <onboarding@resend.dev>",
            to: [email],
            subject: "Road to Rainbow Mountain 🌈",
            html: `<p>${dayLabel} is <strong>${workoutName}</strong>.</p><p>${(exercises ?? []).length} exercises<br/>Estimated time: ${minutes} min</p><p>Another step toward Rainbow Mountain.</p>`,
          }),
        });
      }
    }
  }

  await client.from("settings").update({ last_reminder_sent_date: todayStr }).eq("user_id", settingsRow.user_id);
  return new Response("OK", { status: 200 });
});
