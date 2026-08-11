import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { WorkoutCard } from "../components/WorkoutCard";
import { Button } from "../components/Button";
import { dataSource } from "../lib/data";
import { primeAudio } from "../lib/audio";
import { isSupabaseConfigured } from "../lib/supabase";
import type { Exercise, ScheduledWorkout, WorkoutWithExercises } from "../types";

const ExcelImportPreview = lazy(() =>
  import("../components/ExcelImportPreview").then((m) => ({ default: m.ExcelImportPreview }))
);

type ExerciseDraft = Omit<Exercise, "id" | "workoutId">;

function toDraft(e: Exercise): ExerciseDraft {
  return {
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    restSeconds: e.restSeconds,
    notes: e.notes,
    position: e.position,
  };
}

export function Workouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [schedule, setSchedule] = useState<ScheduledWorkout[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [ws, sched] = await Promise.all([dataSource.listWorkouts(), dataSource.getSchedule()]);
      setWorkouts(ws);
      setSchedule(sched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading your workouts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function lastCompleted(workoutId: string): string | null {
    const done = schedule
      .filter((r) => r.workoutId === workoutId && r.status === "completed")
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return done[0]?.date ?? null;
  }

  async function handleSave(workout: WorkoutWithExercises, exercises: ExerciseDraft[]) {
    await dataSource.saveWorkout({
      id: workout.id,
      name: workout.name,
      position: workout.position,
      isActive: workout.isActive,
      exercises,
    });
    setEditingId(null);
    await reload();
  }

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
          <p className="font-display text-xs text-rainbow-pink">COULDN'T LOAD WORKOUTS</p>
          <p className="text-sm text-rainbow-blue/70">{error}</p>
          <Button tone="purple" onClick={() => void reload()}>
            TRY AGAIN
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-rainbow-beige pb-28">
      <Header />
      <main className="mx-auto max-w-md space-y-4 px-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-sm text-rainbow-blue">WORKOUTS</h1>
          {isSupabaseConfigured && !importing && (
            <button onClick={() => setImporting(true)} className="text-xs font-bold text-rainbow-purple">
              IMPORT EXCEL
            </button>
          )}
        </div>

        {importing && (
          <Suspense fallback={<p className="text-xs text-rainbow-blue/50">Loading importer…</p>}>
            <ExcelImportPreview
              existingWorkouts={workouts}
              onCancel={() => setImporting(false)}
              onDone={async () => {
                setImporting(false);
                await reload();
              }}
            />
          </Suspense>
        )}

        {workouts.map((w) =>
          editingId === w.id ? (
            <WorkoutEditor
              key={w.id}
              workout={w}
              onCancel={() => setEditingId(null)}
              onSave={(exercises) => handleSave(w, exercises)}
            />
          ) : (
            <WorkoutCard
              key={w.id}
              workout={w}
              lastCompletedISO={lastCompleted(w.id)}
              onEdit={() => setEditingId(w.id)}
              onStart={() => {
                primeAudio();
                navigate(`/session/${w.id}`);
              }}
            />
          )
        )}
      </main>
    </div>
  );
}

function WorkoutEditor({
  workout,
  onSave,
  onCancel,
}: {
  workout: WorkoutWithExercises;
  onSave: (exercises: ExerciseDraft[]) => void;
  onCancel: () => void;
}) {
  const [exercises, setExercises] = useState<ExerciseDraft[]>(workout.exercises.map(toDraft));

  function update(i: number, patch: Partial<ExerciseDraft>) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function remove(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { name: "New Exercise", sets: 3, reps: "10", weight: null, restSeconds: 60, notes: "", position: prev.length },
    ]);
  }

  return (
    <div className="space-y-3 rounded-3xl bg-white p-5 shadow-chunky-lg">
      <h3 className="font-display text-sm text-rainbow-blue">{workout.name}</h3>
      <div className="space-y-3">
        {exercises.map((e, i) => (
          <div key={i} className="rounded-2xl bg-rainbow-beige/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={e.name}
                onChange={(ev) => update(i, { name: ev.target.value })}
                className="min-w-0 flex-1 rounded-xl border border-rainbow-blue/10 bg-white px-3 py-2 text-sm font-bold text-rainbow-blue"
              />
              <button onClick={() => remove(i)} className="text-xs font-bold text-rainbow-pink px-2">
                REMOVE
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <NumberField label="SETS" value={e.sets} onChange={(v) => update(i, { sets: v })} />
              <TextField label="REPS" value={e.reps} onChange={(v) => update(i, { reps: v })} />
              <NumberField
                label="KG"
                value={e.weight ?? 0}
                onChange={(v) => update(i, { weight: v || null })}
              />
              <NumberField label="REST s" value={e.restSeconds} onChange={(v) => update(i, { restSeconds: v })} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addExercise} className="text-xs font-bold text-rainbow-purple">
        + ADD EXERCISE
      </button>
      <div className="flex gap-2 pt-2">
        <Button tone="blue" variant="outline" onClick={onCancel}>
          CANCEL
        </Button>
        <Button tone="turquoise" onClick={() => onSave(exercises)}>
          SAVE
        </Button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-bold text-rainbow-blue/50">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-rainbow-blue/10 bg-white px-1 py-1 text-center text-sm"
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-bold text-rainbow-blue/50">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-rainbow-blue/10 bg-white px-1 py-1 text-center text-sm"
      />
    </label>
  );
}
