import { RainbowMountainMark } from "./icons/RainbowMountainMark";

export function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`flex items-center gap-3 px-4 ${compact ? "py-2" : "py-4"}`}>
      <RainbowMountainMark size={compact ? 32 : 42} />
      <div className={`font-display leading-tight text-rainbow-blue ${compact ? "text-[8px]" : "text-[10px]"}`}>
        <div>ROAD TO</div>
        <div>RAINBOW MOUNTAIN</div>
      </div>
    </header>
  );
}
