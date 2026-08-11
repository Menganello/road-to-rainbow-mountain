import { formatMMSS } from "../lib/format";
import { Button } from "./Button";

interface TimerProps {
  remainingMs: number;
  totalMs: number;
  onAdd15: () => void;
  onAdd30: () => void;
  onSkip: () => void;
}

export function Timer({ remainingMs, totalMs, onAdd15, onAdd30, onSkip }: TimerProps) {
  const progressPct = totalMs > 0 ? Math.min(100, 100 - (remainingMs / totalMs) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-display text-xs tracking-[0.3em] text-rainbow-turquoise">REST</p>
      <div
        className="flex h-56 w-56 items-center justify-center rounded-full transition-[background]"
        style={{ background: `conic-gradient(#2EC4B6 ${progressPct}%, #F5E6CA ${progressPct}%)` }}
      >
        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-white shadow-inner">
          <span className="font-display text-4xl text-rainbow-blue tabular-nums">{formatMMSS(remainingMs)}</span>
        </div>
      </div>
      <div className="flex w-full gap-3">
        <Button tone="purple" variant="outline" onClick={onAdd15}>
          +15 SEC
        </Button>
        <Button tone="purple" variant="outline" onClick={onAdd30}>
          +30 SEC
        </Button>
      </div>
      <Button tone="orange" variant="ghost" onClick={onSkip}>
        SKIP
      </Button>
    </div>
  );
}
