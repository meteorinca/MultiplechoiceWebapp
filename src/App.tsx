import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import ExamHeader from './components/ExamHeader';
import QuestionOption from './components/QuestionOption';
import FeedbackPanel from './components/FeedbackPanel';
import NavigationControls from './components/NavigationControls';
import ExamSidebar from './components/ExamSidebar';
import InlineMessage from './components/InlineMessage';
import { defaultExams } from './data/exams';
import useMobile from './hooks/use-mobile';
import { parseExamText, serializeExam } from './utils/exam-io';
import type { Exam, Selection } from './types/question';

const STORAGE_KEY = 'latinExamMaker.exams';

type AlertState =
  | { text: string; type: 'success' | 'error' | 'info' }
  | null;

const App = () => {
  const isMobile = useMobile();
  const [exams, setExams] = useState<Exam[]>(defaultExams);
  const [activeExamId, setActiveExamId] = useState<string>(
    defaultExams[0]?.id ?? '',
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Selection[]>(() =>
    Array(defaultExams[0]?.questions.length ?? 0).fill(null),
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alert, setAlert] = useState<AlertState>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Exam[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExams(parsed);
          setActiveExamId(parsed[0].id);
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
  }, [exams]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const activeExam = useMemo(() => {
    return exams.find((exam) => exam.id === activeExamId) ?? exams[0];
  }, [exams, activeExamId]);

  useEffect(() => {
    if (!activeExam) {
      setSelections([]);
      setCurrentIndex(0);
      return;
    }
    setSelections(Array(activeExam.questions.length).fill(null));
    setCurrentIndex(0);
  }, [activeExam?.id]);

  const totalQuestions = activeExam?.questions.length ?? 0;
  const currentQuestion =
    totalQuestions > 0 ? activeExam?.questions[currentIndex] : undefined;
  const hasQuestions = Boolean(activeExam && totalQuestions > 0 && currentQuestion);

  const score = useMemo(() => {
    return selections.reduce((count, selection) => {
      if (selection?.isCorrect) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [selections]);

  const showStatus = Boolean(selections[currentIndex] && hasQuestions);

  const handleSelect = (choiceIndex: number) => {
    if (!currentQuestion) {
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
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const goNext = () => {
    setCurrentIndex((index) => Math.min(totalQuestions - 1, index + 1));
  };

  const handleExamSelect = (examId: string) => {
    setActiveExamId(examId);
    setSidebarOpen(!isMobile ? true : false);
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
    if (!activeExam || !activeExam.questions.length) {
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

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row">
        <main className="flex-1">
          <div className="rounded-[32px] bg-white px-6 py-8 shadow-card sm:px-10 sm:py-12">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-cream-100 bg-cream-50 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-400"
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                {sidebarOpen ? 'Hide exam list' : 'Show exam list'}
              </button>
            </div>

            {hasQuestions ? (
              <>
                <ExamHeader
                  title={activeExam.title}
                  score={score}
                  total={totalQuestions}
                  questionIndex={currentIndex}
                />

                <section className="mt-8">
                  <p
                    className={`${
                      isMobile ? 'text-xl' : 'text-2xl'
                    } font-semibold text-cocoa-500`}
                  >
                    {currentQuestion?.entry}
                  </p>
                </section>

                <div className="mt-6 space-y-4">
                  {currentQuestion!.options.map((option, index) => (
                    <QuestionOption
                      key={`${currentQuestion!.entry}-${option.label}`}
                      option={option}
                      isSelected={
                        selections[currentIndex]?.optionIndex === index
                      }
                      isCorrectChoice={index === currentQuestion!.correctIndex}
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
                  hasPrev={currentIndex > 0}
                  hasNext={currentIndex < totalQuestions - 1}
                  onPrev={goPrev}
                  onNext={goNext}
                />
              </>
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

            <section className="mt-10 rounded-3xl border border-cream-100 bg-cream-50/60 px-6 py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold text-rose-500">
                    Import or Export
                  </h3>
                  <p className="text-sm text-cocoa-400">
                    Use a plain-text file to add new exams or share the current
                    one.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileChange}
                  />
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

            {alert && (
              <InlineMessage
                text={alert.text}
                type={alert.type}
                onDismiss={() => setAlert(null)}
              />
            )}
          </div>
        </main>

        <ExamSidebar
          exams={exams}
          activeExamId={activeExam?.id ?? ''}
          isOpen={sidebarOpen}
          onSelect={handleExamSelect}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
};

export default App;
