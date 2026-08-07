import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useEventStore } from '../store/eventStore';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
  }
  return globalSocket;
}

export function useSocket() {
  const store = useEventStore();
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    function onConnect() {
      store.setConnection({ isConnected: true, isReconnecting: false });

      // Auto reconnect if team code exists in localStorage
      const savedCode = localStorage.getItem('recruitquest_team_code');
      if (savedCode) {
        socket.emit('team:join', { code: savedCode }, (res: any) => {
          if (res.success && res.team) {
            store.setTeamInfo({
              teamId: res.team.id,
              name: res.team.name,
              leaderName: res.team.leaderName,
              member2Name: res.team.member2Name,
              code: res.team.code,
              totalScore: res.team.totalScore
            });
          }
        });
      }
    }

    function onDisconnect() {
      store.setConnection({ isConnected: false, isReconnecting: true });
    }

    function onEventState(snapshot: any) {
      console.log('[Socket Event] event:state snapshot received:', snapshot);
      store.setEventState(snapshot);
    }

    function onActivityStarted(payload: any) {
      console.log('[Socket Event] activity:started received:', payload);
      store.setActivityStarted(payload);
    }

    function onActivityPaused(payload: any) {
      console.log('[Socket Event] activity:paused received:', payload);
      store.setActivityPaused(payload);
    }

    function onActivityResumed(payload: any) {
      console.log('[Socket Event] activity:resumed received:', payload);
      store.setActivityResumed(payload);
    }

    function onActivityEnded() {
      store.setActivityEnded({});
    }

    function onTeamsList(teams: any[]) {
      store.setTeamsList(teams);
    }

    function onPerActBoard(payload: any) {
      store.setPerActLeaderboard(payload.rows);
    }

    function onOverallBoard(payload: any) {
      store.setOverallLeaderboard(payload.rows);
    }

    function onTeamJoined() {
      const token = localStorage.getItem('recruitquest_admin_token');
      const savedPasscode = localStorage.getItem('recruitquest_admin_passcode');
      if (token || savedPasscode) {
        socket.emit('admin:auth', { passcode: savedPasscode || undefined, token: token || undefined }, () => {});
      }
    }

    function onQuizQuestion(payload: any) {
      console.log('[Socket Event] quiz:question received:', payload);
      store.setQuizQuestion(payload);
    }

    function onQuizLocked(payload: any) {
      store.setQuizLocked(payload.index, payload.answer);
    }

    function onQuizReveal(payload: any) {
      console.log('[Socket Event] quiz:reveal received:', payload);
      store.setQuizReveal(payload);
    }

    function onQuizComplete(payload: any) {
      console.log('[Socket Event] quiz:complete received:', payload);
      store.setQuizComplete(payload);
    }

    function onTeamScoreUpdate(payload: any) {
      console.log('[Socket Event] team:score-update received:', payload);
      store.setTeamScoreUpdate(payload);
    }

    function onMarketScenario(payload: any) {
      console.log('[Socket Event] market:scenario received:', payload);
      store.setMarketScenario(payload);
    }

    function onMarketReveal(payload: any) {
      console.log('[Socket Event] market:reveal received:', payload);
      store.setMarketReveal(payload);
    }

    function onMarketDecisionClosed(payload: any) {
      store.setMarketDecisionClosed(payload);
    }

    function onMarketFinished(payload: any) {
      console.log('[Socket Event] market:finished received:', payload);
      store.setMarketFinished(payload);
    }

    function onTakeover(payload: any) {
      store.setConnection({ isConnected: false, takeoverReason: payload.reason });
      localStorage.removeItem('recruitquest_team_code');
      store.resetState();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('event:state', onEventState);
    socket.on('activity:started', onActivityStarted);
    socket.on('activity:paused', onActivityPaused);
    socket.on('activity:resumed', onActivityResumed);
    socket.on('activity:ended', onActivityEnded);
    socket.on('teams:list', onTeamsList);
    socket.on('team:joined', onTeamJoined);
    socket.on('leaderboard:per-activity', onPerActBoard);
    socket.on('leaderboard:act1', onPerActBoard);
    socket.on('leaderboard:act2', onPerActBoard);
    socket.on('leaderboard:overall', onOverallBoard);
    socket.on('quiz:question', onQuizQuestion);
    socket.on('quiz:locked', onQuizLocked);
    socket.on('quiz:reveal', onQuizReveal);
    socket.on('quiz:complete', onQuizComplete);
    socket.on('team:score-update', onTeamScoreUpdate);
    socket.on('market:scenario', onMarketScenario);
    socket.on('market:reveal', onMarketReveal);
    socket.on('market:decision-closed', onMarketDecisionClosed);
    socket.on('market:finished', onMarketFinished);
    socket.on('team:takeover', onTakeover);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('event:state', onEventState);
      socket.off('activity:started', onActivityStarted);
      socket.off('activity:paused', onActivityPaused);
      socket.off('activity:resumed', onActivityResumed);
      socket.off('activity:ended', onActivityEnded);
      socket.off('teams:list', onTeamsList);
      socket.off('team:joined', onTeamJoined);
      socket.off('leaderboard:per-activity', onPerActBoard);
      socket.off('leaderboard:act1', onPerActBoard);
      socket.off('leaderboard:act2', onPerActBoard);
      socket.off('leaderboard:overall', onOverallBoard);
      socket.off('quiz:question', onQuizQuestion);
      socket.off('quiz:locked', onQuizLocked);
      socket.off('quiz:reveal', onQuizReveal);
      socket.off('quiz:complete', onQuizComplete);
      socket.off('team:score-update', onTeamScoreUpdate);
      socket.off('market:scenario', onMarketScenario);
      socket.off('market:reveal', onMarketReveal);
      socket.off('market:decision-closed', onMarketDecisionClosed);
      socket.off('market:finished', onMarketFinished);
      socket.off('team:takeover', onTakeover);
    };
  }, []);

  return { socket: socketRef.current };
}
