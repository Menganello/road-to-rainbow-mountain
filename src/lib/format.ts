import type { ISOWeekday } from "../types";

/** Formats a Date as a local-time 'YYYY-MM-DD' string (never UTC — avoids off-by-one-day bugs). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses a 'YYYY-MM-DD' string into a local-time Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** ISO weekday: 1=Monday .. 7=Sunday (JS getDay() is 0=Sunday, so we shift it). */
export function isoWeekday(iso: string): ISOWeekday {
  const day = fromISODate(iso).getDay();
  return (day === 0 ? 7 : day) as ISOWeekday;
}

export function mondayOnOrBefore(iso: string): string {
  return addDays(iso, -(isoWeekday(iso) - 1));
}

export function isSameOrAfter(a: string, b: string): boolean {
  return a >= b;
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

const WEEKDAY_LABELS: Record<ISOWeekday, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function weekdayLabel(day: ISOWeekday): string {
  return WEEKDAY_LABELS[day];
}

export function formatDayMonth(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Rough per-exercise time budget: work time for all sets + rest between them. */
export function estimateWorkoutMinutes(exercises: { sets: number; restSeconds: number }[]): number {
  const totalSeconds = exercises.reduce((sum, ex) => {
    const workSeconds = ex.sets * 35; // ~35s per set of actual lifting
    const restSecondsTotal = Math.max(0, ex.sets - 1) * ex.restSeconds;
    return sum + workSeconds + restSecondsTotal;
  }, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}

export function formatMMSS(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
