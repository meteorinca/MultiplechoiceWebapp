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

  const containerClasses = `mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${
    isCorrect
      ? 'border-mint-200 bg-mint-50/80 text-mint-700'
      : 'border-rose-200 bg-rose-50/80 text-rose-600'
  }`;
  const icon = isCorrect ? '✓' : '!';

  if (isFillQuestion(question)) {
    return (
      <div role="status" aria-live="polite" className={containerClasses}>
        <span aria-hidden className="text-base">
          {icon}
        </span>
        {isCorrect ? (
          <span>Correct</span>
        ) : (
          <>
            <span>Not quite right.</span>
            <span className="text-xs font-medium text-cocoa-500">
              Correct:&nbsp;
              <MathText
                text={question.correctAnswer}
                displayMode="inline"
                className="inline text-inherit"
              />
            </span>
            {selection.kind === 'fill' && (
              <span className="text-xs font-medium text-cocoa-400">
                Yours: "{selection.response}"
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  const correctOption = question.options[question.correctIndex];

  return (
    <div role="status" aria-live="polite" className={containerClasses}>
      <span aria-hidden className="text-base">
        {icon}
      </span>
      {isCorrect ? (
        <span>Correct</span>
      ) : (
        <>
          <span>Right answer: {correctOption.label}.</span>
          <MathText
            text={correctOption.text}
            displayMode="inline"
            className="inline text-inherit"
          />
        </>
      )}
    </div>
  );
};

export default FeedbackPanel;
