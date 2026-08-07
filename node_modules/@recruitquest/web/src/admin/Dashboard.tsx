import React, { useState, useEffect } from 'react';
import { getSocket } from '../hooks/useSocket';
import { useEventStore } from '../store/eventStore';
import { TeamSummary, LeaderboardRow, EventConfigSchema } from '@recruitquest/types';
import {
  Play, Pause, FastForward, Square, Edit3, Tv, Users, Sliders,
  FileCode, RefreshCw, LogOut, CheckCircle2, Trophy, Radio, RotateCcw, Flame, TrendingUp, HelpCircle
} from 'lucide-react';

interface AdminDashboardProps {
  onSignOut?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSignOut }) => {
  const store = useEventStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'scoring' | 'boards' | 'config'>('overview');
  const [teams, setTeams] = useState<TeamSummary[]>([]);

  // Separate Leaderboards for Activity 1 (Quiz), Activity 2 (Market), and Overall
  const [act1Leaderboard, setAct1Leaderboard] = useState<LeaderboardRow[]>([]);
  const [act2Leaderboard, setAct2Leaderboard] = useState<LeaderboardRow[]>([]);
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardRow[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);

  // Projector mode state
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [projectorBoardType, setProjectorBoardType] = useState<'act1' | 'act2' | 'overall'>('overall');

  // Override modal state
  const [overrideTeamId, setOverrideTeamId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<number>(0);
  const [overrideNote, setOverrideNote] = useState<string>('');

  // Config Editor state
  const [configJson, setConfigJson] = useState<string>('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<boolean>(false);

  const socket = getSocket();

  const loadEventData = () => {
    fetch('/api/event/default_event/config')
      .then(res => res.json())
      .then(data => {
        setConfigJson(JSON.stringify(data, null, 2));
        if (data.activities && Array.isArray(data.activities)) {
          setActivitiesList(data.activities.map((a: any) => ({
            id: `act_default_event_${a.seq}`,
            seq: a.seq,
            type: a.type,
            title: a.title || (a.type === 'quiz' ? 'Quiz Challenge' : 'Market Simulation')
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Authenticate admin socket explicitly on mount
    socket.emit('admin:auth', { passcode: 'EVENT2026' }, (res: any) => {
      if (res.success) {
        console.log('[Admin Dashboard] Authenticated cleanly.');
      }
    });

    loadEventData();

    function onTeamsList(list: TeamSummary[]) {
      setTeams(list);
    }

    function onPerActBoard(payload: { activityId: string; rows: LeaderboardRow[] }) {
      if (payload.activityId.endsWith('_1')) {
        setAct1Leaderboard(payload.rows);
      } else if (payload.activityId.endsWith('_2')) {
        setAct2Leaderboard(payload.rows);
      }
    }

    function onAct1Board(payload: { rows: LeaderboardRow[] }) {
      setAct1Leaderboard(payload.rows);
    }

    function onAct2Board(payload: { rows: LeaderboardRow[] }) {
      setAct2Leaderboard(payload.rows);
    }

    function onOverallBoard(payload: { rows: LeaderboardRow[] }) {
      setOverallLeaderboard(payload.rows);
    }

    socket.on('teams:list', onTeamsList);
    socket.on('leaderboard:per-activity', onPerActBoard);
    socket.on('leaderboard:act1', onAct1Board);
    socket.on('leaderboard:act2', onAct2Board);
    socket.on('leaderboard:overall', onOverallBoard);

    return () => {
      socket.off('teams:list', onTeamsList);
      socket.off('leaderboard:per-activity', onPerActBoard);
      socket.off('leaderboard:act1', onAct1Board);
      socket.off('leaderboard:act2', onAct2Board);
      socket.off('leaderboard:overall', onOverallBoard);
    };
  }, []);

  const handleStartActivity = (actId: string) => {
    socket.emit('admin:start-activity', { activityId: actId });
  };

  const handlePauseActivity = (actId: string) => {
    socket.emit('admin:pause-activity', { activityId: actId });
  };

  const handleResumeActivity = (actId: string) => {
    socket.emit('admin:resume-activity', { activityId: actId });
  };

  const handleEndActivity = (actId: string) => {
    if (confirm('End activity now? This will calculate final scores.')) {
      socket.emit('admin:end-activity', { activityId: actId });
    }
  };

  const handleNextScenario = (actId: string) => {
    socket.emit('admin:next-scenario', { activityId: actId });
  };

  const handleResetEventData = () => {
    if (confirm('⚠️ WARNING: This will purge all registered teams, test submissions, and scores! Reset to 0 teams?')) {
      socket.emit('admin:reset-event', { eventId: 'default_event' }, (res: any) => {
        if (res.success) {
          alert('Event data reset cleanly — all teams purged.');
        }
      });
    }
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTeamId) return;

    socket.emit('admin:override-score', {
      teamId: overrideTeamId,
      value: Number(overrideValue),
      note: overrideNote
    });

    setOverrideTeamId(null);
  };

  const handleSaveConfig = () => {
    setConfigError(null);
    setConfigSuccess(false);

    try {
      const parsed = JSON.parse(configJson);
      EventConfigSchema.parse(parsed);

      socket.emit('admin:reload-config', { eventId: 'default_event', newConfig: parsed }, (res: any) => {
        if (res.success) {
          setConfigSuccess(true);
          loadEventData();
          setTimeout(() => setConfigSuccess(false), 3000);
        } else {
          setConfigError(res.error || 'Failed to reload config');
        }
      });
    } catch (err: any) {
      setConfigError(err.message || 'Invalid JSON format');
    }
  };

  const currentAct = store.currentActivity;

  // FULLSCREEN PROJECTOR MODE VIEW
  if (isProjectorMode) {
    const rows = projectorBoardType === 'act1'
      ? act1Leaderboard
      : projectorBoardType === 'act2'
      ? act2Leaderboard
      : overallLeaderboard;

    const boardTitle = projectorBoardType === 'act1'
      ? 'Activity 1: Quiz Challenge Leaderboard'
      : projectorBoardType === 'act2'
      ? 'Activity 2: Market Simulation Leaderboard'
      : 'Overall Event Standings';

    const topTeam = rows[0];

    return (
      <div className="fixed inset-0 bg-ink text-white z-50 p-8 flex flex-col justify-between overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-yellow-400 flex items-center justify-center border border-amber-500/40 shadow-lg">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight flex items-center space-x-3">
                <span>{boardTitle}</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-bold uppercase tracking-widest flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE UPDATES</span>
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono">Kickstart 2.0 • Real-Time Leaderboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Board Switcher Selector */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
              <button
                onClick={() => setProjectorBoardType('act1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  projectorBoardType === 'act1' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Act 1: Quiz
              </button>
              <button
                onClick={() => setProjectorBoardType('act2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  projectorBoardType === 'act2' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Act 2: Market
              </button>
              <button
                onClick={() => setProjectorBoardType('overall')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  projectorBoardType === 'overall' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Overall Total
              </button>
            </div>

            <button
              onClick={() => setIsProjectorMode(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold text-white transition-colors"
            >
              Exit Projector
            </button>
          </div>
        </div>

        {/* LIVE COMMENTARY BROADCAST BANNER */}
        {topTeam && topTeam.score > 0 && (
          <div className="my-4 p-4 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/40 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
            <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
            <span className="text-sm font-extrabold tracking-wide text-amber-200 uppercase">
              ⚡ LIVE EVENT COMMENTARY: <strong className="text-white underline">{topTeam.name}</strong> is currently holding 1ST PLACE in {boardTitle} with <strong className="text-yellow-400">{topTeam.score.toLocaleString()} pts</strong>!
            </span>
          </div>
        )}

        <div className="my-6 max-w-5xl mx-auto w-full space-y-4">
          {rows.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-xl font-semibold">
              Waiting for activity scores to be calculated...
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.teamId}
                className={`p-6 rounded-2xl flex items-center justify-between border transition-all duration-500 ${
                  row.rank === 1
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/50 text-yellow-300 shadow-xl scale-[1.02]'
                    : row.rank === 2
                    ? 'bg-gray-300/10 border-gray-400/30 text-gray-200'
                    : row.rank === 3
                    ? 'bg-amber-700/10 border-amber-600/30 text-amber-300'
                    : 'bg-gray-900/80 border-gray-800 text-white'
                }`}
              >
                <div className="flex items-center space-x-6">
                  <span className={`text-3xl font-black font-mono w-12 flex items-center justify-center h-12 rounded-xl ${
                    row.rank === 1 ? 'bg-yellow-400 text-ink font-extrabold' : 'bg-gray-800 text-gray-300'
                  }`}>
                    #{row.rank}
                  </span>
                  <div>
                    <h3 className="text-3xl font-extrabold tracking-tight">{row.name}</h3>
                    {row.teamCode && <span className="text-xs font-mono text-gray-400">Code: {row.teamCode}</span>}
                  </div>
                </div>

                <div className="text-4xl font-black font-mono tracking-tight text-right">
                  {row.score.toLocaleString()} <span className="text-xl font-normal text-gray-400">pts</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-gray-500 text-sm font-mono border-t border-gray-800 pt-4">
          Kickstart 2.0 Realtime Tournament Leaderboard • Projector Mode
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Admin Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-accent text-white font-extrabold flex items-center justify-center text-sm">
            GFG
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-ink">Admin</h1>
            <span className="text-xs text-muted">Control Dashboard</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetEventData}
            className="flex items-center space-x-2 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-danger border border-red-200 rounded-xl font-bold text-xs transition-colors"
            title="Purge all test teams and reset event"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Teams</span>
          </button>

          <button
            onClick={() => setIsProjectorMode(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors"
          >
            <Tv className="w-4 h-4" />
            <span>Project Screen</span>
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-2 rounded-xl border border-border text-muted hover:text-danger hover:bg-bg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Left Sidebar Nav */}
        <aside className="w-64 bg-surface border border-border rounded-2xl p-4 flex flex-col space-y-2 h-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full p-3 rounded-xl font-semibold text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'overview' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Event Control</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`w-full p-3 rounded-xl font-semibold text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'teams' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams Roster ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scoring')}
            className={`w-full p-3 rounded-xl font-semibold text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'scoring' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Score Overrides</span>
          </button>

          <button
            onClick={() => setActiveTab('boards')}
            className={`w-full p-3 rounded-xl font-semibold text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'boards' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboards</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`w-full p-3 rounded-xl font-semibold text-sm flex items-center space-x-3 transition-colors ${
              activeTab === 'config' ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink hover:bg-bg'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Config JSON</span>
          </button>
        </aside>

        {/* Workspace Content */}
        <main className="flex-1 space-y-6">
          {/* LIVE BANNER FEEDBACK */}
          {currentAct && (currentAct.status === 'running' || currentAct.status === 'paused') && (
            <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xs border ${
              currentAct.status === 'running' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            }`}>
              <div className="flex items-center space-x-3">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentAct.status === 'running' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${currentAct.status === 'running' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <div>
                  <h3 className="font-extrabold text-base flex items-center space-x-2">
                    <span>LIVE ACTIVITY: {currentAct.title} ({currentAct.status.toUpperCase()})</span>
                  </h3>
                  <p className="text-xs opacity-80">Teams are currently participating in real-time.</p>
                </div>
              </div>

              <a
                href="/team"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 hover:bg-emerald-700 shadow-xs"
              >
                <Radio className="w-4 h-4" />
                <span>Open Team View (New Tab)</span>
              </a>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
                <h2 className="text-xl font-extrabold text-ink">Activity Controls</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activitiesList.map((act) => {
                    const isCurrent = currentAct?.id === act.id;
                    const status = isCurrent && currentAct ? currentAct.status : 'waiting';

                    return (
                      <div key={act.id} className={`p-5 border rounded-xl bg-bg space-y-3 transition-all ${
                        isCurrent && status === 'running' ? 'border-emerald-500 shadow-xs ring-1 ring-emerald-500/20' : 'border-border'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-ink text-base">Activity {act.seq}: {act.title}</span>

                          {isCurrent && status === 'running' && (
                            <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>RUNNING</span>
                            </span>
                          )}

                          {isCurrent && status === 'paused' && (
                            <span className="bg-amber-100 text-amber-700 border border-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
                              PAUSED
                            </span>
                          )}

                          {!isCurrent && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              act.type === 'quiz' ? 'bg-accent-soft text-accent' : 'bg-emerald-100 text-success'
                            }`}>
                              {act.type}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            onClick={() => handleStartActivity(act.id)}
                            className="px-3.5 py-2 bg-success text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-transform shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start</span>
                          </button>

                          <button
                            onClick={() => handlePauseActivity(act.id)}
                            className="px-3.5 py-2 bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-transform shadow-xs"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>

                          <button
                            onClick={() => handleResumeActivity(act.id)}
                            className="px-3.5 py-2 bg-accent text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-transform shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </button>

                          {act.type === 'market-simulation' && (
                            <button
                              onClick={() => handleNextScenario(act.id)}
                              className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-transform shadow-xs"
                            >
                              <FastForward className="w-3.5 h-3.5" />
                              <span>Advance</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleEndActivity(act.id)}
                            className="px-3.5 py-2 bg-danger text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-transform shadow-xs"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>End</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TEAMS ROSTER TAB */}
          {activeTab === 'teams' && (
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-ink">Registered Teams ({teams.length})</h2>
                <button
                  onClick={handleResetEventData}
                  className="px-3 py-1.5 bg-red-50 text-danger border border-red-200 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-red-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Teams</span>
                </button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-bg text-xs font-bold text-muted uppercase border-b border-border">
                    <tr>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Team Name</th>
                      <th className="p-3.5">Members (Leader & Partner)</th>
                      <th className="p-3.5">Team Code</th>
                      <th className="p-3.5">Total Score</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {teams.map((t) => (
                      <tr key={t.id} className="hover:bg-bg/50">
                        <td className="p-3.5">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${t.isOnline ? 'bg-success' : 'bg-gray-300'}`} />
                        </td>
                        <td className="p-3.5 font-bold text-ink">{t.name}</td>
                        <td className="p-3.5 text-xs text-muted font-medium">
                          <span className="text-ink font-semibold">{t.leaderName || 'Leader'}</span>
                          {t.member2Name && <span> & {t.member2Name}</span>}
                        </td>
                        <td className="p-3.5 font-mono text-accent font-semibold">{t.teamCode}</td>
                        <td className="p-3.5 font-mono font-bold text-ink">{t.totalScore} pts</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setOverrideTeamId(t.id);
                              setOverrideValue(t.totalScore);
                            }}
                            className="px-3 py-1 bg-bg border border-border hover:bg-surface rounded-lg text-xs font-semibold text-ink"
                          >
                            Override Score
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCORE OVERRIDES TAB */}
          {activeTab === 'scoring' && (
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-6">
              <h2 className="text-xl font-extrabold text-ink">Score Adjustments (Admin Overrides)</h2>

              {overrideTeamId && (
                <form onSubmit={handleSaveOverride} className="p-4 bg-bg border border-border rounded-xl space-y-4 max-w-md">
                  <h3 className="font-bold text-ink">Adjust Total Score for Team</h3>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">New Total Score</label>
                    <input
                      type="number"
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-ink font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Reason Note (Optional)</label>
                    <input
                      type="text"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="e.g. +10 bonus for innovation"
                      className="w-full px-3 py-2 border border-border rounded-lg text-ink"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button type="submit" className="px-4 py-2 bg-accent text-white font-bold rounded-lg text-sm">
                      Apply Override
                    </button>
                    <button type="button" onClick={() => setOverrideTeamId(null)} className="px-4 py-2 border border-border rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* DEDICATED SEPARATE LEADERBOARDS TAB */}
          {activeTab === 'boards' && (
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">Admin Event Leaderboards</h2>
                  <p className="text-xs text-muted">Separate score standings for Activity 1, Activity 2, and Overall Total.</p>
                </div>
                <button
                  onClick={() => setIsProjectorMode(true)}
                  className="px-4 py-2 bg-accent hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center space-x-2 shadow-xs transition-colors"
                >
                  <Tv className="w-4 h-4" />
                  <span>Open Fullscreen Projector</span>
                </button>
              </div>

              {/* 3 DEDICATED SEPARATE LEADERBOARD CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Activity 1: Quiz Challenge */}
                <div className="border border-border rounded-2xl p-5 bg-bg space-y-4 shadow-xs">
                  <div className="flex items-center space-x-2 text-accent border-b border-border pb-3">
                    <HelpCircle className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-ink">Activity 1: Quiz Challenge</h3>
                  </div>

                  <div className="space-y-2">
                    {act1Leaderboard.length === 0 ? (
                      <p className="text-xs text-muted italic text-center py-6">No Quiz scores calculated yet</p>
                    ) : (
                      act1Leaderboard.map((r) => (
                        <div key={r.teamId} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-xs font-black bg-accent-soft text-accent px-2 py-0.5 rounded-md">
                              #{r.rank}
                            </span>
                            <span className="font-bold text-ink text-sm">{r.name}</span>
                          </div>
                          <strong className="font-mono text-accent font-black text-sm">{r.score} pts</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Activity 2: Market Simulation */}
                <div className="border border-border rounded-2xl p-5 bg-bg space-y-4 shadow-xs">
                  <div className="flex items-center space-x-2 text-emerald-600 border-b border-border pb-3">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-ink">Activity 2: Market Simulation</h3>
                  </div>

                  <div className="space-y-2">
                    {act2Leaderboard.length === 0 ? (
                      <p className="text-xs text-muted italic text-center py-6">No Market scores calculated yet</p>
                    ) : (
                      act2Leaderboard.map((r) => (
                        <div key={r.teamId} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                              #{r.rank}
                            </span>
                            <span className="font-bold text-ink text-sm">{r.name}</span>
                          </div>
                          <strong className="font-mono text-emerald-600 font-black text-sm">{r.score} pts</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Overall Event Leaderboard */}
                <div className="border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-5 bg-amber-50/20 dark:bg-amber-950/20 space-y-4 shadow-md">
                  <div className="flex items-center space-x-2 text-amber-600 border-b border-amber-200 dark:border-amber-800 pb-3">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="font-black text-base text-ink">Overall Event Standings</h3>
                  </div>

                  <div className="space-y-2">
                    {overallLeaderboard.length === 0 ? (
                      <p className="text-xs text-muted italic text-center py-6">No overall scores calculated yet</p>
                    ) : (
                      overallLeaderboard.map((r) => (
                        <div key={r.teamId} className="p-3 bg-surface border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-xs font-black bg-amber-400 text-ink px-2 py-0.5 rounded-md">
                              #{r.rank}
                            </span>
                            <span className="font-extrabold text-ink text-sm">{r.name}</span>
                          </div>
                          <strong className="font-mono text-accent font-black text-base">{r.score} pts</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONFIG JSON TAB */}
          {activeTab === 'config' && (
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">Event Configuration (JSON)</h2>
                  <p className="text-xs text-muted">Rules are data. Edit JSON schema to customize activities, timings, and points.</p>
                </div>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-accent hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Config</span>
                </button>
              </div>

              {configError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-danger text-xs font-semibold">
                  {configError}
                </div>
              )}

              {configSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-success text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Config validated and reloaded successfully!</span>
                </div>
              )}

              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={20}
                className="w-full font-mono text-xs p-4 bg-bg border border-border rounded-xl focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
