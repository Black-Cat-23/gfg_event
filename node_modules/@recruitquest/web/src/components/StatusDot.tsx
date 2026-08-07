import React from 'react';

interface StatusDotProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ isConnected, isReconnecting = false }) => {
  let color = 'bg-danger';
  let label = 'Offline';

  if (isConnected) {
    color = 'bg-success';
    label = 'Live';
  } else if (isReconnecting) {
    color = 'bg-amber-500 animate-pulse';
    label = 'Reconnecting';
  }

  return (
    <div className="flex items-center space-x-1.5 text-xs text-muted" title={label}>
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="font-medium text-[11px] uppercase tracking-wider">{label}</span>
    </div>
  );
};
