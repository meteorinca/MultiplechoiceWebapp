import type { FC } from 'react';

interface ExamHeaderProps {
  title: string;
  score: number;
  total: number;
  questionIndex: number;
}

const ExamHeader: FC<ExamHeaderProps> = ({ title, score, total, questionIndex }) => {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-rose-500">
          {title}
        </h1>
        <p className="text-base font-medium text-cocoa-300">
          Question {questionIndex + 1} of {total}
        </p>
      </div>
      <div className="text-right text-lg font-semibold text-rose-500">
        Score: {score}/{total}
      </div>
    </header>
  );
};

export default ExamHeader;
