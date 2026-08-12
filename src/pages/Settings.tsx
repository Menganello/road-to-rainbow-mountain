import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { dataSource } from "../lib/data";
import { useAuth } from "../lib/auth";
import { weekdayLabel } from "../lib/format";
import type { ISOWeekday, Settings as SettingsType } from "../types";

const ALL_DAYS: ISOWeekday[] = [1, 2, 3, 4, 5, 6, 7];

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setError(null);
    dataSource
      .getSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong loading settings."));
  }

  useEffect(load, []);

  if (error) {
    return (
      <div className="min-h-dvh bg-rainbow-beige pb-28">
        <Header />
        <main className="mx-auto max-w-md space-y-4 px-4 text-center">
          <p className="font-display text-xs text-rainbow-pink">COULDN'T LOAD SETTINGS</p>
          <p className="text-sm text-rainbow-blue/70">{error}</p>
          <Button tone="purple" onClick={load}>
            TRY AGAIN
          </Button>
        </main>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-dvh bg-rainbow-beige pb-28">
        <Header />
      </div>
    );
  }

  function toggleDay(day: ISOWeekday) {
    if (!settings) return;
    setSaved(false);
    setSaveError(null);
    const has = settings.preferredDays.includes(day);
    if (has) {
      setSettings({ ...settings, preferredDays: settings.preferredDays.filter((d) => d !== day) });
    } else if (settings.preferredDays.length < 3) {
      setSettings({ ...settings, preferredDays: [...settings.preferredDays, day] });
    } else {
      // Already 3 picked — swap out the oldest pick instead of silently ignoring the tap.
      const [, ...rest] = settings.preferredDays;
      setSettings({ ...settings, preferredDays: [...rest, day] });
    }
  }

  async function handleSave() {
    if (!settings || settings.preferredDays.length !== 3) return;
    setSaveError(null);
    try {
      await dataSource.saveSettings(settings);
      await dataSource.regenerateSchedule();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your settings — try again.");
    }
  }

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh bg-rainbow-beige pb-28">
      <Header />
      <main className="mx-auto max-w-md space-y-5 px-4">
        <h1 className="font-display text-sm text-rainbow-blue">SETTINGS</h1>

        <section className="space-y-3 rounded-3xl bg-white p-5 shadow-chunky">
          <p className="font-display text-xs text-rainbow-blue">PREFERRED DAYS</p>
          <p className="text-xs text-rainbow-blue/50">Pick exactly 3 — the app builds your schedule around them.</p>
          <div className="grid grid-cols-4 gap-2">
            {ALL_DAYS.map((day) => {
              const active = settings.preferredDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-xl py-2 text-[11px] font-bold ${
                    active ? "bg-rainbow-purple text-white" : "bg-rainbow-beige text-rainbow-blue/60"
                  }`}
                >
                  {weekdayLabel(day).slice(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>
        </section>

        {saveError && <p className="text-center text-xs font-bold text-rainbow-pink">{saveError}</p>}
        <Button tone="turquoise" onClick={handleSave} disabled={settings.preferredDays.length !== 3}>
          {saved ? "SAVED ✓" : "SAVE SETTINGS"}
        </Button>

        <section className="space-y-2 rounded-3xl bg-white p-5 shadow-chunky">
          <p className="text-xs text-rainbow-blue/50">Signed in as</p>
          <p className="text-sm font-bold text-rainbow-blue">{user?.email}</p>
          <Button tone="pink" variant="outline" onClick={handleLogout}>
            LOG OUT
          </Button>
        </section>
      </main>
    </div>
  );
}
