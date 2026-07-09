import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { query } from './lib/sqlServer.js';
import annexureRoutes from './routes/annexureRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import lrRoutes from './routes/lrRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import misRoutes from './routes/misRoutes.js';

const app = express();

// Trust proxy for correct IP detection behind Render's reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Response compression
app.use(compression());

// CORS configuration - restrict to frontend domain
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Handle preflight OPTIONS requests explicitly
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'public', 'uploads')));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts, please try again later' }
});
app.use('/api/auth', authLimiter);

// Health check endpoint for Render
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1 AS ok');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'sqlserver-connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      details: error.message,
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Spice Express API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/customers', customerRoutes);
app.use('/api/lr', lrRoutes);
app.use('/api/annexure', annexureRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mis', misRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
