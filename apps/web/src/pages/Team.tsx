import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { getSocket } from '../hooks/useSocket';
import { StatusDot } from '../components/StatusDot';
import { CodeCard } from '../components/CodeCard';
import { QuizTeamScreen } from '../activities/quiz/TeamScreen';
import { MarketTeamScreen } from '../activities/market/TeamScreen';
import { Chip } from '../components/Chip';
import { LogOut, Copy, Shield, Users, User } from 'lucide-react';

export const Team: React.FC = () => {
  const navigate = useNavigate();
  const store = useEventStore();
  const socket = getSocket();

  const currentTeamCode = store.teamCode || localStorage.getItem('recruitquest_team_code') || '';

  useEffect(() => {
    const savedCode = localStorage.getItem('recruitquest_team_code');
    if (!savedCode && !store.teamCode) {
      navigate('/');
    }
  }, [store.teamCode, navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('recruitquest_team_code');
    store.resetState();
    navigate('/');
  };

  // 1. Show-Once Team Code view
  if (store.newlyCreatedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
        <CodeCard
          code={store.newlyCreatedCode}
          onProceed={() => store.setNewlyCreatedCode(undefined)}
        />
      </div>
    );
  }

  // 2. Active Activity Renderers
  const actType = store.currentActivity?.type;
  const isRunningOrPaused = store.currentActivity?.status === 'running' || store.currentActivity?.status === 'paused';

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-bg">
      {/* Persistent Team Header */}
      <header className="flex items-center justify-between pb-3 border-b border-border mb-4 max-w-md mx-auto w-full">
        <div>
          <h1 className="font-extrabold text-lg text-ink leading-tight flex items-center space-x-2">
            <span>{store.teamName || 'Team'}</span>
          </h1>
          <div className="flex items-center space-x-2 text-xs text-muted font-medium mt-0.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span>Code: <strong className="font-mono text-accent text-sm font-black">{currentTeamCode}</strong></span>
            {store.leaderName && (
              <span className="text-muted opacity-80">
                • {store.leaderName}{store.member2Name ? ` & ${store.member2Name}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <StatusDot isConnected={store.isConnected} isReconnecting={store.isReconnecting} />
          <button
            onClick={handleSignOut}
            title="Leave Team"
            className="p-2 rounded-lg hover:bg-bg border border-border text-muted hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center">
        {isRunningOrPaused && actType === 'quiz' && <QuizTeamScreen />}
        {isRunningOrPaused && actType === 'market-simulation' && <MarketTeamScreen />}

        {/* Lobby Default Resting View */}
        {(!isRunningOrPaused || !actType) && (
          <div className="bg-surface p-8 rounded-2xl border border-border shadow-xs text-center space-y-6 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-ink">Waiting for organizer...</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                The competition will begin shortly. Keep this screen open.
              </p>
            </div>

            {store.leaderName && (
              <div className="p-3 bg-bg border border-border rounded-xl text-xs text-muted font-medium flex items-center justify-center space-x-2">
                <User className="w-4 h-4 text-accent" />
                <span>Team Roster: <strong className="text-ink">{store.leaderName}</strong> & <strong className="text-ink">{store.member2Name || 'Partner'}</strong></span>
              </div>
            )}

            {store.nextUp && (
              <div className="p-4 bg-bg border border-border rounded-xl text-left space-y-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Next Up</span>
                <div className="font-bold text-ink text-base flex items-center justify-between">
                  <span>{store.nextUp.title}</span>
                  <Chip label={`${store.nextUp.durationMinutes || 15} min`} variant="accent" />
                </div>
              </div>
            )}

            <div className="text-xs text-muted font-mono pt-2">
              Team Code: <strong className="text-accent font-black text-lg tracking-widest px-2 py-0.5 bg-accent-soft rounded-lg">{currentTeamCode}</strong>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-muted max-w-md mx-auto w-full">
        © 2026 Kickstart 2.0 • GFG Tech Lead • All rights reserved.
      </footer>
    </div>
  );
};
