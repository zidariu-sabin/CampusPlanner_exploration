import { AppDataSource } from './data-source.js';
import { seedAdminUser } from './services/auth.service.js';
import { createApp } from './app.js';
import { config } from './config.js';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await seedAdminUser();

  const app = await createApp();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

