import { isSupabaseConfigured } from "../supabase";
import { demoSource } from "./demoSource";
import { supabaseSource } from "./supabaseSource";
import type { DataSource } from "./types";

export const dataSource: DataSource = isSupabaseConfigured ? supabaseSource : demoSource;

export type { DataSource } from "./types";
