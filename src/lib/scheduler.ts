import type { ISOWeekday, ScheduledWorkout } from "../types";
import { addDays, isBefore, isoWeekday, mondayOnOrBefore } from "./format";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Generates the next `weeksAhead` weeks of scheduled workouts starting the day after
 * `afterDate`, assigning one workout to each preferred weekday. `seedQueue` (leftover
 * workoutIds carried over from a missed week) is drained first, in order, before the
 * cycle continues from `continueFromIndex + 1`. This keeps the strict A -> B -> C -> A
 * cycle order intact even after a carry-over.
 */
export function generateSchedule(
  afterDate: string,
  weeksAhead: number,
  preferredDays: ISOWeekday[],
  cycle: string[],
  seedQueue: string[] = [],
  continueFromIndex = -1
): ScheduledWorkout[] {
  if (cycle.length === 0) return [];

  const result: ScheduledWorkout[] = [];
  const queue = [...seedQueue];
  let cycleIndex = continueFromIndex;

  const endDate = addDays(afterDate, weeksAhead * 7);
  let date = addDays(afterDate, 1);

  while (!isBefore(endDate, date)) {
    if (preferredDays.includes(isoWeekday(date))) {
      let workoutId: string;
      if (queue.length > 0) {
        workoutId = queue.shift()!;
        const idx = cycle.indexOf(workoutId);
        if (idx !== -1) cycleIndex = idx;
      } else {
        cycleIndex = (cycleIndex + 1) % cycle.length;
        workoutId = cycle[cycleIndex];
      }
      result.push({ id: newId(), workoutId, date, status: "planned" });
    }
    date = addDays(date, 1);
  }

  return result;
}

export interface RescheduleOptions {
  /** Injected instead of read from `Date.now()` so this stays a pure, testable function. */
  today: string;
  preferredDays: ISOWeekday[];
  /** Active workout ids, ordered by their cycle `position` (A, B, C, ...). */
  cycle: string[];
  weeksAhead?: number;
}

/**
 * Keeps the schedule at 3 workouts/week without ever breaking the A -> B -> C cycle order.
 * Assumes it's called reasonably often (e.g. whenever Home/Calendar loads) — a miss more
 * than a week old, never revisited, stays recorded as history rather than being re-queued.
 *
 * Steps:
 * 1. Mark any past 'planned' workout as 'missed'.
 * 2. Walk this week's workouts in cycle order with a "cursor" that starts at today and
 *    advances by 2 days (1 day gap) every time a workout is placed. A missed workout is
 *    placed at the cursor; a not-yet-happened workout is only pushed to the cursor if the
 *    cursor has caught up to (or passed) it — otherwise it stays put. This is what makes a
 *    single early miss cascade the rest of the week forward just enough to avoid consecutive
 *    days, exactly like sliding beads along a wire.
 * 3. Whatever no longer fits before week's end carries into next week's cycle slot.
 * 4. Regenerate the future (everything after this week) cleanly from the resulting position.
 */
export function rescheduleWorkouts(
  scheduled: ScheduledWorkout[],
  opts: RescheduleOptions
): ScheduledWorkout[] {
  const { today, preferredDays, cycle } = opts;
  const weeksAhead = opts.weeksAhead ?? 4;
  if (cycle.length === 0) return scheduled;

  // 1. Mark overdue planned rows as missed.
  const rows: ScheduledWorkout[] = scheduled.map((r) =>
    r.status === "planned" && isBefore(r.date, today) ? { ...r, status: "missed" } : { ...r }
  );

  const weekStart = mondayOnOrBefore(today);
  const weekEnd = addDays(weekStart, 6);

  const past = rows.filter((r) => isBefore(r.date, weekStart));
  const thisWeek = rows.filter((r) => !isBefore(r.date, weekStart) && !isBefore(weekEnd, r.date));
  // Rows generated for after this week by a previous run are speculative — drop them,
  // step 4 regenerates the future cleanly. Rows before weekStart (`past`) are untouched history.

  // Cycle continuation point: `thisWeek`'s rows, in their ORIGINAL date order, are always a
  // contiguous slice of the cycle (by construction). The last one determines what comes next,
  // regardless of whether it ends up repaired to a different date or stays missed.
  const weekInOriginalOrder = [...thisWeek].sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastOfWeek = weekInOriginalOrder[weekInOriginalOrder.length - 1];
  const lastCompletedInPast = [...past]
    .filter((r) => r.status === "completed")
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const anchorWorkoutId = lastOfWeek?.workoutId ?? lastCompletedInPast?.workoutId;
  const continueFromIndex = anchorWorkoutId ? cycle.indexOf(anchorWorkoutId) : cycle.length - 1;

  // 2. Cascade this week's workouts forward from `today`, closing gaps left by misses while
  // keeping at least a 1-day gap between any two of them.
  let cursor = today;
  for (const row of weekInOriginalOrder) {
    if (row.status === "completed") {
      cursor = cursor > addDays(row.date, 1) ? cursor : addDays(row.date, 1);
      continue;
    }
    const floor = row.status === "missed" ? today : row.date;
    const target = cursor > floor ? cursor : floor;
    if (isBefore(weekEnd, target)) {
      row.status = "missed"; // doesn't fit this week — carried to next week below
      continue;
    }
    row.date = target;
    row.status = "planned";
    cursor = addDays(target, 2);
  }

  // 3. Leftovers become next week's seed queue, preserving cycle order.
  const seedQueue = weekInOriginalOrder.filter((r) => r.status === "missed").map((r) => r.workoutId);

  // 4. Regenerate the future cleanly from here. When this week already had rows, they cover
  // it fully (by construction) so the future starts the week after. But if this week was
  // empty — a brand new schedule, or a long gap since this last ran — nothing accounts for
  // today's remaining preferred days yet, so pick up from today instead of skipping the rest
  // of this week entirely.
  const futureAnchor = weekInOriginalOrder.length > 0 ? weekEnd : addDays(today, -1);
  const future = generateSchedule(futureAnchor, weeksAhead, preferredDays, cycle, seedQueue, continueFromIndex);

  return [...past, ...thisWeek, ...future];
}
