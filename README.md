# 🧠 Bitespeed Identity Reconciliation

A production-ready backend service that consolidates customer identity across multiple purchases using shared **email** and **phone number** data points.

Built for the [Bitespeed Backend Task](https://bitespeed.io/backend-task).

---

## 🎯 Problem Statement

Customers on FluxKart.com can place orders with different combinations of email addresses and phone numbers. Bitespeed needs to link these different contact entries together to build a unified customer profile.

This service exposes a single endpoint — `POST /identify` — that receives contact details and returns a **consolidated contact** response, linking all related entries together.

---

## 🛠 Tech Stack

| Layer         | Technology                     |
| ------------- | ------------------------------ |
| Runtime       | Node.js (v20+)                 |
| Language      | TypeScript                     |
| Framework     | Express.js                     |
| ORM           | Prisma                         |
| Database      | PostgreSQL                     |
| Testing       | Jest                           |
| Architecture  | Clean / Layered (MVC + Repo)   |

---

## 📁 Project Structure

```
src/
├── controllers/       # Route handlers (request/response)
│   └── identify.controller.ts
├── services/          # Core business logic
│   └── identity.service.ts
├── repositories/      # Database queries (Prisma)
│   └── contact.repository.ts
├── routes/            # Express route definitions
│   └── identify.route.ts
├── types/             # TypeScript interfaces
│   └── index.ts
├── utils/             # Prisma client singleton
│   └── db.ts
├── app.ts             # Express app setup
└── server.ts          # Server entry point

prisma/
└── schema.prisma      # Database schema

public/
└── index.html         # Frontend UI for testing

tests/
└── identity.spec.ts   # Unit tests (Jest)
```

---

## 🗄 Database Schema

```prisma
model Contact {
  id             Int       @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?        // References the primary contact
  linkPrecedence String      // "primary" or "secondary"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  @@index([email])
  @@index([phoneNumber])
}
```

**Rules:**
- `linkedId = null` → Contact is **primary**
- `linkedId = <id>` → Contact is **secondary**, linked to another primary
- The **oldest** contact (by `createdAt`) always remains primary during merges

---

## 📥 API Specification

### Endpoint

```
POST /identify
Content-Type: application/json
```

### Request Body

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

> At least one of `email` or `phoneNumber` must be provided.

### Response (HTTP 200)

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

**Response rules:**
- First email/phone in the array is always the **primary contact's** value
- Duplicates are removed
- Secondary IDs are sorted chronologically

---

## 🧠 Business Logic

The service handles **four cases**:

| # | Scenario | Action |
|---|----------|--------|
| 1 | **No existing contact** matches | Create a new **primary** contact |
| 2 | **Partial match** (email OR phone matches, but request has new info) | Create a new **secondary** contact linked to the primary |
| 3 | **Two separate primaries** match (one by email, one by phone) | **Merge**: older stays primary, newer becomes secondary |
| 4 | **Exact duplicate** (same email + phone already exists) | Return consolidated response, no new row created |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ installed
- **PostgreSQL** database (local or cloud — [Neon](https://neon.tech), [Supabase](https://supabase.com), [Render](https://render.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/bitespeed-identity.git
cd bitespeed-identity
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/bitespeed?schema=public"
PORT=3000
```

### 3. Push Database Schema

```bash
npx prisma db push
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start Development Server

```bash
npm run dev
```

The server starts at **http://localhost:3000**

### 6. Open the UI

Navigate to **http://localhost:3000** in your browser to use the built-in testing interface.

---

## 🧪 Running Tests

```bash
npm test
```

**Test coverage includes:**
- ✅ New contact creation (Case 1)
- ✅ Secondary contact creation (Case 2)
- ✅ Primary merge logic (Case 3)
- ✅ Exact duplicate handling (Case 4)

---

## 📡 Sample cURL Requests

**Create a new contact:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

**Link a secondary contact:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

**Query by email only:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu"}'
```

**Query by phone only:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "123456"}'
```

---

## 🏗 Deployment

### Deploy to Render / Railway

1. Push your code to a **GitHub repository**
2. Connect the repo to [Render](https://render.com) or [Railway](https://railway.app)
3. Set the following:

| Setting        | Value                                              |
| -------------- | -------------------------------------------------- |
| Build Command  | `npm install && npx prisma generate && npm run build` |
| Start Command  | `npm run start`                                    |
| Environment    | `DATABASE_URL` → your managed PostgreSQL URL       |

### Available Scripts

| Script          | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start dev server with hot-reload      |
| `npm run build` | Compile TypeScript to `dist/`         |
| `npm run start` | Run the compiled production server    |
| `npm test`      | Run Jest unit tests                   |

---

## ⚡ Performance & Optimizations

- **Indexed queries** on `email` and `phoneNumber` columns
- **Minimized DB calls** — cluster fetching in 2 queries max
- **No N+1 problem** — batch updates via `updateMany`
- **Set-based deduplication** for response construction

---

## 📄 License

MIT

---

> Built with ❤️ for Bitespeed
