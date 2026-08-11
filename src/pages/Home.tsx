import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { ProgressBar } from "../components/ProgressBar";
import { StreakBadge } from "../components/StreakBadge";
import { dataSource } from "../lib/data";
import { computeStreak, weeklyCount } from "../lib/stats";
import { addDays, formatDayMonth, todayISO, weekdayLabel, isoWeekday } from "../lib/format";
import { loadActiveSession } from "../lib/session";
import { primeAudio } from "../lib/audio";
import type { ScheduledWorkout, WorkoutWithExercises } from "../types";

interface RepairNotice {
  workoutName: string;
  kind: "moved" | "next-week";
  newDate: string | null;
  scheduledId: string;
}

export function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [schedule, setSchedule] = useState<ScheduledWorkout[]>([]);
  const [preferredCount, setPreferredCount] = useState(3);
  const [notice, setNotice] = useState<RepairNotice | null>(null);
  const [activeSessionWorkoutId, setActiveSessionWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [before, ws, settings] = await Promise.all([
        dataSource.getSchedule(),
        dataSource.listWorkouts(),
        dataSource.getSettings(),
      ]);
      const after = await dataSource.refreshSchedule();
      if (cancelled) return;

      const today = todayISO();
      const weekEnd = addDays(today, 7 - isoWeekday(today));
      const repaired = after.find((a) => {
        const b = before.find((x) => x.id === a.id);
        return !!b && b.status === "planned" && b.date < today && a.status === "planned" && a.date !== b.date;
      });
      const overflowedId = after.find((a) => {
        const b = before.find((x) => x.id === a.id);
        return !!b && b.status === "planned" && b.date < today && a.status === "missed";
      })?.workoutId;
      const pushedNextWeek = overflowedId
        ? after.find((a) => !before.some((b) => b.id === a.id) && a.workoutId === overflowedId && a.date > weekEnd)
        : undefined;

      const workoutName = (id: string) => ws.find((w) => w.id === id)?.name ?? "Workout";
      if (repaired) {
        setNotice({ workoutName: workoutName(repaired.workoutId), kind: "moved", newDate: repaired.date, scheduledId: repaired.id });
      } else if (pushedNextWeek) {
        setNotice({ workoutName: workoutName(pushedNextWeek.workoutId), kind: "next-week", newDate: null, scheduledId: pushedNextWeek.id });
      }

      setWorkouts(ws);
      setSchedule(after);
      setPreferredCount(settings.preferredDays.length);
      setActiveSessionWorkoutId(loadActiveSession()?.workoutId ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-rainbow-beige">
        <RainbowLoading />
      </div>
    );
  }

  const today = todayISO();
  const week = weeklyCount(schedule, today);
  const streak = computeStreak(schedule, today);
  const totalWorkouts = schedule.filter((r) => r.status === "completed").length;
  const progressPct = preferredCount > 0 ? (week.completed / preferredCount) * 100 : 0;

  const nextEntry = [...schedule]
    .filter((r) => r.status === "planned" && r.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const nextWorkout = nextEntry ? workouts.find((w) => w.id === nextEntry.workoutId) : undefined;

  async function moveNoticeToToday() {
    if (!notice) return;
    const updated = await dataSource.moveScheduledWorkout(notice.scheduledId, todayISO());
    setSchedule(updated);
    setNotice(null);
  }

  return (
    <div className="min-h-dvh bg-rainbow-beige pb-28">
      <Header />
      <main className="mx-auto max-w-md space-y-5 px-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-xs text-rainbow-blue/50">WEEK</p>
          <p className="font-display text-sm text-rainbow-purple">
            {week.completed} / {preferredCount} WORKOUTS
          </p>
        </div>

        <ProgressBar percent={progressPct} />

        {activeSessionWorkoutId && (
          <button
            onClick={() => {
              primeAudio();
              navigate(`/session/${activeSessionWorkoutId}`);
            }}
            className="w-full rounded-2xl bg-rainbow-purple/10 border-2 border-dashed border-rainbow-purple px-4 py-3 text-left"
          >
            <p className="font-display text-xs text-rainbow-purple">WORKOUT IN PROGRESS</p>
            <p className="mt-1 text-sm font-bold text-rainbow-blue">Tap to RESUME →</p>
          </button>
        )}

        {notice && (
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-chunky">
            <p className="font-display text-xs text-rainbow-pink">{notice.workoutName.toUpperCase()} WAS MISSED</p>
            {notice.kind === "moved" ? (
              <>
                <p className="text-sm text-rainbow-blue/70">
                  Suggested: {notice.newDate === today ? "TODAY" : formatDayMonth(notice.newDate!)}
                </p>
                <div className="flex gap-2">
                  <Button tone="pink" onClick={moveNoticeToToday}>
                    MOVE TO TODAY
                  </Button>
                  <Button tone="blue" variant="outline" onClick={() => setNotice(null)}>
                    KEEP DATE
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-rainbow-blue/70">No room left this week — moved to next week.</p>
            )}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-chunky-lg">
          <p className="font-display text-xs text-rainbow-blue/50">NEXT</p>
          {nextWorkout && nextEntry ? (
            <>
              <h2 className="mt-2 font-display text-xl text-rainbow-blue">{nextWorkout.name}</h2>
              <p className="mt-1 text-sm font-bold text-rainbow-turquoise">
                {nextEntry.date === today ? "TODAY" : weekdayLabel(isoWeekday(nextEntry.date))}
              </p>
              <div className="mt-4">
                <Button
                  tone="turquoise"
                  onClick={() => {
                    primeAudio();
                    navigate(`/session/${nextWorkout.id}`, { state: { scheduledWorkoutId: nextEntry.id } });
                  }}
                >
                  START WORKOUT
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-rainbow-blue/60">No workout scheduled — check Settings.</p>
          )}
        </section>

        <StreakBadge weeks={streak} totalWorkouts={totalWorkouts} />
      </main>
    </div>
  );
}

function RainbowLoading() {
  return <p className="font-display text-xs text-rainbow-blue/50 animate-pulse">LOADING 🌈</p>;
}
