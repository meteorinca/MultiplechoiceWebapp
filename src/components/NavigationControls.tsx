import type { FC } from 'react';

interface NavigationControlsProps {
  hasPrev: boolean;
  hasNext: boolean;
  canProceed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const NavigationControls: FC<NavigationControlsProps> = ({
  hasPrev,
  hasNext,
  canProceed,
  onPrev,
  onNext,
  onFinish,
}) => {
  const isLastStep = !hasNext;
  const handlePrimary = isLastStep ? onFinish : onNext;
  const isPrimaryDisabled = isLastStep ? !canProceed : !canProceed || !hasNext;
  const primaryLabel = isLastStep ? 'Finish exam' : 'Next';

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
        disabled={isPrimaryDisabled}
        onClick={handlePrimary}
        className={`rounded-2xl px-5 py-3 text-lg font-semibold text-white transition-all ${
          isPrimaryDisabled
            ? 'bg-cocoa-300 opacity-60'
            : 'bg-rose-400 hover:bg-rose-500'
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
};

export default NavigationControls;
