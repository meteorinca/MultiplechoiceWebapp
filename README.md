# Omni Exam Studio

Omni Exam Studio is a responsive React + TypeScript web app for building and running multiple-choice exams across every discipline - science, technology, engineering, art, languages, and math (including equation rendering). It mirrors a polished testing experience, supports unlimited stored exams, and keeps everything in local storage so your question banks follow you between sessions.

## Features
- Modern Tailwind CSS UI with mobile-first layout that mirrors the reference mockup.
- KaTeX-powered math typesetting: wrap any prompt or option in `$$...$$` to render LaTeX equations.
- Stored exam management with Firebase Cloud Firestore sync (plus local caching), quick switching, plain-text import/export, and one-click deletion.
- Optional shuffle toggles for question order and answer order before each practice session.
- Math rendering toggle so editors can opt into KaTeX parsing (wrap inline math with `$$...$$`).
- Inline feedback (stars/frowns), real-time scoring, and forward/backward navigation.
- Completion summary with score, percentage, and quick actions to retake or jump back to the exam hub.
- Non-blocking inline notices for parser issues instead of modal alerts.
- Accessibility-minded focus states, aria labels, and descriptive feedback copy.

## Tech Stack
- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- Tailwind CSS 3
- Firebase Cloud Firestore (client SDK)
- KaTeX + react-katex for equation rendering
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

## Cloud Sync Setup (Firestore)
1. In the Firebase console, enable **Cloud Firestore** for your project and choose production mode (adjust rules as needed).
2. (Optional for local dev or manual config) create a `.env.local` (or `.env`) in the project root with:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Restart `npm run dev` so Vite picks up the environment variables.
4. When deployed to Firebase Hosting, the SDK automatically reads the config exposed by `/__/firebase/init.js`, so the `.env` file is only required when you want to run against Firestore outside of hosting.

## Key Folders
- `src/App.tsx` - Main layout, exam state management, import/export logic, localStorage sync.
- `src/components/` - Header, sidebar, navigation controls, question options, summary view, math renderer, and feedback panel.
- `src/hooks/use-mobile.tsx` - Responsive breakpoint hook.
- `src/data/exams.ts` - Default sample exam shown on first load; safe place to seed demo content.
- `src/utils/exam-io.ts` - Plain-text parser and serializer used for import/export.
- `src/utils/cloud-exams.ts` - Firestore helpers (subscribe/upsert/delete) used to keep the library in sync.
- `src/lib/firebase.ts` - Firebase app + Firestore initialization sourced from Vite environment variables.

## Working With Exams
- **Import**: Click **Import exam (.txt)** and supply a UTF-8 text file that follows the template below.
- **Delete**: Use the Delete badge on each exam tile or the sidebar to remove it from storage (active exam deletion drops you back to the hub).
- **Shuffle**: Toggle **Shuffle questions** or **Shuffle answers** in the hub before starting a session; the layout resets each time you click an exam.
- **Math**: Enable **Render math ($$...$$)** when you import calculus-heavy content to display inline formulas via KaTeX.
- **Export**: Click **Export current exam (.txt)** to download the active exam in the same text format.
- **Complete**: Answer the final question and hit **Finish exam** to view the scorecard with retake and back-to-hub shortcuts.
- **Persistence**: Exams sync to Firebase Cloud Firestore (when configured) and fall back to the localStorage key `omniExamStudio.exams`. Legacy data saved as `latinExamMaker.exams` is migrated automatically on load.

### Import Format
Repeat the Question block as needed, up to 1000 questions:

```
Title: My Custom Exam

Question 1: Sample prompt goes here $$E = mc^2$$
a. Option one
b. Option two $$\int_0^1 x^2 \, dx$$
c. Option three
d. Option four
Answer: b
```

Guidelines:
- Lines can include numbering (for example `Question 12:`) but must start with the word `Question`.
- Answer letters must match one of the option labels (`a`, `b`, `c`, etc.).
- Wrap any LaTeX math in `$$...$$`; the renderer supports multi-line expressions.
- Blank lines are ignored, so spacing is flexible.
- If formatting is off, the app shows a small inline warning, never a blocking popup.

### Architecture Notes
- **State shape**: Exams are arrays of `{ id, title, questions[] }`, where each question contains `entry`, `options`, and `correctIndex`.
- **Session prep**: `prepareSessionQuestions` in `App.tsx` shuffles questions/answers per the hub toggles while recalculating the correct index each run.
- **Math rendering**: `MathText` (in `src/components/MathText.tsx`) tokenizes `$$` segments and pipes them to `react-katex`. Use `displayMode="inline"` when embedding within buttons or inline copy.
- **Exam lifecycle**: `App.tsx` drives navigation, scoring, import/export, local/cloud persistence, and localStorage caching. Sidebar and hub actions call `handleExamSelect`, `handleDeleteExam`, and `goToExamHub`.
- **Cloud sync**: `src/utils/cloud-exams.ts` wraps Firestore subscriptions and mutations; `App.tsx` seeds the default exam and keeps the local cache aligned when the remote collection changes.
- **Completion**: `handleFinishExam` swaps the question view for `ExamSummary`, which reports the score and wires up retake/back actions.
- **Styling**: Tailwind classes are colocated with components; follow existing naming, and favor semantic wrappers when adding new UI.

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
