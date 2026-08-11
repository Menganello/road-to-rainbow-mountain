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

  useEffect(() => {
    void dataSource.getSettings().then(setSettings);
  }, []);

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
    const has = settings.preferredDays.includes(day);
    if (has) {
      setSettings({ ...settings, preferredDays: settings.preferredDays.filter((d) => d !== day) });
    } else if (settings.preferredDays.length < 3) {
      setSettings({ ...settings, preferredDays: [...settings.preferredDays, day].sort((a, b) => a - b) });
    }
  }

  async function handleSave() {
    if (!settings || settings.preferredDays.length !== 3) return;
    await dataSource.saveSettings(settings);
    await dataSource.refreshSchedule();
    setSaved(true);
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

        <section className="space-y-3 rounded-3xl bg-white p-5 shadow-chunky">
          <p className="font-display text-xs text-rainbow-blue">REMINDERS</p>
          <label className="flex items-center justify-between text-sm text-rainbow-blue">
            Day before
            <input
              type="checkbox"
              checked={settings.reminderDayBefore}
              onChange={(e) => {
                setSaved(false);
                setSettings({ ...settings, reminderDayBefore: e.target.checked });
              }}
              className="h-5 w-5 accent-rainbow-purple"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-rainbow-blue">
            Same day
            <input
              type="checkbox"
              checked={settings.reminderSameDay}
              onChange={(e) => {
                setSaved(false);
                setSettings({ ...settings, reminderSameDay: e.target.checked });
              }}
              className="h-5 w-5 accent-rainbow-purple"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-rainbow-blue">
            Reminder time
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => {
                setSaved(false);
                setSettings({ ...settings, reminderTime: e.target.value });
              }}
              className="rounded-lg border border-rainbow-blue/10 px-2 py-1"
            />
          </label>
        </section>

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
