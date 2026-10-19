# QueryPilot

Phase 1 is the foundation for QueryPilot, an agentic Text-to-SQL application. It includes a modular SQLite commerce database, deterministic seed data, a database access layer, a health endpoint, and a responsive chat UI shell. AI, Text-to-SQL, and clarification behavior will be added in later phases.

## Setup

Requirements: Node.js 20.11.1 (see `.nvmrc`) and npm.

```sh
cp .env.example .env
npm ci
npm run db:seed
```

`DB_PATH` controls the SQLite file and defaults to `data/querypilot.sqlite`.

## Run

```sh
npm run dev
```

The health endpoint is available at `http://localhost:3000/api/health`.

The initial UI is available at `http://localhost:3000`. It intentionally shows a disabled chat placeholder until the agent workflow is implemented.

## Test

```sh
npm test
```

Tests use in-memory SQLite and do not require network access or a pre-existing database.

## Project structure

```text
pages/              Next.js pages and API routes
src/lib/db/         SQLite schema, seed data, and database access layer
scripts/             Local database commands
tests/               Vitest database tests
styles/              Global styles for the UI shell
```

## Production / Docker

```sh
docker build -t querypilot .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" querypilot
```
