# QueryPilot

Phase 4 adds a schema-aware, read-only SQL generation and validation layer on top of the Phase 3 conversation backend. It tracks conversation state, analyzes intents, asks deterministic clarifying questions, resolves follow-ups, and produces validated SQLite `SELECT` previews. SQL is never executed by the generator endpoint.

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

### SQL preview API

After an intent is resolved, generate and validate a read-only query with:

```sh
curl -X POST http://localhost:3000/api/conversations/<id>/sql
```

The endpoint uses the session's compact schema, current intent, resolved context, and messages. It rejects pending clarifications, unknown schema identifiers, comments, multiple statements, and all non-`SELECT` or mutating SQL. The response contains `sql`, parameter values, an explanation, and validator status; it does not run the query.

Supported Phase 4 intents are customer ranking by delivered-order revenue, order count, or latest purchase; customer listing; order summaries; and product inventory. Generation is deterministic for the offline MVP, schema-bound, and returns a structured `unsupported_intent` result when required identifiers are absent. User-supplied filter values are represented as `?` parameters rather than interpolated into SQL. Validation allows only one `SELECT`, rejects comments and write/admin/transaction statements, and checks referenced tables, aliases, and columns against the compact schema. The UI's development preview is explicitly marked `Preview only · SQL is not executed`; result rendering is not implemented yet.

The initial UI is available at `http://localhost:3000`. The existing QueryPilot design can send questions, display conversation messages and clarification choices, and show a small validated SQL preview after a clear intent. It does not execute SQL or display query results.

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
