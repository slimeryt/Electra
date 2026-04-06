import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { runMigrations } from './db/migrations';
import apiRouter from './routes/index';
import { errorHandler } from './middleware/error';
import { createSocketServer } from './socket/index';

const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './src/uploads');
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
