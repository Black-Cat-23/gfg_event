# RecruitQuest — Application Flow

**Version:** MVP 1.0 · **Status:** Draft for discussion · **Last updated:** 2026-08-05

## 1. Global structure

```
RecruitQuest
├── /                  Team landing (create / join)
├── /team/*            Team interface (auto-entered via saved Team Code)
├── /admin             Admin dashboard (passcode-protected)
└── socket events      All realtime state
```

## 2. Event flow (organizer's timeline)

```
 1  OPEN EVENT           Load or create an event config (template / new / edit JSON)
 2  WAIT FOR TEAMS       Roster fills as teams join the lobby
 3  START EVENT          Kicks all teams into the lobby ("welcome" + next-up preview)
 4  ACTIVITY 1           Start → Running → (pause/resume) → End → auto-scored
 5  INTERSTITIAL         Teams see lobby / "next up"; organizer switches to Activity 2
 6  ACTIVITY 2           Start → Running → (pause/resume) → End → auto-scored
 7  FINAL RESULTS        Organizer reveals overall leaderboard + winners
```

## 3. Team flow (participant's timeline)

```
LANDING ──► CREATE/JOIN ──► LOBBY ──► ACTIVITY SCREENS ──► LOBBY ──► … ──► RESULTS
             (one-time)      │                                    │
                             └──────── refresh / new phone ────────┘
                                       (auto-reconnect via code)
```

### 3.1 Landing → Create/Join

- **Create Team**: enter Team Name → validated → server creates team → **Team Code shown once** with copy button → auto-saved to localStorage → enter lobby.
- **Join Team**: enter Team Code → validated → joins → enter lobby.
- Auto-reconnect if Team Code in localStorage.

## 4. Screen-by-screen flow

- **Lobby**: Default resting state; displays current status, "next up" preview, and countdown interstitial.
- **Quiz**: One question at a time. Selection locks immediately. Timer expiry auto-advances. Interstitial between questions.
- **Market Simulation**: Buy/Sell/Hold segmented controls per company. Default Hold. Sticky bottom bar with Cash & Portfolio Value.
- **Results**: Simple confirmation screen. Admin projects official room scores.
