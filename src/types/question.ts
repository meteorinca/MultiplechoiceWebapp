export type ChoiceOption = {
  label: string;
  text: string;
};

export type QuestionKind = 'choice' | 'fill';

type QuestionBase = {
  entry: string;
  imageUrl?: string;
};

export type ChoiceQuestion = QuestionBase & {
  kind?: 'choice';
  options: ChoiceOption[];
  correctIndex: number;
};

export type FillQuestion = QuestionBase & {
  kind: 'fill';
  correctAnswer: string;
};

export type Question = ChoiceQuestion | FillQuestion;

export type ChoiceSelection = {
  kind: 'choice';
  optionIndex: number;
  isCorrect: boolean;
};

export type FillSelection = {
  kind: 'fill';
  response: string;
  isCorrect: boolean;
};

export type Selection = ChoiceSelection | FillSelection | null;

export type AssignmentHistoryEntry = {
  id: string;
  completedAt: number;
  score: number;
  total: number;
  incorrectAttempts?: number;
};

export type AssignmentMetadata = {
  id: string;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: number;
  assignedTo: string;
  assignedToName?: string;
  requireCorrectToAdvance?: boolean;
  shuffleQuestions?: boolean;
  history?: AssignmentHistoryEntry[];
  lastCompletedAt?: number;
  lastScore?: number;
};

export type Exam = {
  id: string;
  title: string;
  questions: Question[];
  ownerId?: string;
  assignment?: AssignmentMetadata;
};

export const isFillQuestion = (question: Question): question is FillQuestion =>
  question.kind === 'fill';

export const isChoiceQuestion = (
  question: Question,
): question is ChoiceQuestion => !question.kind || question.kind === 'choice';
