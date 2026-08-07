"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const repository_1 = require("./db/repository");
const TimerService_1 = require("./engine/TimerService");
const ActivityRuntime_1 = require("./engine/ActivityRuntime");
const events_1 = require("./socket/events");
const default_event_json_1 = __importDefault(require("./config/templates/default-event.json"));
const PORT = process.env.PORT || 3000;
const DEFAULT_EVENT_ID = 'default_event';
async function bootstrap() {
    const server = http_1.default.createServer(app_1.app);
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    const cfg = default_event_json_1.default;
    // Always ensure default event is loaded with template config
    let event = await repository_1.repo.getEvent(DEFAULT_EVENT_ID);
    if (!event) {
        console.log('[Server] Initializing default event from template...');
        event = {
            id: DEFAULT_EVENT_ID,
            name: cfg.copy?.eventName || 'Kickstart 2.0',
            config: cfg,
            passcodeHash: cfg.passcode || 'MITULRISHI2026',
            status: 'waiting',
            createdAt: new Date().toISOString()
        };
        await repository_1.repo.createEvent(event);
    }
    else {
        // Sync event config with template
        await repository_1.repo.updateEventConfig(DEFAULT_EVENT_ID, cfg);
    }
    // Always sync default activities from template
    if (cfg.activities && Array.isArray(cfg.activities)) {
        for (const act of cfg.activities) {
            const actId = `act_${DEFAULT_EVENT_ID}_${act.seq}`;
            const existing = await repository_1.repo.getActivity(actId);
            if (existing) {
                await repository_1.repo.createActivity({
                    ...existing,
                    type: act.type,
                    config: act.config,
                    seq: act.seq
                });
            }
            else {
                await repository_1.repo.createActivity({
                    id: actId,
                    eventId: DEFAULT_EVENT_ID,
                    type: act.type,
                    config: act.config,
                    seq: act.seq,
                    status: 'waiting'
                });
            }
        }
    }
    // Initialize Timer Service
    TimerService_1.timerService.init(io);
    // Initialize Activity Runtime Engine
    const runtime = new ActivityRuntime_1.ActivityRuntime(io);
    // Register Socket Handlers
    (0, events_1.registerSocketHandlers)(io, runtime, DEFAULT_EVENT_ID);
    server.listen(PORT, () => {
        console.log(`[Server] RecruitQuest Engine running on http://localhost:${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
});
