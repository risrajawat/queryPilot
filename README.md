# QueryPilot

Phase 3 adds a modular backend conversation layer on top of the Phase 2 schema introspection. It tracks conversation state, analyzes intents, asks deterministic clarifying questions, and resolves follow-ups. SQL generation and execution remain out of scope.

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

The development schema endpoint is available at `http://localhost:3000/api/schema`. It returns full SQLite metadata and a compact schema representation without selecting application rows.

### Conversation API

Start an in-memory conversation (the response includes the compact, row-free schema):

```sh
curl -X POST http://localhost:3000/api/conversations
```

Send a message using the returned `conversation.id`:

```sh
curl -X POST http://localhost:3000/api/conversations/<id>/messages \
  -H 'content-type: application/json' \
  -d '{"message":"Who are our best customers?"}'
```

The backend returns `intent`, `clarification`, `resolvedContext`, and the persisted conversation. “Best customers” deterministically asks whether to rank by highest total revenue, most orders, or most recent purchases. A follow-up such as “Highest revenue.” resolves to the `total_revenue` metric. Conversation storage is process-local and intended for this phase; no SQL is generated or executed.

The provider boundary is `src/lib/ai/provider.js`. `DeterministicProvider` is the offline fallback. `Gpt6AstraProvider` is an intentionally isolated future adapter; it does not make network calls or assume API behavior. Any future API key must remain server-side (for example, `GPT6_ASTRA_API_KEY` in the runtime environment).

The initial UI is available at `http://localhost:3000`. The Phase 3 chat shell can send questions, display conversation messages, and present clarification choices; it does not display SQL or query results yet.

## Test

```sh
npm test
```

Tests use in-memory SQLite and do not require network access or a pre-existing database.

## Project structure

```text
pages/              Next.js pages and API routes
src/lib/db/         SQLite schema, seed data, database access, and introspection
src/lib/conversation/ Session state, intent analysis, clarification, and message engine
src/lib/ai/         Server-side provider abstraction and deterministic fallback
scripts/             Local database commands
tests/               Vitest database tests
styles/              Global styles for the UI shell
```

## Production / Docker

```sh
docker build -t querypilot .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" querypilot
```
