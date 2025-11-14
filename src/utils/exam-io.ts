import type { Exam, Question } from '../types/question';
import { isFillQuestion } from '../types/question';

const OPTION_REGEX = /^([a-z])[).:\-]\s*(.+)$/i;
const QUESTION_REGEX = /^question(?:\s+\d+)?\s*[:\-]\s*(.+)$/i;
const TITLE_REGEX = /^title\s*[:\-]\s*(.+)$/i;
const ANSWER_REGEX = /^answer\s*[:\-]\s*([a-z])/i;
const ANSWER_TEXT_REGEX = /^answer\s*[:\-]\s*(.+)$/i;
const TYPE_REGEX = /^type\s*[:\-]\s*(choice|fill)/i;
const MAX_QUESTIONS = 1000;

export type ParseResult =
  | { success: true; data: { title: string; questions: Question[] } }
  | { success: false; message: string };

const normalizeLines = (raw: string): string[] => {
  return raw.replace(/\r\n/g, '\n').split('\n');
};

export const parseExamText = (raw: string): ParseResult => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { success: false, message: 'The uploaded file is empty.' };
  }

  const lines = normalizeLines(raw);
  let index = 0;
  let title = '';
  const questions: Question[] = [];

  const skipBlank = () => {
    while (index < lines.length && !lines[index].trim()) {
      index += 1;
    }
  };

  skipBlank();
  if (index >= lines.length) {
    return { success: false, message: 'File content is missing a Title line.' };
  }

  const titleMatch = lines[index].trim().match(TITLE_REGEX);
  if (!titleMatch) {
    return {
      success: false,
      message: 'Start your file with "Title: <Name of exam>".',
    };
  }
  title = titleMatch[1].trim();
  index += 1;

  while (index < lines.length) {
    skipBlank();
    if (index >= lines.length) {
      break;
    }

    const questionLine = lines[index].trim();
    const questionMatch = questionLine.match(QUESTION_REGEX);
    if (!questionMatch) {
      return {
        success: false,
        message: `Expected a "Question:" line near line ${index + 1}.`,
      };
    }
    const entry = questionMatch[1].trim();
    if (!entry) {
      return {
        success: false,
        message: `Missing text for the question near line ${index + 1}.`,
      };
    }
    index += 1;

    let questionKind: 'choice' | 'fill' = 'choice';

    const potentialTypeLine = lines[index]?.trim();
    if (potentialTypeLine) {
      const typeMatch = potentialTypeLine.match(TYPE_REGEX);
      if (typeMatch) {
        questionKind = typeMatch[1].toLowerCase() as 'choice' | 'fill';
        index += 1;
      }
    }

    const skipInnerBlank = () => {
      while (index < lines.length && !lines[index].trim()) {
        index += 1;
      }
    };

    if (questionKind === 'fill') {
      skipInnerBlank();
      if (index >= lines.length) {
        return {
          success: false,
          message: `Missing "Answer:" line for the fill-in question that begins with "${entry}".`,
        };
      }
      const answerLine = lines[index].trim();
      const answerMatch = answerLine.match(ANSWER_TEXT_REGEX);
      if (!answerMatch || !answerMatch[1].trim()) {
        return {
          success: false,
          message: `Fill-in answers should look like "Answer: your text" near line ${index + 1}.`,
        };
      }
      const correctAnswer = answerMatch[1].trim();
      questions.push({
        kind: 'fill',
        entry,
        correctAnswer,
      });
      index += 1;
      continue;
    }

    const options: Array<{ label: string; text: string }> = [];
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }
      if (ANSWER_REGEX.test(line)) {
        break;
      }

      const optionMatch = line.match(OPTION_REGEX);
      if (!optionMatch) {
        return {
          success: false,
          message: `Option lines should start with "a. text". Issue near line ${index + 1}.`,
        };
      }
      options.push({
        label: optionMatch[1].toLowerCase(),
        text: optionMatch[2].trim(),
      });
      index += 1;
    }

    if (options.length < 2) {
      return {
        success: false,
        message: `Each question needs at least two options (question near line ${index + 1}).`,
      };
    }

    if (index >= lines.length) {
      return {
        success: false,
        message: `Missing "Answer:" line for the question that begins with "${entry}".`,
      };
    }

    const answerLine = lines[index].trim();
    const answerMatch = answerLine.match(ANSWER_REGEX);
    if (!answerMatch) {
      return {
        success: false,
        message: `Answer line malformed near line ${index + 1}. Use "Answer: a".`,
      };
    }
    const answerLetter = answerMatch[1].toLowerCase();
    const correctIndex = options.findIndex((opt) => opt.label === answerLetter);
    if (correctIndex === -1) {
      return {
        success: false,
        message: `The answer letter "${answerLetter}" must match one of the listed options.`,
      };
    }
    index += 1;

    questions.push({ entry, options, correctIndex });
    if (questions.length > MAX_QUESTIONS) {
      return {
        success: false,
        message: 'Please limit exams to 1000 questions or fewer.',
      };
    }
  }

  if (questions.length === 0) {
    return {
      success: false,
      message: 'No questions were detected. Please follow the provided template.',
    };
  }

  return { success: true, data: { title, questions } };
};

export const serializeExam = (exam: Exam): string => {
  const lines: string[] = [];
  lines.push(`Title: ${exam.title}`);
  lines.push('');

  exam.questions.forEach((question, idx) => {
    lines.push(`Question ${idx + 1}: ${question.entry}`);
    if (isFillQuestion(question)) {
      lines.push('Type: fill');
      lines.push(`Answer: ${question.correctAnswer}`);
    } else {
      const choiceQuestion = question;
      choiceQuestion.options.forEach((option) => {
        lines.push(`${option.label}. ${option.text}`);
      });
      const correctOption = choiceQuestion.options[choiceQuestion.correctIndex];
      const answerLabel = correctOption ? correctOption.label : '';
      lines.push(`Answer: ${answerLabel}`);
    }
    lines.push('');
  });

  return lines.join('\n').trim() + '\n';
};
