import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

let loaded = false;

export const loadEnv = () => {
  if (loaded) return;
  loaded = true;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // backend/src/config -> repo root .env
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: rootEnvPath });
};
