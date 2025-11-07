import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import ExamHeader from './components/ExamHeader';
import QuestionOption from './components/QuestionOption';
import FeedbackPanel from './components/FeedbackPanel';
import NavigationControls from './components/NavigationControls';
import ExamSidebar from './components/ExamSidebar';
import ExamSummary from './components/ExamSummary';
import MathText from './components/MathText';
import InlineMessage from './components/InlineMessage';
import AdminPanel from './components/AdminPanel';
import { defaultExam, defaultExams } from './data/exams';
import useMobile from './hooks/use-mobile';
import { parseExamText, serializeExam } from './utils/exam-io';
import type { Exam, Question, Selection } from './types/question';
import type { UserAccount } from './types/user';
import {
  deleteAllUserExams,
  deleteCloudExam,
  fetchUserExamsSnapshot,
  saveUserExamsLocally,
  subscribeToCloudExams,
  upsertCloudExam,
} from './utils/cloud-exams';
import { isFirebaseConfigured } from './lib/firebase';
import {
  authenticateUser,
  deleteUserAccount,
  ensureAdminAccount,
  listUsers,
  registerUser,
  UserAuthError,
} from './utils/cloud-users';
import { requestPersistentStorageAccess } from './utils/persistent-store';

const SESSION_STORAGE_KEY = 'omniExamStudio.session';

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

type LogoBadgeProps = {
  size?: 'lg' | 'md';
  withText?: boolean;
  className?: string;
};

