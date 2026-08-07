import { Activity, Event } from '@recruitquest/types';
import { QuizActivityEngine } from '../activities/quiz/QuizActivity';
import { MarketActivityEngine } from '../activities/market/MarketActivity';
import { repo } from '../db/repository';
import { Server } from 'socket.io';
import { timerService } from './TimerService';

export class ActivityRuntime {
  private activeEngines: Map<string, QuizActivityEngine | MarketActivityEngine> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  getEngine(activity: Activity, forceNew: boolean = false) {
    let engine = this.activeEngines.get(activity.id);
    if (!engine || forceNew) {
      if (activity.type === 'quiz') {
        engine = new QuizActivityEngine(activity, this.io);
      } else if (activity.type === 'market-simulation') {
        engine = new MarketActivityEngine(activity, this.io);
      } else {
        throw new Error(`Unsupported activity type: ${activity.type}`);
      }
      this.activeEngines.set(activity.id, engine);
    }
    return engine;
  }

  async broadcastEventState(eventId: string) {
    const event = await repo.getEvent(eventId);
    const activities = await repo.listActivities(eventId);
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

  async startActivity(activityId: string) {
    const activity = await repo.getActivity(activityId);
    if (!activity) throw new Error('Activity not found');

    // Clear any existing timer & force fresh engine instance
    timerService.clearTimer(activityId);
    await repo.updateActivityStatus(activityId, 'running');

    const freshActivity = await repo.getActivity(activityId);
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

  async pauseActivity(activityId: string) {
    const activity = await repo.getActivity(activityId);
    if (!activity || activity.status !== 'running') return;

    await repo.updateActivityStatus(activityId, 'paused');
    const engine = this.getEngine(activity);
    await engine.onPause();

    await this.broadcastEventState(activity.eventId);
  }

  async resumeActivity(activityId: string) {
    const activity = await repo.getActivity(activityId);
    if (!activity || activity.status !== 'paused') return;

    await repo.updateActivityStatus(activityId, 'running');
    const engine = this.getEngine(activity);
    await engine.onResume();

    await this.broadcastEventState(activity.eventId);
  }

  async endActivity(activityId: string) {
    const activity = await repo.getActivity(activityId);
    if (!activity) return;

    await repo.updateActivityStatus(activityId, 'completed');
    const engine = this.getEngine(activity);
    await engine.onEnd();

    this.io.emit('activity:ended', { activityId });
    await this.broadcastEventState(activity.eventId);
  }

  async advanceNextScenario(activityId: string) {
    const activity = await repo.getActivity(activityId);
    if (!activity || activity.type !== 'market-simulation') return;

    const engine = this.getEngine(activity) as MarketActivityEngine;
    const state = engine.getCurrentState();
    if (state.scenario) {
      await engine.closeRoundAndAdvance(state.currentRoundIndex);
    }
  }

  async resetRuntime(eventId: string) {
    const activities = await repo.listActivities(eventId);
    for (const act of activities) {
      timerService.clearTimer(act.id);
    }
    this.activeEngines.clear();
  }
}
