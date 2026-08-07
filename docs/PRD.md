# RecruitQuest — Product Requirements Document

**Version:** MVP 1.0 (v1)
**Status:** Draft for discussion — rules and decisions are expected to change after the first trial run
**Last updated:** 2026-08-05

---

## 0. Executive Summary

RecruitQuest is a real-time web platform for conducting fast-paced, team-based recruitment
competitions. Instead of interviews or presentations, teams compete in short, interactive
activities that test teamwork, communication, observation, strategy, and decision-making.

The platform is designed as an **activity engine**, not a single game. The organizer runs the
entire event from one admin dashboard; each team participates from a single device with no
accounts, no logins, and near-zero onboarding. All scoring is automatic wherever possible,
and every game rule is **data, not code** — so rules can change between events without
touching the application.

**North-star principle:** Teams should spend most of their time discussing with each other,
not interacting with a screen.

---

## 1. Product Vision

Conduct an entire recruitment event — team formation, multiple competitive activities,
scoring, and winner announcement — from one dashboard, with participants using one phone
per team.

The platform is reusable across future events. Activities, questions, companies, scenarios,
scoring weights, and timings are all configurable by the organizer without writing code.

---

## 2. Goals

The platform must:

| # | Goal |
|---|------|
| G1 | Run an entire recruitment event from a single admin dashboard |
| G2 | Support multiple interactive activities (quiz, market simulation, future games) |
| G3 | Automatically calculate scores wherever possible |
| G4 | Keep students interacting physically, not with the app |
| G5 | Eliminate manual leaderboard calculations |
| G6 | Let organizers modify activities/rules without changing application code |

---

## 3. Non-Goals (MVP)

The platform will **not** include:

- User authentication or individual participant accounts
- Chat or messaging
- Attendance tracking
- Registration forms
- Recruitment management, resume collection, candidate tracking
- Analytics or reporting
- Multi-event scheduling / concurrent events
- Digital payments or real money

---

## 4. Users & Roles

### 4.1 Admin (organizer)

Controls the entire event. Responsibilities:

- Start / pause / resume / end activities
- Configure activities (JSON + schema + templates)
- Monitor teams (online/offline, roster)
- View and project leaderboards
- Adjust team scores (override)
- End the event and reveal winners

**Access control:** The admin dashboard is protected by a single shared **passcode** set in
the event config. Not full accounts — just a door. Teams must not be able to reach the
dashboard, because it shows hidden leaderboards and controls the event.

### 4.2 Team

- Exactly **one device** per team.
- One representative handles the device; the rest of the team collaborates physically.
- No individual accounts. A team is identified by a generated **Team Code**.

---

## 5. Event Lifecycle

The application supports a **generic, configurable** event flow. Activities are not hardcoded:

```
Landing
   ↓
Team Creation (Create / Join)
   ↓
Lobby
   ↓
Activity 1 (configurable)   ──→  Lobby / interstitial  ──→  Activity 2 (configurable)
   ↓                                                                        ↓
Final Results / Winner Announcement
```

- The sequence, count, and type of activities are defined in the **event config**.
- Between activities, teams see a **lobby with a "next up" preview** and a short
  **countdown interstitial**.
- Reference event for MVP (~45 min): Quiz (15 min) → Market Simulation (15–20 min) → Results.

### 5.1 Events

- **One active event at a time.** The platform runs a single live event; the data model
  still allows saving/reloading event configs (templates) for reuse.
- An event config bundles: admin passcode, activity sequence, per-activity configuration,
  team-visible copy, and reveal settings.

---

## 6. Team Management

### 6.1 Create Team

- Participant enters a **Team Name**.
- Validation:
  - **Unique** (case-insensitive against existing teams)
  - **Max 20 characters**
  - Allowed: letters, digits, spaces, and basic punctuation (`- _ . '`)
- On success the server generates:
  - **Team ID** (internal)
  - **Team Code** (6 chars, e.g. `K7MX92`, unambiguous alphabet — no `0/O`, `1/I`)
- The Team Code is shown **once**, with a prominent "save this code" callout and a
  copy-to-clipboard button.
- The Team Code is stored in **localStorage** for automatic reconnection.

### 6.2 Join / Rejoin

- Participant enters an existing Team Code.
- If a Team Code exists in localStorage, reconnection is **automatic** on page load.

### 6.3 Active Session (device takeover)

