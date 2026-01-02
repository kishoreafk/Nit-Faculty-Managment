import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isProduction } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeStorage = () => {
  const uploadDirs = [
    path.join(__dirname, '../../uploads/vaultify'),
    path.join(__dirname, '../../uploads/timetables'),
    path.join(__dirname, '../../uploads/temp')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      if (!isProduction) console.log(`✅ Created directory: ${dir}`);
    }
  });

  if (!isProduction) console.log('✅ Storage directories initialized');
};
