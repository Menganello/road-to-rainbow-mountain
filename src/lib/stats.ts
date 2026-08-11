import type { ScheduledWorkout } from "../types";
import { addDays, mondayOnOrBefore } from "./format";

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
 * Counts consecutive fully-completed weeks walking backward from the week before `todayISO`
 * (the current, still-in-progress week is never counted toward the streak).
 */
export function computeStreak(scheduled: ScheduledWorkout[], todayISO: string): number {
  let streak = 0;
  let cursor = addDays(mondayOnOrBefore(todayISO), -7);

  while (true) {
    const week = weeklyCount(scheduled, cursor);
    if (week.total === 0 || week.completed < week.total) break;
    streak += 1;
    cursor = addDays(cursor, -7);
  }

  return streak;
}