- Only **one active device** may control a team at any time.
- If another device joins with the same Team Code, the **previous device becomes inactive**
  (shows "session moved to another device") and the **new device becomes active**.
- This is a hard takeover — no confirmation prompt on the old device (it may be dead).

### 6.4 Team roster

- **No maximum team cap.** The roster is unlimited; organizers control volume at the venue.
- Admin can view the roster and remove a team if needed.

---

## 7. Activity Engine

The platform is built around **Activities**. An activity is one interactive competition.

Each activity defines:

- `id`, `name`, `description`, `instructions`
- `type` (e.g. `quiz`, `market-simulation`)
- `config` (type-specific JSON, schema-validated)
- `duration`
- `scoringMethod` (automatic / hybrid / manual — MVP supports automatic + admin override)
- `status` (from the lifecycle state machine)

The application core **does not assume anything about an activity's internals**. A new
activity type implements a common interface and becomes immediately usable.

### 7.1 Activity interface

```
interface Activity {
  id: string;
  name: string;
  type: string;
  config: ActivityConfig;      // JSON, schema-validated

  onStart(): void;             // admin starts
  onPause(): void;
  onResume(): void;
  onEnd(): void;               // admin ends → triggers scoring
  calculateScore(team): number;
}
```

The admin dashboard only needs to: load the configured activity, start/pause/resume/end it,
and display its scores. It never needs to understand the game's rules.

### 7.2 Activity lifecycle

Every activity follows the same state machine, and **every client sees the same state**:

```
Waiting
   ↓  (admin: Start)
Started
   ↓  (auto, on start)
Running ──(admin: Pause)──▶ Paused ──(admin: Resume)──▶ Running
   ↓  (admin: End)
Completed
   ↓  (scoring engine runs)
Scored
   ↓  (admin reveals / next activity starts)
Leaderboard / Next
```

---

## 8. Activity Configuration

### 8.1 Format

- All activity rules are **JSON**, validated against **JSON Schemas**.
- The admin authors/edits JSON in the dashboard editor, with **inline validation and error
  feedback** and a **live preview** of the result.
- **Templates** ship with the platform (including a default sample event) so the first
  event runs with zero setup. Admins can duplicate/edit templates.

### 8.2 What is configurable (examples)

| Activity | Configurable |
|---|---|
| Event | Activity sequence, passcode, copy, reveal settings |
| Quiz | Questions, options, correct answers, per-question timer, scoring weights, tie-breaker |
| Market Simulation | Companies + initial prices, starting cash, scenarios + price effects, decision window, scenario frequency |
| Global | Tie-breakers, bonus rules, activity duration |

### 8.3 Game rules are data

> Because the rules are still being iterated (and will change after the first trial run),
> **no rule is permanent**. Anything a game does should be expressible in its JSON config —
> and if a rule can't be expressed yet, that's a signal to add it as a config option, not
> to hardcode it.

---

## 9. Scoring Engine

### 9.1 Design

- Generic, **strategy-based**: each activity type provides a `calculateScore` implementation.
- Activity scores roll up into a team **total score**.
- The platform supports, and the MVP ships:
  - **Automatic scoring** (quiz correctness × time, market portfolio value, …)
  - **Admin override** — the organizer can adjust any team's activity or total score
    (e.g. +10 for a judging-based round) before final results.

### 9.2 Quiz scoring (reference)

- Each question awards points based on **correctness and response time**.
- Example formula: correct within the first 25% of the timer → full points; correct within
  the remaining time → reduced points; incorrect → 0.
- The exact formula (slope, windows, per-question weights) is **configurable**.
- Design intent: reward accuracy and speed **without** encouraging random guessing.

### 9.3 Market Simulation scoring (reference)

- Final score = **final portfolio value** (cash + holdings at market prices).
- Higher value = higher rank. No manual scoring in the market game.
- Starting cash and portfolio are identical for all teams.

### 9.4 Tie-breakers

- Configurable per activity (e.g., total correct answers, faster total response time,
  earlier registration, or "keep the tie").
- Applied deterministically so the leaderboard is stable.

---

## 10. Leaderboards

- **Admin-only in the app at all times.** The team interface **never** displays a
  leaderboard or any other team's score.
- When the organizer wants the room to see scores, they **project the admin's leaderboard
  screen** on an external display. The admin leaderboard must therefore be
  **projector-friendly** (large rows, high contrast).
