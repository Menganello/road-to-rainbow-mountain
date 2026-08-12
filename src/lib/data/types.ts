import type {
  Exercise,
  ScheduledWorkout,
  Settings,
  SetResult,
  WorkoutWithExercises,
} from "../../types";

export interface WorkoutDraft {
  id?: string;
  name: string;
  position: number;
  isActive: boolean;
  isCircuit: boolean;
  exercises: Omit<Exercise, "id" | "workoutId">[];
}

export interface CompleteWorkoutInput {
  workoutId: string;
  scheduledWorkoutId: string | null;
  startedAt: string;
  completedAt: string;
  setResults: SetResult[];
}

export interface DataSource {
  listWorkouts(): Promise<WorkoutWithExercises[]>;
  saveWorkout(draft: WorkoutDraft): Promise<WorkoutWithExercises>;

  getSchedule(): Promise<ScheduledWorkout[]>;
  /** Marks misses, repairs the current week, and regenerates the future window; persists and returns the result. */
  refreshSchedule(): Promise<ScheduledWorkout[]>;
  /**
   * Discards every not-yet-happened ('planned') scheduled workout — keeping completed/missed
   * history intact — then rebuilds the schedule from scratch against the current settings.
   * Used after a preferred-days change so the new days take effect this week, not next.
   */
  regenerateSchedule(): Promise<ScheduledWorkout[]>;
  /** Explicit user override (e.g. Home's "MOVE TO TODAY" / "CHOOSE DATE"). */
  moveScheduledWorkout(id: string, newDateISO: string): Promise<ScheduledWorkout[]>;

  completeWorkout(input: CompleteWorkoutInput): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}
