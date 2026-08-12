import type { DataSource } from "./types";
import type { Exercise, ScheduledWorkout, Settings, Workout, WorkoutSession, WorkoutWithExercises } from "../../types";
import { DEMO_EXERCISES, DEMO_SCHEDULE, DEMO_SESSIONS, DEMO_SETTINGS, DEMO_WORKOUTS } from "../demoData";
import { rescheduleWorkouts } from "../scheduler";
import { todayISO } from "../format";

const STORAGE_KEY = "rrm.demo.v1";

interface DemoStore {
  version: 1;
  workouts: Workout[];
  exercises: Exercise[];
  scheduled: ScheduledWorkout[];
  sessions: WorkoutSession[];
  settings: Settings;
}

function freshStore(): DemoStore {
  return {
    version: 1,
    workouts: DEMO_WORKOUTS,
    exercises: DEMO_EXERCISES,
    scheduled: DEMO_SCHEDULE,
    sessions: DEMO_SESSIONS,
    settings: DEMO_SETTINGS,
  };
}

function loadStore(): DemoStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoStore;
      if (parsed.version === 1) return parsed;
    } catch {
      // fall through to a fresh seed
    }
  }
  const fresh = freshStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(store: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function newId(): string {
  return crypto.randomUUID();
}

function toWorkoutWithExercises(store: DemoStore, w: Workout): WorkoutWithExercises {
  return {
    ...w,
    exercises: store.exercises.filter((e) => e.workoutId === w.id).sort((a, b) => a.position - b.position),
  };
}

export const demoSource: DataSource = {
  async listWorkouts() {
    const store = loadStore();
    return [...store.workouts].sort((a, b) => a.position - b.position).map((w) => toWorkoutWithExercises(store, w));
  },

  async saveWorkout(draft) {
    const store = loadStore();
    let workout: Workout;
    if (draft.id) {
      const existing = store.workouts.find((w) => w.id === draft.id);
      if (!existing) throw new Error("Workout not found");
      workout = { ...existing, name: draft.name, position: draft.position, isActive: draft.isActive };
      store.workouts = store.workouts.map((w) => (w.id === workout.id ? workout : w));
    } else {
      workout = { id: newId(), name: draft.name, position: draft.position, isActive: draft.isActive };
      store.workouts = [...store.workouts, workout];
    }
    store.exercises = store.exercises.filter((e) => e.workoutId !== workout.id);
    store.exercises.push(...draft.exercises.map((e, i) => ({ ...e, id: newId(), workoutId: workout.id, position: i })));
    saveStore(store);
    return toWorkoutWithExercises(store, workout);
  },

  async getSchedule() {
    return loadStore().scheduled;
  },

  async refreshSchedule() {
    const store = loadStore();
    const cycle = store.workouts
      .filter((w) => w.isActive)
      .sort((a, b) => a.position - b.position)
      .map((w) => w.id);
    const updated = rescheduleWorkouts(store.scheduled, {
      today: todayISO(),
      preferredDays: store.settings.preferredDays,
      cycle,
    });
    store.scheduled = updated;
    saveStore(store);
    return updated;
  },

  async regenerateSchedule() {
    const store = loadStore();
    store.scheduled = store.scheduled.filter((r) => r.status !== "planned");
    saveStore(store);
    return demoSource.refreshSchedule();
  },

  async moveScheduledWorkout(id, newDateISO) {
    const store = loadStore();
    store.scheduled = store.scheduled.map((r) => (r.id === id ? { ...r, date: newDateISO, status: "planned" as const } : r));
    saveStore(store);
    return store.scheduled;
  },

  async completeWorkout(input) {
    const store = loadStore();
    const session: WorkoutSession = {
      id: newId(),
      workoutId: input.workoutId,
      scheduledWorkoutId: input.scheduledWorkoutId,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      setResults: input.setResults,
    };
    store.sessions = [...store.sessions, session];

    if (input.scheduledWorkoutId) {
      const scheduledId = input.scheduledWorkoutId;
      store.scheduled = store.scheduled.map((r) => (r.id === scheduledId ? { ...r, status: "completed" as const } : r));
    } else {
      // Ad-hoc start: create a same-day completed row so the cycle position stays honest.
      const adHoc: ScheduledWorkout = {
        id: newId(),
        workoutId: input.workoutId,
        date: input.completedAt.slice(0, 10),
        status: "completed",
      };
      store.scheduled = [...store.scheduled, adHoc];
    }
    saveStore(store);
  },

  async getSettings() {
    return loadStore().settings;
  },

  async saveSettings(patch) {
    const store = loadStore();
    store.settings = { ...store.settings, ...patch };
    saveStore(store);
    return store.settings;
  },
};
