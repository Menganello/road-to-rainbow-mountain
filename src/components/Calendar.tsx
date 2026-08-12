import { isoWeekday, toISODate } from "../lib/format";
import type { ScheduledWorkout, ScheduledWorkoutStatus } from "../types";

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function symbolFor(status: ScheduledWorkoutStatus): string {
  if (status === "completed") return "✓";
  if (status === "missed") return "×";
  return "●";
}

function bgFor(status?: ScheduledWorkoutStatus): string {
  switch (status) {
    case "completed":
      return "bg-rainbow-turquoise/20 text-rainbow-turquoise";
    case "missed":
      return "bg-rainbow-pink/20 text-rainbow-pink";
    case "planned":
      return "bg-rainbow-yellow/25 text-rainbow-blue";
    default:
      return "text-rainbow-blue/30";
  }
}

/** A day can have more than one entry (e.g. a bonus extra workout) — pick the most
 * encouraging status to represent the day: something done beats something missed. */
function primaryStatus(entries: ScheduledWorkout[]): ScheduledWorkoutStatus | undefined {
  if (entries.some((e) => e.status === "completed")) return "completed";
  if (entries.some((e) => e.status === "missed")) return "missed";
  if (entries.some((e) => e.status === "planned")) return "planned";
  return undefined;
}

interface CalendarProps {
  year: number;
  month: number; // 0-indexed
  scheduled: ScheduledWorkout[];
  workoutLetter: (workoutId: string) => string;
  todayISO: string;
  onSelectDay?: (dateISO: string, entries: ScheduledWorkout[]) => void;
}

export function Calendar({ year, month, scheduled, workoutLetter, todayISO, onSelectDay }: CalendarProps) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = isoWeekday(toISODate(firstOfMonth)) - 1;

  const byDate = new Map<string, ScheduledWorkout[]>();
  for (const s of scheduled) {
    const list = byDate.get(s.date);
    if (list) list.push(s);
    else byDate.set(s.date, [s]);
  }

  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1))),
  ];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-rainbow-blue/40">
        {WEEKDAY_HEADERS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateISO, i) => {
          if (!dateISO) return <div key={`blank-${i}`} />;
          const entries = byDate.get(dateISO) ?? [];
          const status = primaryStatus(entries);
          const primaryEntry = status ? entries.find((e) => e.status === status) : undefined;
          const isToday = dateISO === todayISO;
          const dayNum = Number(dateISO.slice(-2));
          return (
            <button
              key={dateISO}
              onClick={() => onSelectDay?.(dateISO, entries)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${bgFor(status)} ${
                isToday ? "ring-2 ring-rainbow-purple" : ""
              }`}
            >
              <span className="font-bold leading-none">{dayNum}</span>
              {primaryEntry && (
                <span className="mt-0.5 text-[10px] leading-none">
                  {symbolFor(primaryEntry.status)} {workoutLetter(primaryEntry.workoutId)}
                  {entries.length > 1 && ` +${entries.length - 1}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
