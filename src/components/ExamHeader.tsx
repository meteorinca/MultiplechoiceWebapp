import type { FC } from 'react';

interface ExamHeaderProps {
  title: string;
  score: number;
  total: number;
  questionIndex: number;
  elapsedMs?: number;
}

const formatElapsed = (ms?: number) => {
  if (!ms || ms <= 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const ExamHeader: FC<ExamHeaderProps> = ({
  title,
  score,
  total,
  questionIndex,
  elapsedMs,
}) => {
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
      <div className="text-right">
        <p className="text-lg font-semibold text-rose-500">
          Score: {score}/{total}
        </p>
        <p className="text-sm font-semibold text-cocoa-400">
          Time: {formatElapsed(elapsedMs)}
        </p>
      </div>
    </header>
  );
};

export default ExamHeader;
