import type { FC } from 'react';
import type { Exam } from '../types/question';

interface ExamSidebarProps {
  exams: Exam[];
  activeExamId: string;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onToggle: () => void;
  onDelete: (id: string) => void | Promise<void>;
}

const ExamSidebar: FC<ExamSidebarProps> = ({
  exams,
  activeExamId,
  isOpen,
  onSelect,
  onToggle,
  onDelete,
}) => {
  return (
    <aside
      className={`fixed bottom-0 right-0 top-0 z-30 w-72 border-l border-cream-100 bg-white px-5 py-6 shadow-2xl transition-all duration-200 md:static md:mt-0 md:h-auto md:border-none md:shadow-none ${
        isOpen
          ? 'translate-x-0 opacity-100 md:block'
          : 'pointer-events-none translate-x-full opacity-0 md:hidden'
      }`}
      aria-label="Exam list"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-rose-500">
          Stored Exams
        </h2>
        <button
          type="button"
          className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-cocoa-500 md:hidden"
          onClick={onToggle}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="mt-2 text-sm text-cocoa-300">
        Tap an exam to load it. Import as many as you like (up to 1000 questions
        each).
      </p>
      <ul className="mt-4 space-y-2">
        {exams.map((exam) => {
          const isActive = exam.id === activeExamId;
          return (
            <li key={exam.id} className="relative">
              <button
                type="button"
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  isActive
                    ? 'border-rose-400 bg-blush-200/60 text-rose-500'
                    : 'border-transparent bg-cream-50 text-cocoa-500 hover:border-cocoa-100'
                }`}
                onClick={() => onSelect(exam.id)}
                >
                  <span className="block text-base">{exam.title}</span>
                  <span className="text-xs font-medium text-cocoa-300">
                    {exam.questions.length} questions
                  </span>
                </button>
              <button
                type="button"
                aria-label={`Delete ${exam.title}`}
                className="absolute right-3 top-3 rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-semibold text-rose-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(exam.id);
                }}
              >
                Delete
              </button>
            </li>
          );
        })}
        {exams.length === 0 && (
          <li className="rounded-2xl border border-dashed border-cream-100 bg-cream-50/60 px-4 py-3 text-sm text-cocoa-300">
            No exams stored yet.
          </li>
        )}
      </ul>
    </aside>
  );
};

export default ExamSidebar;
