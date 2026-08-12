import { useState, type ChangeEvent } from "react";
import { parseExcelFile, type ImportedWorkout } from "../lib/excel";
import { dataSource } from "../lib/data";
import { Button } from "./Button";
import type { WorkoutWithExercises } from "../types";

interface ExcelImportPreviewProps {
  existingWorkouts: WorkoutWithExercises[];
  onDone: () => void;
  onCancel: () => void;
}

export function ExcelImportPreview({ existingWorkouts, onDone, onCancel }: ExcelImportPreviewProps) {
  const [parsed, setParsed] = useState<ImportedWorkout[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const result = await parseExcelFile(file);
      if (result.length === 0) {
        setError(
          "No rows recognized — check the column headers match Workout/Exercise/Sets/Reps/Weight/Rest/Notes (or Allenamento/Esercizio/Serie/Ripetizioni/Peso/Recupero/Note)."
        );
        return;
      }
      setParsed(result);
    } catch {
      setError("Couldn't read that file — make sure it's a .xlsx file.");
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setImporting(true);
    try {
      let nextPosition = existingWorkouts.length;
      for (const imported of parsed) {
        const existing = existingWorkouts.find((w) => w.name.toLowerCase() === imported.name.toLowerCase());
        await dataSource.saveWorkout({
          id: existing?.id,
          name: imported.name,
          position: existing?.position ?? nextPosition++,
          isActive: existing?.isActive ?? true,
          isCircuit: imported.isCircuit,
          exercises: imported.exercises,
        });
      }
      onDone();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl bg-white p-5 shadow-chunky-lg">
      <h3 className="font-display text-sm text-rainbow-blue">IMPORT EXCEL</h3>

      {!parsed && (
        <div className="space-y-3">
          <p className="text-xs text-rainbow-blue/60">
            Columns: Workout, Exercise, Sets, Reps, Weight, Rest, Notes (English or Italian).
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFile}
            className="w-full rounded-xl border border-rainbow-blue/10 bg-rainbow-beige/40 p-2 text-sm"
          />
          {error && <p className="text-xs font-bold text-rainbow-pink">{error}</p>}
          <Button tone="blue" variant="outline" onClick={onCancel}>
            CANCEL
          </Button>
        </div>
      )}

      {parsed && (
        <div className="space-y-4">
          {parsed.map((w) => (
            <div key={w.name} className="rounded-2xl bg-rainbow-beige/60 p-3">
              <p className="font-display text-xs text-rainbow-blue">
                {w.name}
                {w.isCircuit && <span className="ml-2 text-[9px] font-bold text-rainbow-turquoise">CIRCUIT</span>}
                {existingWorkouts.some((ew) => ew.name.toLowerCase() === w.name.toLowerCase()) && (
                  <span className="ml-2 text-[9px] font-bold text-rainbow-orange">REPLACES EXISTING</span>
                )}
              </p>
              {w.isCircuit && (
                <p className="mt-1 text-[10px] text-rainbow-blue/50">
                  {w.exercises.length} exercises × {w.exercises[0]?.sets ?? 0} rounds, rest{" "}
                  {w.exercises.find((e) => e.restSeconds > 0)?.restSeconds ?? 0}s between rounds
                </p>
              )}
              <ul className="mt-2 space-y-1 text-xs text-rainbow-blue/70">
                {w.exercises.map((e, i) => (
                  <li key={i}>
                    {e.name} — {w.isCircuit ? `${e.reps} reps` : `${e.sets}×${e.reps}`}
                    {e.weight ? ` @ ${e.weight}kg` : ""}
                    {!w.isCircuit && ` · rest ${e.restSeconds}s`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex gap-2">
            <Button tone="blue" variant="outline" onClick={onCancel}>
              CANCEL
            </Button>
            <Button tone="turquoise" onClick={handleConfirm} disabled={importing}>
              {importing ? "IMPORTING…" : "CONFIRM"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
