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

// CORS configuration for production and development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL || 'https://spiceexpress.netlify.app',
          'https://spiceexpress-frontend.netlify.app',
          'https://main--spiceexpress.netlify.app',
          'https://spiceexpress.netlify.app',
          // Allow any Netlify subdomain for this project
          /https:\/\/.*--spiceexpress\.netlify\.app$/,
          /https:\/\/spiceexpress.*\.netlify\.app$/
        ]
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5174',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false, // Set to false for public API
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

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
