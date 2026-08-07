import { Server, Socket } from 'socket.io';
import { repo } from '../db/repository';
import { getAdminRoom, getTeamRoom, getPrivateTeamRoom, getEventRoom } from './rooms';
import { ActivityRuntime } from '../engine/ActivityRuntime';
import { validateActivityConfig } from '@recruitquest/activities';
import { Team, TeamSummary, LeaderboardRow } from '@recruitquest/types';
import { QuizActivityEngine } from '../activities/quiz/QuizActivity';
import { MarketActivityEngine } from '../activities/market/MarketActivity';

const UNAMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateTeamCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const rand = Math.floor(Math.random() * UNAMBIGUOUS_ALPHABET.length);
    code += UNAMBIGUOUS_ALPHABET[rand];
  }
  return code;
}

export function registerSocketHandlers(io: Server, runtime: ActivityRuntime, defaultEventId: string) {
  io.on('connection', async (socket: Socket) => {
    let socketTeamId: string | null = null;

    // Send initial connection snapshot
    const event = await repo.getEvent(defaultEventId);
    const activities = await repo.listActivities(defaultEventId);
    const currentActivity = activities.find(a => a.status === 'running' || a.status === 'paused') || activities.find(a => a.status === 'waiting');

    socket.emit('event:state', {
      event: { id: event?.id || defaultEventId, name: event?.name || 'RecruitQuest', status: event?.status || 'waiting' },
      activity: currentActivity ? {
        id: currentActivity.id,
        type: currentActivity.type,
        seq: currentActivity.seq,
        status: currentActivity.status,
        title: currentActivity.config.title || currentActivity.type
      } : undefined
    });

    if (currentActivity && (currentActivity.status === 'running' || currentActivity.status === 'paused')) {
      const engine = runtime.getEngine(currentActivity);
      if (currentActivity.type === 'quiz') {
        (engine as QuizActivityEngine).sendQuestionToSocket(socket);
      } else if (currentActivity.type === 'market-simulation') {
        (engine as MarketActivityEngine).sendScenarioToSocket(socket);
      }
    }

    // TEAM: CREATE
    socket.on('team:create', async (payload: { name: string; leaderName?: string; member2Name?: string }, callback) => {
      try {
        const rawName = (payload.name || '').trim();
        const leaderName = (payload.leaderName || '').trim();
        const member2Name = (payload.member2Name || '').trim();

        if (!rawName) {
          return callback?.({ success: false, error: 'Team name cannot be empty' });
        }
        if (rawName.length > 20) {
          return callback?.({ success: false, error: 'Team name must be 20 characters or less' });
        }
        if (!leaderName) {
          return callback?.({ success: false, error: 'Team Leader name is required' });
        }
        if (!member2Name) {
          return callback?.({ success: false, error: 'Teammate name (Member 2) is required' });
        }

        const allowedCharset = /^[a-zA-Z0-9\s._'-]+$/;
        if (!allowedCharset.test(rawName) || !allowedCharset.test(leaderName) || !allowedCharset.test(member2Name)) {
          return callback?.({ success: false, error: 'Names contain invalid special characters' });
        }

        const existing = await repo.getTeamByName(defaultEventId, rawName);
        if (existing) {
          return callback?.({ success: false, error: `Team '${rawName}' already exists — try a different name` });
        }

        let code = generateTeamCode();
        while (await repo.getTeamByCode(code)) {
          code = generateTeamCode();
        }

        const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const team: Team = {
          id: teamId,
          eventId: defaultEventId,
          name: rawName,
          leaderName,
          member2Name,
          teamCode: code,
          totalScore: 0,
          activeConn: socket.id,
          createdAt: new Date().toISOString()
        };

        await repo.createTeam(team);

        socketTeamId = teamId;
        socket.join(getPrivateTeamRoom(teamId));
        socket.join(getTeamRoom(defaultEventId));
        socket.join(getEventRoom(defaultEventId));

        // Notify admin dashboard of new team
        io.to(getAdminRoom(defaultEventId)).emit('team:joined', { id: team.id, name: team.name, code: team.teamCode });
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);

        callback?.({
          success: true,
          teamCode: code,
          team: {
            id: team.id,
            name: team.name,
            leaderName: team.leaderName,
            member2Name: team.member2Name,
            code: team.teamCode
          }
        });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Failed to create team' });
      }
    });

    // TEAM: JOIN
    socket.on('team:join', async (payload: { code: string }, callback) => {
      try {
        const code = (payload.code || '').trim().toUpperCase();
        if (!code || code.length !== 6) {
          return callback?.({ success: false, error: 'Enter a valid 6-character Team Code' });
        }

        const team = await repo.getTeamByCode(code);
        if (!team) {
          return callback?.({ success: false, error: 'Code not found — check with your organizer' });
        }

        if (team.activeConn && team.activeConn !== socket.id) {
          const oldSocket = io.sockets.sockets.get(team.activeConn);
          if (oldSocket) {
            oldSocket.emit('team:takeover', { reason: 'Session moved to another device' });
            oldSocket.emit('session:inactive', { reason: 'Another device joined with your team code' });
            oldSocket.leave(getPrivateTeamRoom(team.id));
          }
        }

        await repo.updateTeamActiveConn(team.id, socket.id);
        socketTeamId = team.id;

        socket.join(getPrivateTeamRoom(team.id));
        socket.join(getTeamRoom(team.eventId));
        socket.join(getEventRoom(team.eventId));

        await broadcastAdminState(io.to(getAdminRoom(team.eventId)), team.eventId);

        await sendSnapshotToTeam(socket, team, runtime);

        callback?.({
          success: true,
          team: {
            id: team.id,
            name: team.name,
            leaderName: team.leaderName,
            member2Name: team.member2Name,
            code: team.teamCode,
            totalScore: team.totalScore
          }
        });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Failed to join team' });
      }
    });

    // TEAM: SUBMIT
    socket.on('team:submit', async (payload: { activityId: string; payload: any }, callback) => {
      try {
        if (!socketTeamId) {
          return callback?.({ success: false, error: 'Not joined to any team' });
        }

        const activity = await repo.getActivity(payload.activityId);
        if (!activity || activity.status !== 'running') {
          return callback?.({ success: false, error: 'Activity is not currently active' });
        }

        const engine = runtime.getEngine(activity);
        const res = await engine.onSubmit(socketTeamId, payload.payload);

        io.to(getAdminRoom(activity.eventId)).emit('submission:received', {
          activityId: activity.id,
          teamId: socketTeamId,
          at: new Date().toISOString()
        });

        callback?.(res);
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Submission failed' });
      }
    });

    // ADMIN: AUTH
    socket.on('admin:auth', async (payload: { passcode?: string; token?: string }, callback) => {
      try {
        const ev = await repo.getEvent(defaultEventId);
        if (!ev) return callback?.({ success: false, error: 'Event not found' });

        const correctPasscode = ev.config.passcode || 'MITULRISHI2026';
        const isValidToken = payload.token && payload.token.startsWith('admin_token_');
        const isValidPasscode = payload.passcode && payload.passcode === correctPasscode;

        if (!isValidToken && !isValidPasscode) {
          return callback?.({ success: false, error: 'Incorrect admin passcode' });
        }

        socket.data.isAdmin = true;
        socket.join(getAdminRoom(defaultEventId));

        await broadcastAdminState(socket, defaultEventId);

        callback?.({ success: true, token: payload.token || `admin_token_${Date.now()}` });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Admin authentication failed' });
      }
    });

    const verifyAdmin = (socket: Socket): boolean => {
      return !!(socket.data?.isAdmin || socket.rooms.has(getAdminRoom(defaultEventId)));
    };

    // ADMIN: START ACTIVITY
    socket.on('admin:start-activity', async (payload: { activityId: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        console.log(`[Admin] Starting activity: ${payload.activityId}`);
        await runtime.startActivity(payload.activityId);
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);
      } catch (err: any) {
        console.error('[Admin] Error starting activity:', err);
      }
    });

    // ADMIN: PAUSE ACTIVITY
    socket.on('admin:pause-activity', async (payload: { activityId: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        console.log(`[Admin] Pausing activity: ${payload.activityId}`);
        await runtime.pauseActivity(payload.activityId);
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);
      } catch (err: any) {
        console.error('[Admin] Error pausing activity:', err);
      }
    });

    // ADMIN: RESUME ACTIVITY
    socket.on('admin:resume-activity', async (payload: { activityId: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        console.log(`[Admin] Resuming activity: ${payload.activityId}`);
        await runtime.resumeActivity(payload.activityId);
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);
      } catch (err: any) {
        console.error('[Admin] Error resuming activity:', err);
      }
    });

    // ADMIN: END ACTIVITY
    socket.on('admin:end-activity', async (payload: { activityId: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        console.log(`[Admin] Ending activity: ${payload.activityId}`);
        await runtime.endActivity(payload.activityId);
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);
      } catch (err: any) {
        console.error('[Admin] Error ending activity:', err);
      }
    });

    // ADMIN: RESET EVENT DATA
    socket.on('admin:reset-event', async (payload: { eventId?: string }, callback) => {
      if (!verifyAdmin(socket)) return callback?.({ success: false, error: 'Unauthorized' });
      try {
        const eventId = payload?.eventId || defaultEventId;
        console.log(`[Admin] Resetting all event data for ${eventId}...`);
        await repo.resetEventData(eventId);
        await runtime.resetRuntime(eventId);
        io.emit('event:reset', { eventId });
        await broadcastAdminState(io.to(getAdminRoom(eventId)), eventId);
        await runtime.broadcastEventState(eventId);
        callback?.({ success: true });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Failed to reset event data' });
      }
    });

    // ADMIN: NEXT SCENARIO
    socket.on('admin:next-scenario', async (payload: { activityId: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        console.log(`[Admin] Advancing scenario: ${payload.activityId}`);
        await runtime.advanceNextScenario(payload.activityId);
      } catch (err: any) {
        console.error('[Admin] Error advancing scenario:', err);
      }
    });

    // ADMIN: OVERRIDE SCORE
    socket.on('admin:override-score', async (payload: { activityId?: string; teamId: string; value: number; note?: string }) => {
      if (!verifyAdmin(socket)) return;
      try {
        if (payload.activityId) {
          await repo.saveScore({
            id: `score_override_${payload.activityId}_${payload.teamId}`,
            activityId: payload.activityId,
            teamId: payload.teamId,
            value: payload.value,
            source: 'admin_override',
            note: payload.note,
            adjustedAt: new Date().toISOString()
          });
        } else {
          await repo.saveOverallOverrideScore(payload.teamId, payload.value, payload.note);
        }

        io.to(getAdminRoom(defaultEventId)).emit('score:override-applied', {
          teamId: payload.teamId,
          newValue: payload.value,
          note: payload.note
        });

        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);
      } catch (err: any) {
        console.error('[Admin] Error overriding score:', err);
      }
    });

    // ADMIN: RELOAD CONFIG
    socket.on('admin:reload-config', async (payload: { eventId: string; newConfig?: any }, callback) => {
      if (!verifyAdmin(socket)) return callback?.({ success: false, error: 'Unauthorized' });
      try {
        const ev = await repo.getEvent(payload.eventId || defaultEventId);
        if (!ev) return callback?.({ success: false, error: 'Event not found' });

        const configToSave = payload.newConfig || ev.config;
        await repo.updateEventConfig(ev.id, configToSave);

        if (configToSave.activities && Array.isArray(configToSave.activities)) {
          for (const act of configToSave.activities) {
            validateActivityConfig(act.type, act.config);
            const actId = `act_${ev.id}_${act.seq}`;
            const existingAct = await repo.getActivity(actId);
            if (existingAct) {
              await repo.createActivity({
                ...existingAct,
                type: act.type,
                config: act.config
              });
            } else {
              await repo.createActivity({
                id: actId,
                eventId: ev.id,
                seq: act.seq,
                type: act.type,
                config: act.config,
                status: 'waiting',
                startedAt: undefined,
                endedAt: undefined
              });
            }
          }
        }

        io.to(getAdminRoom(defaultEventId)).emit('admin:config-saved', { success: true });
        await broadcastAdminState(io.to(getAdminRoom(defaultEventId)), defaultEventId);

        callback?.({ success: true });
      } catch (err: any) {
        callback?.({ success: false, error: err.message || 'Invalid config format' });
      }
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      if (socketTeamId) {
        const team = await repo.getTeamByCode((await repo.listTeams(defaultEventId)).find(t => t.id === socketTeamId)?.teamCode || '');
        if (team && team.activeConn === socket.id) {
          await repo.updateTeamActiveConn(team.id, null);
        }
        await broadcastRosterToAdmin(io, defaultEventId);
      }
    });
  });
}

