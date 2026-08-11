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
const PROGRESS_WINDOW_DAYS = 84; // ~12 weeks of lead-up shown on the progress bar

/** 0% at (RAINBOW_MOUNTAIN_DATE - PROGRESS_WINDOW_DAYS), 100% on RAINBOW_MOUNTAIN_DATE itself. */
export function mountainProgressPercent(todayISO: string): number {
  const windowStart = addDays(RAINBOW_MOUNTAIN_DATE, -PROGRESS_WINDOW_DAYS);
  const totalDays = daysBetween(windowStart, RAINBOW_MOUNTAIN_DATE);
  const elapsed = daysBetween(windowStart, todayISO);
  return Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
}
