import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

// A phone locking mid-workout suspends JS entirely, so the background token-refresh timer can
// miss its window. Force a session check the moment the tab/app is visible again, so the next
// request (e.g. finishing the workout) doesn't get the stale token's 401 out of nowhere.
if (supabase) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void supabase.auth.getSession();
    }
  });
}
