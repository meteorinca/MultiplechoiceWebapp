export type ChoiceOption = {
  label: string;
  text: string;
};

export type Question = {
  entry: string;
  options: ChoiceOption[];
  correctIndex: number;
};

export type Selection = {
  optionIndex: number;
  isCorrect: boolean;
} | null;

export type Exam = {
  id: string;
  title: string;
  questions: Question[];
};
