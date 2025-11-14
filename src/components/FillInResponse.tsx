import type { FC, FormEvent } from 'react';
import MathText from './MathText';

interface FillInResponseProps {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isLocked: boolean;
}

const FillInResponse: FC<FillInResponseProps> = ({
  prompt,
  value,
  onChange,
  onSubmit,
  disabled = false,
  isLocked,
}) => {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isLocked && !disabled) {
      onSubmit();
    }
  };

  return (
    <form
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-cream-100 bg-cream-50/70 p-4"
      onSubmit={handleSubmit}
    >
      <label className="text-sm font-semibold text-cocoa-500">
        Type your answer below
      </label>
      <textarea
        aria-label={`Fill in the blank for ${prompt}`}
        rows={3}
        className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-3 text-base font-medium text-cocoa-600 transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isLocked}
        placeholder="Type the correct word or phrase"
      />
      <div className="flex items-center justify-between gap-3 text-sm text-cocoa-400">
        <MathText
          text="Answers ignore case and extra spaces."
          displayMode="inline"
          className="text-xs text-cocoa-400"
        />
        <button
          type="submit"
          className="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLocked || disabled || !value.trim()}
        >
          {isLocked ? 'Answer locked' : 'Check answer'}
        </button>
      </div>
    </form>
  );
};

export default FillInResponse;
