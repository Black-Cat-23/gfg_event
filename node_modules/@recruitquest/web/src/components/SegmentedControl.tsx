import React from 'react';
import { DecisionAction } from '@recruitquest/types';

interface SegmentedControlProps {
  value: DecisionAction;
  onChange: (val: DecisionAction) => void;
  disabled?: boolean;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ value = 'hold', onChange, disabled = false }) => {
  const options: { label: string; action: DecisionAction }[] = [
    { label: 'Buy', action: 'buy' },
    { label: 'Hold', action: 'hold' },
    { label: 'Sell', action: 'sell' }
  ];

  return (
    <div className="inline-flex p-1 bg-bg border border-border rounded-lg">
      {options.map((opt) => {
        const isActive = value === opt.action;
        let activeBg = 'bg-surface text-ink font-semibold shadow-xs';

        if (isActive) {
          if (opt.action === 'buy') activeBg = 'bg-success text-white font-bold shadow-xs';
          if (opt.action === 'sell') activeBg = 'bg-danger text-white font-bold shadow-xs';
          if (opt.action === 'hold') activeBg = 'bg-ink text-white font-bold shadow-xs';
        }

        return (
          <button
            key={opt.action}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.action)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation ${
              isActive ? activeBg : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
