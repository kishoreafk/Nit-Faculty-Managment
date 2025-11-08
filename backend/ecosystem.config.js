module.exports = {
  apps: [{
    name: 'faculty-backend',
    script: 'server.js',
    cwd: 'f:\\Nit Project\\faculty-login\\backend',
    env: {
      NODE_ENV: 'development'
    },
    watch: true,
    ignore_watch: ['node_modules', 'uploads'],
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};