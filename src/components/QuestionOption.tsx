import type { FC } from 'react';
import MathText from './MathText';
import type { ChoiceOption } from '../types/question';

interface QuestionOptionProps {
  option: ChoiceOption;
  isSelected: boolean;
  isCorrectChoice: boolean;
  showStatus: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

const QuestionOption: FC<QuestionOptionProps> = ({
  option,
  isSelected,
  isCorrectChoice,
  showStatus,
  disabled,
  onSelect,
}) => {
  const stateClass = (() => {
    if (showStatus && isSelected && isCorrectChoice) {
      return 'border-mint-600 bg-mint-50 text-cocoa-500 shadow-inner';
    }
    if (showStatus && isSelected && !isCorrectChoice) {
      return 'border-rose-400 bg-blush-200/70 text-rose-500';
    }
    if (showStatus && !isSelected && isCorrectChoice) {
      return 'border-mint-400 bg-mint-50 text-cocoa-500';
    }
    if (!showStatus && isSelected) {
      return 'border-cocoa-300 bg-cream-50';
    }
    return 'border-[rgba(118,90,72,0.18)] bg-white hover:border-cocoa-300';
  })();

  return (
    <button
      type="button"
      aria-label={`Option ${option.label}`}
      disabled={disabled}
      className={`flex w-full items-stretch justify-between rounded-2xl border px-5 py-3 text-left font-medium text-cocoa-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${stateClass} ${disabled ? 'cursor-not-allowed opacity-90' : ''}`}
      onClick={onSelect}
    >
      <div className="flex w-full items-start gap-3">
        <span className="text-lg font-semibold text-rose-400">
          {option.label}.
        </span>
        <MathText
          text={option.text}
          displayMode="inline"
          className="flex-1 text-base leading-relaxed text-current sm:text-lg"
        />
      </div>
    </button>
  );
};

export default QuestionOption;
