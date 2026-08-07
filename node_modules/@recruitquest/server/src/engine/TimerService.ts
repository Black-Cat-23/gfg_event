import { ServerToTeamEvents } from '@recruitquest/types';
import { Server } from 'socket.io';

export interface ActiveTimer {
  activityId: string;
  deadline: number; // epoch ms
  pausedAt?: number;
  remainingMs?: number;
  timeoutId?: NodeJS.Timeout;
}

export class TimerService {
  private timers: Map<string, ActiveTimer> = new Map();
  private io?: Server;
  private syncInterval?: NodeJS.Timeout;

  init(io: Server) {
    this.io = io;
    if (!this.syncInterval) {
      this.syncInterval = setInterval(() => {
        this.broadcastSync();
      }, 10000);
    }
  }

  startTimer(activityId: string, durationSeconds: number, onExpire: (activityId: string) => void): number {
    this.clearTimer(activityId);

    const now = Date.now();
    const durationMs = durationSeconds * 1000;
    const deadline = now + durationMs;

    const timeoutId = setTimeout(() => {
      this.clearTimer(activityId);
      onExpire(activityId);
    }, durationMs);

    const timer: ActiveTimer = {
      activityId,
      deadline,
      timeoutId
    };

    this.timers.set(activityId, timer);
    return deadline;
  }

  pauseTimer(activityId: string): { pausedAt: number; remainingMs: number } | null {
    const timer = this.timers.get(activityId);
    if (!timer || timer.pausedAt) return null;

    if (timer.timeoutId) {
      clearTimeout(timer.timeoutId);
      timer.timeoutId = undefined;
    }

    const now = Date.now();
    const remainingMs = Math.max(0, timer.deadline - now);
    timer.pausedAt = now;
    timer.remainingMs = remainingMs;

    return { pausedAt: now, remainingMs };
  }

  resumeTimer(activityId: string, onExpire: (activityId: string) => void): number | null {
    const timer = this.timers.get(activityId);
    if (!timer || !timer.pausedAt || timer.remainingMs === undefined) return null;

    const now = Date.now();
    const deadline = now + timer.remainingMs;
    timer.deadline = deadline;
    timer.pausedAt = undefined;

    const timeoutId = setTimeout(() => {
      this.clearTimer(activityId);
      onExpire(activityId);
    }, timer.remainingMs);

    timer.timeoutId = timeoutId;
    timer.remainingMs = undefined;

    return deadline;
  }

  clearTimer(activityId: string) {
    const timer = this.timers.get(activityId);
    if (timer) {
      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
      }
      this.timers.delete(activityId);
    }
  }

  getTimer(activityId: string): ActiveTimer | undefined {
    return this.timers.get(activityId);
  }

  getRemainingMs(activityId: string): number {
    const timer = this.timers.get(activityId);
    if (!timer) return 0;
    if (timer.pausedAt && timer.remainingMs !== undefined) {
      return timer.remainingMs;
    }
    return Math.max(0, timer.deadline - Date.now());
  }

  private broadcastSync() {
    if (!this.io) return;
    const nowISO = new Date().toISOString();

    for (const [activityId, timer] of this.timers.entries()) {
      if (!timer.pausedAt) {
        this.io.to(`event:${activityId}:team`).emit('timer:sync', {
          now: nowISO,
          deadline: new Date(timer.deadline).toISOString(),
          remainingMs: this.getRemainingMs(activityId)
        });
      }
    }
  }
}

export const timerService = new TimerService();
