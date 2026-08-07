import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../hooks/useSocket';
import { AdminDashboard } from '../admin/Dashboard';
import { Lock, Key, ShieldAlert, Loader2 } from 'lucide-react';

export const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const socket = getSocket();

  const authenticateWithSavedCreds = useCallback(() => {
    const token = localStorage.getItem('recruitquest_admin_token');
    const savedPasscode = localStorage.getItem('recruitquest_admin_passcode');

    if (token || savedPasscode) {
      socket.emit(
        'admin:auth',
        { passcode: savedPasscode || undefined, token: token || undefined },
        (res: any) => {
          setIsCheckingAuth(false);
          if (res.success) {
            setIsAuthenticated(true);
            if (res.token) {
              localStorage.setItem('recruitquest_admin_token', res.token);
            }
          } else {
            setIsAuthenticated(false);
          }
        }
      );
    } else {
      setIsCheckingAuth(false);
    }
  }, [socket]);

  useEffect(() => {
    if (socket.connected) {
      authenticateWithSavedCreds();
    }

    const onConnect = () => {
      authenticateWithSavedCreds();
    };

    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket, authenticateWithSavedCreds]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    socket.emit('admin:auth', { passcode }, (res: any) => {
      setIsSubmitting(false);
      if (res.success && res.token) {
        localStorage.setItem('recruitquest_admin_token', res.token);
        localStorage.setItem('recruitquest_admin_passcode', passcode);
        setIsAuthenticated(true);
      } else {
        setError(res.error || 'Incorrect passcode');
      }
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('recruitquest_admin_token');
    localStorage.removeItem('recruitquest_admin_passcode');
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <AdminDashboard onSignOut={handleSignOut} />;
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-sm font-extrabold text-ink">Authenticating Admin Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface p-8 rounded-2xl border border-border shadow-md max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Admin Passcode</h1>
          <p className="text-xs text-muted">Enter the event passcode to open the dashboard.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Event Passcode
            </label>
            <div className="relative">
              <Key className="w-5 h-5 text-muted absolute left-3.5 top-3" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-bg border border-border rounded-xl text-ink font-medium focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-danger text-xs font-semibold flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passcode.trim()}
            className="w-full py-3.5 bg-accent hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs transition-colors text-sm"
          >
            {isSubmitting ? 'Authenticating...' : 'Access Admin Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
