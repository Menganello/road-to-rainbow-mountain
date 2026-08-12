import * as XLSX from "xlsx";
import type { Exercise } from "../types";

export type ExerciseDraft = Omit<Exercise, "id" | "workoutId">;

export interface ImportedWorkout {
  name: string;
  exercises: ExerciseDraft[];
}

const FIELD_ALIASES: Record<string, string[]> = {
  workout: ["workout", "allenamento"],
  exercise: ["exercise", "esercizio"],
  sets: ["sets", "serie"],
  reps: ["reps", "ripetizioni"],
  weight: ["weight", "peso"],
  rest: ["rest", "recupero"],
  notes: ["notes", "note"],
};

function buildHeaderMap(headerRow: unknown[]): Record<number, string> {
  const map: Record<number, string> = {};
  headerRow.forEach((raw, i) => {
    const h = String(raw ?? "").trim().toLowerCase();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(h)) {
        map[i] = field;
        break;
      }
    }
  });
  return map;
}

function toNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parses an .xlsx file into workouts grouped by the "Workout"/"Allenamento" column,
 * in order of first appearance. Supports both English and Italian column headers. */
export async function parseExcelFile(file: File): Promise<ImportedWorkout[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) return [];

  const headerMap = buildHeaderMap(rows[0]);
  const workoutsByName = new Map<string, ImportedWorkout>();
  const order: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === undefined || c === "")) continue;

    const record: Record<string, unknown> = {};
    Object.entries(headerMap).forEach(([idx, field]) => {
      record[field] = row[Number(idx)];
    });

    const workoutName = String(record.workout ?? "").trim();
    const exerciseName = String(record.exercise ?? "").trim();
    if (!workoutName || !exerciseName) continue;

    if (!workoutsByName.has(workoutName)) {
      workoutsByName.set(workoutName, { name: workoutName, exercises: [] });
      order.push(workoutName);
    }
    const workout = workoutsByName.get(workoutName)!;
    workout.exercises.push({
      name: exerciseName,
      sets: toNumber(record.sets) ?? 3,
      reps: String(record.reps ?? "").trim() || "10",
      weight: toNumber(record.weight),
      restSeconds: toNumber(record.rest) ?? 0, // empty cell = no rest, not a guessed default
      notes: String(record.notes ?? "").trim(),
      position: workout.exercises.length,
    });
  }

  return order.map((name) => workoutsByName.get(name)!);
}
