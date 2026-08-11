import { isSupabaseConfigured } from "../supabase";
import { AuthProvider as DemoAuthProvider, useAuth as useDemoAuth } from "./demoAuth";
import { AuthProvider as SupabaseAuthProvider, useAuth as useSupabaseAuth } from "./supabaseAuth";

export const AuthProvider = isSupabaseConfigured ? SupabaseAuthProvider : DemoAuthProvider;
export const useAuth = isSupabaseConfigured ? useSupabaseAuth : useDemoAuth;

export type { AuthContextValue, AuthUser } from "./types";