const LogoBadge = ({
  size = 'md',
  withText = false,
  className = '',
}: LogoBadgeProps) => {
  const circleClasses =
    size === 'lg'
      ? 'h-28 w-28 text-4xl'
      : 'h-14 w-14 text-xl';
  const titleClasses =
    size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl';
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div
        aria-hidden
        className={`relative flex ${circleClasses} items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-br from-rose-500 via-rose-400 to-amber-200 shadow-xl ring-4 ring-white/40`}
      >
        <img
          src="/assets/omni-logo.png"
          alt=""
          className="pointer-events-none absolute inset-3 h-auto w-auto object-contain opacity-90"
        />
        <span className="relative z-10 font-display font-semibold tracking-tight text-white">
          OE
        </span>
      </div>
      {withText && (
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.45em] text-rose-300">
            Omni Exam Studio
          </span>
          <span className={`font-display font-semibold text-cocoa-600 ${titleClasses}`}>
            Omni Exam Studio
          </span>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const isMobile = useMobile();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    login: '',
    password: '',
    displayName: '',
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
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
  const hasSeededCloudRef = useRef<Record<string, boolean>>({});
  const localExamsLoadedRef = useRef<Record<string, boolean>>({});
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<UserAccount[]>([]);
  const [isAdminUsersLoading, setIsAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  const [adminSelectedUserExams, setAdminSelectedUserExams] = useState<Exam[]>([]);
  const [isAdminExamsLoading, setIsAdminExamsLoading] = useState(false);
  const [adminExamsError, setAdminExamsError] = useState<string | null>(null);

  useEffect(() => {
    void requestPersistentStorageAccess();
    void ensureAdminAccount().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to ensure admin account.', error);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsRestoringSession(false);
      return;
    }
    try {
      const payload = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (payload) {
        const parsed = JSON.parse(payload) as UserAccount;
        if (parsed?.id) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore corrupted payloads
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!user) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setExams([]);
      setActiveExamId('');
      setSessionExam(null);
      setIsExamActive(false);
      setIsSummaryVisible(false);
      setSelections([]);
      setCurrentIndex(0);
      setShowHelpGuide(false);
      setSidebarOpen(false);
      return;
    }

    setExams([]);
    setActiveExamId('');
    setSessionExam(null);
    setIsExamActive(false);
    setIsSummaryVisible(false);
    setSelections([]);
    setCurrentIndex(0);
    setShowHelpGuide(false);
    setSidebarOpen(false);
  }, [user]);

  useEffect(() => {
    if (!user || isFirebaseConfigured) {
      return;
    }

    localExamsLoadedRef.current[user.id] = false;
    let cancelled = false;

    const loadLocalExams = async () => {
      try {
        const stored = await fetchUserExamsSnapshot(user.id);
        const nextExams =
          stored.length > 0
            ? stored.map((exam) => ({ ...exam, ownerId: user.id }))
            : defaultExams.map((exam) => ({ ...exam, ownerId: user.id }));

        if (!stored.length) {
          await saveUserExamsLocally(user.id, nextExams);
        }

        if (!cancelled) {
          setExams(nextExams);
          localExamsLoadedRef.current[user.id] = true;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load exams from local storage.', error);
        if (cancelled) {
          return;
        }
        const seeded = defaultExams.map((exam) => ({
          ...exam,
          ownerId: user.id,
        }));
        setExams(seeded);
        localExamsLoadedRef.current[user.id] = true;
        await saveUserExamsLocally(user.id, seeded);
      }
    };

    void loadLocalExams();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || isFirebaseConfigured) {
      return;
    }
    if (!localExamsLoadedRef.current[user.id]) {
      return;
    }
    void saveUserExamsLocally(user.id, exams);
  }, [user, exams]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) {
      return;
    }

    const unsubscribe = subscribeToCloudExams(
      user.id,
      async (cloudExams, { fromCache }) => {
        if (cloudExams.length === 0) {
          if (!fromCache && !hasSeededCloudRef.current[user.id]) {
            try {
              const seededExam = {
                ...defaultExam,
                ownerId: user.id,
              };
              await upsertCloudExam(user.id, seededExam);
              hasSeededCloudRef.current[user.id] = true;
              setExams([seededExam]);
              return;
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Failed to seed default exam in Firestore.', error);
            }
          }
          setExams([]);
          return;
        }
        hasSeededCloudRef.current[user.id] = true;
        setExams(cloudExams);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to sync exams from Firestore.', error);
        setAlert({
          text: 'Could not sync exams with cloud storage. Showing local copy.',
          type: 'error',
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

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

  const handleAuthInputChange =
    (field: 'login' | 'password' | 'displayName') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setAuthForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const resetAuthState = () => {
    setAuthForm({
      login: '',
      password: '',
      displayName: '',
    });
    setAuthError(null);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAuthLoading) {
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      let account: UserAccount;
      if (authMode === 'login') {
        account = await authenticateUser(authForm.login, authForm.password);
      } else {
        account = await registerUser({
          login: authForm.login,
          password: authForm.password,
          displayName: authForm.displayName || authForm.login,
        });
      }
      setUser(account);
      resetAuthState();
      setAlert({
        text:
          authMode === 'login'
            ? `Welcome back, ${account.displayName}!`
            : `Account created. Hello, ${account.displayName}!`,
        type: 'success',
      });
    } catch (error) {
      if (error instanceof UserAuthError) {
        setAuthError(error.message);
      } else {
        setAuthError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    resetAuthState();
    setAuthMode('login');
    setIsMenuOpen(false);
    setIsAdminConsoleOpen(false);
    setAdminSelectedUserId(null);
    setAdminSelectedUserExams([]);
    setAdminUsers([]);
    setAdminUsersError(null);
    setAdminExamsError(null);
    setAlert({
      text: 'Signed out safely.',
      type: 'info',
    });
  };

  const toggleAuthMode = () => {
    setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setAuthError(null);
    setAuthForm((prev) => ({
      ...prev,
      password: '',
      displayName: prev.displayName,
    }));
  };

  const refreshAdminUsers = useCallback(async () => {
    setIsAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const usersList = await listUsers();
      setAdminUsers(usersList);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load users list.', error);
      setAdminUsersError('Unable to load users right now.');
    } finally {
      setIsAdminUsersLoading(false);
    }
  }, []);

  const loadAdminUserExams = useCallback(async (targetUserId: string) => {
    setIsAdminExamsLoading(true);
    setAdminExamsError(null);
    try {
      const examsList = await fetchUserExamsSnapshot(targetUserId);
      setAdminSelectedUserExams(
        examsList.map((exam) => ({
          ...exam,
          ownerId: targetUserId,
        })),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load exams for user.', error);
      setAdminSelectedUserExams([]);
      setAdminExamsError('Unable to load exams for that user.');
    } finally {
      setIsAdminExamsLoading(false);
    }
  }, []);

  const openAdminConsole = useCallback(() => {
    setIsAdminConsoleOpen(true);
    setAdminSelectedUserId(null);
    setAdminSelectedUserExams([]);
    setAdminExamsError(null);
    void refreshAdminUsers();
  }, [refreshAdminUsers]);

  const closeAdminConsole = useCallback(() => {
    setIsAdminConsoleOpen(false);
    setAdminSelectedUserId(null);
    setAdminSelectedUserExams([]);
    setAdminExamsError(null);
  }, []);

  const handleAdminSelectUser = useCallback(
    (targetUserId: string) => {
      setAdminSelectedUserId(targetUserId);
      void loadAdminUserExams(targetUserId);
    },
    [loadAdminUserExams],
  );

  const handleAdminDeleteExam = useCallback(
    async (targetUserId: string, examId: string) => {
      try {
        await deleteCloudExam(targetUserId, examId);
        await loadAdminUserExams(targetUserId);
        if (user?.id === targetUserId) {
          setExams((prev) => prev.filter((exam) => exam.id !== examId));
        }
        setAlert({
          text: 'Removed exam successfully.',
          type: 'info',
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete exam for user.', error);
        setAlert({
          text: 'Could not delete that exam right now.',
          type: 'error',
        });
      }
    },
    [loadAdminUserExams, setAlert, user],
  );

  const handleAdminDeleteAllExams = useCallback(
    async (targetUserId: string) => {
      let confirmed = true;
      if (typeof window !== 'undefined') {
        confirmed = window.confirm('Delete all exams for this user?');
      }
      if (!confirmed) {
        return;
      }
      try {
        await deleteAllUserExams(targetUserId);
        await loadAdminUserExams(targetUserId);
        if (user?.id === targetUserId) {
          setExams([]);
          setActiveExamId('');
          setSessionExam(null);
          setIsExamActive(false);
          setIsSummaryVisible(false);
          setSelections([]);
          setCurrentIndex(0);
        }
        setAlert({
          text: 'Cleared all exams for that user.',
          type: 'info',
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete all exams for user.', error);
        setAlert({
          text: 'Could not clear exams for that user.',
          type: 'error',
        });
      }
    },
    [loadAdminUserExams, user],
  );

  const handleAdminDeleteUser = useCallback(
    async (targetUserId: string) => {
      const targetUser = adminUsers.find((candidate) => candidate.id === targetUserId);
      if (!targetUser) {
        return;
      }
      if (targetUser.role === 'admin') {
        setAlert({
          text: 'Admin accounts cannot be deleted.',
          type: 'error',
        });
        return;
      }
      let confirmed = true;
      if (typeof window !== 'undefined') {
        confirmed = window.confirm(
          `Delete user "${targetUser.displayName}" and all of their exams?`,
        );
      }
      if (!confirmed) {
        return;
      }
      try {
        await deleteUserAccount(targetUserId);
        await deleteAllUserExams(targetUserId);
        setAlert({
          text: `Deleted "${targetUser.displayName}" and their exams.`,
          type: 'info',
        });
        if (adminSelectedUserId === targetUserId) {
          setAdminSelectedUserId(null);
          setAdminSelectedUserExams([]);
        }
        await refreshAdminUsers();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete user.', error);
        setAlert({
          text: 'Could not delete that user.',
          type: 'error',
        });
      }
    },
    [adminSelectedUserId, adminUsers, refreshAdminUsers],
  );

  const activeExam = useMemo(() => {
    if (!activeExamId) {
      return undefined;
    }
    return exams.find((exam) => exam.id === activeExamId);
  }, [exams, activeExamId]);

  const adminSelectedUser = useMemo(() => {
    if (!adminSelectedUserId) {
      return null;
    }
    return adminUsers.find((candidate) => candidate.id === adminSelectedUserId) ?? null;
  }, [adminUsers, adminSelectedUserId]);

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

  const handleDeleteExam = async (examId: string) => {
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

    if (user) {
      try {
        await deleteCloudExam(user.id, examId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete exam from storage.', error);
        setAlert({
          text: 'Deleted locally but could not remove from storage yet.',
          type: 'error',
        });
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!user) {
      setAlert({
        text: 'Please sign in before importing exams.',
        type: 'error',
      });
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
          ownerId: user.id,
        };
        setExams((prev) => [...prev, newExam]);
        setActiveExamId(id);
        try {
          await upsertCloudExam(user.id, newExam);
          setAlert({
            text: `Imported "${parsed.data.title}" successfully.`,
            type: 'success',
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to persist exam to storage.', error);
          setAlert({
            text: `Imported "${parsed.data.title}" locally. Sync will retry soon.`,
            type: 'info',
          });
        }
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

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream-50 px-6 text-cocoa-500">
        <LogoBadge size="lg" withText />
        <p className="text-sm font-medium text-cocoa-400">
          Restoring your Omni Exam Studio workspace&hellip;
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-rose-50 px-6 py-12 sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col items-center rounded-[40px] bg-white/70 p-10 text-center shadow-2xl backdrop-blur-sm lg:items-start lg:text-left">
            <LogoBadge size="lg" withText className="mb-8" />
            <p className="max-w-md text-lg text-cocoa-500">
              Build, review, and deliver personalized exams for every teammate.
            </p>
            <ul className="mt-10 space-y-4 text-left text-sm text-cocoa-400">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-500">
                  1
                </span>
                <span>Save unique exam sets for each login.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-500">
                  2
                </span>
                <span>Import plain-text question banks in one click.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-500">
                  3
                </span>
                <span>Track progress while Omni Exam Studio handles the scoring.</span>
              </li>
            </ul>
          </div>
          <div className="w-full max-w-md rounded-[36px] border border-cream-100 bg-white px-8 py-10 shadow-2xl sm:px-10">
            <form className="flex flex-col gap-5" onSubmit={handleAuthSubmit}>
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-semibold text-cocoa-400"
                  htmlFor="auth-login"
                >
                  Login
                </label>
                <input
                  id="auth-login"
                  type="text"
                  className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm font-medium text-cocoa-600 transition focus:border-rose-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={authForm.login}
                  onChange={handleAuthInputChange('login')}
                  autoComplete="username"
                  required
                />
              </div>

              {authMode === 'register' && (
                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-semibold text-cocoa-400"
                    htmlFor="auth-display-name"
                  >
                    Display name
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm font-medium text-cocoa-600 transition focus:border-rose-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                    value={authForm.displayName}
                    onChange={handleAuthInputChange('displayName')}
                    autoComplete="name"
                    required={authMode === 'register'}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-semibold text-cocoa-400"
                  htmlFor="auth-password"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm font-medium text-cocoa-600 transition focus:border-rose-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={authForm.password}
                  onChange={handleAuthInputChange('password')}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>

              {authError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500">
                  {authError}
                </div>
              ) : null}

              <button
                type="submit"
                className="rounded-2xl bg-rose-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAuthLoading}
              >
                {isAuthLoading
                  ? 'Just a moment...'
                  : authMode === 'login'
                    ? 'Sign in to Omni'
                    : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-cocoa-400">
              {authMode === 'login' ? (
                <>
                  Need an account?{' '}
                  <button
                    type="button"
                    className="font-semibold text-rose-500 transition hover:text-rose-600"
                    onClick={toggleAuthMode}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    className="font-semibold text-rose-500 transition hover:text-rose-600"
                    onClick={toggleAuthMode}
                  >
                    Sign in instead
                  </button>
                </>
              )}
            </p>

            <p className="mt-4 text-center text-xs text-cocoa-300">
              Credentials are stored securely in our internal datastore.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[32px] bg-white/70 px-6 py-6 shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <LogoBadge withText className="justify-center sm:justify-start" />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-center sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-300">
                Signed in as
              </p>
              <p className="text-base font-semibold text-cocoa-600">
                {user.displayName}
              </p>
              <p className="text-xs font-medium text-cocoa-400">{user.login}</p>
            </div>
            {user.role === 'admin' && (
              <button
                type="button"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-100"
                onClick={openAdminConsole}
              >
                Manage workspace
              </button>
            )}
            <button
              type="button"
              className="rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-500"
              onClick={handleSignOut}
            >
              Sign out
            </button>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cream-100 bg-white text-cocoa-500 shadow-sm transition hover:border-rose-200 hover:text-rose-400"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
              >
                <span className="sr-only">
                  {isMenuOpen ? 'Close workspace actions' : 'Open workspace actions'}
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
                      showComingSoon('Question sharing');
                    }}
                  >
                    Share current question
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cocoa-500 transition hover:bg-cream-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      showComingSoon('Bulk edit');
                    }}
                  >
                    Bulk edit exams
                  </button>
                  <div className="my-1 h-px bg-cream-100" />
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
        </header>
        <div className="flex flex-col gap-6 md:flex-row">
          <main className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />


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
                          void handleDeleteExam(exam.id);
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
                  Shuffle changes apply next session; math renders automatically when detected.
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
        {user?.role === 'admin' && (
          <AdminPanel
            isOpen={isAdminConsoleOpen}
            onClose={closeAdminConsole}
            users={adminUsers}
            isLoadingUsers={isAdminUsersLoading}
            usersError={adminUsersError}
            onRefreshUsers={refreshAdminUsers}
            onSelectUser={handleAdminSelectUser}
            selectedUser={adminSelectedUser}
            selectedUserExams={adminSelectedUserExams}
            isLoadingExams={isAdminExamsLoading}
            examsError={adminExamsError}
            onDeleteExam={handleAdminDeleteExam}
            onDeleteAllExams={handleAdminDeleteAllExams}
            onDeleteUser={handleAdminDeleteUser}
            currentUserId={user.id}
          />
        )}
      </div>
    </div>
  </div>
);
};

export default App;
