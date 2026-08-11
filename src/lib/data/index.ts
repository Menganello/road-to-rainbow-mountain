import { demoSource } from "./demoSource";
import type { DataSource } from "./types";

// Phase 2 swaps this for supabaseSource once Supabase is wired up.
export const dataSource: DataSource = demoSource;

export type { DataSource } from "./types";
