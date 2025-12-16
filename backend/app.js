import express from 'express';
import cors from 'cors';
import annexureRoutes from './routes/annexureRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import lrRoutes from './routes/lrRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import misRoutes from './routes/misRoutes.js';

const app = express();

// CORS configuration - allow all origins for flexibility
const corsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Handle preflight OPTIONS requests explicitly
// Express 5 requires named splat pattern for wildcards
app.options('/*splat', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

export default app;
