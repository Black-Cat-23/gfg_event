# RecruitQuest — Technical Requirements Document (TRD)

## 1. Functional Requirements
- **F-EVT**: Event & Activity lifecycle management (Waiting, Running, Paused, Completed, Scored). Admin passcode.
- **F-TEAM**: Team creation (unique name, 6-char code), join, reconnect, single active device takeover.
- **F-QUIZ**: Question timer, immediate selection lock, auto-advance, speed-weighted correctness score.
- **F-MKT**: Portfolio initialization (₹10,000 cash + initial shares), Buy/Sell/Hold decision window (default Hold), price effect application, final portfolio valuation.
- **F-SCR**: Automatic scoring + admin overrides, per-activity and overall leaderboards, rank & value projector view.
- **F-RT**: Server-authoritative timer service, socket room isolation, state snapshots on reconnect.

## 2. Technical Stack
- Monorepo: `npm` workspaces
- Frontend: React 18, Vite, Tailwind CSS, Zustand, React Router, Socket.IO-client
- Backend: Node.js, Express, Socket.IO, Drizzle ORM, better-sqlite3, Zod
