import React, { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';

interface CodeCardProps {
  code: string;
  onProceed: () => void;
}

export const CodeCard: React.FC<CodeCardProps> = ({ code, onProceed }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-md max-w-md w-full mx-auto text-center space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-soft text-accent mx-auto">
        <ShieldCheck className="w-6 h-6" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-ink">Team Created!</h2>
        <p className="text-sm text-muted mt-1">Save this code for your team:</p>
      </div>

      <div className="bg-bg border-2 border-dashed border-accent p-5 rounded-xl flex items-center justify-between">
        <span className="text-3xl font-extrabold tracking-widest text-accent font-mono">{code}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-2 bg-surface hover:bg-bg border border-border rounded-lg text-sm font-semibold text-ink transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-muted" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        You'll need this code if you refresh the browser or switch to a new phone. It is also saved on this device.
      </p>

      <button
        onClick={onProceed}
        className="w-full py-4 px-6 bg-accent hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors text-base"
      >
        Let's go →
      </button>
    </div>
  );
};
