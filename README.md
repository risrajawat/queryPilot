# QueryPilot

### An AI SQL agent that knows when it doesn't understand your question.

QueryPilot is a natural-language database assistant that lets users interact with structured data using plain English instead of writing SQL manually.

Instead of blindly converting every question into SQL, QueryPilot first understands the user's intent, detects ambiguity, asks clarification questions when necessary, generates a safe SQL query, validates it, executes it against the database, and explains the verified result in natural language.

> **Example:**  
> **User:** "Show me the best customers."
>
> QueryPilot doesn't guess what "best" means.
>
> **QueryPilot:** "How would you like to rank customers?"
> - Highest total revenue
> - Most orders
> - Most recent purchases
>
> After the user chooses a metric, QueryPilot generates and executes the appropriate query.

---

## Why QueryPilot?

Natural-language-to-SQL systems often have a fundamental problem:

**The user may ask something that has multiple valid interpretations.**

For example:

```text
Show me the best customers.
```

"Best" could mean:

- Highest revenue
- Most purchases
- Most recent activity
- Highest average order value

A system that immediately generates SQL has to guess.

QueryPilot takes a different approach:

```text
Natural Language
       ↓
Understand Intent
       ↓
Detect Ambiguity
       ↓
Ask Clarification
       ↓
Resolve Intent
       ↓
Generate SQL
       ↓
Validate SQL
       ↓
Execute Safely
       ↓
Verify Results
       ↓
Explain Results
```

This makes the system more predictable, auditable, and safer than directly executing generated SQL.

---

# Core Features

### 🧠 Natural-Language Querying

Users can ask questions about the database using normal language.

Examples:

```text
Show me the best customers.

Which customers generated the most revenue?

Show me customers with the most orders.

Which products are currently in inventory?

Show me recent orders.
```

---

### 💬 Clarification Engine

QueryPilot detects supported ambiguous requests instead of silently guessing.

For example:

```text
User:
Show me the best customers.

QueryPilot:
How would you like to rank customers?

1. Highest total revenue
2. Most orders
3. Most recent purchases
```

The selected option becomes part of the resolved conversation intent.

---

### 🔍 Database Schema Introspection

QueryPilot understands the database structure before generating SQL.

The system introspects:

- Tables
- Columns
- Data types
- Primary keys
- Foreign keys
- Relationships
- Nullability
- Defaults

This provides the SQL generation layer with a compact representation of the actual database schema.

---

### 🛡️ SQL Validation

QueryPilot never accepts arbitrary SQL directly from the browser.

Generated SQL passes through a validation layer that checks:

- SQL is a `SELECT`
- Only one statement is allowed
- No comments
- No mutation statements
- No dangerous SQL operations
- Tables exist
- Columns exist
- Identifiers are valid
- Parameters are safely bound

Operations such as:

```sql
DROP
DELETE
UPDATE
INSERT
ALTER
CREATE
ATTACH
DETACH
PRAGMA
VACUUM
```

are rejected.

---

### ⚡ Safe SQL Execution

Only server-generated and validated queries reach the database.

The browser sends:

```text
conversation ID
```

The server then:

```text
Load conversation
       ↓
Resolve intent
       ↓
Generate SQL
       ↓
Validate SQL
       ↓
Execute SQL
       ↓
Return verified results
```

The browser never directly executes SQL.

---

### 📊 Database Explorer

QueryPilot includes a read-only database explorer for inspecting the underlying demo dataset.

It provides:

- Available tables
- Row counts
- Table schemas
- Column information
- Sample records

The explorer is schema-backed and does not expose an arbitrary SQL execution interface.

---

### 💡 Natural-Language Result Explanation

After a query executes successfully, QueryPilot can explain the returned data in simple language.

For example:

```text
The top customer generated ₹24,850 in revenue
from 18 delivered orders.
```

The explanation is generated only from the verified query result.

If there are no matching records:

```text
No results found for this query.
```

The actual result data remains available even if explanation generation fails.

---

# System Architecture

```text
                    ┌───────────────────┐
                    │       User        │
                    │ Natural Language  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Conversation      │
                    │ State             │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Intent Analysis   │
                    └─────────┬─────────┘
                              │
                       Ambiguous?
                        /       \
                      Yes       No
                      │          │
                      ▼          │
              ┌─────────────┐    │
              │ Clarification│    │
              │   Engine     │    │
              └──────┬──────┘    │
                     │            │
                     └─────┬──────┘
                           ▼
                  ┌───────────────────┐
                  │ Resolved Intent   │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ SQL Generator     │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ SQL Validator     │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Database Executor │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Verified Results  │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Result Explainer  │
                  └─────────┬─────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │      User       │
                    │ Answer + Data   │
                    └─────────────────┘
```

---

# AI / Reasoning Architecture

QueryPilot separates the reasoning layer from the core database execution pipeline.

The application contains a provider abstraction:

```text
src/lib/ai/provider.js
```

The current production MVP uses a deterministic provider for supported query patterns.

This means the critical SQL path does not depend on an external LLM API at runtime.

The architecture is prepared for model-powered reasoning through:

```text
Gpt6AstraProvider
```

which is isolated behind the provider interface.

The current adapter does not assume undocumented API endpoints or credentials.

### Why this architecture?

It allows the project to keep the database execution path:

- Deterministic
- Testable
- Auditable
- Safe

while keeping the reasoning layer replaceable.

The project was developed using OmniRush and GPT-6 Astra, while the current deployed MVP keeps the critical SQL workflow deterministic.

---

# Example Query Flow

Consider:

```text
Show me the best customers.
```

### Step 1 — Intent Analysis

QueryPilot recognizes this as:

```text
Intent:
customer_ranking

Status:
ambiguous
```

### Step 2 — Clarification

The system asks:

```text
How would you like to rank customers?

• Highest total revenue
• Most orders
• Most recent purchases
```

### Step 3 — Intent Resolution

If the user chooses:

```text
Highest total revenue
```

the intent becomes:

```text
customer_ranking
metric: total_revenue
```

### Step 4 — SQL Generation

The SQL generator creates a schema-aware query.

### Step 5 — Validation

The generated query is checked by the SQL validator.

### Step 6 — Execution

The validated query is executed against the database.

### Step 7 — Result Verification

The server returns the actual database rows.

### Step 8 — Explanation

QueryPilot converts the verified result into a human-readable explanation.

---

# Database Architecture

QueryPilot supports separate database adapters for development and production.

```text
LOCAL DEVELOPMENT

QueryPilot
     │
     ▼
Database Adapter
     │
     ▼
better-sqlite3
     │
     ▼
Local SQLite Database
```

Production uses:

```text
VERCEL PRODUCTION

QueryPilot
     │
     ▼
Database Adapter
     │
     ▼
@libsql/client
     │
     ▼
Turso / libSQL
```

This keeps the application-level database interface consistent while allowing the production deployment to use persistent cloud storage.

---

# Demo Dataset

QueryPilot includes a fully synthetic commerce dataset designed for demonstrations and testing.

The database contains:

| Table | Records |
|---|---:|
| Customers | 60 |
| Categories | 9 |
| Products | 36 |
| Orders | 300 |
| Order Items | 900 |
| Payments | 300 |

The dataset contains:

- Repeat customers
- Customers with no orders
- Multiple countries
- Different order statuses
- Product categories
- Inventory information
- Realistic order relationships
- Consistent foreign keys

The dataset is completely synthetic and does not contain real customer information.

The demo data also contains intentionally distinguishable ranking patterns so that different clarification choices produce visibly different results.

---

# Security Model

Security is a core part of QueryPilot's architecture.

### Browser → Server

The browser does **not** send arbitrary SQL for execution.

