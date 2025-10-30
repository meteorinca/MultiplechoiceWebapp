import type { FC } from 'react';

interface ExamSummaryProps {
  title: string;
  score: number;
  total: number;
  onRetake: () => void;
  onExit: () => void;
}

const ExamSummary: FC<ExamSummaryProps> = ({
  title,
  score,
  total,
  onRetake,
  onExit,
}) => {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const missed = Math.max(total - score, 0);

  return (
    <section
      aria-label="Exam summary"
      className="flex flex-col items-center gap-8 text-center"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-400">
          Exam complete
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-cocoa-600">
          {title}
        </h2>
      </div>

      <div className="w-full max-w-md rounded-3xl border border-cream-100 bg-cream-50 px-8 py-6 shadow-inner">
        <p className="text-sm font-medium text-cocoa-400">Your score</p>
        <p className="mt-3 text-5xl font-semibold text-rose-500">
          {score}/{total}
        </p>
        <p className="mt-2 text-sm text-cocoa-400">
          {percentage}% correct &bull;{' '}
          {missed === 0
            ? 'Perfect run!'
            : `${missed} ${missed === 1 ? 'missed question' : 'missed questions'}`}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="button"
          className="rounded-2xl bg-rose-400 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
          onClick={onRetake}
        >
          Retake exam
        </button>
        <button
          type="button"
          className="rounded-2xl border border-cream-100 px-6 py-3 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-400"
          onClick={onExit}
        >
          Back to exam hub
        </button>
      </div>
    </section>
  );
};

export default ExamSummary;
