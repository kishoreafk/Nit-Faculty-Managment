const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

// Test database connection before starting server
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end();
  process.exit(0);
}); 