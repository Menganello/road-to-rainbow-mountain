const STORAGE_KEY = "rrm.activeSession.v1";

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
  version: 1;
  workoutId: string;
  scheduledWorkoutId: string | null;
  startedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
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
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function newActiveSession(workoutId: string, scheduledWorkoutId: string | null): ActiveSessionState {
  return {
    version: 1,
    workoutId,
    scheduledWorkoutId,
    startedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    setResults: {},
    restTimer: null,
    lastUpdatedAt: new Date().toISOString(),
  };
}
