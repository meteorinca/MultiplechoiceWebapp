# Exam Maker

Exam Maker is a responsive React + TypeScript web app for running multiple-choice exams on any device. It mirrors a polished flashcard/exam experience, supports unlimited stored exams, and lets you import or export plain-text files for quick sharing across subjects.

## Features
- Modern UI with Tailwind CSS and mobile-friendly layout that matches the reference mockup.
- Hideable exam library sidebar with localStorage persistence so every imported exam is one tap away.
- Plain-text import/export pipeline that works for up to 1000 questions without vendor lock-in.
- Non-blocking inline notices for formatting issues instead of modal alerts.
- Scoring, per-question feedback (star for correct, frown for incorrect), and previous/next navigation controls.
- Accessibility-minded focus states, aria labels, and descriptive feedback copy.

## Tech Stack
- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- Tailwind CSS 3
- Local storage for persisting exam data between sessions

## Getting Started
1. Install dependencies
   ```bash
   npm install
   ```
2. Start the dev server
   ```bash
   npm run dev
   ```
   Open the printed URL (usually http://localhost:5173/).
3. Build for production
   ```bash
   npm run build
   ```
   Optimized assets land in `dist/`.

## Key Folders
- `src/App.tsx` - Main layout, exam state management, import/export logic.
- `src/components/` - Header, sidebar, question options, feedback panel, inline messages, and navigation buttons.
- `src/hooks/use-mobile.tsx` - Hook for responsive typography/behavior tweaks.
- `src/data/exams.ts` - Default sample exam that appears on first load.
- `src/utils/exam-io.ts` - Plain-text parser and serializer used for import/export.

## Import Format
Use a UTF-8 `.txt` file with this pattern (repeat the Question block as needed, up to 1000 questions):

```
Title: My Custom Exam

Question 1: Sample prompt goes here
a. Option one
b. Option two
c. Option three
d. Option four
Answer: a
```

Guidelines:
- Lines can include numbering (for example `Question 12:`) but must start with the word `Question`.
- Answer letters must match one of the option labels (`a`, `b`, `c`, etc.).
- Blank lines are ignored, so spacing is flexible.
- If formatting is off, the app shows a small inline warning, never a blocking popup.

## Exporting
Click **Export exam (.txt)** to download the active exam in the same format. Share or edit the file, then re-import anywhere.

## Testing
`npm run build` runs `tsc` type-checking plus Vite's production build, ensuring the project compiles cleanly.

## Deploying to Firebase Hosting
1. Install the [Firebase CLI](https://firebase.google.com/docs/cli) if you have not already:
   ```bash
   npm install -g firebase-tools
   ```
2. Update `.firebaserc` with your Firebase project ID:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```
3. Log in and make sure you are targeting the right project:
   ```bash
   firebase login
   firebase use default
   ```
4. Build the app and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
The included `firebase.json` config serves the Vite build output from `dist/` and rewrites all routes to `index.html` for client-side navigation.

## License
MIT (adjust as needed for your repository).

Enjoy crafting exams for any subject!
