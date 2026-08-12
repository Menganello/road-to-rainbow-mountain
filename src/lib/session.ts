const STORAGE_KEY = "rrm.activeSession.v2";

export interface LoggedSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface RestTimerState {
  endTimestamp: number;
  exerciseId: string;
  setNumber: number;
}

export interface ActiveSessionState {
  version: 2;
  workoutId: string;
  scheduledWorkoutId: string | null;
  startedAt: string;
  /** Index into the workout's step sequence (see lib/workoutSteps.ts) — one step per set,
   * or per circuit round-position for circuit workouts. */
  stepIndex: number;
  setResults: Record<string, LoggedSet[]>;
  restTimer: RestTimerState | null;
  lastUpdatedAt: string;
}

export function saveActiveSession(state: ActiveSessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastUpdatedAt: new Date().toISOString() }));
}

export function loadActiveSession(): ActiveSessionState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveSessionState;
    return parsed.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function newActiveSession(workoutId: string, scheduledWorkoutId: string | null): ActiveSessionState {
  return {
    version: 2,
    workoutId,
    scheduledWorkoutId,
    startedAt: new Date().toISOString(),
    stepIndex: 0,
    setResults: {},
    restTimer: null,
    lastUpdatedAt: new Date().toISOString(),
  };
}
