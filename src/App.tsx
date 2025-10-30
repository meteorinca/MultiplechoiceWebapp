import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import ExamHeader from './components/ExamHeader';
import QuestionOption from './components/QuestionOption';
import FeedbackPanel from './components/FeedbackPanel';
import NavigationControls from './components/NavigationControls';
import ExamSidebar from './components/ExamSidebar';
import ExamSummary from './components/ExamSummary';
import MathText from './components/MathText';
import InlineMessage from './components/InlineMessage';
import { defaultExams } from './data/exams';
import useMobile from './hooks/use-mobile';
import { parseExamText, serializeExam } from './utils/exam-io';
import type { Exam, Question, Selection } from './types/question';

const STORAGE_KEY = 'omniExamStudio.exams';
const LEGACY_STORAGE_KEY = 'latinExamMaker.exams';

type SessionExam = {
  id: string;
  title: string;
  questions: Question[];
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const prepareSessionQuestions = (
  exam: Exam,
  options: { shuffleQuestions: boolean; shuffleAnswers: boolean },
): Question[] => {
  const questionPool = options.shuffleQuestions
    ? shuffleArray(exam.questions)
    : exam.questions.slice();

  return questionPool.map((question) => {
    if (!options.shuffleAnswers) {
      return {
        entry: question.entry,
        options: question.options.map((option) => ({ ...option })),
        correctIndex: question.correctIndex,
      };
    }

    const optionPool = question.options.map((option, optionIndex) => ({
      ...option,
      originalIndex: optionIndex,
    }));

    const shuffledOptions = shuffleArray(optionPool).map(
      (optionWithIndex, idx) => ({
        label: String.fromCharCode(97 + idx),
        text: optionWithIndex.text,
        originalIndex: optionWithIndex.originalIndex,
      }),
    );

    const newCorrectIndex = shuffledOptions.findIndex(
      (option) => option.originalIndex === question.correctIndex,
    );

    return {
      entry: question.entry,
      options: shuffledOptions.map(({ originalIndex, ...option }) => option),
      correctIndex:
        newCorrectIndex >= 0 ? newCorrectIndex : question.correctIndex,
    };
  });
};

type AlertState =
  | { text: string; type: 'success' | 'error' | 'info' }
  | null;

const App = () => {
  const isMobile = useMobile();
  const [exams, setExams] = useState<Exam[]>(defaultExams);
  const [activeExamId, setActiveExamId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);
  const [sessionExam, setSessionExam] = useState<SessionExam | null>(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const legacyStored = stored
        ? null
        : window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const payload = stored ?? legacyStored;
      if (legacyStored) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      if (payload) {
        const parsed: Exam[] = JSON.parse(payload);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExams(parsed);
          return;
        }
      }
    } catch {
      // ignore corrupted payloads
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [exams]);

  useEffect(() => {
    setSidebarOpen(!isMobile && isExamActive);
    setIsMenuOpen(false);
  }, [isMobile, isExamActive]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const activeExam = useMemo(() => {
    if (!activeExamId) {
      return undefined;
    }
    return exams.find((exam) => exam.id === activeExamId);
  }, [exams, activeExamId]);

  useEffect(() => {
    if (!sessionExam || !isExamActive) {
      setSelections([]);
      setCurrentIndex(0);
      setIsSummaryVisible(false);
      return;
    }
    setSelections(Array(sessionExam.questions.length).fill(null));
    setCurrentIndex(0);
    setIsSummaryVisible(false);
  }, [sessionExam?.id, isExamActive]);

  const totalQuestions = sessionExam?.questions.length ?? 0;
  const currentQuestion =
    isExamActive && totalQuestions > 0
      ? sessionExam?.questions[currentIndex]
      : undefined;
  const hasQuestions = Boolean(
    isExamActive && sessionExam && totalQuestions > 0 && currentQuestion,
  );

  const score = useMemo(() => {
    return selections.reduce((count, selection) => {
      if (selection?.isCorrect) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [selections]);

  const canProceed = Boolean(selections[currentIndex]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalQuestions - 1;

  const showStatus = Boolean(
    selections[currentIndex] && hasQuestions && !isSummaryVisible,
  );

  const startExam = useCallback(
    (examId: string) => {
      const selectedExam = exams.find((exam) => exam.id === examId);
      if (!selectedExam) {
        return;
      }
      setActiveExamId(examId);
      setIsSummaryVisible(false);
      setIsExamActive(true);
      setShowHelpGuide(false);
      setIsMenuOpen(false);
      const preparedQuestions = prepareSessionQuestions(selectedExam, {
        shuffleQuestions,
        shuffleAnswers,
      });
      setSessionExam({
        id: selectedExam.id,
        title: selectedExam.title,
        questions: preparedQuestions,
      });
    },
    [exams, shuffleAnswers, shuffleQuestions],
  );

  const goToExamHub = () => {
    setIsExamActive(false);
    setActiveExamId('');
    setSessionExam(null);
    setSidebarOpen(false);
    setCurrentIndex(0);
    setSelections([]);
    setShowHelpGuide(false);
    setIsMenuOpen(false);
    setIsSummaryVisible(false);
  };

  const handleSelect = (choiceIndex: number) => {
    if (!isExamActive || !currentQuestion || isSummaryVisible) {
      return;
    }
    setSelections((prev) => {
      const next = [...prev];
      next[currentIndex] = {
        optionIndex: choiceIndex,
        isCorrect: choiceIndex === currentQuestion.correctIndex,
      };
      return next;
    });
  };

  const goPrev = () => {
    if (isSummaryVisible) {
      return;
    }
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const goNext = () => {
    if (isSummaryVisible) {
      return;
    }
    setCurrentIndex((index) => Math.min(totalQuestions - 1, index + 1));
  };

  const handleFinishExam = () => {
    if (!sessionExam) {
      return;
    }
    setIsSummaryVisible(true);
    setSidebarOpen(false);
  };

  const handleRetakeExam = () => {
    const examId = sessionExam?.id ?? activeExamId;
    if (!examId) {
      return;
    }
    const exists = exams.some((exam) => exam.id === examId);
    if (!exists) {
      setAlert({
        text: 'That exam is no longer available.',
        type: 'info',
      });
      return;
    }
    startExam(examId);
  };

  const handleExamSelect = (examId: string) => {
    startExam(examId);
  };

  const handleDeleteExam = (examId: string) => {
    const examToDelete = exams.find((exam) => exam.id === examId);
    if (!examToDelete) {
      return;
    }

    let confirmed = true;
    if (typeof window !== 'undefined') {
      confirmed = window.confirm(
        `Delete "${examToDelete.title}" from your stored exams?`,
      );
    }
    if (!confirmed) {
      return;
    }

    setExams((prev) => prev.filter((exam) => exam.id !== examId));

    if (examId === activeExamId || sessionExam?.id === examId) {
      goToExamHub();
    }

    setAlert({
      text: `Deleted "${examToDelete.title}".`,
      type: 'info',
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseExamText(text);
      if (!parsed.success) {
        setAlert({ text: parsed.message, type: 'error' });
      } else {
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `exam-${Date.now()}`;
        const newExam: Exam = {
          id,
          title: parsed.data.title,
          questions: parsed.data.questions,
        };
        setExams((prev) => [...prev, newExam]);
        setActiveExamId(id);
        setAlert({
          text: `Imported "${parsed.data.title}" successfully.`,
          type: 'success',
        });
      }
    } catch {
      setAlert({
        text: 'Could not read that file. Please try another plain-text export.',
        type: 'error',
      });
    } finally {
      // reset input so the same file can be selected again
      event.target.value = '';
    }
  };

  const handleExport = () => {
    if (!activeExam) {
      setAlert({ text: 'Select an exam before exporting.', type: 'info' });
      return;
    }
    if (!activeExam.questions.length) {
      setAlert({ text: 'No questions to export yet.', type: 'info' });
      return;
    }
    const text = serializeExam(activeExam);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const normalizedName = activeExam.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    anchor.href = url;
    anchor.download = `${normalizedName || 'exam'}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setAlert({
      text: `Exported "${activeExam.title}" as a text file.`,
      type: 'success',
    });
  };

  const instructionTemplate = `Title: My Custom Exam

Question 1: puella, puellae, f.
a. girl
b. boy
c. child
d. pull
Answer: a`;

  const showComingSoon = (feature: string) => {
    setAlert({ text: `${feature} is coming soon.`, type: 'info' });
  };

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row">
        <main className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mb-4 flex justify-end">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cream-100 bg-white text-cocoa-500 shadow-sm transition hover:border-rose-200 hover:text-rose-400"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
              >
                <span className="sr-only">
                  {isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                </span>
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-3 w-60 rounded-2xl border border-cream-100 bg-white p-2 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!isExamActive}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      isExamActive
                        ? 'text-cocoa-500 hover:bg-cream-50'
                        : 'cursor-not-allowed text-cocoa-300'
                    }`}
                    onClick={() => {
                      if (!isExamActive) {
                        return;
                      }
                      setIsMenuOpen(false);
                      goToExamHub();
                    }}
                  >
                    Go to exam hub
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      showComingSoon('Login');
                    }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      showComingSoon('Register');
                    }}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      showComingSoon('Settings');
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleExport();
                    }}
                  >
                    Export exam (.txt)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleImportClick();
                    }}
                  >
                    Import exam (.txt)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowHelpGuide((prev) => !prev);
                    }}
                  >
                    {showHelpGuide ? 'Hide help guide' : 'Show help guide'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {isExamActive ? (
            <div className="rounded-[32px] bg-white px-6 py-8 shadow-card sm:px-10 sm:py-12">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="rounded-full border border-cream-100 bg-cream-50 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-400"
                  onClick={goToExamHub}
                >
                  Back to exam hub
                </button>
                <button
                  type="button"
                  className="rounded-full border border-cream-100 bg-cream-50 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-400"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                >
                  {sidebarOpen ? 'Hide exam list' : 'Show exam list'}
                </button>
              </div>

              {hasQuestions ? (
                isSummaryVisible && sessionExam ? (
                  <ExamSummary
                    title={sessionExam.title}
                    score={score}
                    total={totalQuestions}
                    onRetake={handleRetakeExam}
                    onExit={goToExamHub}
                  />
                ) : (
                  <>
                    <ExamHeader
                      title={sessionExam?.title ?? activeExam?.title ?? 'Exam'}
                      score={score}
                      total={totalQuestions}
                      questionIndex={currentIndex}
                    />

                    <section className="mt-8">
                      <MathText
                        text={currentQuestion?.entry ?? ''}
                        displayMode="block"
                        className={`${
                          isMobile ? 'text-xl' : 'text-2xl'
                        } font-semibold text-cocoa-500`}
                      />
                    </section>

                    <div className="mt-6 space-y-4">
                      {currentQuestion!.options.map((option, index) => (
                        <QuestionOption
                          key={`${currentQuestion!.entry}-${option.label}`}
                          option={option}
                          isSelected={
                            selections[currentIndex]?.optionIndex === index
                          }
                          isCorrectChoice={
                            index === currentQuestion!.correctIndex
                          }
                          showStatus={showStatus}
                          onSelect={() => handleSelect(index)}
                        />
                      ))}
                    </div>

                    <FeedbackPanel
                      selection={selections[currentIndex]}
                      question={currentQuestion!}
                    />

                    <NavigationControls
                      hasPrev={hasPrev}
                      hasNext={hasNext}
                      canProceed={canProceed}
                      onPrev={goPrev}
                      onNext={goNext}
                      onFinish={handleFinishExam}
                    />
                  </>
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-cream-100 bg-cream-50/60 px-6 py-10 text-center text-cocoa-400">
                  <p className="text-lg font-semibold">
                    No questions are loaded yet.
                  </p>
                  <p className="mt-2 text-sm">
                    Import a .txt file that follows the provided template to start
                    practicing.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[32px] bg-white px-6 py-10 shadow-card sm:px-10 sm:py-16">
              <header className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">
                  Omni Exam Studio
                </p>
                <h1 className="mt-3 font-display text-4xl font-semibold text-cocoa-600">
                  Choose an exam to begin practicing
                </h1>
                <p className="mt-4 text-base text-cocoa-400">
                  Tap one of the stored exams below or import a new list of questions.
                </p>
              </header>

              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {exams.map((exam) => {
                  const isSelectedCard = exam.id === activeExamId;
                  const cardClasses = isSelectedCard
                    ? 'border-rose-400 bg-blush-200/60 shadow-xl'
                    : 'border-transparent bg-cream-50/70 shadow-card hover:-translate-y-1 hover:shadow-2xl';
                  return (
                    <div key={exam.id} className="group relative">
                      <button
                        type="button"
                        className={`flex w-full flex-col overflow-hidden rounded-[36px] border px-8 py-10 text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${cardClasses}`}
                        onClick={() => startExam(exam.id)}
                      >
                        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
                          Exam
                        </span>
                        <h2 className="mt-4 font-display text-2xl font-semibold text-cocoa-600">
                          {exam.title}
                        </h2>
                        <p className="mt-6 text-sm font-medium text-cocoa-400">
                          {exam.questions.length}{' '}
                          {exam.questions.length === 1
                            ? 'question'
                            : 'questions'}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${exam.title}`}
                        className="absolute right-6 top-6 rounded-full border border-transparent bg-white/80 px-4 py-2 text-xs font-semibold text-rose-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteExam(exam.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>

              {exams.length === 0 && (
                <div className="mt-8 rounded-3xl border border-dashed border-cream-100 bg-cream-50/60 px-6 py-10 text-center text-cocoa-400">
                  <p className="text-lg font-semibold">No exams stored yet.</p>
                  <p className="mt-2 text-sm">
                    Import a plain-text exam file to get started.
                  </p>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-rose-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
                  onClick={handleImportClick}
                >
                  Import exam (.txt)
                </button>
                <button
                  type="button"
                  className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                    activeExam
                      ? 'border-rose-200 text-rose-500 hover:bg-blush-200/40'
                      : 'cursor-not-allowed border-cream-100 text-cocoa-300'
                  }`}
                  onClick={handleExport}
                  disabled={!activeExam}
                >
                  Export current exam (.txt)
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2 font-semibold text-cocoa-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-cream-200 text-rose-500 focus:ring-rose-400"
                    checked={shuffleQuestions}
                    onChange={(event) => setShuffleQuestions(event.target.checked)}
                  />
                  Shuffle questions
                </label>
                <label className="flex items-center gap-2 font-semibold text-cocoa-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-cream-200 text-rose-500 focus:ring-rose-400"
                    checked={shuffleAnswers}
                    onChange={(event) => setShuffleAnswers(event.target.checked)}
                  />
                  Shuffle answers
                </label>
                <span className="text-xs font-medium text-cocoa-400">
                  Applies the next time you start an exam
                </span>
              </div>
            </div>
          )}

          {showHelpGuide && (
            <section className="mt-10 rounded-3xl border border-cream-100 bg-cream-50/60 px-6 py-6 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold text-rose-500">
                    Import or Export
                  </h3>
                  <p className="text-sm text-cocoa-400">
                    Use a plain-text file to add new exams or share the current one.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-3 sm:justify-end">
                    <button
                      type="button"
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-blush-200/40"
                      onClick={handleExport}
                    >
                      Export exam (.txt)
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                      onClick={handleImportClick}
                    >
                      Import exam (.txt)
                    </button>
                  </div>
                  <button
                    type="button"
                    className="self-end rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-400 transition hover:border-rose-200 hover:text-rose-400"
                    onClick={() => setShowHelpGuide(false)}
                  >
                    Hide guide
                  </button>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-cocoa-400">
                <p className="font-semibold text-cocoa-500">
                  Template (repeat the Question block up to 1000 times):
                </p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-cream-50 p-4 font-mono text-xs leading-6 text-cocoa-500">
                  {instructionTemplate}
                </pre>
              </div>
            </section>
          )}

          {alert && (
            <div className="mt-6">
              <InlineMessage
                text={alert.text}
                type={alert.type}
                onDismiss={() => setAlert(null)}
              />
            </div>
          )}
        </main>

        {isExamActive && (
          <ExamSidebar
            exams={exams}
            activeExamId={activeExamId}
            isOpen={sidebarOpen}
            onSelect={handleExamSelect}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            onDelete={handleDeleteExam}
          />
        )}
      </div>
    </div>
  );
};

export default App;
