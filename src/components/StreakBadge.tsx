interface StreakBadgeProps {
  streak: number;
  totalWorkouts: number;
}

export function StreakBadge({ streak, totalWorkouts }: StreakBadgeProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-chunky">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="font-display text-lg text-rainbow-orange">{streak}</p>
          <p className="text-[9px] font-bold tracking-wide text-rainbow-blue/50">WORKOUT STREAK</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-chunky">
        <span className="text-2xl">🦙</span>
        <div>
          <p className="font-display text-lg text-rainbow-purple">{totalWorkouts}</p>
          <p className="text-[9px] font-bold tracking-wide text-rainbow-blue/50">TOTAL WORKOUTS</p>
        </div>
      </div>
    </div>
  );
}
