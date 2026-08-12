import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "../components/Header";
import { Calendar as CalendarGrid } from "../components/Calendar";
import { Button } from "../components/Button";
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
  const [preferredCount, setPreferredCount] = useState(3);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<{ date: string; entries: ScheduledWorkout[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [sched, ws, settings] = await Promise.all([
        dataSource.refreshSchedule(), // marks overdue days as missed, not just a raw read
        dataSource.listWorkouts(),
        dataSource.getSettings(),
      ]);
      setSchedule(sched);
      setWorkouts(ws);
      setPreferredCount(settings.preferredDays.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading the calendar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-rainbow-beige pb-28">
        <Header />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-rainbow-beige pb-28">
        <Header />
        <main className="mx-auto max-w-md space-y-4 px-4 text-center">
          <p className="font-display text-xs text-rainbow-pink">COULDN'T LOAD CALENDAR</p>
          <p className="text-sm text-rainbow-blue/70">{error}</p>
          <Button tone="purple" onClick={() => void load()}>
            TRY AGAIN
          </Button>
        </main>
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
            {week.completed} / {preferredCount} WORKOUTS
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
            onSelectDay={(date, entries) => setSelected({ date, entries })}
          />
        </div>

        <div className="flex justify-center gap-4 text-xs text-rainbow-blue/60">
          <span>✓ completed</span>
          <span>● planned</span>
          <span>× missed</span>
        </div>

        {selected && (
          <div className="space-y-1 rounded-2xl bg-white p-4 shadow-chunky">
            <p className="font-display text-xs text-rainbow-blue">{selected.date}</p>
            {selected.entries.length === 0 ? (
              <p className="text-sm text-rainbow-blue/70">Nothing scheduled</p>
            ) : (
              selected.entries.map((e) => (
                <p key={e.id} className="text-sm text-rainbow-blue/70">
                  {workouts.find((w) => w.id === e.workoutId)?.name ?? "Workout"} — {e.status}
                </p>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
