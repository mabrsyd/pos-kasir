# System Architecture

## Architecture
PWA + REST API + offline-first local database + synchronization.

```text
Next.js PWA
  ├─ Online → Express REST API → Prisma → MySQL
  └─ Offline → IndexedDB/Dexie → Sync Queue → API
```

## Stack
Frontend: Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, Dexie.js, IndexedDB, PWA.
Backend: Node.js, Express.js, TypeScript, Prisma.
Database: MySQL 8+.

## Rules
- No microservices for MVP.
- Backend is source of truth.
- Critical mutations are atomic.
- Sync is idempotent.
- Offline transactions persist locally.
- Server-side authorization is mandatory.
