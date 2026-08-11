import { describe, expect, it } from "vitest";
import { computeStreak, mountainProgressPercent } from "./stats";
import type { ScheduledWorkout } from "../types";

function row(date: string, status: ScheduledWorkout["status"]): ScheduledWorkout {
  return { id: date, workoutId: "w", date, status };
}

describe("computeStreak", () => {
  it("counts consecutive completed workouts back from today", () => {
    const scheduled = [
      row("2026-08-01", "completed"),
      row("2026-08-03", "completed"),
      row("2026-08-05", "completed"),
    ];
    expect(computeStreak(scheduled, "2026-08-06")).toBe(3);
  });

  it("stops counting at the first missed workout looking backward", () => {
    const scheduled = [
      row("2026-08-01", "completed"),
      row("2026-08-03", "missed"),
      row("2026-08-05", "completed"),
      row("2026-08-07", "completed"),
    ];
    expect(computeStreak(scheduled, "2026-08-08")).toBe(2);
  });

  it("ignores still-upcoming planned workouts", () => {
    const scheduled = [row("2026-08-05", "completed"), row("2026-08-10", "planned")];
    expect(computeStreak(scheduled, "2026-08-06")).toBe(1);
  });

  it("is zero with no history", () => {
    expect(computeStreak([], "2026-08-06")).toBe(0);
  });
});

describe("mountainProgressPercent", () => {
  it("is 0% at the start of the 84-day window and 100% on the target date", () => {
    expect(mountainProgressPercent("2026-06-15")).toBe(0); // 2026-09-07 minus 84 days
    expect(mountainProgressPercent("2026-09-07")).toBe(100);
  });

  it("clamps to 0 before the window and 100 after the target date", () => {
    expect(mountainProgressPercent("2026-01-01")).toBe(0);
    expect(mountainProgressPercent("2026-12-25")).toBe(100);
  });

  it("increases roughly linearly through the window", () => {
    const mid = mountainProgressPercent("2026-07-27"); // ~42 days into the 84-day window
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(60);
  });
});
