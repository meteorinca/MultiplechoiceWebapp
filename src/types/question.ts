export type ChoiceOption = {
  label: string;
  text: string;
};

export type QuestionKind = 'choice' | 'fill';

export type ChoiceQuestion = {
  kind?: 'choice';
  entry: string;
  options: ChoiceOption[];
  correctIndex: number;
};

export type FillQuestion = {
  kind: 'fill';
  entry: string;
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

export type Exam = {
  id: string;
  title: string;
  questions: Question[];
  ownerId?: string;
};

export const isFillQuestion = (question: Question): question is FillQuestion =>
  question.kind === 'fill';

export const isChoiceQuestion = (
  question: Question,
): question is ChoiceQuestion => !question.kind || question.kind === 'choice';
