import type { FC } from 'react';
import type { Exam } from '../types/question';
import type { UserAccount } from '../types/user';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  isLoadingUsers: boolean;
  usersError?: string | null;
  onRefreshUsers: () => void;
  onSelectUser: (userId: string) => void;
  selectedUser: UserAccount | null;
  selectedUserExams: Exam[];
  isLoadingExams: boolean;
  examsError?: string | null;
  onDeleteExam: (userId: string, examId: string) => void;
  onDeleteAllExams: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  currentUserId: string;
}

const AdminPanel: FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  users,
  isLoadingUsers,
  usersError,
  onRefreshUsers,
  onSelectUser,
  selectedUser,
  selectedUserExams,
  isLoadingExams,
  examsError,
  onDeleteExam,
  onDeleteAllExams,
  onDeleteUser,
  currentUserId,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,23,18,0.55)] px-4 py-8">
      <div className="relative flex w-full max-w-6xl flex-col gap-6 rounded-[36px] bg-white p-8 shadow-2xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-300">
              Admin console
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-cocoa-600">
              Manage users and exams
            </h2>
            <p className="mt-2 text-sm text-cocoa-400">
              View and tidy up stored accounts and exam libraries across Omni Exam Studio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-2xl border border-cream-100 px-4 py-2 text-sm font-semibold text-cocoa-500 transition hover:border-rose-200 hover:text-rose-500"
              onClick={onRefreshUsers}
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? 'Refreshing…' : 'Refresh list'}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-transparent bg-rose-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <section className="flex flex-col gap-4 rounded-3xl border border-cream-100 bg-cream-50/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-cocoa-600">
                Accounts
              </h3>
              <span className="text-sm font-medium text-cocoa-400">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </span>
            </div>
            {usersError && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500">
                {usersError}
              </p>
            )}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-white/80">
              {isLoadingUsers ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-cocoa-400">
                  Loading users…
                </div>
              ) : users.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-cocoa-400">
                  No users found.
                </div>
              ) : (
                <ul className="divide-y divide-cream-100">
                  {users.map((account) => {
                    const isSelected = selectedUser?.id === account.id;
                    const isAdmin = account.role === 'admin';
                    const createdDate = new Date(account.createdAt);
                    return (
                      <li key={account.id}>
                        <button
                          type="button"
                          className={`flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition ${
                            isSelected
                              ? 'bg-rose-50 text-rose-600'
                              : 'hover:bg-cream-50 text-cocoa-500'
                          }`}
                          onClick={() => onSelectUser(account.id)}
                        >
                          <div>
                            <p className="font-display text-lg font-semibold">
                              {account.displayName}
                              {account.id === currentUserId ? (
                                <span className="ml-2 rounded-full bg-rose-100 px-2 py-[2px] text-xs font-semibold uppercase tracking-wide text-rose-500">
                                  You
                                </span>
                              ) : null}
                              {isAdmin ? (
                                <span className="ml-2 rounded-full bg-cocoa-100 px-2 py-[2px] text-xs font-semibold uppercase tracking-wide text-cocoa-500">
                                  Admin
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs font-medium text-cocoa-400">
                              {account.login} • Joined{' '}
                              {Number.isFinite(account.createdAt)
                                ? createdDate.toLocaleDateString()
                                : 'recently'}
                            </p>
                          </div>
                          {!isAdmin && account.id !== currentUserId && (
                            <button
                              type="button"
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteUser(account.id);
                              }}
                            >
                              Delete user
                            </button>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-cream-100 bg-cream-50/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-cocoa-600">
                  Exams for {selectedUser ? selectedUser.displayName : '—'}
                </h3>
                <p className="text-xs font-medium text-cocoa-400">
                  {selectedUserExams.length}{' '}
                  {selectedUserExams.length === 1 ? 'exam' : 'exams'} loaded
                </p>
              </div>
              {selectedUser && selectedUserExams.length > 0 && (
                <button
                  type="button"
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onDeleteAllExams(selectedUser.id)}
                  disabled={isLoadingExams}
                >
                  Delete all exams
                </button>
              )}
            </div>

            {examsError && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500">
                {examsError}
              </p>
            )}

            <div className="flex-1 overflow-y-auto rounded-2xl bg-white/80">
              {!selectedUser ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-cocoa-400">
                  Select a user to inspect their exams.
                </div>
              ) : isLoadingExams ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-cocoa-400">
                  Loading exams…
                </div>
              ) : selectedUserExams.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-cocoa-400">
                  No exams stored for this user.
                </div>
              ) : (
                <ul className="divide-y divide-cream-100">
                  {selectedUserExams.map((exam) => (
                    <li key={exam.id} className="flex items-start justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="font-display text-lg font-semibold text-cocoa-600">
                          {exam.title}
                        </p>
                        <p className="text-xs font-medium text-cocoa-400">
                          {exam.questions.length}{' '}
                          {exam.questions.length === 1 ? 'question' : 'questions'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                        onClick={() => onDeleteExam(selectedUser.id, exam.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
