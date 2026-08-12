import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "./excel";

function makeFile(rows: (string | number)[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Workouts");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], "test.xlsx");
}

const HEADER = ["Workout", "Exercise", "Sets", "Reps", "Weight", "Rest", "Notes"];

describe("parseExcelFile", () => {
  it("imports a plain (non-circuit) sheet as before", async () => {
    const file = makeFile([
      HEADER,
      ["A", "Squat", 4, "8", 70, 120, ""],
      ["A", "Bench Press", 3, "10", 35, 90, ""],
    ]);
    const result = await parseExcelFile(file);
    expect(result).toHaveLength(1);
    expect(result[0].isCircuit).toBe(false);
    expect(result[0].exercises.map((e) => e.name)).toEqual(["Squat", "Bench Press"]);
    expect(result[0].exercises[0].sets).toBe(4);
  });

  it("recognizes a Giro-tagged circuit and collapses repeated rounds into one exercise per position", async () => {
    // Mirrors the real-world file: 6 exercises repeated across 3 "Giro N" rounds, rest only
    // on the last exercise of each round except the final round.
    const file = makeFile([
      HEADER,
      ["Giorno 1", "Squat", 1, "10", "Corpo libero", "", "Giro 1"],
      ["Giorno 1", "Push up", 1, "6", "Corpo libero", "", "Giro 1"],
      ["Giorno 1", "Affondi", 1, "8 per gamba", "Corpo libero", "", "Giro 1"],
      ["Giorno 1", "Jumping jacks", 1, "20", "Corpo libero", 75, "Giro 1 - recupero 60-90s, poi giro successivo"],
      ["Giorno 1", "Squat", 1, "10", "Corpo libero", "", "Giro 2"],
      ["Giorno 1", "Push up", 1, "6", "Corpo libero", "", "Giro 2"],
      ["Giorno 1", "Affondi", 1, "8 per gamba", "Corpo libero", "", "Giro 2"],
      ["Giorno 1", "Jumping jacks", 1, "20", "Corpo libero", 75, "Giro 2 - recupero 60-90s, poi giro successivo"],
      ["Giorno 1", "Squat", 1, "10", "Corpo libero", "", "Giro 3"],
      ["Giorno 1", "Push up", 1, "6", "Corpo libero", "", "Giro 3"],
      ["Giorno 1", "Affondi", 1, "8 per gamba", "Corpo libero", "", "Giro 3"],
      ["Giorno 1", "Jumping jacks", 1, "20", "Corpo libero", "", "Giro 3"],
    ]);
    const result = await parseExcelFile(file);
    expect(result).toHaveLength(1);
    const workout = result[0];
    expect(workout.isCircuit).toBe(true);
    expect(workout.exercises).toHaveLength(4);
    expect(workout.exercises.map((e) => e.name)).toEqual(["Squat", "Push up", "Affondi", "Jumping jacks"]);
    // 3 rounds -> sets: 3 for every exercise in the circuit
    for (const e of workout.exercises) expect(e.sets).toBe(3);
    // Rest lived on the last exercise of the round in the source sheet.
    expect(workout.exercises.find((e) => e.name === "Jumping jacks")?.restSeconds).toBe(75);
    expect(workout.exercises.find((e) => e.name === "Squat")?.restSeconds).toBe(0);
    // The leading "Giro N" tag is stripped out of the kept notes (free text after it stays).
    expect(workout.exercises.find((e) => e.name === "Jumping jacks")?.notes).not.toMatch(/^giro/i);
  });

  it("falls back to a plain import when rounds are tagged but exercises don't repeat identically", async () => {
    const file = makeFile([
      HEADER,
      ["B", "Squat", 1, "10", "", "", "Giro 1"],
      ["B", "Lunges", 1, "10", "", "", "Giro 2"], // different exercise second time -> not a real circuit
    ]);
    const result = await parseExcelFile(file);
    expect(result[0].isCircuit).toBe(false);
    expect(result[0].exercises).toHaveLength(2);
  });
});
