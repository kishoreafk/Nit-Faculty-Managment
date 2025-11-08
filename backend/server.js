const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  try {
    // Skip initDatabase for SQLite - database is already created
    console.log('🔄 Using SQLite database - bypassing MySQL initialization');

    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🌐 External access: http://0.0.0.0:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end();
  process.exit(0);
});
