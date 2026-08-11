import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { RainbowMountainMark } from "../components/icons/RainbowMountainMark";
import { Button } from "../components/Button";
import { useAuth } from "../lib/auth/demoAuth";

export function Login() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await signIn(email, password);
    navigate("/", { replace: true });
  }

  async function handleReset() {
    if (!email) return;
    await resetPassword(email);
    setResetSent(true);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-rainbow-beige px-6">
      <div className="pointer-events-none absolute -top-10 -right-10 text-[9rem] opacity-20">☀️</div>
      <div className="pointer-events-none absolute top-16 left-4 text-5xl opacity-40">☁️</div>
      <div className="pointer-events-none absolute bottom-10 right-6 text-5xl opacity-40">☁️</div>
      <div className="pointer-events-none absolute bottom-0 left-0 text-7xl opacity-20">🦙</div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-2">
        <RainbowMountainMark size={72} />
        <h1 className="mt-2 text-center font-display text-lg leading-relaxed text-rainbow-blue">
          ROAD TO
          <br />
          RAINBOW MOUNTAIN
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 mt-10 w-full max-w-sm space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-rainbow-blue/60">EMAIL</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-rainbow-blue/10 bg-white px-4 py-3 text-base text-rainbow-blue shadow-chunky outline-none focus:border-rainbow-purple"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-rainbow-blue/60">PASSWORD</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-rainbow-blue/10 bg-white px-4 py-3 text-base text-rainbow-blue shadow-chunky outline-none focus:border-rainbow-purple"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" tone="purple" disabled={submitting} className="mt-2">
          {submitting ? "…" : "LOGIN"}
        </Button>

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-center text-xs font-bold text-rainbow-blue/50 underline-offset-2 hover:underline"
        >
          {resetSent ? "Reset link sent (demo)" : "Forgot password?"}
        </button>
      </form>
    </div>
  );
}
