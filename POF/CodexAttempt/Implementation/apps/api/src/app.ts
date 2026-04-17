import fs from 'node:fs/promises';

import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { mapsRouter } from './routes/maps.routes.js';
import { meetingsRouter } from './routes/meetings.routes.js';
import { usersRouter } from './routes/users.routes.js';

export async function createApp() {
  await fs.mkdir(config.uploadsDir, { recursive: true });

  const app = express();
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(config.uploadsDir));

  app.get('/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/maps', mapsRouter);
  app.use('/meetings', meetingsRouter);

  app.use(errorHandler);

  return app;
}

