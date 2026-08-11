import { useEffect, useRef, useState } from "react";
import { beep, vibrate } from "./audio";

interface UseRestTimerOptions {
  onComplete: () => void;
  /** Lets the caller mirror the running endTimestamp into session.ts for crash/backgrounding recovery. */
  onEndTimestampChange?: (endTimestamp: number | null) => void;
}

/**
 * A rest-countdown timer that never trusts an interval's tick count. `endTimestamp` (an
 * absolute epoch ms) is the single source of truth; every tick recomputes the remaining time
 * from `Date.now()`, so the display is always correct even after the phone was locked or the
 * tab was backgrounded for a while.
 */
export function useRestTimer({ onComplete, onEndTimestampChange }: UseRestTimerOptions) {
  const [endTimestamp, setEndTimestampState] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const setEndTimestamp = (value: number | null) => {
    setEndTimestampState(value);
    onEndTimestampChange?.(value);
  };

  const start = (seconds: number) => {
    firedRef.current = false;
    setEndTimestamp(Date.now() + seconds * 1000);
  };

  /** Rehydrates a timer already running before a reload/resume (from session.ts). */
  const resume = (savedEndTimestamp: number) => {
    firedRef.current = false;
    setEndTimestampState(savedEndTimestamp);
  };

  const addSeconds = (seconds: number) => {
    setEndTimestampState((prev) => {
      const next = (prev ?? Date.now()) + seconds * 1000;
      onEndTimestampChange?.(next);
      return next;
    });
  };

  const complete = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setEndTimestamp(null);
    beep();
    vibrate([200, 100, 200]);
    onCompleteRef.current();
  };

  const skip = () => complete();

  useEffect(() => {
    if (endTimestamp == null) return;

    const tick = () => {
      const remaining = Math.max(0, endTimestamp - Date.now());
      setRemainingMs(remaining);
      if (remaining <= 0) complete();
    };
    tick();

    const id = window.setInterval(tick, 250);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTimestamp]);

  return { remainingMs, isRunning: endTimestamp != null, start, addSeconds, skip, resume };
}
