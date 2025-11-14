import type { FC } from 'react';
import MathText from './MathText';
import type { Question, Selection } from '../types/question';
import { isFillQuestion } from '../types/question';

interface FeedbackPanelProps {
  selection: Selection;
  question: Question;
}

const FeedbackPanel: FC<FeedbackPanelProps> = ({ selection, question }) => {
  if (!selection) {
    return null;
  }

  const isCorrect = selection.isCorrect;

  if (isFillQuestion(question)) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`mt-8 flex flex-col gap-1 rounded-2xl px-5 py-4 text-base font-semibold ${
          isCorrect
            ? 'bg-mint-50 text-mint-600'
            : 'bg-cream-100/60 text-rose-500'
        }`}
      >
        <span className="text-2xl" aria-hidden>
          {isCorrect ? '\u2605' : ':('}
        </span>
        {isCorrect ? (
          <span>Perfect! You nailed the blank.</span>
        ) : (
          <div className="flex flex-col gap-1 text-sm font-medium text-cocoa-500">
            <span className="text-rose-500">Not quite right.</span>
            <span className="text-cocoa-400">
              Your answer: "
              {selection.kind === 'fill' ? selection.response : ''}
              "
            </span>
            <span className="text-cocoa-500">
              Correct answer:&nbsp;
              <MathText
                text={question.correctAnswer}
                displayMode="inline"
                className="inline text-inherit"
              />
            </span>
          </div>
        )}
      </div>
    );
  }

  const correctOption = question.options[question.correctIndex];

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
        <div className="flex flex-wrap items-center gap-2">
          <span>Nope. Right answer: {correctOption.label}.</span>
          <MathText
            text={correctOption.text}
            displayMode="inline"
            className="inline text-inherit"
          />
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
