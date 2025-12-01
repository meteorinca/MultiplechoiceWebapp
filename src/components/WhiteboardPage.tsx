import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InlineMessage from './InlineMessage';
import type { WhiteboardDocument } from '../types/whiteboard';
import {
  deleteWhiteboard,
  subscribeToWhiteboards,
  upsertWhiteboard,
} from '../utils/cloud-whiteboards';

type WhiteboardPageProps = {
  userId: string;
  onBack: () => void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const generateBoardId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `board-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const WhiteboardPage = ({ userId, onBack }: WhiteboardPageProps) => {
  const [whiteboards, setWhiteboards] = useState<WhiteboardDocument[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasContainerRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeBoard = useMemo(
    () => whiteboards.find((board) => board.id === activeBoardId) ?? null,
    [whiteboards, activeBoardId],
  );

  useEffect(() => {
    setIsLoadingBoards(true);
    setError(null);
    const unsubscribe = subscribeToWhiteboards(
      userId,
      (boards) => {
        setWhiteboards(boards);
        setIsLoadingBoards(false);
        setError(null);
        if (!activeBoardId && boards[0]) {
          setActiveBoardId(boards[0].id);
        } else if (activeBoardId && boards.every((board) => board.id !== activeBoardId)) {
          setActiveBoardId(boards[0]?.id ?? null);
        }
      },
      (firestoreError) => {
        setIsLoadingBoards(false);
        // eslint-disable-next-line no-console
        console.error('Failed to load whiteboards:', firestoreError);
        setError(firestoreError.message ?? 'Unable to load whiteboards.');
      },
    );

    return () => {
      unsubscribe();
    };
  }, [activeBoardId, userId]);

  const handleCreateBoard = async () => {
    const now = Date.now();
    const board: WhiteboardDocument = {
      id: generateBoardId(),
      title: 'Untitled board',
      userId,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      setError(null);
      setSaveState('saving');
      await upsertWhiteboard(userId, board);
      setActiveBoardId(board.id);
      setLastSavedAt(now);
      setSaveState('saved');
    } catch (createError) {
      setSaveState('error');
      // eslint-disable-next-line no-console
      console.error('Failed to create whiteboard:', createError);
      setError('Unable to create a whiteboard right now.');
    }
  };

  const handleRenameBoard = async (title: string) => {
    if (!activeBoard) {
      return;
    }
    const trimmed = title.trim();
    if (!trimmed || trimmed === activeBoard.title) {
      return;
    }
    const now = Date.now();
    try {
      setSaveState('saving');
      await upsertWhiteboard(userId, {
        ...activeBoard,
        title: trimmed,
        updatedAt: now,
      });
      setLastSavedAt(now);
      setSaveState('saved');
    } catch (renameError) {
      setSaveState('error');
      setError('Unable to rename that whiteboard.');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!boardId) {
      return;
    }
    try {
      await deleteWhiteboard(userId, boardId);
      if (activeBoardId === boardId) {
        const nextBoard = whiteboards.find((board) => board.id !== boardId);
        setActiveBoardId(nextBoard?.id ?? null);
      }
    } catch (deleteError) {
      setError('Unable to delete that whiteboard.');
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBoard) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!imageUrl) {
        setError('Unable to read image file.');
        return;
      }

      const now = Date.now();
      setIsUploading(true);
      setSaveState('saving');
      setError(null);
      try {
        await upsertWhiteboard(userId, {
          ...activeBoard,
          imageUrl,
          updatedAt: now,
        });
        setLastSavedAt(now);
        setSaveState('saved');
      } catch (uploadError) {
        setSaveState('error');
        // eslint-disable-next-line no-console
        console.error('Failed to upload whiteboard image:', uploadError);
        setError('Unable to upload whiteboard image right now.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveBadgeText = useMemo(() => {
    if (isUploading || saveState === 'saving') {
      return 'Saving...';
    }
    if ((saveState === 'saved' || saveState === 'idle') && lastSavedAt) {
      return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
    }
    if (saveState === 'error') {
      return 'Save failed';
    }
    return 'Ready';
  }, [isUploading, lastSavedAt, saveState]);

  const toggleFullscreen = useCallback(() => {
    if (!canvasContainerRef.current) {
      return;
    }

    if (!isFullscreen) {
      const element = canvasContainerRef.current;
      if (element.requestFullscreen) {
        void element.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as {
        fullscreenElement?: Element | null;
      };
      const isCurrentlyFullscreen = !!doc.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="rounded-[32px] border border-cream-100 bg-white px-5 py-6 shadow-card sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
            Whiteboard
          </p>
          <h2 className="font-display text-3xl font-semibold text-cocoa-600">
            Visual workspace
          </h2>
          <p className="text-sm font-medium text-cocoa-400">
            Sketch ideas, annotate exams, and keep boards synced to your account.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              saveState === 'saved'
                ? 'bg-emerald-50 text-emerald-600'
                : saveState === 'error'
                  ? 'bg-rose-50 text-rose-500'
                  : 'bg-cream-100 text-cocoa-500'
            }`}
          >
            {saveBadgeText}
          </span>
          <button
            type="button"
            className="rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-500"
            onClick={() => {
              window.open('https://www.tldraw.com', '_blank', 'noopener,noreferrer');
            }}
          >
            Open tldraw.com
          </button>
          {activeBoard && (
            <button
              type="button"
              className="rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-500"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            className="rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-500"
            onClick={onBack}
          >
            Back to exams
          </button>
          <button
            type="button"
            className="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            onClick={handleCreateBoard}
            disabled={isLoadingBoards}
          >
            New board
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <InlineMessage text={error} type="error" onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-3xl border border-cream-100 bg-cream-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-cocoa-500">Your boards</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cocoa-400">
              {whiteboards.length}
            </span>
          </div>
          <div className="space-y-2">
            {isLoadingBoards ? (
              <div className="rounded-2xl border border-dashed border-cream-100 bg-white px-3 py-4 text-center text-sm font-semibold text-cocoa-400">
                Loading whiteboards…
              </div>
            ) : whiteboards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cream-100 bg-white px-3 py-4 text-center text-sm font-semibold text-cocoa-400">
                No whiteboards yet. Create one to get started.
              </div>
            ) : (
              whiteboards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setActiveBoardId(board.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    board.id === activeBoardId
                      ? 'border-rose-200 bg-white text-rose-500 shadow-sm'
                      : 'border-cream-100 bg-white/70 text-cocoa-500 hover:border-rose-100 hover:text-rose-500'
                  }`}
                >
                  <span className="line-clamp-2">{board.title}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cocoa-300">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
          {activeBoard && (
            <div className="rounded-2xl border border-cream-100 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cocoa-400">
                Board actions
              </p>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-2 text-sm font-semibold text-cocoa-500">
                  Title
                  <input
                    key={activeBoard.id}
                    defaultValue={activeBoard.title}
                    onBlur={(event) => handleRenameBoard(event.target.value)}
                    className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm font-semibold text-cocoa-600 transition focus:border-rose-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </label>
                <button
                  type="button"
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-100"
                  onClick={() => handleDeleteBoard(activeBoard.id)}
                >
                  Delete board
                </button>
              </div>
            </div>
          )}
        </aside>

        <section
          ref={canvasContainerRef}
          className={`min-h-[480px] overflow-hidden rounded-3xl border border-cream-100 bg-white shadow-inner transition-all ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
          }`}
        >
          {activeBoard ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
              {activeBoard.imageUrl ? (
                <img
                  src={activeBoard.imageUrl}
                  alt={activeBoard.title}
                  className="max-h-[70vh] w-full max-w-4xl rounded-2xl border border-cream-100 object-contain shadow-inner"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-cocoa-400">
                  <p className="text-lg font-semibold text-cocoa-500">
                    No whiteboard image yet
                  </p>
                  <p className="max-w-md text-sm">
                    Export your board from tldraw.com as an image, then upload it here to keep it
                    attached to this exam workspace.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading…' : activeBoard.imageUrl ? 'Replace image' : 'Upload image'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-cocoa-400">
              <p className="text-lg font-semibold text-cocoa-500">Select a whiteboard</p>
              <p className="max-w-md text-sm">
                Choose a board from the left or create a new one to start attaching tldraw images.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default WhiteboardPage;
