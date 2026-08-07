import { useState, useEffect, useRef } from 'react';

export function useCountdown(deadlineISO?: string, isPaused: boolean = false) {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const frozenMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!deadlineISO) {
      setRemainingMs(0);
      frozenMsRef.current = null;
      return;
    }

    const targetTime = new Date(deadlineISO).getTime();

    if (isPaused) {
      if (frozenMsRef.current === null) {
        frozenMsRef.current = Math.max(0, targetTime - Date.now());
      }
      setRemainingMs(frozenMsRef.current);
      return;
    } else {
      frozenMsRef.current = null;
    }

    function update() {
      const diff = Math.max(0, targetTime - Date.now());
      setRemainingMs(diff);
    }

    update();
    const interval = setInterval(update, 100);

    return () => clearInterval(interval);
  }, [deadlineISO, isPaused]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return {
    remainingMs,
    totalSeconds,
    minutes,
    seconds,
    formatted,
    isExpired: remainingMs <= 0
  };
}