Instead, it sends a conversation identifier.

### Server → SQL Generator

The server retrieves the stored conversation and resolved intent.

### SQL Generator → Validator

The generated SQL is validated before execution.

### Validator → Database

Only a valid, read-only query reaches the database.

```text
Browser
   │
   │ conversation ID
   ▼
Server
   │
   ▼
Intent
   │
   ▼
SQL Generator
   │
   ▼
SQL Validator
   │
   │ Valid SELECT only
   ▼
Database
```

This prevents the frontend from becoming an arbitrary SQL execution interface.

---

# Supported Query Types

The current MVP supports deterministic patterns including:

### Customer Ranking

```text
Customers by total revenue
Customers by order count
Customers by most recent purchase
```

### Customer Listing

```text
Show me all customers.
```

### Order Summaries

```text
Show me order summaries.
```

### Product / Inventory

```text
Show me product inventory.
```

Unsupported requests return a structured `unsupported_intent` response rather than guessing.

---

# Project Structure

```text
querypilot/
│
├── pages/
│   ├── index.js
│   └── api/
│       ├── conversations/
│       ├── explorer.js
│       └── schema.js
│
├── src/
│   └── lib/
│       │
│       ├── ai/
│       │   └── provider.js
│       │
│       ├── conversation/
│       │   ├── session-store.js
│       │   ├── engine.js
│       │   ├── intent-analysis.js
│       │   └── clarification-engine.js
│       │
│       ├── db/
│       │   ├── adapter.js
│       │   ├── index.js
│       │   ├── turso.js
│       │   ├── schema-introspection.js
│       │   ├── explorer.js
│       │   └── seed.js
│       │
│       ├── sql/
│       │   ├── generator.js
│       │   ├── validator.js
│       │   └── executor.js
│       │
│       └── results/
│           └── explainer.js
│
├── scripts/
│   ├── seed-db.js
│   └── seed-turso.js
│
├── tests/
│
├── styles/
│   └── globals.css
│
├── data/
│   └── querypilot.sqlite
│
├── .nvmrc
├── package.json
└── README.md
```

### Responsibility of each layer

| Layer | Responsibility |
|---|---|
| `conversation/` | Conversation state, intent detection and clarification |
| `ai/` | Provider abstraction and reasoning boundary |
| `db/` | Database connection, schema, introspection and data |
| `sql/` | SQL generation, validation and execution |
| `results/` | Verified result explanation |
| `pages/api/` | Server-side API endpoints |
| `tests/` | Automated testing |

The architecture follows separation of concerns so that each part of the system has a clear responsibility.

---

# Getting Started

## Requirements

- Node.js `20.11.1`
- npm

Node version is pinned using:

```text
.nvmrc
```

---

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd querypilot
```

Install dependencies:

```bash
npm ci
```

Create the environment file:

```bash
cp .env.example .env
```

Seed the local database:

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open the application in your browser.

---

# Local Database

The local SQLite database is controlled by:

```env
DB_PATH=data/querypilot.sqlite
```

If `DB_PATH` is not specified, QueryPilot uses:

```text
data/querypilot.sqlite
```

Seed the database with:

```bash
npm run db:seed
```

---

# Turso / libSQL Production Setup

Vercel serverless functions should not rely on a local SQLite file for persistent production data.

QueryPilot therefore supports Turso/libSQL for production.

Create a Turso database:

```bash
turso db create querypilot
```

Get the database URL:

```bash
turso db show --url querypilot
```

Create an authentication token:

```bash
turso db tokens create querypilot
```

Configure:

```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

Seed the Turso database:

```bash
npm run db:seed:turso
```

For Vercel, configure the same variables in the project's environment settings.

After deployment, verify:

```text
/api/health
/api/schema
/api/explorer
/api/explorer?table=customers
```

A healthy production database connection should report the Turso provider.

---

# API Overview

## Health

```http
GET /api/health
```

Checks application/database availability.

