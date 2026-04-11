import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './db/migrations';
import apiRouter from './routes/index';
import { errorHandler } from './middleware/error';
import { createSocketServer } from './socket/index';
import { initBot } from './services/botService';
import { parseCorsOriginList, isDesktopOrOpaqueOrigin } from './config/corsOrigins';

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = parseCorsOriginList();
app.use(cors({
  origin: allowedOrigins === '*'
    ? '*'
    : (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => {
        if (isDesktopOrOpaqueOrigin(origin) || (!!origin && allowedOrigins.includes(origin))) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
      },
  credentials: allowedOrigins !== '*',
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './src/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Error handler (must be last)
app.use(errorHandler);

// Init DB + start server
runMigrations();
initBot();
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';
createSocketServer(httpServer);

httpServer.listen(port, host, () => {
  console.log(`Electra API listening on http://${host}:${port}`);
});

httpServer.on('error', (err) => {
  console.error('[http] server error', err);
  process.exit(1);
});
