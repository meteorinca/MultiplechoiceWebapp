import type { FC } from 'react';

interface NavigationControlsProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const NavigationControls: FC<NavigationControlsProps> = ({ hasPrev, hasNext, onPrev, onNext }) => {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button
        type="button"
        disabled={!hasPrev}
        onClick={onPrev}
        className={`rounded-2xl border border-transparent px-5 py-3 text-lg font-semibold transition-all ${
          hasPrev
            ? 'bg-cream-100 text-cocoa-500 hover:border-cocoa-200 hover:bg-white'
            : 'bg-cream-100 text-cocoa-300 opacity-60'
        }`}
      >
        Previous
      </button>
      <button
        type="button"
        disabled={!hasNext}
        onClick={onNext}
        className={`rounded-2xl px-5 py-3 text-lg font-semibold text-white transition-all ${
          hasNext
            ? 'bg-rose-400 hover:bg-rose-500'
            : 'bg-cocoa-300 opacity-60'
        }`}
      >
        Next
      </button>
    </div>
  );
};

export default NavigationControls;
