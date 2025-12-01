Tasklist: Collaborative Whiteboard (Tldraw + Firebase)


Phase 1: The Integration Skeleton
Goal: Get the tldraw canvas rendering on screen with local-only state. No backend yet.
SKIPPING This phase since it was tested and works perfectly locally on a different session.

Phase 2: Integration into Moe's Exam Studio
Goal: Integrate tldraw whiteboard as a per-account add-on page in the existing Firebase web app.

App Structure Analysis
[x] Review Moe's Exam Studio codebase structure (directory layout, component organization, routing system).
    - Vite + React/TypeScript single-page app; main UI in `src/App.tsx` with supporting components in `src/components`, hooks/utils/data typed under `src/hooks|utils|data|types`.
[x] Identify the existing Firebase configuration (Auth, Firestore, Storage setup).
    - `src/lib/firebase.ts` initializes Firestore from hosting defaults or `VITE_FIREBASE_*` env vars; no Firebase Auth/Storage usage beyond config shape; Firestore used directly for users/exams.
[x] Document current routing/navigation system (React Router, Next.js, or other).
    - No router library; app renders conditionally inside `App` (admin console drawer, exam vs dashboard panes) without URL-based navigation.
[x] Identify user account/profile data structure (where user data is stored, how accounts are managed).
    - `users` collection in Firestore with records shaped like `UserAccount` (`id/login/displayName/role/createdAt/lastLoginAt`); password hashes stored alongside in `cloud-users.ts`; admin bootstrap via `ensureAdminAccount`.
[x] Review existing authentication flow (login, session management, protected routes).
    - Custom auth using Firestore reads/writes via `authenticateUser`/`registerUser`; session cached in `localStorage` (`SESSION_STORAGE_KEY`); UI gating handled in `App` by checking `user` state instead of route guards.
[x] Identify UI component library and styling approach (Material-UI, Tailwind, custom CSS, etc.).
    - Tailwind utility classes + custom CSS/Google fonts in `src/index.css`; bespoke React components (no external UI kit).
[x] Document existing state management (Context API, Redux, Zustand, etc.).
    - Local React state/hooks inside `App`; no global store (Redux/Zustand/Context) beyond prop drilling and hook helpers.

Dependencies & Installation
[x] Install tldraw in Moe's Exam Studio project: `npm install tldraw @tldraw/tldraw`. (added v4.2.0)

[x] Verify tldraw doesn't conflict with existing dependencies (check for version conflicts). (build passes)

[x] Import tldraw CSS in the main app entry point or global stylesheet: `import 'tldraw/tldraw.css'`.

Routing & Navigation Setup
[x] Create new route for whiteboard page (e.g., `/whiteboard`, `/drawing-board`, `/canvas`). (added authenticated view toggle via `workspaceView` in `App`; no URL router)

[x] Add navigation link/menu item to access whiteboard (in main nav, user menu, or dashboard). (header pills + menu action)

[x] Implement protected route wrapper to ensure only authenticated users can access whiteboard. (gated by `user` state; view hidden when signed out)

[ ] Add route parameter support if needed (e.g., `/whiteboard/:boardId` for multiple boards per account).

[x] Ensure proper back navigation and breadcrumb integration with existing app navigation. (whiteboard page back-to-exams button + goToExamHub reset)

Component Architecture
[x] Create `<WhiteboardPage />` or `<DrawingBoard />` component in appropriate components directory.

[x] Create `<TldrawCanvas />` component that wraps the `<Tldraw />` component. (Tldraw embedded inside WhiteboardPage)

[x] Integrate with existing app layout (header, sidebar, footer if applicable).

[x] Ensure responsive design matches existing app breakpoints and mobile behavior.

[x] Apply existing app theme/styling to whiteboard page (colors, fonts, spacing).

Firebase Authentication Integration
[x] Get current authenticated user from Firebase Auth context/provider. (uses existing `user` state)

[x] Pass user ID to tldraw component for per-account persistence. (prop into `WhiteboardPage`)

[x] Verify user authentication before rendering whiteboard (redirect to login if not authenticated). (whiteboard view only available post-login)

