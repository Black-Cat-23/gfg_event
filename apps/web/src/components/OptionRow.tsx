import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface OptionRowProps {
  label: string;
  index: number;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: (index: number) => void;
}

export const OptionRow: React.FC<OptionRowProps> = ({ label, index, isSelected, isLocked, onSelect }) => {
  let containerStyles = 'border-border bg-surface text-ink hover:bg-bg';

  if (isSelected) {
    containerStyles = 'border-accent bg-accent-soft text-accent font-semibold shadow-xs';
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = optionLetters[index] || String(index + 1);

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(index)}
      className={`w-full min-h-[52px] px-4 py-3 border-2 rounded-xl text-left flex items-center justify-between transition-all touch-manipulation active:scale-[0.99] ${containerStyles}`}
    >
      <div className="flex items-center space-x-3 text-base sm:text-lg">
        <span className="w-7 h-7 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-bold text-muted">
          {letter}
        </span>
        <span className="leading-snug">{label}</span>
      </div>

      <div className="ml-2 flex-shrink-0">
        {isSelected ? (
          <CheckCircle2 className="w-6 h-6 text-accent fill-accent-soft" />
        ) : (
          <Circle className="w-6 h-6 text-muted opacity-40" />
        )}
      </div>
    </button>
  );
};
