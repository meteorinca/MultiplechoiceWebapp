import type { FC } from 'react';
import type { Question, Selection } from '../types/question';

interface FeedbackPanelProps {
  selection: Selection;
  question: Question;
}

const FeedbackPanel: FC<FeedbackPanelProps> = ({ selection, question }) => {
  if (!selection) {
    return null;
  }

  const correctOption = question.options[question.correctIndex];
  const isCorrect = selection.isCorrect;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-8 flex items-center gap-3 rounded-2xl px-5 py-4 text-base font-semibold ${
        isCorrect
          ? 'bg-mint-50 text-mint-600'
          : 'bg-cream-100/60 text-rose-500'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {isCorrect ? '\u2605' : ':('}
      </span>
      {isCorrect ? (
        <span>Correct!</span>
      ) : (
        <span>
          Nope. Right answer: {correctOption.label}. {correctOption.text}
        </span>
      )}
    </div>
  );
};

export default FeedbackPanel;
