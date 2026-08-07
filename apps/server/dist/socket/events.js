"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const repository_1 = require("../db/repository");
const rooms_1 = require("./rooms");
const activities_1 = require("@recruitquest/activities");
const UNAMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateTeamCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        const rand = Math.floor(Math.random() * UNAMBIGUOUS_ALPHABET.length);
        code += UNAMBIGUOUS_ALPHABET[rand];
    }
    return code;
}
function registerSocketHandlers(io, runtime, defaultEventId) {
    io.on('connection', async (socket) => {
        let socketTeamId = null;
        // Send initial connection snapshot
        const event = await repository_1.repo.getEvent(defaultEventId);
        const activities = await repository_1.repo.listActivities(defaultEventId);
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
                engine.sendQuestionToSocket(socket);
            }
            else if (currentActivity.type === 'market-simulation') {
                engine.sendScenarioToSocket(socket);
            }
        }
        // TEAM: CREATE
        socket.on('team:create', async (payload, callback) => {
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
                const existing = await repository_1.repo.getTeamByName(defaultEventId, rawName);
                if (existing) {
                    return callback?.({ success: false, error: `Team '${rawName}' already exists — try a different name` });
                }
                let code = generateTeamCode();
                while (await repository_1.repo.getTeamByCode(code)) {
                    code = generateTeamCode();
                }
                const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const team = {
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
                await repository_1.repo.createTeam(team);
                socketTeamId = teamId;
                socket.join((0, rooms_1.getPrivateTeamRoom)(teamId));
                socket.join((0, rooms_1.getTeamRoom)(defaultEventId));
                socket.join((0, rooms_1.getEventRoom)(defaultEventId));
                // Notify admin dashboard of new team
                io.to((0, rooms_1.getAdminRoom)(defaultEventId)).emit('team:joined', { id: team.id, name: team.name, code: team.teamCode });
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
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
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Failed to create team' });
            }
        });
        // TEAM: JOIN
        socket.on('team:join', async (payload, callback) => {
            try {
                const code = (payload.code || '').trim().toUpperCase();
                if (!code || code.length !== 6) {
                    return callback?.({ success: false, error: 'Enter a valid 6-character Team Code' });
                }
                const team = await repository_1.repo.getTeamByCode(code);
                if (!team) {
                    return callback?.({ success: false, error: 'Code not found — check with your organizer' });
                }
                if (team.activeConn && team.activeConn !== socket.id) {
                    const oldSocket = io.sockets.sockets.get(team.activeConn);
                    if (oldSocket) {
                        oldSocket.emit('team:takeover', { reason: 'Session moved to another device' });
                        oldSocket.emit('session:inactive', { reason: 'Another device joined with your team code' });
                        oldSocket.leave((0, rooms_1.getPrivateTeamRoom)(team.id));
                    }
                }
                await repository_1.repo.updateTeamActiveConn(team.id, socket.id);
                socketTeamId = team.id;
                socket.join((0, rooms_1.getPrivateTeamRoom)(team.id));
                socket.join((0, rooms_1.getTeamRoom)(team.eventId));
                socket.join((0, rooms_1.getEventRoom)(team.eventId));
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(team.eventId)), team.eventId);
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
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Failed to join team' });
            }
        });
        // TEAM: SUBMIT
        socket.on('team:submit', async (payload, callback) => {
            try {
                if (!socketTeamId) {
                    return callback?.({ success: false, error: 'Not joined to any team' });
                }
                const activity = await repository_1.repo.getActivity(payload.activityId);
                if (!activity || activity.status !== 'running') {
                    return callback?.({ success: false, error: 'Activity is not currently active' });
                }
                const engine = runtime.getEngine(activity);
                const res = await engine.onSubmit(socketTeamId, payload.payload);
                io.to((0, rooms_1.getAdminRoom)(activity.eventId)).emit('submission:received', {
                    activityId: activity.id,
                    teamId: socketTeamId,
                    at: new Date().toISOString()
                });
                callback?.(res);
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Submission failed' });
            }
        });
        // ADMIN: AUTH
        socket.on('admin:auth', async (payload, callback) => {
            try {
                const ev = await repository_1.repo.getEvent(defaultEventId);
                if (!ev)
                    return callback?.({ success: false, error: 'Event not found' });
                const correctPasscode = ev.config.passcode || 'MITULRISHI2026';
                const isValidToken = payload.token && payload.token.startsWith('admin_token_');
                const isValidPasscode = payload.passcode && payload.passcode === correctPasscode;
                if (!isValidToken && !isValidPasscode) {
                    return callback?.({ success: false, error: 'Incorrect admin passcode' });
                }
                socket.data.isAdmin = true;
                socket.join((0, rooms_1.getAdminRoom)(defaultEventId));
                await broadcastAdminState(socket, defaultEventId);
                callback?.({ success: true, token: payload.token || `admin_token_${Date.now()}` });
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Admin authentication failed' });
            }
        });
        const verifyAdmin = (socket) => {
            return !!(socket.data?.isAdmin || socket.rooms.has((0, rooms_1.getAdminRoom)(defaultEventId)));
        };
        // ADMIN: START ACTIVITY
        socket.on('admin:start-activity', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                console.log(`[Admin] Starting activity: ${payload.activityId}`);
                await runtime.startActivity(payload.activityId);
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
            }
            catch (err) {
                console.error('[Admin] Error starting activity:', err);
            }
        });
        // ADMIN: PAUSE ACTIVITY
        socket.on('admin:pause-activity', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                console.log(`[Admin] Pausing activity: ${payload.activityId}`);
                await runtime.pauseActivity(payload.activityId);
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
            }
            catch (err) {
                console.error('[Admin] Error pausing activity:', err);
            }
        });
        // ADMIN: RESUME ACTIVITY
        socket.on('admin:resume-activity', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                console.log(`[Admin] Resuming activity: ${payload.activityId}`);
                await runtime.resumeActivity(payload.activityId);
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
            }
            catch (err) {
                console.error('[Admin] Error resuming activity:', err);
            }
        });
        // ADMIN: END ACTIVITY
        socket.on('admin:end-activity', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                console.log(`[Admin] Ending activity: ${payload.activityId}`);
                await runtime.endActivity(payload.activityId);
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
            }
            catch (err) {
                console.error('[Admin] Error ending activity:', err);
            }
        });
        // ADMIN: RESET EVENT DATA
        socket.on('admin:reset-event', async (payload, callback) => {
            if (!verifyAdmin(socket))
                return callback?.({ success: false, error: 'Unauthorized' });
            try {
                const eventId = payload?.eventId || defaultEventId;
                console.log(`[Admin] Resetting all event data for ${eventId}...`);
                await repository_1.repo.resetEventData(eventId);
                await runtime.resetRuntime(eventId);
                io.emit('event:reset', { eventId });
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(eventId)), eventId);
                await runtime.broadcastEventState(eventId);
                callback?.({ success: true });
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Failed to reset event data' });
            }
        });
        // ADMIN: NEXT SCENARIO
        socket.on('admin:next-scenario', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                console.log(`[Admin] Advancing scenario: ${payload.activityId}`);
                await runtime.advanceNextScenario(payload.activityId);
            }
            catch (err) {
                console.error('[Admin] Error advancing scenario:', err);
            }
        });
        // ADMIN: OVERRIDE SCORE
        socket.on('admin:override-score', async (payload) => {
            if (!verifyAdmin(socket))
                return;
            try {
                if (payload.activityId) {
                    await repository_1.repo.saveScore({
                        id: `score_override_${payload.activityId}_${payload.teamId}`,
                        activityId: payload.activityId,
                        teamId: payload.teamId,
                        value: payload.value,
                        source: 'admin_override',
                        note: payload.note,
                        adjustedAt: new Date().toISOString()
                    });
                }
                else {
                    await repository_1.repo.saveOverallOverrideScore(payload.teamId, payload.value, payload.note);
                }
                io.to((0, rooms_1.getAdminRoom)(defaultEventId)).emit('score:override-applied', {
                    teamId: payload.teamId,
                    newValue: payload.value,
                    note: payload.note
                });
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
            }
            catch (err) {
                console.error('[Admin] Error overriding score:', err);
            }
        });
        // ADMIN: RELOAD CONFIG
        socket.on('admin:reload-config', async (payload, callback) => {
            if (!verifyAdmin(socket))
                return callback?.({ success: false, error: 'Unauthorized' });
            try {
                const ev = await repository_1.repo.getEvent(payload.eventId || defaultEventId);
                if (!ev)
                    return callback?.({ success: false, error: 'Event not found' });
                const configToSave = payload.newConfig || ev.config;
                await repository_1.repo.updateEventConfig(ev.id, configToSave);
                if (configToSave.activities && Array.isArray(configToSave.activities)) {
                    for (const act of configToSave.activities) {
                        (0, activities_1.validateActivityConfig)(act.type, act.config);
                        const actId = `act_${ev.id}_${act.seq}`;
                        const existingAct = await repository_1.repo.getActivity(actId);
                        if (existingAct) {
                            await repository_1.repo.createActivity({
                                ...existingAct,
                                type: act.type,
                                config: act.config
                            });
                        }
                        else {
                            await repository_1.repo.createActivity({
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
                io.to((0, rooms_1.getAdminRoom)(defaultEventId)).emit('admin:config-saved', { success: true });
                await broadcastAdminState(io.to((0, rooms_1.getAdminRoom)(defaultEventId)), defaultEventId);
                callback?.({ success: true });
            }
            catch (err) {
                callback?.({ success: false, error: err.message || 'Invalid config format' });
            }
        });
        // DISCONNECT
        socket.on('disconnect', async () => {
            if (socketTeamId) {
                const team = await repository_1.repo.getTeamByCode((await repository_1.repo.listTeams(defaultEventId)).find(t => t.id === socketTeamId)?.teamCode || '');
                if (team && team.activeConn === socket.id) {
                    await repository_1.repo.updateTeamActiveConn(team.id, null);
                }
                await broadcastRosterToAdmin(io, defaultEventId);
            }
        });
    });
}
async function sendSnapshotToTeam(socket, team, runtime) {
    const ev = await repository_1.repo.getEvent(team.eventId);
    const activities = await repository_1.repo.listActivities(team.eventId);
    const currentActivity = activities.find(a => a.status === 'running' || a.status === 'paused') || activities.find(a => a.status === 'waiting');
    let actScore = 0;
    let actRank = 1;
    const allTeams = await repository_1.repo.listTeams(team.eventId);
    if (currentActivity) {
        const perActBoard = await repository_1.repo.getPerActivityLeaderboard(currentActivity.id);
        const teamRow = perActBoard.find(r => r.teamId === team.id);
        if (currentActivity.type === 'quiz') {
            actScore = teamRow ? teamRow.score : 0;
        }
        else if (currentActivity.type === 'market-simulation') {
            actScore = teamRow ? teamRow.score : 10000;
        }
        else {
            actScore = team.totalScore;
        }
        actRank = teamRow ? teamRow.rank : allTeams.length;
    }
    else {
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
            engine.sendQuestionToSocket(socket);
        }
        else if (currentActivity.type === 'market-simulation') {
            engine.sendScenarioToSocket(socket, team.id);
        }
    }
}
async function broadcastRosterToAdmin(io, eventId) {
    const teams = await repository_1.repo.listTeams(eventId);
    const summaries = teams.map(t => ({
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
    io.to((0, rooms_1.getAdminRoom)(eventId)).emit('teams:list', summaries);
}
async function broadcastAdminState(target, eventId) {
    const teams = await repository_1.repo.listTeams(eventId);
    const summaries = teams.map(t => ({
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
    const act1Board = await repository_1.repo.getPerActivityLeaderboard(`act_${eventId}_1`);
    const act2Board = await repository_1.repo.getPerActivityLeaderboard(`act_${eventId}_2`);
    const overallBoard = await repository_1.repo.getOverallLeaderboard(eventId);
    target.emit('leaderboard:per-activity', { activityId: `act_${eventId}_1`, rows: act1Board });
    target.emit('leaderboard:act1', { rows: act1Board });
    target.emit('leaderboard:act2', { rows: act2Board });
    target.emit('leaderboard:overall', { rows: overallBoard });
}
