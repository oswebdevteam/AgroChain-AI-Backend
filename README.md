# 🌾 AgroChain AI — Backend API

**Financial infrastructure layer for agricultural trade in Nigeria and emerging markets.**

Every agricultural trade becomes verified, trackable, transparent, and credit-worthy financial data.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Phase Overview](#phase-overview)

---

## 🏗️ Architecture

Modular layered monolith designed for future microservice decomposition:

```
Controllers (thin: routing + validation)
    ↓
Services (business logic, orchestration)
    ↓
Repositories (Supabase data access layer)
    ↓
Supabase (PostgreSQL + Auth + RLS)
```

External integrations:
- **Interswitch** — Payment gateway (card payments, payouts)
- **Base Sepolia** — Blockchain trust layer (ethers.js v6)
- **Google Gemini** — AI financial identity scoring (Gemini 2.5 Flash)

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT + httpOnly cookies |
| Payments | Interswitch API v3 |
| Blockchain | ethers.js v6 / Base Sepolia |
| AI | Google Gemini 2.5 Flash |
| Validation | Zod |
| Logging | Pino (structured JSON) |
| Testing | Jest + Supertest + ts-jest |
| Docs | Swagger / OpenAPI 3.0 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Supabase account** — [supabase.com](https://supabase.com)
- **Interswitch sandbox account** — [sandbox.interswitchng.com](https://sandbox.interswitchng.com)
- **Google AI API key** — [aistudio.google.com](https://aistudio.google.com)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd agrochain-ai-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your environment variables (see below)
```

---

## 🗄️ Database Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL**, **Anon Key**, **Service Role Key**, and **JWT Secret**
3. Find these in: Settings → API

### 2. Run Migrations

Execute the SQL migration files in order via the **Supabase SQL Editor** (Dashboard → SQL Editor):

```
database/migrations/001_create_profiles.sql
database/migrations/002_create_farmer_profiles.sql
database/migrations/003_create_produce_orders.sql
database/migrations/004_create_escrows.sql
database/migrations/005_create_transaction_records.sql
database/migrations/006_create_financial_identities.sql
database/migrations/007_create_blockchain_logs.sql
database/migrations/008_create_rls_policies.sql
database/migrations/009_create_db_functions.sql
```

**Important:** Run them in numerical order. Each migration is idempotent (uses `IF NOT EXISTS`).

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in all values:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (public, RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only, bypasses RLS) |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification |
| `INTERSWITCH_CLIENT_ID` | Interswitch sandbox client ID |
| `INTERSWITCH_CLIENT_SECRET` | Interswitch sandbox secret |
| `INTERSWITCH_MERCHANT_CODE` | Your merchant code |
| `INTERSWITCH_WEBHOOK_SECRET` | Webhook signature verification key |
| `BLOCKCHAIN_PRIVATE_KEY` | Base Sepolia testnet wallet private key (**NEVER** use mainnet) |
| `TRADE_LOGGER_CONTRACT_ADDRESS` | Deployed contract address on Base Sepolia |
| `GEMINI_API_KEY` | Google AI API key for credit scoring |
| `GEMINI_MODEL` | Gemini model (default: `gemini-2.5-flash`) |
| `FX_API_KEY` | Exchange rate API key |

> ⚠️ **Never commit `.env` to version control.** Use the `.env.example` as reference.

### Interswitch Test Credentials

Register at [sandbox.interswitchng.com](https://sandbox.interswitchng.com) to get sandbox credentials. The sandbox simulates the full payment flow without real money.

### Base Sepolia

- RPC: `https://sepolia.base.org` (rate-limited; use a provider like Alchemy/Infura for production)
- Chain ID: `84532`
- Block Explorer: [sepolia.basescan.org](https://sepolia.basescan.org)
- Get test ETH from the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

---

## 💻 Running Locally

```bash
# Development mode (with auto-reload)
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

The server starts at `http://localhost:3000` by default.

- **API Base:** `http://localhost:3000/api/v1/`
- **Swagger Docs:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/health`

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:ci

# Run with watch mode
npm run test:watch

# Type check only (no emit)
npm run lint
```

Tests use mocked Supabase, Interswitch, blockchain, and Gemini clients. No real API calls are made during testing.

---

## 📖 API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register (buyer/seller/admin) |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/orders` | Create produce order |
| GET | `/api/v1/orders` | List orders (paginated) |
| POST | `/api/v1/payments/initiate` | Initiate Interswitch payment |
| POST | `/api/v1/webhooks/interswitch` | Payment webhook handler |
| POST | `/api/v1/orders/:id/confirm-delivery` | Confirm delivery |
| GET | `/api/v1/escrow/:orderId` | Get escrow status |
| POST | `/api/v1/escrow/:orderId/release` | Release escrow (admin) |
| GET | `/api/v1/blockchain/orders/:id/blockchain-proof` | Get on-chain proof |
| GET | `/api/v1/users/:id/financial-identity` | Get AI credit score |
| GET | `/api/v1/analytics/trade-corridors` | Trade corridor analysis |
| GET | `/api/v1/analytics/fx-rate` | FX rate lookup |

---

## 📁 Project Structure

```
agrochain-ai-backend/
├── src/
│   ├── config/          # Environment, Supabase client, logger, Swagger
│   ├── common/
│   │   ├── errors/      # AppError class
│   │   ├── middleware/   # Auth, error handler, validation, rate limiting
│   │   ├── types/       # TypeScript interfaces, enums, DB types
│   │   └── utils/       # Response helper, pagination, crypto
│   ├── modules/
│   │   ├── auth/        # Registration, login, OTP, profiles
│   │   ├── orders/      # Order lifecycle management
│   │   ├── payments/    # Interswitch integration + webhooks
│   │   ├── escrow/      # Escrow hold/release/refund
│   │   ├── blockchain/  # Base Sepolia recording + proof
│   │   ├── ai/          # Google Gemini credit scoring engine
│   │   └── analytics/   # Trade corridors, FX, settlement metrics
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── database/
│   └── migrations/      # SQL migration scripts (001-009)
├── tests/
│   ├── setup.ts         # Jest global setup
│   ├── helpers/         # Mock factories
│   ├── unit/            # Service + middleware unit tests
│   ├── integration/     # Controller HTTP tests
│   └── e2e/             # Full trade lifecycle test
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .env.example
└── README.md
```

---

## 🔄 Phase Overview

### Phase 1 — Secure Trade & Escrow Infrastructure ✅
Core order lifecycle, Interswitch payments, webhook handling, escrow hold/release.

### Phase 2 — Blockchain Trust Layer ✅
Immutable trade recording on Base Sepolia, BaseScan verification links.

### Phase 3 — AI Financial Identity Engine ✅
Gemini-powered credit scoring, risk indicators, financing eligibility.

### Phase 4 — Cross-Border Intelligence ✅
FX rate integration, trade corridor analytics, settlement metrics.

---

## 🔒 Security

- **Supabase RLS** enforces data ownership at the database level
- **JWT authentication** via Supabase Auth
- **httpOnly cookies** for refresh tokens
- **HMAC-SHA512** webhook signature verification
- **Zod validation** on all inputs
- **Helmet** with strict CSP headers
- **CORS** restricted to configured origins
- **Rate limiting** (global + per-endpoint)
- **Pino** with sensitive field redaction

---

## 📄 License

MIT
