import type { Exercise } from "../types";

export interface WorkoutStep {
  exerciseIndex: number;
  /** 1-indexed "set N" for a normal exercise, or "round N" for a circuit. */
  setNumber: number;
  restSecondsAfter: number;
  /** Circuit only: true when this step is the last exercise of its round (where rest happens). */
  isRoundBoundary: boolean;
}

/**
 * Normal workout: exercise 1's sets in order, then exercise 2's sets, etc.
 * Circuit: round 1 = one pass through every exercise in order, then round 2, etc. — rest only
 * follows the last exercise of a round (assumes every exercise in a circuit shares the same
 * `sets` count, i.e. the same number of rounds, which is how excel.ts's circuit import builds it).
 */
export function buildWorkoutSteps(exercises: Exercise[], isCircuit: boolean): WorkoutStep[] {
  if (exercises.length === 0) return [];
  const steps: WorkoutStep[] = [];

  if (isCircuit) {
    const rounds = exercises[0].sets;
    for (let round = 0; round < rounds; round++) {
      exercises.forEach((ex, exerciseIndex) => {
        const isLast = exerciseIndex === exercises.length - 1;
        steps.push({
          exerciseIndex,
          setNumber: round + 1,
          restSecondsAfter: isLast ? ex.restSeconds : 0,
          isRoundBoundary: isLast,
        });
      });
    }
  } else {
    exercises.forEach((ex, exerciseIndex) => {
      for (let s = 0; s < ex.sets; s++) {
        steps.push({ exerciseIndex, setNumber: s + 1, restSecondsAfter: ex.restSeconds, isRoundBoundary: false });
      }
    });
  }

  return steps;
}
