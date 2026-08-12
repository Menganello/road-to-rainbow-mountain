import { estimateWorkoutMinutes, formatDayMonth } from "../lib/format";
import type { WorkoutWithExercises } from "../types";
import { Button } from "./Button";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface WorkoutCardProps {
  workout: WorkoutWithExercises;
  lastCompletedISO: string | null;
  onStart: () => void;
  onEdit: () => void;
}

export function WorkoutCard({ workout, lastCompletedISO, onStart, onEdit }: WorkoutCardProps) {
  const minutes = estimateWorkoutMinutes(workout.exercises);
  return (
    <div className="space-y-3 rounded-3xl bg-white p-5 shadow-chunky">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-rainbow-blue">{workout.name}</h3>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rainbow-yellow font-display text-xs text-rainbow-blue">
          {LETTERS[workout.position] ?? workout.position + 1}
        </span>
      </div>
      <p className="text-sm text-rainbow-blue/70">
        {workout.exercises.length} exercises · ~{minutes} min
        {workout.isCircuit && (
          <span className="ml-2 rounded-full bg-rainbow-turquoise/15 px-2 py-0.5 text-[10px] font-bold text-rainbow-turquoise">
            CIRCUIT
          </span>
        )}
      </p>
      <p className="text-xs text-rainbow-blue/50">
        {lastCompletedISO ? `Last done ${formatDayMonth(lastCompletedISO)}` : "Not done yet"}
      </p>
      <div className="flex gap-2 pt-1">
        <Button tone="blue" variant="outline" onClick={onEdit}>
          EDIT
        </Button>
        <Button tone="turquoise" onClick={onStart}>
          START
        </Button>
      </div>
    </div>
  );
}
