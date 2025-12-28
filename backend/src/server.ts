import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, pool } from './config/database.js';
import routes from './routes/index.js';
import { initializeCronJobs } from './utils/cronJobs.js';
import { initializeStorage } from './utils/initStorage.js';
import { verifyTables } from './utils/verifyTables.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Add your Vercel URLs here. Keep localhost for testing.
const allowedOrigins = [
  'https://faculty-management-nbcvpe3rk-kishores-projects-9633ca02.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Important if you send cookies or authorization headers
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

console.log('✅ Routes registered');

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await testConnection();
    await verifyTables();
    initializeStorage();
    initializeCronJobs();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        pool.end();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      server.close(() => {
        pool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
