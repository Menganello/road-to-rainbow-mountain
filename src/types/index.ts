export type ISOWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Monday ... 7=Sunday

export interface Workout {
  id: string;
  name: string;
  position: number; // 0,1,2 => A,B,C cycle order
  isActive: boolean;
  /** Circuit: one round = one "set" of every exercise, back to back; rest happens between rounds. */
  isCircuit: boolean;
}

export interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: string; // target, e.g. "8" or "8-12"
  weight: number | null; // kg, target
  restSeconds: number;
  notes: string;
  position: number;
}

export type ScheduledWorkoutStatus = "planned" | "completed" | "missed";

export interface ScheduledWorkout {
  id: string;
  workoutId: string;
  date: string; // 'YYYY-MM-DD'
  status: ScheduledWorkoutStatus;
}

export interface SetResult {
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  scheduledWorkoutId: string | null;
  startedAt: string; // ISO datetime
  completedAt: string | null;
  setResults: SetResult[];
}

export interface Settings {
  preferredDays: ISOWeekday[]; // exactly 3
  reminderTime: string; // 'HH:mm'
  reminderDayBefore: boolean;
  reminderSameDay: boolean;
  timezone: string;
}

export interface WorkoutWithExercises extends Workout {
  exercises: Exercise[];
}
