import express from 'express';
import { testConnection, pool } from './config/database.js';
import { validateEnvOnBoot } from './config/env.js';
import routes from './routes/index.js';
import { initializeCronJobs } from './utils/cronJobs.js';
import { initializeStorage } from './utils/initStorage.js';
import { verifyTables } from './utils/verifyTables.js';
import { loadEnv } from './config/loadEnv.js';
import { isProduction } from './config/env.js';
import { isPrivilegedActor, writeAdminLog } from './utils/adminLog.js';

loadEnv();

// Fail fast in production if critical env vars are missing.
validateEnvOnBoot();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

// Auto-audit: log all successful privileged mutations on authorized routes.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    try {
      const method = req.method.toUpperCase();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return originalJson(body);
      }

      const requiredRoles = (req as any).authz?.requiredRoles as string[] | undefined;
      if (!requiredRoles || requiredRoles.length === 0) {
        return originalJson(body);
      }

      const actor = (req as any).user as { id?: number; role?: string } | undefined;
      if (!actor?.id || !isPrivilegedActor(actor.role)) {
        return originalJson(body);
      }

      const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
      if (pathOnly.startsWith('/api/admin/logs')) {
        return originalJson(body);
      }

      // Skip if controller already logged (check response body for explicit logging flag)
      if (body && typeof body === 'object' && body._skipAutoLog) {
        delete body._skipAutoLog;
        return originalJson(body);
      }

      if (res.statusCode >= 200 && res.statusCode < 400) {
        void writeAdminLog({
          adminId: actor.id,
          actionType: `AUTO_${method}`,
          resourceType: 'route',
          resourceId: null,
          payload: {
            path: pathOnly,
            statusCode: res.statusCode,
            params: (req as any).params ?? {},
            query: (req as any).query ?? {},
            bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : []
          },
          ipAddress: (req as any).ip ?? null,
          userAgent: (req as any).get?.('user-agent') ?? null
        });
      }
    } catch {
      // Never fail the request because auditing failed.
    }

    return originalJson(body);
  };

  next();
});


app.use('/api', routes);

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
      if (!isProduction) {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📍 API available at http://localhost:${PORT}/api`);
      }
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