---

## Schema

```http
GET /api/schema
```

Returns the introspected database schema.

---

## Database Explorer

```http
GET /api/explorer
```

Returns available tables and metadata.

A specific table can be inspected with:

```http
GET /api/explorer?table=customers
```

The explorer is read-only and schema-backed.

---

## Create Conversation

```http
POST /api/conversations
```

Creates a new conversation.

---

## Send Message

```http
POST /api/conversations/<id>/messages
```

Processes the user's natural-language request and updates conversation state.

---

## SQL Preview

```http
POST /api/conversations/<id>/sql
```

Generates and validates SQL without executing it.

Useful for development and debugging.

---

## Execute Query

```http
POST /api/conversations/<id>/execute
```

The server:

1. Loads the conversation
2. Resolves the intent
3. Generates SQL
4. Validates SQL
5. Executes the query
6. Returns verified results

The browser cannot provide arbitrary SQL for execution.

---

## Explain Results

```http
POST /api/conversations/<id>/explain
```

Regenerates and verifies the query path, executes it, and produces a natural-language explanation from the verified result.

---

# Environment Variables

For local SQLite development:

```env
DB_PATH=data/querypilot.sqlite
```

For Turso production:

```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

The current deployed MVP does **not** require an external LLM API key for its deterministic runtime path.

---

# Testing

Run the complete test suite:

```bash
npm test
```

The tests use in-memory databases where appropriate and do not require an existing production database or network connection.

Build the production application:

```bash
npm run build
```

Both should pass before deployment.

---

# Design Principles

QueryPilot is built around a few important principles:

### 1. Don't Guess When Ambiguity Matters

If a question has multiple meaningful interpretations, ask the user.

### 2. Never Trust Browser SQL

SQL is generated and validated on the server.

### 3. Validate Before Execution

Every generated query passes through the SQL validator.

### 4. Use the Actual Schema

SQL generation is based on introspected database structure.

### 5. Explain Verified Data

Result explanations are based on actual database results rather than fabricated values.

### 6. Keep Critical Paths Deterministic

The current MVP prioritizes predictable and auditable behavior for database operations.

---

# Current Status

QueryPilot is a working MVP demonstrating an end-to-end natural-language database workflow:

```text
Natural Language
        ↓
Intent Analysis
        ↓
Clarification
        ↓
Resolved Intent
        ↓
SQL Generation
        ↓
SQL Validation
        ↓
Safe Execution
        ↓
Verified Results
        ↓
Natural-Language Explanation
```

The application supports local SQLite development and Turso/libSQL production deployment.

---

# Future Improvements

Potential future improvements include:

- Model-powered intent reasoning
- More complex natural-language queries
- Multi-table analytical queries
- Advanced filtering and aggregation
- Query history persistence
- Streaming responses
- Charts and visual analytics
- User authentication
- Persistent conversation storage
- More advanced agentic planning
- Support for additional database engines

These are intentionally separated from the current deterministic core so that the existing database execution path remains predictable and safe.

---

# Tech Stack

**Frontend**

- Next.js
- React
- JavaScript
- CSS

**Backend**

- Next.js API Routes
- Node.js

**Database**

- SQLite
- better-sqlite3
- Turso / libSQL
- @libsql/client

**Architecture**

- Intent analysis
- Clarification engine
- SQL generation
- SQL validation
- Safe query execution
- Result explanation
- Provider abstraction

**Deployment**

- Vercel
- Turso

---

# Project Philosophy

QueryPilot is not designed to be a system that simply does:

```text
Question → LLM → SQL → Database
```

Instead, the goal is:

```text
Question
   ↓
Understand
   ↓
Clarify
   ↓
Plan
   ↓
Generate
   ↓
Validate
   ↓
Execute
   ↓
Verify
   ↓
Explain
```

The central idea is simple:

> **When an AI system doesn't understand what the user means, it should ask instead of guessing.**

---
