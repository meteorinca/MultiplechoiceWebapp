import type { Exam } from '../types/question';

export const defaultExam: Exam = {
  id: 'latin-default',
  title: 'Latin Vocabulary Exam',
  questions: [
    {
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
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
      kind: 'choice',
      entry: 'agricola, agricolae, m.',
      options: [
        { label: 'a', text: 'general' },
        { label: 'b', text: 'hunter' },
        { label: 'c', text: 'painter' },
        { label: 'd', text: 'farmer' },
      ],
      correctIndex: 3,
    },
    {
      kind: 'fill',
      entry: 'Fill in the blank: "Roma in Italia est" translates to ____.',
      correctAnswer: 'Rome is in Italy',
    },
  ],
};

export const fillDrillsExam: Exam = {
  id: 'latin-fill-drills',
  title: 'Latin Translation Drills',
  questions: [
    {
      kind: 'fill',
      entry: 'Translate "amicus" into English.',
      correctAnswer: 'friend',
    },
    {
      kind: 'fill',
      entry: 'Fill in the blank: "Magistra ____ docet" (the teacher teaches the girl).',
      correctAnswer: 'puellam',
    },
    {
      kind: 'fill',
      entry: 'Translate "in aqua".',
      correctAnswer: 'in the water',
    },
    {
      kind: 'fill',
      entry: 'Translate "parvus" to English.',
      correctAnswer: 'small',
    },
  ],
};

export const visualArtifactsExam: Exam = {
  id: 'latin-visual-artifacts',
  title: 'Roman Artifact Visuals',
  questions: [
    {
      entry: 'Identify the structure pictured.',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Pont_du_Gard_BLS.jpg/640px-Pont_du_Gard_BLS.jpg',
      options: [
        { label: 'a', text: 'Aqueduct' },
        { label: 'b', text: 'Colosseum' },
        { label: 'c', text: 'Forum' },
        { label: 'd', text: 'Basilica' },
      ],
      correctIndex: 0,
    },
    {
      entry: 'What kind of tool is shown here?',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Stylus_%28PSF%29.png/480px-Stylus_%28PSF%29.png',
      options: [
        { label: 'a', text: 'Wax stylus' },
        { label: 'b', text: 'Mortar' },
        { label: 'c', text: 'Helmet crest' },
        { label: 'd', text: 'Compass' },
      ],
      correctIndex: 0,
    },
    {
      kind: 'fill',
      entry: 'Name the type of public space shown.',
      imageUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Roman_forum_cropped.jpg/640px-Roman_forum_cropped.jpg',
      correctAnswer: 'forum',
    },
  ],
};

export const defaultExams: Exam[] = [defaultExam, fillDrillsExam, visualArtifactsExam];

export default defaultExam;
