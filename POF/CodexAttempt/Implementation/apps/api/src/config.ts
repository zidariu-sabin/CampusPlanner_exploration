import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: required('WEB_ORIGIN', 'http://localhost:4200'),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/campus_planner'),
  jwtSecret: required('JWT_SECRET', 'change-me'),
  jwtExpiresInHours: Number(process.env.JWT_EXPIRES_IN_HOURS ?? 8),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@campus.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME ?? 'Campus Admin',
  uploadsDir: path.resolve(__dirname, process.env.UPLOADS_DIR ?? '../../storage/uploads'),
};