- Two leaderboards:
  - **Per-activity leaderboard** (rank, team, activity score)
  - **Overall leaderboard** (rank, team, total score) — shown at the end
- Final results include a dedicated **Winner Announcement** screen the organizer reveals.

---

## 11. Admin Dashboard

Single control center. Sections:

| Section | Capabilities |
|---|---|
| **Event control** | Start event, pause, resume, end event |
| **Activity control** | Start / pause / resume / end current activity; view status; advance to next activity |
| **Configuration** | Edit event & activity config (JSON + schema + templates), reload config |
| **Teams** | Roster, online/offline status, remove team |
| **Scoring** | View automatic scores, adjust (override) scores, recalculate rankings |
| **Leaderboards** | Per-activity & overall; large projector view; reveal results / winners |
| **Timer** | Current activity countdown, pause/resume, advance scenario (market) |

The dashboard is **desktop-first**.

---

## 12. Team Interface

Always simple, **mobile-first**, one primary action per screen. Depending on activity state
it shows:

- Current activity name + instructions
- **Large timer** (readable at arm's length / on projector)
- Required inputs (answer options, buy/sell/hold controls)
- Current progress (e.g. "Question 3 of 15")
- Lobby: "waiting for organizer" + "next up" preview + countdown
- Reconnection: automatic, silent

The interface must **never overwhelm the participant**. No leaderboards, no other teams'
scores, no chat.

---

## 13. Reference Activities (MVP)

### 13.1 Quiz Challenge

| Property | Value |
|---|---|
| Duration | Configurable (reference: 15 min) |
| Format | One question at a time; individual per-question timer |
| Flow | Question appears → timer runs → on expiry the answer locks and next question auto-advances |
| Navigation | Back navigation disabled; answers cannot be changed after lock |
| Categories | Observation, technology, logical reasoning, general knowledge, pattern recognition (configurable) |
| Scoring | Time-weighted correctness (see §9.2), configurable |

### 13.2 Market Simulation

| Property | Value |
|---|---|
| Duration | Configurable (reference: 15–20 min) |
| Theme | Teams start with identical virtual cash + identical portfolios of 10 companies |
| Companies | Configurable (reference: Apple, Tesla, Nvidia, Reliance, TCS, Amazon, Google, Netflix, Infosys, Microsoft) |
| Flow | Admin starts simulation → a scenario appears → teams decide Buy/Sell/Hold per company within a window (e.g. 45–60s) → prices update → portfolios update → next scenario |
| Market logic | Each scenario maps to predefined per-company price changes (e.g. Tesla battery breakthrough → Tesla +15%, Nvidia +5%, oil −8%) |
| Portfolio view | Cash, holdings, current portfolio value, P/L |
| Scoring | Final portfolio value; no manual scoring |

---

## 14. State Management

- **The server is the single source of truth.** It stores event state, activity state,
  teams, scores, timers, and activity data.
- The **client stores only the Team Code** (localStorage).
- **Refreshing the page never loses progress.** On reconnect the server replays the current
  state; submissions already received are kept.

---

## 15. Real-Time Requirements

- Socket.IO for all realtime traffic.
- **Timer updates**: server ticks; clients display and re-sync periodically.
- **Activity transitions**: start/pause/resume/end broadcast to all clients in sync.
- **Scenario updates**: market simulation state pushed to all teams simultaneously.
- **Team submissions**: sent to server, validated, acknowledged; scored on activity end.
- **Admin/team isolation**: teams only receive their own data + shared event state — never
  other teams' scores or the leaderboard.

---

## 16. Data Model (conceptual)

```
Event
  id, name, config (JSON), status, passcode, created_at, started_at, ended_at

Team
  id, event_id, name, team_code, total_score, active_device_id, created_at

Activity
  id, event_id, type, config (JSON), status, started_at, ended_at

Submission
  id, activity_id, team_id, payload (JSON), submitted_at     -- activity-specific

Score
  id, activity_id, team_id, value, source (auto|admin_override), adjusted_at
```

---

## 17. Technical Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite (SPA) + Tailwind CSS + React Router |
| Backend | Node.js + Express |
| Realtime | Socket.IO |
| Data | SQLite + Drizzle ORM (swappable to PostgreSQL) |
| Language | TypeScript end-to-end |
