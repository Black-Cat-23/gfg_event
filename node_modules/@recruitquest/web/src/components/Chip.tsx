import React from 'react';

interface ChipProps {
  label: string;
  variant?: 'default' | 'accent' | 'success' | 'warning';
}

export const Chip: React.FC<ChipProps> = ({ label, variant = 'default' }) => {
  let styles = 'bg-bg text-muted border-border';

  if (variant === 'accent') styles = 'bg-accent-soft text-accent border-accent/20 font-semibold';
  if (variant === 'success') styles = 'bg-emerald-50 text-success border-success/20 font-semibold';
  if (variant === 'warning') styles = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${styles}`}>
      {label}
    </span>
  );
};
