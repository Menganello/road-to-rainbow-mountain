import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { rescheduleWorkouts } from "../scheduler";
import { todayISO } from "../format";
import type { DataSource } from "./types";
import type { Exercise, ScheduledWorkout, Settings, Workout, WorkoutWithExercises } from "../../types";

function sb(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/**
 * There's a brief window right after signing in (and potentially after a background-tab
 * token refresh) where the very next request can 401 even though the session is genuinely
 * valid — a one-time retry after a short pause clears it up rather than surfacing a scary
 * error for what's really just a timing hiccup.
 */
async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const looksLikeAuthHiccup = message.includes("401") || /jwt|token|auth/i.test(message);
    if (!looksLikeAuthHiccup) throw err;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fn();
  }
}

let refreshInFlight: Promise<ScheduledWorkout[]> | null = null;

interface WorkoutRow {
  id: string;
  name: string;
  position: number;
  is_active: boolean;
  is_circuit: boolean;
}
interface ExerciseRow {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  rest_seconds: number;
  notes: string | null;
  position: number;
}
interface ScheduledRow {
  id: string;
  workout_id: string;
  date: string;
  status: "planned" | "completed" | "missed";
}
interface SettingsRow {
  preferred_days: number[];
  reminder_time: string;
  reminder_day_before: boolean;
  reminder_same_day: boolean;
  timezone: string;
}

const toWorkout = (r: WorkoutRow): Workout => ({
  id: r.id,
  name: r.name,
  position: r.position,
  isActive: r.is_active,
  isCircuit: r.is_circuit,
});
const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  workoutId: r.workout_id,
  name: r.name,
  sets: r.sets,
  reps: r.reps,
  weight: r.weight,
  restSeconds: r.rest_seconds,
  notes: r.notes ?? "",
  position: r.position,
});
const toScheduled = (r: ScheduledRow): ScheduledWorkout => ({ id: r.id, workoutId: r.workout_id, date: r.date, status: r.status });
const toSettings = (r: SettingsRow): Settings => ({
  preferredDays: r.preferred_days as Settings["preferredDays"],
  reminderTime: r.reminder_time.slice(0, 5),
  reminderDayBefore: r.reminder_day_before,
  reminderSameDay: r.reminder_same_day,
  timezone: r.timezone,
});

async function fetchOrCreateSettings(client: SupabaseClient): Promise<SettingsRow> {
  const { data, error } = await client.from("settings").select("*").maybeSingle();
  if (error) throw error;
  if (data) return data as SettingsRow;
  const { data: created, error: insertError } = await client.from("settings").insert({}).select().single();
  if (insertError) throw insertError;
  return created as SettingsRow;
}

async function fetchSchedule(client: SupabaseClient): Promise<ScheduledWorkout[]> {
  const { data, error } = await client.from("scheduled_workouts").select("*").order("date");
  if (error) throw error;
  return ((data ?? []) as ScheduledRow[]).map(toScheduled);
}

async function persistScheduleDiff(client: SupabaseClient, before: ScheduledWorkout[], after: ScheduledWorkout[]) {
  const afterIds = new Set(after.map((r) => r.id));
  const toDelete = before.filter((r) => !afterIds.has(r.id)).map((r) => r.id);
  if (toDelete.length > 0) {
    const { error } = await client.from("scheduled_workouts").delete().in("id", toDelete);
    if (error) throw error;
  }
  if (after.length > 0) {
    const { error } = await client
      .from("scheduled_workouts")
      .upsert(after.map((r) => ({ id: r.id, workout_id: r.workoutId, date: r.date, status: r.status })), { onConflict: "id" });
    if (error) throw error;
  }
}

