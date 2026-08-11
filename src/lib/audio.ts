let ctx: AudioContext | null = null;

/** Must be called from a direct user gesture (e.g. the START WORKOUT tap) — iOS Safari
 * blocks AudioContext creation/resume outside of one. Reused for every later beep(). */
export function primeAudio(): void {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AudioCtor();
}

export function beep(): void {
  if (!ctx) return;
  const duration = 0.15;
  const now = ctx.currentTime;

  for (const [offset, freq] of [
    [0, 880],
    [0.2, 880],
    [0.4, 1175],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + duration + 0.05);
  }
}

export function vibrate(pattern: number | number[]): void {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore — not all platforms support it
    }
  }
}
