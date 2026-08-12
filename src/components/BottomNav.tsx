import { NavLink } from "react-router-dom";
import { Calendar as CalendarIcon, Dumbbell, House, Settings as SettingsIcon } from "lucide-react";

const ITEMS = [
  { to: "/", label: "HOME", Icon: House },
  { to: "/workouts", label: "WORKOUTS", Icon: Dumbbell },
  { to: "/calendar", label: "CALENDAR", Icon: CalendarIcon },
  { to: "/settings", label: "SETTINGS", Icon: SettingsIcon },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 will-change-transform border-t-2 border-rainbow-beige bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex justify-around">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-[10px] font-extrabold tracking-wide ${
                  isActive ? "text-rainbow-purple" : "text-rainbow-blue/40"
                }`
              }
            >
              <Icon size={22} strokeWidth={2.5} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
