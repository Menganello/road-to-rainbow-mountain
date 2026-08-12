import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "../components/Button";
import { Timer } from "../components/Timer";
import { dataSource } from "../lib/data";
import { primeAudio } from "../lib/audio";
import { useRestTimer } from "../lib/timer";
import { buildWorkoutSteps, type WorkoutStep } from "../lib/workoutSteps";
import {
  clearActiveSession,
  loadActiveSession,
  newActiveSession,
  saveActiveSession,
  type ActiveSessionState,
  type LoggedSet,
} from "../lib/session";
import type { Exercise, SetResult, WorkoutWithExercises } from "../types";

type Phase = "exercise" | "resting" | "exercise-done" | "workout-done";

function parseTargetReps(reps: string): number {
  const match = reps.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function WorkoutSession() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const location = useLocation() as { state?: { scheduledWorkoutId?: string } };
  const navigate = useNavigate();

  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [stepIndex, setStepIndex] = useState(0);
  const [setResults, setSetResults] = useState<Record<string, LoggedSet[]>>({});
  const [actualWeight, setActualWeight] = useState(0);
  const [actualReps, setActualReps] = useState(0);
  const scheduledWorkoutIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const steps = useMemo(
    () => buildWorkoutSteps(workout?.exercises ?? [], workout?.isCircuit ?? false),
    [workout]
  );
  const currentStep: WorkoutStep | undefined = steps[stepIndex];
  const currentExercise = workout && currentStep ? workout.exercises[currentStep.exerciseIndex] : undefined;

  const restTimer = useRestTimer({
    onComplete: () => advanceAfterRest(),
    onEndTimestampChange: (endTimestamp) => {
      persist({
        restTimer:
          endTimestamp && currentExercise && currentStep
            ? { endTimestamp, exerciseId: currentExercise.id, setNumber: currentStep.setNumber }
            : null,
      });
    },
  });

  useEffect(() => {
    if (!workoutId) return;
    const id = workoutId;
    primeAudio();
    let cancelled = false;
    async function load() {
      const workouts = await dataSource.listWorkouts();
      const w = workouts.find((x) => x.id === id);
      if (!w || cancelled) return;
      setWorkout(w);
      const builtSteps = buildWorkoutSteps(w.exercises, w.isCircuit);

      const saved = loadActiveSession();
      if (saved && saved.workoutId === id) {
        scheduledWorkoutIdRef.current = saved.scheduledWorkoutId;
        startedAtRef.current = saved.startedAt;
        setSetResults(saved.setResults);
        const idx = Math.min(saved.stepIndex, Math.max(0, builtSteps.length - 1));
        setStepIndex(idx);
        const step = builtSteps[idx];
        const ex = step ? w.exercises[step.exerciseIndex] : undefined;
        if (saved.restTimer && ex) {
          setPhase("resting");
          restTimer.resume(saved.restTimer.endTimestamp);
        }
        primeActualInputs(ex, step ? step.setNumber - 1 : 0, saved.setResults);
      } else {
        scheduledWorkoutIdRef.current = location.state?.scheduledWorkoutId ?? null;
        const fresh = newActiveSession(id, scheduledWorkoutIdRef.current);
        startedAtRef.current = fresh.startedAt;
        saveActiveSession(fresh);
        primeActualInputs(w.exercises[0], 0, {});
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  function primeActualInputs(exercise: Exercise | undefined, setIdx: number, results: Record<string, LoggedSet[]>) {
    if (!exercise) return;
    const logged = results[exercise.id]?.[setIdx];
    setActualWeight(logged?.weight ?? exercise.weight ?? 0);
    setActualReps(logged?.reps ?? parseTargetReps(exercise.reps));
  }

  function persist(patch: Partial<ActiveSessionState>) {
    if (!workoutId) return;
    const current = loadActiveSession();
    const base: ActiveSessionState =
      current && current.workoutId === workoutId
        ? current
        : newActiveSession(workoutId, scheduledWorkoutIdRef.current);
    saveActiveSession({ ...base, ...patch });
  }

  if (!workout) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-rainbow-blue">
        <p className="font-display text-xs text-white animate-pulse">LOADING 🌈</p>
      </div>
    );
  }

  // A stable non-null binding: TypeScript can't carry the `!workout` narrowing above into the
  // sibling function declarations below (advanceAfterRest, handleNextExercise, finishWorkout).
  const w = workout;

  function goToStep(index: number) {
    const step = steps[index];
    setStepIndex(index);
    primeActualInputs(step ? w.exercises[step.exerciseIndex] : undefined, step ? step.setNumber - 1 : 0, setResults);
    persist({ stepIndex: index, restTimer: null });
    setPhase("exercise");
  }

  function handleCompleteSet() {
    if (!currentStep || !currentExercise) return;
    const logged: LoggedSet = { setNumber: currentStep.setNumber, weight: actualWeight || null, reps: actualReps || null };
    const updatedResults = {
      ...setResults,
      [currentExercise.id]: [
        ...(setResults[currentExercise.id] ?? []).filter((s) => s.setNumber !== logged.setNumber),
        logged,
      ],
    };
    setSetResults(updatedResults);
    persist({ setResults: updatedResults, stepIndex });

    if (currentStep.restSecondsAfter > 0) {
      setPhase("resting");
      restTimer.start(currentStep.restSecondsAfter);
    } else {
      advanceAfterRest(); // no rest configured here — go straight to the next step
    }
  }

  function advanceAfterRest() {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      void finishWorkout();
      return;
    }
    const nextStep = steps[nextIndex];
    const movingToNewExercise = !currentStep || nextStep.exerciseIndex !== currentStep.exerciseIndex;
    if (!w.isCircuit && movingToNewExercise) {
      // Circuits flow straight from one exercise to the next within a round; only a normal
      // workout pauses on a "exercise done, tap to continue" screen between exercises.
      persist({ restTimer: null });
      setPhase("exercise-done");
      return;
    }
    goToStep(nextIndex);
  }

  function handleNextExercise() {
    goToStep(stepIndex + 1);
  }

  async function finishWorkout() {
    const flatResults: SetResult[] = Object.entries(setResults).flatMap(([exerciseId, sets]) =>
      sets.map((s) => ({ exerciseId, setNumber: s.setNumber, weight: s.weight, reps: s.reps }))
    );
    await dataSource.completeWorkout({
      workoutId: w.id,
      scheduledWorkoutId: scheduledWorkoutIdRef.current,
      startedAt: startedAtRef.current,
      completedAt: new Date().toISOString(),
      setResults: flatResults,
    });
    clearActiveSession();
    setPhase("workout-done");
  }

  function handleClose() {
    navigate("/");
  }

  const progressLabel =
    currentStep && currentExercise
      ? w.isCircuit
        ? `${currentStep.exerciseIndex + 1} / ${w.exercises.length}`
        : `SET ${currentStep.setNumber} / ${currentExercise.sets}`
      : "";

  return (
    <div className="flex min-h-dvh flex-col bg-rainbow-blue text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="font-display text-[9px] text-white/60">ROAD TO RAINBOW MOUNTAIN</p>
          <p className="font-display text-xs text-rainbow-yellow">{workout.name.toUpperCase()}</p>
          {w.isCircuit && currentStep && (
            <p className="mt-1 font-display text-[10px] text-rainbow-turquoise">
              GIRO {currentStep.setNumber} / {w.exercises[0]?.sets ?? 0}
            </p>
          )}
        </div>
        <button onClick={handleClose} aria-label="Close" className="p-2 text-white/70">
          <X size={22} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {phase === "exercise" && currentExercise && (
          <ExercisePhase
            exercise={currentExercise}
            progressLabel={progressLabel}
            weight={actualWeight}
            reps={actualReps}
            onWeightChange={setActualWeight}
            onRepsChange={setActualReps}
            onComplete={handleCompleteSet}
          />
        )}

        {phase === "resting" && (
          <Timer
            remainingMs={restTimer.remainingMs}
            totalMs={currentStep ? currentStep.restSecondsAfter * 1000 : 0}
            onAdd15={() => restTimer.addSeconds(15)}
            onAdd30={() => restTimer.addSeconds(30)}
            onSkip={restTimer.skip}
          />
        )}

        {phase === "exercise-done" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-5xl">🎉</p>
            <p className="font-display text-sm text-rainbow-yellow">{currentExercise?.name.toUpperCase()} DONE</p>
            <Button tone="turquoise" onClick={handleNextExercise}>
              NEXT EXERCISE
            </Button>
          </div>
        )}

        {phase === "workout-done" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-6xl">🌈</p>
            <p className="font-display text-base text-rainbow-yellow">WORKOUT COMPLETE</p>
            <p className="text-sm text-white/70">Another step toward Rainbow Mountain.</p>
            <Button tone="pink" onClick={() => navigate("/")}>
              BACK HOME
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ExercisePhaseProps {
  exercise: Exercise;
  progressLabel: string;
  weight: number;
  reps: number;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onComplete: () => void;
}

function ExercisePhase({ exercise, progressLabel, weight, reps, onWeightChange, onRepsChange, onComplete }: ExercisePhaseProps) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-8 text-center">
      <h1 className="font-display text-2xl leading-snug text-white">{exercise.name.toUpperCase()}</h1>

      <div className="flex w-full items-center justify-center gap-6">
        <Stepper label="KG" value={weight} step={2.5} onChange={onWeightChange} />
        <Stepper label="REPS" value={reps} step={1} onChange={onRepsChange} />
      </div>

      <p className="font-display text-sm text-rainbow-turquoise">{progressLabel}</p>

      <Button tone="yellow" onClick={onComplete}>
        COMPLETE SET
      </Button>
    </div>
  );
}

function Stepper({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold tracking-wide text-white/50">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, Math.round((value - step) * 10) / 10))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold"
        >
          −
        </button>
        <span className="w-14 font-display text-2xl tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.round((value + step) * 10) / 10)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
