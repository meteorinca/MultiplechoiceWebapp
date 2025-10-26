# Latin Exam Maker

Latin Exam Maker is a responsive React + TypeScript web app for running multiple-choice exams (Latin or otherwise) on any device. It mirrors a polished flashcard/exam experience, supports unlimited stored exams, and lets you import/export plain-text files for quick sharing.

## ? Features
- **Modern UI**: Tailwind CSS styling that matches the provided mockup with mobile/desktop responsiveness.
- **Exam Library**: Hideable right sidebar lists every stored exam; uses `localStorage` to persist across sessions.
- **Import / Export**: Upload or download human-readable `.txt` files to reuse the interface for any subject (up to 1000 questions per exam).
- **Non-blocking feedback**: Friendly inline notices for parse issues—no modals to dismiss.
- **Scoring & Navigation**: Shows current score, question numbering, per-question feedback (? or ??), and next/previous controls.
- **Accessibility minded**: Keyboard focus states, aria labels, and descriptive feedback text.

## ?? Tech Stack
- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- Tailwind CSS 3
- Local storage for persisting exam data

## ?? Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open the printed URL (usually http://localhost:5173/).
3. **Build for production**
   ```bash
   npm run build
   ```
   Optimized assets land in `dist/`.

## ?? Key Folders
- `src/App.tsx` – Main layout, state management, import/export logic.
- `src/components/` – UI pieces (header, sidebar, options, feedback, inline messages).
- `src/hooks/use-mobile.tsx` – Hook for responsive typography/behavior.
- `src/data/exams.ts` – Default Latin exam seeded at first load.
- `src/utils/exam-io.ts` – Plain-text parser/serializer.

## ?? Import Format
Use a UTF-8 `.txt` file with this pattern (repeat the Question block as needed, up to 1000 questions):

```
Title: My Custom Exam

Question 1: puella, puellae, f.
a. girl
b. boy
c. child
d. pull
Answer: a
```

Guidelines:
- Lines may include optional numbering (e.g., `Question 12:`) but must start with the word “Question”.
- Answer letters must match one of the option labels (`a`, `b`, `c`, etc.).
- Blank lines are ignored, so spacing is flexible.
- If formatting is off, the app shows a small inline warning—no blocking popups.

## ?? Exporting
Click **Export exam (.txt)** to download the active exam in the same format. Share or edit the file, then re-import anywhere.

## ?? Testing
`npm run build` runs `tsc` type-checking plus Vite’s production build, ensuring the project compiles cleanly.

## ?? License
MIT (adjust as needed for your repo).

Enjoy crafting exams for Latin or any subject!
