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

interface CalendarProps {
  year: number;
  month: number; // 0-indexed
  scheduled: ScheduledWorkout[];
  workoutLetter: (workoutId: string) => string;
  todayISO: string;
  onSelectDay?: (dateISO: string, entry: ScheduledWorkout | undefined) => void;
}

export function Calendar({ year, month, scheduled, workoutLetter, todayISO, onSelectDay }: CalendarProps) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = isoWeekday(toISODate(firstOfMonth)) - 1;
  const byDate = new Map(scheduled.map((s) => [s.date, s]));

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
          const entry = byDate.get(dateISO);
          const isToday = dateISO === todayISO;
          const dayNum = Number(dateISO.slice(-2));
          return (
            <button
              key={dateISO}
              onClick={() => onSelectDay?.(dateISO, entry)}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${bgFor(entry?.status)} ${
                isToday ? "ring-2 ring-rainbow-purple" : ""
              }`}
            >
              <span className="font-bold leading-none">{dayNum}</span>
              {entry && (
                <span className="mt-0.5 text-[10px] leading-none">
                  {symbolFor(entry.status)} {workoutLetter(entry.workoutId)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