export const supabaseSource: DataSource = {
  async listWorkouts() {
    return withAuthRetry(async () => {
      const client = sb();
      const [{ data: workouts, error }, { data: exercises, error: exError }] = await Promise.all([
        client.from("workouts").select("*").order("position"),
        client.from("exercises").select("*").order("position"),
      ]);
      if (error) throw error;
      if (exError) throw exError;
      const exRows = (exercises ?? []) as ExerciseRow[];
      return ((workouts ?? []) as WorkoutRow[]).map(
        (w): WorkoutWithExercises => ({
          ...toWorkout(w),
          exercises: exRows.filter((e) => e.workout_id === w.id).map(toExercise),
        })
      );
    });
  },

  async saveWorkout(draft) {
    const client = sb();
    let workoutId = draft.id;
    if (workoutId) {
      const { error } = await client
        .from("workouts")
        .update({
          name: draft.name,
          position: draft.position,
          is_active: draft.isActive,
          is_circuit: draft.isCircuit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workoutId);
      if (error) throw error;
      const { error: deleteError } = await client.from("exercises").delete().eq("workout_id", workoutId);
      if (deleteError) throw deleteError;
    } else {
      const { data, error } = await client
        .from("workouts")
        .insert({ name: draft.name, position: draft.position, is_active: draft.isActive, is_circuit: draft.isCircuit })
        .select()
        .single();
      if (error) throw error;
      workoutId = (data as WorkoutRow).id;
    }

    if (draft.exercises.length > 0) {
      const { error } = await client.from("exercises").insert(
        draft.exercises.map((e, i) => ({
          workout_id: workoutId,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          rest_seconds: e.restSeconds,
          notes: e.notes,
          position: i,
        }))
      );
      if (error) throw error;
    }

    const [{ data: workoutRow, error: workoutErr }, { data: exerciseRows, error: exerciseErr }] = await Promise.all([
      client.from("workouts").select("*").eq("id", workoutId).single(),
      client.from("exercises").select("*").eq("workout_id", workoutId).order("position"),
    ]);
    if (workoutErr) throw workoutErr;
    if (exerciseErr) throw exerciseErr;
    return { ...toWorkout(workoutRow as WorkoutRow), exercises: ((exerciseRows ?? []) as ExerciseRow[]).map(toExercise) };
  },

  async getSchedule() {
    return withAuthRetry(() => fetchSchedule(sb()));
  },

  async refreshSchedule() {
    // Concurrent calls (e.g. React StrictMode's dev double-invoke, or two pages loading at
    // once) must not race — two independent runs would each try to insert their own freshly
    // generated ids for the same dates and collide on the (user_id, date) unique constraint.
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = withAuthRetry(async () => {
      const client = sb();
      const [before, { data: activeWorkouts, error }, settingsRow] = await Promise.all([
        fetchSchedule(client),
        client.from("workouts").select("*").eq("is_active", true).order("position"),
        fetchOrCreateSettings(client),
      ]);
      if (error) throw error;
      const cycle = ((activeWorkouts ?? []) as WorkoutRow[]).map((w) => w.id);
      const after = rescheduleWorkouts(before, {
        today: todayISO(),
        preferredDays: toSettings(settingsRow).preferredDays,
        cycle,
      });
      await persistScheduleDiff(client, before, after);
      return after;
    });
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },

  async regenerateSchedule() {
    const client = sb();
    const { error } = await client.from("scheduled_workouts").delete().eq("status", "planned");
    if (error) throw error;
    return supabaseSource.refreshSchedule();
  },

  async moveScheduledWorkout(id, newDateISO) {
    const client = sb();
    const { error } = await client.from("scheduled_workouts").update({ date: newDateISO, status: "planned" }).eq("id", id);
    if (error) throw error;
    return fetchSchedule(client);
  },

  async completeWorkout(input) {
    const client = sb();
    const { data: session, error } = await client
      .from("workout_sessions")
      .insert({
        workout_id: input.workoutId,
        scheduled_workout_id: input.scheduledWorkoutId,
        started_at: input.startedAt,
        completed_at: input.completedAt,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.setResults.length > 0) {
      const { error: resultsError } = await client.from("set_results").insert(
        input.setResults.map((r) => ({
          session_id: (session as { id: string }).id,
          exercise_id: r.exerciseId,
          set_number: r.setNumber,
          weight: r.weight,
          reps: r.reps,
        }))
      );
      if (resultsError) throw resultsError;
    }

    if (input.scheduledWorkoutId) {
      const { error: updateError } = await client
        .from("scheduled_workouts")
        .update({ status: "completed" })
        .eq("id", input.scheduledWorkoutId);
      if (updateError) throw updateError;
    } else {
      // Ad-hoc start (e.g. tapped START on the Workouts list rather than today's scheduled
      // card): today very likely already has a row from the auto-generated schedule, so a
      // plain insert would 409 on the (user_id, date) unique constraint. Upsert instead —
      // whatever was actually done today should replace whatever was merely planned.
      const { error: adHocError } = await client
        .from("scheduled_workouts")
        .upsert(
          { workout_id: input.workoutId, date: input.completedAt.slice(0, 10), status: "completed" },
          { onConflict: "user_id,date" }
        );
      if (adHocError) throw adHocError;
    }
  },

  async getSettings() {
    return withAuthRetry(async () => toSettings(await fetchOrCreateSettings(sb())));
  },

  async saveSettings(patch) {
    const client = sb();
    await fetchOrCreateSettings(client); // ensures a row exists to update
    const { data, error } = await client
      .from("settings")
      .update({
        ...(patch.preferredDays ? { preferred_days: patch.preferredDays } : {}),
        ...(patch.reminderTime ? { reminder_time: patch.reminderTime } : {}),
        ...(patch.reminderDayBefore !== undefined ? { reminder_day_before: patch.reminderDayBefore } : {}),
        ...(patch.reminderSameDay !== undefined ? { reminder_same_day: patch.reminderSameDay } : {}),
        ...(patch.timezone ? { timezone: patch.timezone } : {}),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return toSettings(data as SettingsRow);
  },
};
