# QueryPilot database foundation

Phase 1 provides a modular SQLite commerce database for the Next.js application. It includes schema migrations, deterministic seed data, a database access layer, and a health endpoint. AI, Text-to-SQL, clarification, and UI layers are intentionally outside this phase.

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

## Test

```sh
npm test
```

Tests use in-memory SQLite and do not require network access or a pre-existing database.

## Production / Docker

```sh
docker build -t querypilot .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" querypilot
```
