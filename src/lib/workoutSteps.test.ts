import { describe, expect, it } from "vitest";
import { buildWorkoutSteps } from "./workoutSteps";
import type { Exercise } from "../types";

function ex(overrides: Partial<Exercise>): Exercise {
  return {
    id: overrides.name ?? "e",
    workoutId: "w",
    name: "Exercise",
    sets: 3,
    reps: "10",
    weight: null,
    restSeconds: 60,
    notes: "",
    position: 0,
    ...overrides,
  };
}

describe("buildWorkoutSteps", () => {
  it("normal workout: all sets of exercise 1, then all sets of exercise 2", () => {
    const exercises = [ex({ name: "A", sets: 2, restSeconds: 60 }), ex({ name: "B", sets: 2, restSeconds: 90 })];
    const steps = buildWorkoutSteps(exercises, false);
    expect(steps).toEqual([
      { exerciseIndex: 0, setNumber: 1, restSecondsAfter: 60, isRoundBoundary: false },
      { exerciseIndex: 0, setNumber: 2, restSecondsAfter: 60, isRoundBoundary: false },
      { exerciseIndex: 1, setNumber: 1, restSecondsAfter: 90, isRoundBoundary: false },
      { exerciseIndex: 1, setNumber: 2, restSecondsAfter: 90, isRoundBoundary: false },
    ]);
  });

  it("circuit: round-robins through every exercise once per round, rest only after the last exercise of a round", () => {
    const exercises = [
      ex({ name: "Squat", sets: 3, restSeconds: 0 }),
      ex({ name: "Push up", sets: 3, restSeconds: 0 }),
      ex({ name: "Jacks", sets: 3, restSeconds: 75 }),
    ];
    const steps = buildWorkoutSteps(exercises, true);
    expect(steps).toHaveLength(9);
    expect(steps.map((s) => [s.exerciseIndex, s.setNumber])).toEqual([
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
      [0, 3], [1, 3], [2, 3],
    ]);
    // Only the last exercise of each round carries rest.
    expect(steps.filter((s) => s.restSecondsAfter > 0).map((s) => s.exerciseIndex)).toEqual([2, 2, 2]);
    expect(steps.filter((s) => s.isRoundBoundary)).toHaveLength(3);
  });
});
