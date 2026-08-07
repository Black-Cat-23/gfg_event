import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { repo } from './db/repository';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { passcode } = req.body || {};
    const ev = await repo.getEvent('default_event');
    const correctPasscode = ev?.config?.passcode || 'MITULRISHI2026';
    if (passcode === correctPasscode) {
      return res.json({ success: true, token: `admin_token_${Date.now()}` });
    } else {
      return res.status(401).json({ success: false, error: 'Incorrect admin passcode' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/event/:id', async (req: Request, res: Response) => {
  try {
    const event = await repo.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/event/:id/config', async (req: Request, res: Response) => {
  try {
    const event = await repo.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event.config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve compiled web SPA from apps/web/dist if available
const webDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}