async function sendSnapshotToTeam(socket: Socket, team: Team, runtime: ActivityRuntime) {
  const ev = await repo.getEvent(team.eventId);
  const activities = await repo.listActivities(team.eventId);
  const currentActivity = activities.find(a => a.status === 'running' || a.status === 'paused') || activities.find(a => a.status === 'waiting');

  let actScore = 0;
  let actRank = 1;
  const allTeams = await repo.listTeams(team.eventId);

  if (currentActivity) {
    const perActBoard = await repo.getPerActivityLeaderboard(currentActivity.id);
    const teamRow = perActBoard.find(r => r.teamId === team.id);
    if (currentActivity.type === 'quiz') {
      actScore = teamRow ? teamRow.score : 0;
    } else if (currentActivity.type === 'market-simulation') {
      actScore = teamRow ? teamRow.score : 10000;
    } else {
      actScore = team.totalScore;
    }
    actRank = teamRow ? teamRow.rank : allTeams.length;
  } else {
    actScore = team.totalScore;
  }

  socket.emit('event:state', {
    event: { id: ev?.id || team.eventId, name: ev?.name || 'RecruitQuest', status: ev?.status || 'running' },
    activity: currentActivity ? {
      id: currentActivity.id,
      type: currentActivity.type,
      seq: currentActivity.seq,
      status: currentActivity.status,
      title: currentActivity.config.title || currentActivity.type
    } : undefined,
    teamState: {
      teamId: team.id,
      name: team.name,
      leaderName: team.leaderName,
      member2Name: team.member2Name,
      teamCode: team.teamCode,
      totalScore: actScore,
      rank: actRank,
      totalTeams: allTeams.length
    }
  });

  if (currentActivity && (currentActivity.status === 'running' || currentActivity.status === 'paused')) {
    const engine = runtime.getEngine(currentActivity);
    if (currentActivity.type === 'quiz') {
      (engine as QuizActivityEngine).sendQuestionToSocket(socket);
    } else if (currentActivity.type === 'market-simulation') {
      (engine as MarketActivityEngine).sendScenarioToSocket(socket, team.id);
    }
  }
}

