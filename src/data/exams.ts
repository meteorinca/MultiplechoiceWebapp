import type { Exam } from '../types/question';

export const defaultExam: Exam = {
  id: 'latin-default',
  title: 'Latin Vocabulary Exam',
  questions: [
    {
      entry: 'grammatica, grammaticae, f.',
      options: [
        { label: 'a', text: 'example' },
        { label: 'b', text: 'chapter' },
        { label: 'c', text: 'letter' },
        { label: 'd', text: 'grammar' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'discipula, discipulae, f.',
      options: [
        { label: 'a', text: 'teacher' },
        { label: 'b', text: 'friend' },
        { label: 'c', text: 'scribe' },
        { label: 'd', text: 'student' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'poeta, poetae, m.',
      options: [
        { label: 'a', text: 'sailor' },
        { label: 'b', text: 'soldier' },
        { label: 'c', text: 'farmer' },
        { label: 'd', text: 'poet' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'patria, patriae, f.',
      options: [
        { label: 'a', text: 'daughter' },
        { label: 'b', text: 'market' },
        { label: 'c', text: 'forest' },
        { label: 'd', text: 'homeland' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'puella, puellae, f.',
      options: [
        { label: 'a', text: 'maid' },
        { label: 'b', text: 'boy' },
        { label: 'c', text: 'child' },
        { label: 'd', text: 'girl' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'insula, insulae, f.',
      options: [
        { label: 'a', text: 'street' },
        { label: 'b', text: 'temple' },
        { label: 'c', text: 'palace' },
        { label: 'd', text: 'island' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'fabula, fabulae, f.',
      options: [
        { label: 'a', text: 'spear' },
        { label: 'b', text: 'statue' },
        { label: 'c', text: 'feast' },
        { label: 'd', text: 'story' },
      ],
      correctIndex: 3,
    },
    {
      entry: 'agricola, agricolae, m.',
      options: [
        { label: 'a', text: 'general' },
        { label: 'b', text: 'hunter' },
        { label: 'c', text: 'painter' },
        { label: 'd', text: 'farmer' },
      ],
      correctIndex: 3,
    },
  ],
};

export const defaultExams: Exam[] = [defaultExam];

export default defaultExam;
