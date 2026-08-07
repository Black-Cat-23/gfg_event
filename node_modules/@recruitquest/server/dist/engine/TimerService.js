"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerService = exports.TimerService = void 0;
class TimerService {
    timers = new Map();
    io;
    syncInterval;
    init(io) {
        this.io = io;
        if (!this.syncInterval) {
            this.syncInterval = setInterval(() => {
                this.broadcastSync();
            }, 10000);
        }
    }
    startTimer(activityId, durationSeconds, onExpire) {
        this.clearTimer(activityId);
        const now = Date.now();
        const durationMs = durationSeconds * 1000;
        const deadline = now + durationMs;
        const timeoutId = setTimeout(() => {
            this.clearTimer(activityId);
            onExpire(activityId);
        }, durationMs);
        const timer = {
            activityId,
            deadline,
            timeoutId
        };
        this.timers.set(activityId, timer);
        return deadline;
    }
    pauseTimer(activityId) {
        const timer = this.timers.get(activityId);
        if (!timer || timer.pausedAt)
            return null;
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
    resumeTimer(activityId, onExpire) {
        const timer = this.timers.get(activityId);
        if (!timer || !timer.pausedAt || timer.remainingMs === undefined)
            return null;
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
    clearTimer(activityId) {
        const timer = this.timers.get(activityId);
        if (timer) {
            if (timer.timeoutId) {
                clearTimeout(timer.timeoutId);
            }
            this.timers.delete(activityId);
        }
    }
    getTimer(activityId) {
        return this.timers.get(activityId);
    }
    getRemainingMs(activityId) {
        const timer = this.timers.get(activityId);
        if (!timer)
            return 0;
        if (timer.pausedAt && timer.remainingMs !== undefined) {
            return timer.remainingMs;
        }
        return Math.max(0, timer.deadline - Date.now());
    }
    broadcastSync() {
        if (!this.io)
            return;
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
exports.TimerService = TimerService;
exports.timerService = new TimerService();
