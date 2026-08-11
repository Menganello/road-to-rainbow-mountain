import type { Exercise, ScheduledWorkout, Settings, Workout, WorkoutSession } from "../types";
import { addDays, todayISO } from "./format";
import { generateSchedule } from "./scheduler";

export const DEMO_WORKOUTS: Workout[] = [
  { id: "w-a", name: "Workout A", position: 0, isActive: true },
  { id: "w-b", name: "Workout B", position: 1, isActive: true },
  { id: "w-c", name: "Workout C", position: 2, isActive: true },
];

export const DEMO_EXERCISES: Exercise[] = [
  // Workout A — squat focus
  { id: "e-a1", workoutId: "w-a", name: "Squat", sets: 4, reps: "8", weight: 70, restSeconds: 120, notes: "", position: 0 },
  { id: "e-a2", workoutId: "w-a", name: "Bench Press", sets: 3, reps: "10", weight: 35, restSeconds: 90, notes: "", position: 1 },
  { id: "e-a3", workoutId: "w-a", name: "Bent-Over Row", sets: 3, reps: "10", weight: 40, restSeconds: 90, notes: "", position: 2 },
  { id: "e-a4", workoutId: "w-a", name: "Plank", sets: 3, reps: "45s", weight: null, restSeconds: 45, notes: "", position: 3 },
  // Workout B — deadlift focus
  { id: "e-b1", workoutId: "w-b", name: "Deadlift", sets: 4, reps: "6", weight: 60, restSeconds: 120, notes: "", position: 0 },
  { id: "e-b2", workoutId: "w-b", name: "Overhead Press", sets: 3, reps: "8", weight: 25, restSeconds: 90, notes: "", position: 1 },
  { id: "e-b3", workoutId: "w-b", name: "Pull-Up", sets: 3, reps: "6-8", weight: null, restSeconds: 90, notes: "Assisted if needed", position: 2 },
  { id: "e-b4", workoutId: "w-b", name: "Hanging Leg Raise", sets: 3, reps: "12", weight: null, restSeconds: 45, notes: "", position: 3 },
  // Workout C — accessory / conditioning
  { id: "e-c1", workoutId: "w-c", name: "Front Squat", sets: 3, reps: "8", weight: 45, restSeconds: 120, notes: "", position: 0 },
  { id: "e-c2", workoutId: "w-c", name: "Incline Dumbbell Press", sets: 3, reps: "10", weight: 16, restSeconds: 75, notes: "", position: 1 },
  { id: "e-c3", workoutId: "w-c", name: "Lat Pulldown", sets: 3, reps: "12", weight: 45, restSeconds: 75, notes: "", position: 2 },
  { id: "e-c4", workoutId: "w-c", name: "Farmer's Carry", sets: 3, reps: "30m", weight: 20, restSeconds: 60, notes: "", position: 3 },
];

export const DEMO_SETTINGS: Settings = {
  preferredDays: [1, 3, 6], // Mon, Wed, Sat
  reminderTime: "20:00",
  reminderDayBefore: true,
  reminderSameDay: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome",
};

const CYCLE = DEMO_WORKOUTS.filter((w) => w.isActive)
  .sort((a, b) => a.position - b.position)
  .map((w) => w.id);

/** Builds a believable demo month: a few completed weeks behind us, the rest generated ahead. */
function buildDemoSchedule(): { scheduled: ScheduledWorkout[]; sessions: WorkoutSession[] } {
  const today = todayISO();
  const start = addDays(today, -21);
  const rows = generateSchedule(addDays(start, -1), 6, DEMO_SETTINGS.preferredDays, CYCLE);

  const sessions: WorkoutSession[] = [];
  const scheduled = rows.map((r) => {
    if (r.date >= today) return r; // future stays planned
    // Past: mark completed except one deliberately missed slot, to demo rescheduling.
    if (r.date === addDays(today, -9)) {
      return { ...r, status: "missed" as const };
    }
    const completedAt = `${r.date}T18:30:00`;
    sessions.push({
      id: `s-${r.id}`,
      workoutId: r.workoutId,
      scheduledWorkoutId: r.id,
      startedAt: `${r.date}T17:40:00`,
      completedAt,
      setResults: [],
    });
    return { ...r, status: "completed" as const };
  });

  return { scheduled, sessions };
}

export const { scheduled: DEMO_SCHEDULE, sessions: DEMO_SESSIONS } = buildDemoSchedule();
