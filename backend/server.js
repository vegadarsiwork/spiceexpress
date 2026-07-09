import 'dotenv/config';
import app from './app.js';
import { closePool, getPool, getSqlConfig } from './lib/sqlServer.js';

const PORT = process.env.PORT || 5000;
try {
  const config = getSqlConfig();
  await getPool();
  console.log(`SQL Server connected to ${config.database}`);
} catch (err) {
  console.error('DB connection error:', err);
  process.exit(1);
}

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    console.log('SQL Server disconnected. Process terminated.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
