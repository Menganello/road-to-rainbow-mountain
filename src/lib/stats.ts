import type { ScheduledWorkout } from "../types";
import { addDays, daysBetween, mondayOnOrBefore } from "./format";

export interface WeekCount {
  completed: number;
  total: number;
}

/** Completed vs. total scheduled workouts for the Monday-starting week containing `dateISO`. */
export function weeklyCount(scheduled: ScheduledWorkout[], dateISO: string): WeekCount {
  const weekStart = mondayOnOrBefore(dateISO);
  const weekEnd = addDays(weekStart, 6);
  const week = scheduled.filter((r) => r.date >= weekStart && r.date <= weekEnd);
  return {
    completed: week.filter((r) => r.status === "completed").length,
    total: week.length,
  };
}

/**
 * Counts consecutive completed workouts walking backward from the most recent one that's
 * already happened (today or earlier) — stops at the first missed one. A still-upcoming
 * 'planned' workout is simply ignored (it hasn't happened yet, so it can't break the streak).
 */
export function computeStreak(scheduled: ScheduledWorkout[], todayISO: string): number {
  const happened = scheduled
    .filter((r) => r.date <= todayISO && (r.status === "completed" || r.status === "missed"))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  let streak = 0;
  for (const row of happened) {
    if (row.status !== "completed") break;
    streak += 1;
  }
  return streak;
}

/** The real target: every workout is a step toward actually being there. */
export const RAINBOW_MOUNTAIN_DATE = "2026-09-07";
/** 0% anchor — the day this countdown started. Fixed, not "today" (which would always read 0%). */
const JOURNEY_START_DATE = "2026-08-11";

/** 0% on JOURNEY_START_DATE, 100% on RAINBOW_MOUNTAIN_DATE, advancing linearly one day at a time. */
export function mountainProgressPercent(todayISO: string): number {
  const totalDays = daysBetween(JOURNEY_START_DATE, RAINBOW_MOUNTAIN_DATE);
  const elapsed = daysBetween(JOURNEY_START_DATE, todayISO);
  return Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
}
