"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityRuntime = void 0;
const QuizActivity_1 = require("../activities/quiz/QuizActivity");
const MarketActivity_1 = require("../activities/market/MarketActivity");
const repository_1 = require("../db/repository");
const TimerService_1 = require("./TimerService");
class ActivityRuntime {
    activeEngines = new Map();
    io;
    constructor(io) {
        this.io = io;
    }
    getEngine(activity, forceNew = false) {
        let engine = this.activeEngines.get(activity.id);
        if (!engine || forceNew) {
            if (activity.type === 'quiz') {
                engine = new QuizActivity_1.QuizActivityEngine(activity, this.io);
            }
            else if (activity.type === 'market-simulation') {
                engine = new MarketActivity_1.MarketActivityEngine(activity, this.io);
            }
            else {
                throw new Error(`Unsupported activity type: ${activity.type}`);
            }
            this.activeEngines.set(activity.id, engine);
        }
        return engine;
    }
    async broadcastEventState(eventId) {
        const event = await repository_1.repo.getEvent(eventId);
        const activities = await repository_1.repo.listActivities(eventId);
        const currentActivity = activities.find(a => a.status === 'running' || a.status === 'paused') || activities.find(a => a.status === 'waiting');
        this.io.emit('event:state', {
            event: { id: event?.id || eventId, name: event?.name || 'RecruitQuest', status: event?.status || 'running' },
            activity: currentActivity ? {
                id: currentActivity.id,
                type: currentActivity.type,
                seq: currentActivity.seq,
                status: currentActivity.status,
                title: currentActivity.config.title || currentActivity.type
            } : undefined
        });
    }
    async startActivity(activityId) {
        const activity = await repository_1.repo.getActivity(activityId);
        if (!activity)
            throw new Error('Activity not found');
        // Clear any existing timer & force fresh engine instance
        TimerService_1.timerService.clearTimer(activityId);
        await repository_1.repo.updateActivityStatus(activityId, 'running');
        const freshActivity = await repository_1.repo.getActivity(activityId);
        const engine = this.getEngine(freshActivity || activity, true);
        await engine.onStart();
        // Broadcast activity started notification & updated event state to all clients
        this.io.emit('activity:started', {
            activityId: activity.id,
            type: activity.type,
            title: activity.config.title || (activity.type === 'quiz' ? 'Quiz Challenge' : 'Market Simulation'),
            config: activity.config
        });
        await this.broadcastEventState(activity.eventId);
    }
    async pauseActivity(activityId) {
        const activity = await repository_1.repo.getActivity(activityId);
        if (!activity || activity.status !== 'running')
            return;
        await repository_1.repo.updateActivityStatus(activityId, 'paused');
        const engine = this.getEngine(activity);
        await engine.onPause();
        await this.broadcastEventState(activity.eventId);
    }
    async resumeActivity(activityId) {
        const activity = await repository_1.repo.getActivity(activityId);
        if (!activity || activity.status !== 'paused')
            return;
        await repository_1.repo.updateActivityStatus(activityId, 'running');
        const engine = this.getEngine(activity);
        await engine.onResume();
        await this.broadcastEventState(activity.eventId);
    }
    async endActivity(activityId) {
        const activity = await repository_1.repo.getActivity(activityId);
        if (!activity)
            return;
        await repository_1.repo.updateActivityStatus(activityId, 'completed');
        const engine = this.getEngine(activity);
        await engine.onEnd();
        this.io.emit('activity:ended', { activityId });
        await this.broadcastEventState(activity.eventId);
    }
    async advanceNextScenario(activityId) {
        const activity = await repository_1.repo.getActivity(activityId);
        if (!activity || activity.type !== 'market-simulation')
            return;
        const engine = this.getEngine(activity);
        const state = engine.getCurrentState();
        if (state.scenario) {
            await engine.closeRoundAndAdvance(state.currentRoundIndex);
        }
    }
    async resetRuntime(eventId) {
        const activities = await repository_1.repo.listActivities(eventId);
        for (const act of activities) {
            TimerService_1.timerService.clearTimer(act.id);
        }
        this.activeEngines.clear();
    }
}
exports.ActivityRuntime = ActivityRuntime;
