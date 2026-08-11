interface ProgressBarProps {
  percent: number; // 0-100
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[9px] font-display text-rainbow-blue/50">
        <span>BASE CAMP 🏕️</span>
        <span>🌈 RAINBOW MTN</span>
      </div>
      <div className="relative h-4 overflow-visible rounded-full bg-white shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rainbow-pink via-rainbow-purple to-rainbow-turquoise transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
        <span
          className="absolute -top-2 text-base transition-[left] duration-500"
          style={{ left: `calc(${clamped}% - 10px)` }}
        >
          🚶
        </span>
      </div>
      <p className="text-center font-display text-xs text-rainbow-purple">{Math.round(clamped)}%</p>
    </div>
  );
}
