import { describe, expect, it } from "vitest";
import { generateSchedule, rescheduleWorkouts } from "./scheduler";
import type { ScheduledWorkout } from "../types";

const CYCLE = ["A", "B", "C"];
const MON_WED_SAT: (1 | 3 | 6)[] = [1, 3, 6];
const MON_WED_FRI: (1 | 3 | 5)[] = [1, 3, 5];

describe("generateSchedule", () => {
  it("assigns workouts in cycle order to each preferred weekday", () => {
    // 2026-08-10 is a Monday.
    const rows = generateSchedule("2026-08-09", 2, MON_WED_SAT, CYCLE);
    expect(rows.map((r) => [r.date, r.workoutId])).toEqual([
      ["2026-08-10", "A"], // Mon
      ["2026-08-12", "B"], // Wed
      ["2026-08-15", "C"], // Sat
      ["2026-08-17", "A"], // Mon
      ["2026-08-19", "B"], // Wed
      ["2026-08-22", "C"], // Sat
    ]);
  });

  it("drains the seed queue before continuing the cycle", () => {
    const rows = generateSchedule("2026-08-09", 1, MON_WED_SAT, CYCLE, ["C"], 2);
    expect(rows.map((r) => r.workoutId)).toEqual(["C", "A", "B"]);
  });
});

describe("rescheduleWorkouts", () => {
  function row(date: string, workoutId: string, status: ScheduledWorkout["status"] = "planned"): ScheduledWorkout {
    return { id: `${workoutId}-${date}`, workoutId, date, status };
  }

  it("cascades the rest of the week forward, matching the spec's Mon/Wed/Fri -> Tue/Thu/Sat example", () => {
    const scheduled = [
      row("2026-08-10", "A"), // Monday, missed
      row("2026-08-12", "B"), // Wednesday
      row("2026-08-14", "C"), // Friday
    ];
    const result = rescheduleWorkouts(scheduled, { today: "2026-08-11", preferredDays: MON_WED_FRI, cycle: CYCLE });

    expect(result.find((r) => r.workoutId === "A")).toMatchObject({ date: "2026-08-11", status: "planned" });
    expect(result.find((r) => r.workoutId === "B")).toMatchObject({ date: "2026-08-13", status: "planned" });
    expect(result.find((r) => r.workoutId === "C")).toMatchObject({ date: "2026-08-15", status: "planned" });
  });

  it("doesn't move workouts that don't need to move", () => {
    // Nothing missed — everything already has enough of a gap.
    const scheduled = [row("2026-08-10", "A"), row("2026-08-12", "B"), row("2026-08-15", "C")];
    const result = rescheduleWorkouts(scheduled, { today: "2026-08-09", preferredDays: MON_WED_SAT, cycle: CYCLE });
    expect(result.find((r) => r.workoutId === "A")?.date).toBe("2026-08-10");
    expect(result.find((r) => r.workoutId === "B")?.date).toBe("2026-08-12");
    expect(result.find((r) => r.workoutId === "C")?.date).toBe("2026-08-15");
  });

  it("carries whatever can't fit into next week, preserving cycle order", () => {
    // Miss discovered on the very last day of the week — only one slot (today) is left.
    const scheduled = [
      row("2026-08-10", "A"), // Monday
      row("2026-08-12", "B"), // Wednesday
      row("2026-08-15", "C"), // Saturday
    ];
    const result = rescheduleWorkouts(scheduled, { today: "2026-08-16", preferredDays: MON_WED_SAT, cycle: CYCLE });

    // A claims the only day left this week (today, Sunday); B and C overflow to next week.
    expect(result.find((r) => r.workoutId === "A" && r.date === "2026-08-16")?.status).toBe("planned");
    const nextWeekRows = result
      .filter((r) => r.date > "2026-08-16" && r.date <= "2026-08-23")
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    expect(nextWeekRows.map((r) => r.workoutId)).toEqual(["B", "C", "A"]);
  });

  it("never produces two workouts on the same date", () => {
    const scheduled = [row("2026-08-10", "A"), row("2026-08-12", "B"), row("2026-08-15", "C")];
    const result = rescheduleWorkouts(scheduled, { today: "2026-08-11", preferredDays: MON_WED_SAT, cycle: CYCLE });
    const dates = result.map((r) => r.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("leaves completed workouts and past history untouched", () => {
    const scheduled = [
      row("2026-08-03", "C", "completed"),
      row("2026-08-10", "A", "completed"),
      row("2026-08-12", "B"),
      row("2026-08-15", "C"),
    ];
    const result = rescheduleWorkouts(scheduled, { today: "2026-08-11", preferredDays: MON_WED_SAT, cycle: CYCLE });
    expect(result.find((r) => r.date === "2026-08-03")?.status).toBe("completed");
    expect(result.find((r) => r.date === "2026-08-10")?.status).toBe("completed");
  });

  it("fills in the rest of this week for a brand new schedule instead of skipping to next week", () => {
    // A fresh account: nothing scheduled yet. Today is Tuesday — Wednesday and Saturday
    // this week should still get filled, not just next week onward.
    const result = rescheduleWorkouts([], { today: "2026-08-11", preferredDays: MON_WED_SAT, cycle: CYCLE });
    const thisWeekRows = result.filter((r) => r.date >= "2026-08-11" && r.date <= "2026-08-16");
    expect(thisWeekRows.map((r) => [r.date, r.workoutId])).toEqual([
      ["2026-08-12", "A"],
      ["2026-08-15", "B"],
    ]);
  });

  it("still fills the rest of this week when it only contains old completed history (e.g. preferred days just changed)", () => {
    // Monday (2026-08-10) was already completed under the OLD preferred days before the
    // switch. After changing to Tue/Wed/Sat mid-week, today's and the rest of this week's
    // slots must still be generated now, not deferred to next week.
    const scheduled = [row("2026-08-10", "C", "completed")];
    const result = rescheduleWorkouts(scheduled, {
      today: "2026-08-11",
      preferredDays: [2, 3, 6],
      cycle: CYCLE,
    });
    const thisWeekRows = result
      .filter((r) => r.date >= "2026-08-11" && r.date <= "2026-08-16")
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    expect(thisWeekRows.map((r) => [r.date, r.workoutId])).toEqual([
      ["2026-08-11", "A"],
      ["2026-08-12", "B"],
      ["2026-08-15", "C"],
    ]);
  });
});
