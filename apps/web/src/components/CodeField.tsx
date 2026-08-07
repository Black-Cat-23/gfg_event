import React from 'react';

interface CodeFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CodeField: React.FC<CodeFieldProps> = ({ value, onChange, placeholder = 'K7MX92', disabled = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercaseVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    onChange(uppercaseVal);
  };

  return (
    <div className="w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={6}
        className="w-full text-center text-3xl font-extrabold tracking-widest uppercase py-4 px-4 bg-surface border-2 border-border rounded-xl focus:border-accent focus:outline-none transition-colors"
      />
    </div>
  );
};
