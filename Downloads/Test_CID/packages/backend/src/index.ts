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

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o: string) => o.trim());
app.use(cors({
  origin: allowedOrigins.includes('*')
    ? '*'
    : (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
      },
  credentials: !allowedOrigins.includes('*'),
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
const port = parseInt(process.env.PORT || '3001', 10);
createSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Cord server running on http://localhost:${port}`);
});
