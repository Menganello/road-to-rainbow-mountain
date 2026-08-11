import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthContextValue, AuthUser } from "./types";

const STORAGE_KEY = "rrm.demo.auth.v1";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: false,
      async signIn(email: string) {
        const authedUser: AuthUser = { email };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
        setUser(authedUser);
      },
      async signOut() {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
      async resetPassword() {
        // Demo mode: no real email flow to hook into yet.
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