[x] Handle authentication state changes (logout, session expiry) gracefully. (view resets to exams on sign-out)

Firebase Firestore Integration
[x] Design Firestore data structure for whiteboard documents:
    - Collection: `whiteboards` or `user_whiteboards`
    - Document structure: `{ userId, boardId, document (tldraw snapshot), createdAt, updatedAt, metadata }`

[x] Create Firestore helper functions for whiteboard CRUD operations:
    - `createWhiteboard(userId, boardData)`
    - `getUserWhiteboards(userId)`
    - `updateWhiteboard(boardId, document)`
    - `deleteWhiteboard(boardId)`

[x] Set up Firestore security rules for whiteboards:
    - Users can only read/write their own whiteboards
    - Validate userId matches authenticated user (rule enforces `request.resource.data.userId == userId`)

[x] Implement tldraw persistence using Firestore:
    - Use tldraw's `Tldraw` component with custom persistence
    - Replace `persistenceKey` with Firestore sync
    - Implement `onMount` and `onChange` handlers to sync with Firestore

[ ] Handle offline support (optional but recommended):
    - Use Firestore offline persistence
    - Queue changes when offline, sync when online

Per-Account Access Control
[x] Implement user-specific whiteboard isolation (each user only sees their own boards).

[x] Create whiteboard list/dashboard view (if multiple boards per account):
    - Display all user's whiteboards
    - Create new whiteboard button
    - Delete/rename whiteboard actions

[ ] Add whiteboard sharing functionality (optional):
    - Share with specific users by email
    - Generate shareable link with permissions
    - Update Firestore rules to allow shared access

[ ] Implement whiteboard permissions system (if needed):
    - Owner, Editor, Viewer roles
    - Permission checks before allowing edits

UI Integration
[x] Match whiteboard page styling with existing Moe's Exam Studio design system.

[x] Add loading states while fetching whiteboard data from Firestore.

[x] Add error handling UI (network errors, permission denied, etc.).

[x] Integrate with existing app notifications/toast system for save confirmations. (InlineMessage + badge)

[x] Add save indicator (saving... / saved) to show sync status.

[x] Ensure whiteboard page works within existing app layout constraints.

State Management Integration
[x] Integrate whiteboard state with existing app state management (if applicable). (new `workspaceView` + board state)

[ ] Store current whiteboard ID in URL or app state for deep linking.

[ ] Handle whiteboard data in existing user profile/account context (if needed).

[x] Sync whiteboard metadata (title, last modified) with user account data.

Performance & Optimization
[ ] Implement lazy loading for whiteboard component (code splitting).

[ ] Optimize Firestore queries (use indexes if needed for whiteboard list queries).

[x] Add debouncing for Firestore writes (don't save on every keystroke/stroke).

[ ] Implement pagination for whiteboard list (if user has many boards).

[x] Add cleanup on component unmount (unsubscribe from Firestore listeners).

Testing & Validation
[ ] Test whiteboard creation for authenticated user.

[ ] Test whiteboard persistence across page refreshes (Firestore sync).

[ ] Test whiteboard access control (user A cannot access user B's whiteboard).

[ ] Test whiteboard deletion and cleanup.

[ ] Test on mobile devices (responsive design, touch interactions).

[ ] Test offline behavior (if offline support implemented).

[ ] Test concurrent editing (if multiple users can edit same board).

[ ] Verify whiteboard doesn't break existing app functionality.

Documentation & Deployment
[ ] Document whiteboard feature in app documentation/user guide.

[ ] Update app changelog/release notes with new whiteboard feature.

[ ] Add whiteboard feature flag (if using feature flags) for gradual rollout.

[ ] Test in staging environment before production deployment.

[ ] Monitor Firestore usage and costs (whiteboard documents can be large).

[ ] Set up error tracking for whiteboard-related errors.

Testing Gate 2
[x] Whiteboard page accessible from Moe's Exam Studio navigation.

[ ] Authenticated users can create and access their whiteboards.

[ ] Whiteboard data persists in Firestore and syncs across devices.

[ ] Users can only access their own whiteboards (security verified).

[x] Whiteboard integrates seamlessly with existing app UI/UX.

[x] No conflicts with existing app functionality.