async function broadcastRosterToAdmin(io: Server, eventId: string) {
  const teams = await repo.listTeams(eventId);
  const summaries: TeamSummary[] = teams.map(t => ({
    id: t.id,
    name: t.name,
    leaderName: t.leaderName,
    member2Name: t.member2Name,
    teamCode: t.teamCode,
    totalScore: t.totalScore,
    isOnline: !!t.activeConn,
    activeConn: t.activeConn,
    createdAt: t.createdAt
  }));

  io.to(getAdminRoom(eventId)).emit('teams:list', summaries);
}

async function broadcastAdminState(target: any, eventId: string) {
  const teams = await repo.listTeams(eventId);

  const summaries: TeamSummary[] = teams.map(t => ({
    id: t.id,
    name: t.name,
    leaderName: t.leaderName,
    member2Name: t.member2Name,
    teamCode: t.teamCode,
    totalScore: t.totalScore,
    isOnline: !!t.activeConn,
    activeConn: t.activeConn,
    createdAt: t.createdAt
  }));

  target.emit('teams:list', summaries);

  // Broadcast separate activity 1, activity 2, and overall leaderboards
  const act1Board = await repo.getPerActivityLeaderboard(`act_${eventId}_1`);
  const act2Board = await repo.getPerActivityLeaderboard(`act_${eventId}_2`);
  const overallBoard = await repo.getOverallLeaderboard(eventId);

  target.emit('leaderboard:per-activity', { activityId: `act_${eventId}_1`, rows: act1Board });
  target.emit('leaderboard:act1', { rows: act1Board });
  target.emit('leaderboard:act2', { rows: act2Board });
  target.emit('leaderboard:overall', { rows: overallBoard });
}
