import React from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { Clock, Pause } from 'lucide-react';

interface TimerProps {
  deadline?: string;
  isPaused?: boolean;
  size?: 'normal' | 'hero';
}

export const Timer: React.FC<TimerProps> = ({ deadline, isPaused = false, size = 'hero' }) => {
  const { formatted, totalSeconds } = useCountdown(deadline, isPaused);

  const isLowTime = totalSeconds <= 5 && totalSeconds > 0 && !isPaused;

  const fontClass = size === 'hero' ? 'text-5xl sm:text-6xl font-bold tracking-tight font-mono' : 'text-2xl font-bold font-mono';

  const colorClass = isPaused
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : isLowTime
    ? 'text-danger border-danger/30 animate-pulse'
    : 'text-accent';

  return (
    <div className="flex flex-col items-center justify-center my-3">
      <div className={`flex items-center space-x-3 px-6 py-2.5 rounded-2xl bg-surface border shadow-xs transition-colors ${colorClass}`}>
        {isPaused ? <Pause className="w-8 h-8 text-amber-500 animate-pulse" /> : <Clock className="w-8 h-8 opacity-80" />}
        <span className={fontClass}>⏱ {formatted}</span>
      </div>
      {isPaused && (
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1.5 flex items-center space-x-1">
          <span>⏸ PAUSED BY ORGANIZER</span>
        </span>
      )}
    </div>
  );
};
