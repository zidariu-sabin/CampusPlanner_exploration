# Campus Planner

Monorepo for the first interactive campus planner milestone.

For a fuller description of the application layers, database schema, map/room polygon model, and coordinate system, see [docs/project-description.md](docs/project-description.md).

## Apps

- `apps/api`: Express API with TypeORM and Postgres
- `apps/web`: Angular frontend
- `packages/contracts`: shared DTO and geometry helpers

## Local development

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. ensure `docker context use default`
3. Start Postgres with `docker compose -f infra/docker-compose.yml up -d`.
4. Run `npm install` in this directory.
5. Run `npm run dev`.

The API runs migrations automatically on startup and seeds the initial admin account from the environment.

## Debugging
 Entering the psql console of the docker container `docker exec -it campus-planner-postgres psql -U postgres -d campus_planner`