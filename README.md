# QueryPilot

Phase 7A adds a deterministic synthetic commerce dataset and a read-only Database Explorer for the jury demo. QueryPilot tracks conversation state, analyzes intents, asks deterministic clarifying questions, produces validated SQLite `SELECT` queries, executes only resolved generated queries, and explains only the returned columns and rows. SQL is never accepted from the browser.

## Setup

Requirements: Node.js 20.11.1 (see `.nvmrc`) and npm.

```sh
cp .env.example .env
npm ci
npm run db:seed
```

`DB_PATH` controls the SQLite file and defaults to `data/querypilot.sqlite`.

The seed is deterministic and creates 60 fictional customers, 9 categories, 36 products, 300 orders, 900 order items, and 300 payments. A fresh database therefore produces the same rows every time. Customer 1 is deliberately a high-value customer, customer 2 has the most delivered orders, and customer 3 has the most recent purchase so the clarification choices produce visibly different rankings.

## Run

```sh
npm run dev
```

The health endpoint is available at `http://localhost:3000/api/health`.

The development schema endpoint is available at `http://localhost:3000/api/schema`. It returns full SQLite metadata and a compact schema representation without selecting application rows.

The read-only Database Explorer is available in the sidebar or at `http://localhost:3000` through the `Database Explorer` entry. It uses `GET /api/explorer` and `GET /api/explorer?table=customers` to display known table names, row counts, schema-backed columns, and at most 50 rows. It constructs all SQL on the server from the introspected schema; it does not accept arbitrary SQL and has no write operations.

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

### SQL execution API

After an intent is resolved, execute its generated query with:

```sh
curl -X POST http://localhost:3000/api/conversations/<id>/execute
```

The endpoint accepts only the conversation id. It rejects missing, pending, or unresolved sessions, generates and validates SQL server-side, and then runs it against the seeded SQLite database. The executor repeats the Phase 4 validator as its mandatory final security gate, accepts only safe bound parameters, returns JSON-safe `columns`, `rows`, and `rowCount`, and caps results at 100 rows. Database failures return a generic error without paths or stack traces.

Example successful response:

```json
{
  "success": true,
  "intent": { "name": "customer_ranking", "metric": "total_revenue" },
  "columns": ["customer_id", "first_name", "last_name", "total_revenue"],
  "rows": [{ "customer_id": 1, "first_name": "Maya", "last_name": "Chen", "total_revenue": 28337 }],
  "rowCount": 1
}
```

Supported intents are customer ranking by delivered-order revenue, order count, or latest purchase; customer listing; order summaries; and product inventory. Generation is deterministic for the offline MVP, schema-bound, and returns a structured `unsupported_intent` result when required identifiers are absent. User-supplied filter values are represented as `?` parameters rather than interpolated into SQL. Validation allows only one `SELECT`, rejects comments and write/admin/transaction statements, and checks referenced tables, aliases, and columns against the compact schema.

Execution returns `{ columns, rows, rowCount }` with JSON-safe values and caps returned rows at 100. A valid query with no rows returns `success: true` and `rowCount: 0`; the UI displays `No results found.`. Validation failures return `reason: sql_validation_failed`, while database failures return the generic `reason: execution_error` without paths or stack traces. The execution layer repeats the Phase 4 validator as its mandatory security gate, and only server-generated, validated `SELECT` statements can execute.

### Verified result explanation API

After execution, the UI calls:

```sh
curl -X POST http://localhost:3000/api/conversations/<id>/explain
```

The browser sends only the conversation ID. The server regenerates, validates, and executes the query through the existing Phase 5 path, then passes only the verified question, intent, columns, rows, and row count to `src/lib/results/explainer.js`. At most 20 verified rows are provided to the explanation provider; the actual result table remains unchanged. Empty results use `No results found for this query.`. If explanation fails, execution remains successful and the UI keeps the real results while showing that the explanation is unavailable.

The initial UI is available at `http://localhost:3000`. The existing QueryPilot design can send questions, display conversation messages and clarification choices, show generated/validated/executed/explained status, render a concise verified explanation above each dynamic result table, and keep SQL details secondary. It does not execute SQL in the browser or display fabricated results.

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
src/lib/sql/         SQL generation, validation, and read-only execution
src/lib/results/     Verified-result explanation with deterministic fallback
src/lib/db/explorer.js Read-only schema-backed table previews
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
