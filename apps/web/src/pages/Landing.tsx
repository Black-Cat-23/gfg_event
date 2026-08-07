import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { getSocket } from '../hooks/useSocket';
import { StatusDot } from '../components/StatusDot';
import { UserPlus, LogIn, Sparkles, ShieldCheck, Smartphone } from 'lucide-react';

interface CodeFieldProps {
  value: string;
  onChange: (val: string) => void;
}

const CodeField: React.FC<CodeFieldProps> = ({ value, onChange }) => {
  const chars = value.padEnd(6, ' ').split('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    onChange(raw);
  };

  return (
    <div className="relative flex justify-center items-center space-x-2 my-4 cursor-pointer">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        maxLength={6}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 font-mono"
        autoFocus
      />
      {chars.map((ch, idx) => (
        <div
          key={idx}
          className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center font-mono text-2xl font-black transition-all ${ch !== ' '
            ? 'border-accent bg-accent-soft text-accent shadow-xs'
            : idx === value.length
              ? 'border-accent animate-pulse bg-bg'
              : 'border-border bg-bg text-muted'
            }`}
        >
          {ch !== ' ' ? ch : ''}
        </div>
      ))}
    </div>
  );
};

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const store = useEventStore();
  const socket = getSocket();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState<string>('');
  const [leaderName, setLeaderName] = useState<string>('');
  const [member2Name, setMember2Name] = useState<string>('');
  const [teamCode, setTeamCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto redirect to /team if team session is already active or saved
  useEffect(() => {
    const savedCode = localStorage.getItem('recruitquest_team_code');
    if (savedCode || (store.teamId && store.teamCode)) {
      navigate('/team');
    }
  }, [store.teamId, store.teamCode, navigate]);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    socket.emit(
      'team:create',
      {
        name: teamName.trim(),
        leaderName: leaderName.trim(),
        member2Name: member2Name.trim()
      },
      (res: any) => {
        setIsSubmitting(false);
        if (res.success && res.team) {
          store.setTeamInfo({
            teamId: res.team.id,
            name: res.team.name,
            leaderName: res.team.leaderName,
            member2Name: res.team.member2Name,
            code: res.team.code,
            totalScore: res.team.totalScore
          });
          store.setNewlyCreatedCode(res.team.code);
          localStorage.setItem('recruitquest_team_code', res.team.code);
          navigate('/team');
        } else {
          setError(res.error || 'Failed to create team');
        }
      }
    );
  };

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamCode.length !== 6) {
      setError('Please enter a valid 6-character Team Code');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    socket.emit('team:join', { code: teamCode }, (res: any) => {
      setIsSubmitting(false);
      if (res.success && res.team) {
        store.setTeamInfo({
          teamId: res.team.id,
          name: res.team.name,
          leaderName: res.team.leaderName,
          member2Name: res.team.member2Name,
          code: res.team.code,
          totalScore: res.team.totalScore
        });
        localStorage.setItem('recruitquest_team_code', res.team.code);
        navigate('/team');
      } else {
        setError(res.error || 'Invalid team code — please check with your organizer');
      }
    });
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-4 max-w-md mx-auto relative">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-lg shadow-xs">
            GFG
          </div>
          <span className="font-extrabold text-xl tracking-tight text-ink">GeeksforGeeks</span>
        </div>
        <StatusDot isConnected={store.isConnected} isReconnecting={store.isReconnecting} />
      </header>

      {/* Main Container */}
      <main className="my-auto py-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-ink tracking-tight sm:text-4xl">
            Kickstart 2.0
          </h1>
          <p className="text-muted text-sm font-medium">
            Solve puzzles & trade in real-time
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface border border-border rounded-xl">
          <button
            type="button"
            onClick={() => { setTab('create'); setError(null); }}
            className={`py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${tab === 'create' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Team</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('join'); setError(null); }}
            className={`py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${tab === 'join' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Join Team</span>
          </button>
        </div>

        {/* Create Team Form (2 Members) */}
        {tab === 'create' && (
          <form onSubmit={handleCreateTeam} className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-ink uppercase tracking-wider">Team Name</label>
                <span className="text-xs text-muted font-mono">{teamName.length}/20</span>
              </div>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value.slice(0, 20))}
                placeholder="e.g. Xcalibur"
                maxLength={20}
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-ink font-medium focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Team Leader Name (Member 1)</label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="e.g. Mitul"
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-ink font-medium focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Teammate Name (Member 2)</label>
              <input
                type="text"
                value={member2Name}
                onChange={(e) => setMember2Name(e.target.value)}
                placeholder="e.g. Rishi"
                required
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-ink font-medium focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-danger text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !teamName.trim() || !leaderName.trim() || !member2Name.trim()}
              className="w-full py-3.5 px-6 bg-accent hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors text-base flex items-center justify-center space-x-2 pt-3"
            >
              <Sparkles className="w-5 h-5" />
              <span>Register Team (2 Members)</span>
            </button>
          </form>
        )}

        {/* Join Team Form */}
        {tab === 'join' && (
          <form onSubmit={handleJoinTeam} className="bg-surface p-6 rounded-2xl border border-border shadow-xs space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink text-center mb-3">Enter 6-Character Team Code</label>
              <CodeField value={teamCode} onChange={setTeamCode} />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-danger text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || teamCode.length !== 6}
              className="w-full py-4 px-6 bg-accent hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors text-base flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Takeover / Join Device</span>
            </button>
          </form>
        )}

        {/* Informative Card Explaining Team Code & 1-Device Policy */}
        <div className="p-4 bg-surface border border-border rounded-2xl flex items-start space-x-3 text-xs shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-left">
            <h4 className="font-extrabold text-ink text-xs flex items-center space-x-1.5">
              <span>Why Team Codes & 1 Active Device?</span>
            </h4>
            <p className="text-muted leading-relaxed font-medium">
              Only <strong className="text-ink">1 active phone/device</strong> controls your team during live activities. If your phone battery dies or you switch devices, enter your team's <strong className="text-accent font-mono">6-character Team Code</strong> on the new phone to instantly transfer live control!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted">
        © 2026 Kickstart 2.0 • GFG Tech Lead • All rights reserved.
      </footer>
    </div>
  );
};
