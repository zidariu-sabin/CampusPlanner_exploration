# Campus Planner

Monorepo for the first interactive campus planner milestone.

## Apps

- `apps/api`: Express API with TypeORM and Postgres
- `apps/web`: Angular frontend
- `packages/contracts`: shared DTO and geometry helpers

## Local development

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Start Postgres with `docker compose -f infra/docker-compose.yml up -d`.
3. Run `npm install` in this directory.
4. Run `npm run dev`.

The API runs migrations automatically on startup and seeds the initial admin account from the environment.

