import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "../components/Header";
import { Calendar as CalendarGrid } from "../components/Calendar";
import { dataSource } from "../lib/data";
import { weeklyCount } from "../lib/stats";
import { todayISO } from "../lib/format";
import type { ScheduledWorkout, WorkoutWithExercises } from "../types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarPage() {
  const [schedule, setSchedule] = useState<ScheduledWorkout[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<{ date: string; entry: ScheduledWorkout | undefined } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [sched, ws] = await Promise.all([dataSource.getSchedule(), dataSource.listWorkouts()]);
      setSchedule(sched);
      setWorkouts(ws);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-rainbow-beige pb-28">
        <Header />
      </div>
    );
  }

  const today = todayISO();
  const week = weeklyCount(schedule, today);
  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function letterFor(workoutId: string): string {
    const w = workouts.find((x) => x.id === workoutId);
    if (!w) return "";
    return ["A", "B", "C", "D", "E", "F"][w.position] ?? "";
  }

  return (
    <div className="min-h-dvh bg-rainbow-beige pb-28">
      <Header />
      <main className="mx-auto max-w-md space-y-4 px-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-xs text-rainbow-blue/50">THIS WEEK</p>
          <p className="font-display text-sm text-rainbow-purple">
            {week.completed} / {week.total || 3} WORKOUTS
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-chunky-lg">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="p-2 text-rainbow-blue/60">
              <ChevronLeft size={20} />
            </button>
            <p className="font-display text-xs text-rainbow-blue">
              {MONTH_NAMES[month]} {year}
            </p>
            <button onClick={() => setMonthOffset((m) => m + 1)} className="p-2 text-rainbow-blue/60">
              <ChevronRight size={20} />
            </button>
          </div>
          <CalendarGrid
            year={year}
            month={month}
            scheduled={schedule}
            workoutLetter={letterFor}
            todayISO={today}
            onSelectDay={(date, entry) => setSelected({ date, entry })}
          />
        </div>

        <div className="flex justify-center gap-4 text-xs text-rainbow-blue/60">
          <span>✓ completed</span>
          <span>● planned</span>
          <span>× missed</span>
        </div>

        {selected && (
          <div className="rounded-2xl bg-white p-4 shadow-chunky">
            <p className="font-display text-xs text-rainbow-blue">{selected.date}</p>
            <p className="mt-1 text-sm text-rainbow-blue/70">
              {selected.entry
                ? `${workouts.find((w) => w.id === selected.entry!.workoutId)?.name ?? "Workout"} — ${selected.entry.status}`
                : "Nothing scheduled"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
