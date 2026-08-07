"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const repository_1 = require("./db/repository");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.app.post('/api/admin/login', async (req, res) => {
    try {
        const { passcode } = req.body || {};
        const ev = await repository_1.repo.getEvent('default_event');
        const correctPasscode = ev?.config?.passcode || 'MITULRISHI2026';
        if (passcode === correctPasscode) {
            return res.json({ success: true, token: `admin_token_${Date.now()}` });
        }
        else {
            return res.status(401).json({ success: false, error: 'Incorrect admin passcode' });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.app.get('/api/event/:id', async (req, res) => {
    try {
        const event = await repository_1.repo.getEvent(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.app.get('/api/event/:id/config', async (req, res) => {
    try {
        const event = await repository_1.repo.getEvent(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event.config);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Serve compiled web SPA from apps/web/dist if available
const webDistPath = path_1.default.resolve(__dirname, '../../web/dist');
if (fs_1.default.existsSync(webDistPath)) {
    exports.app.use(express_1.default.static(webDistPath));
    exports.app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path_1.default.join(webDistPath, 'index.html'));
    });
}
