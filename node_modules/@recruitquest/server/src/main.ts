import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { repo } from './db/repository';
import { timerService } from './engine/TimerService';
import { ActivityRuntime } from './engine/ActivityRuntime';
import { registerSocketHandlers } from './socket/events';
import defaultEventConfig from './config/templates/default-event.json';

const PORT = process.env.PORT || 3000;
const DEFAULT_EVENT_ID = 'default_event';

async function bootstrap() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const cfg = defaultEventConfig as any;

  // Always ensure default event is loaded with template config
  let event = await repo.getEvent(DEFAULT_EVENT_ID);
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
    await repo.createEvent(event);
  } else {
    // Sync event config with template
    await repo.updateEventConfig(DEFAULT_EVENT_ID, cfg);
  }

  // Always sync default activities from template
  if (cfg.activities && Array.isArray(cfg.activities)) {
    for (const act of cfg.activities) {
      const actId = `act_${DEFAULT_EVENT_ID}_${act.seq}`;
      const existing = await repo.getActivity(actId);
      if (existing) {
        await repo.createActivity({
          ...existing,
          type: act.type as any,
          config: act.config,
          seq: act.seq
        });
      } else {
        await repo.createActivity({
          id: actId,
          eventId: DEFAULT_EVENT_ID,
          type: act.type as any,
          config: act.config,
          seq: act.seq,
          status: 'waiting'
        });
      }
    }
  }

  // Initialize Timer Service
  timerService.init(io);

  // Initialize Activity Runtime Engine
  const runtime = new ActivityRuntime(io);

  // Register Socket Handlers
  registerSocketHandlers(io, runtime, DEFAULT_EVENT_ID);

  server.listen(PORT, () => {
    console.log(`[Server] RecruitQuest Engine running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal bootstrap error:', err);
  process.exit(1);
});
