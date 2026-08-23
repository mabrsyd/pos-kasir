# AGENTS.md

# POS Toko Retail + Pom Mini

## 1. Project Context

This repository contains a POS (Point of Sale) application for a small/medium-sized family retail store in Indonesia.

The store operates similarly to a traditional Indonesian retail shop/toko Madura and also has a small fuel station (pom mini).

The application must be:

- Simple enough for non-technical users, including older users.
- Fast for daily cashier operations.
- Usable on desktop, laptop, tablet, and smartphone.
- Installable as a PWA.
- Able to operate when internet connectivity is unavailable.
- Able to synchronize data when connectivity returns.
- Able to support both barcode scanning and manual product selection.
- Able to monitor sales, stock, cash, expenses, purchases, profit, and fuel sales.

The goal is a real operational application, not a CRUD demo.

## 2. Source of Truth

Before implementing or changing functionality, read the relevant documentation in `/docs`.

Documentation:

```text
docs/
├── README.md
├── 01-PRD.md
├── 02-System-Architecture.md
├── 03-ERD.md
├── 04-Database-Design.md
├── 05-Business-Rules.md
├── 06-User-Flow-IA.md
├── 07-Screen-Specification.md
├── 08-API-Specification.md
├── 09-Development-Backlog.md
└── 10-Testing-Strategy.md
```

Read the documentation in this order when starting a new major task:

1. PRD
2. System Architecture
3. ERD
4. Database Design
5. Business Rules
6. User Flow / IA
7. Screen Specification
8. API Specification
9. Development Backlog
10. Testing Strategy

Do not implement features based on assumptions when the answer already exists in the documentation.

If a requirement is ambiguous, use the simplest safe implementation consistent with the existing architecture.

Do not ask the user to interview the store owner.

## 3. Requirement Priority

When requirements conflict, use this priority:

```text
Business Rules
        ↓
System Architecture
        ↓
Database Design / ERD
        ↓
API Specification
        ↓
Screen Specification
        ↓
Development Backlog
```

Data integrity and business correctness have higher priority than UI convenience.

Do not change architectural decisions without a strong technical reason.

## 4. Technology Stack

Use the following stack unless explicitly instructed otherwise.

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- Dexie.js
- IndexedDB
- PWA

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM

### Database

- MySQL 8+

### Architecture

```text
Next.js PWA
      │
      ├── Online → REST API
      │
      └── Offline → IndexedDB
                         │
                    Sync Queue
                         │
                         ▼
                     REST API
                         │
                       Prisma
                         │
                        MySQL
```

Do not introduce microservices, Kafka, Redis, Kubernetes, GraphQL, or complex cloud architecture unless explicitly required.

Keep the architecture simple.

## 5. Core Architecture Rules

### Backend is the source of truth

The frontend must not be trusted for authoritative:

- stock;
- payment totals;
- profit;
- permissions;
- transaction status;
- financial calculations.

The server must validate and calculate authoritative values.

### Database transactions

Operations that affect multiple related records must be atomic.

Examples:

```text
Sale
→ Sale Items
→ Payment
→ Stock Movement
→ Cash Transaction
```

```text
Purchase
→ Purchase Items
→ Stock Movement
→ Cash/Debt
```

```text
Return
→ Return Items
→ Stock Movement
→ Refund
```

```text
Void
→ Sale Status
→ Stock Reversal
→ Cash Reversal
→ Audit Log
```

Do not allow partially completed financial or stock operations.

## 6. POS Rules

The POS must support two input modes.

### Barcode Mode

Barcode scanners can be used when available.

### Manual Mode

Cashier must also be able to:

- search product by name;
- search by SKU;
- filter by category;
- select quick products;
- manually add an item when appropriate.

Barcode scanning is optional.

Never make the POS dependent on barcode hardware.

## 7. Product Rules

Products must support:

- SKU;
- optional barcode;
- category;
- unit;
- purchase price;
- selling price;
- minimum stock;
- active/inactive status;
- product type.

Product types:

```text
RETAIL
FUEL
OTHER
```

Do not hard-delete products that have historical transactions.

Prefer deactivation.

Price changes must preserve historical transaction prices.

## 8. Stock Rules

Stock integrity is critical.

Every stock change must produce a stock movement.

Examples:

```text
OPENING
PURCHASE
SALE
RETURN
DAMAGE
LOSS
ADJUSTMENT
VOID_REVERSAL
```

Conceptually:

```text
Current Stock =
Opening
+ Stock In
- Stock Out
+/- Adjustments
```

Normal sales must not create negative stock.

Stock adjustment must require:

- product;
- physical quantity;
- reason;
- user.

Never blindly trust client-provided stock values.

## 9. Sale Rules

A completed sale must correctly create:

- sale;
- sale items;
- payment;
- stock movement;
- cash transaction if payment is cash.

The sale must have a unique transaction/invoice identifier.

Sale item must preserve historical:

- product name;
- selling price;
- cost snapshot;
- quantity.

Changing a product price later must not change old transactions.

## 10. Payment Rules

Cash:

```text
change = amount_received - total
```

If payment is insufficient:

```text
Do not complete transaction.
```

Digital payment:

- record payment method;
- record amount;
- optionally record reference;
- do not increase physical cash.

Double-click checkout must never create duplicate transactions.

## 11. Idempotency

Any operation that can be retried must be idempotent.

Especially:

- offline sale sync;
- checkout retry;
- purchase sync;
- return sync.

Use stable client-generated IDs / idempotency keys.

Example:

```text
client_transaction_id
```

Retrying the same transaction must result in exactly one server-side transaction.

## 12. Offline-First Rules

Offline operation is a core requirement.

Use:

```text
Dexie.js
+
IndexedDB
+
Sync Queue
```

Offline POS must continue to support:

- product search;
- cart;
- payment;
- transaction creation;
- local stock updates;
- receipt generation where possible.

Offline transactions must survive:

- browser refresh;
- application restart;
- temporary network loss.

Sync states:

```text
PENDING
↓
SYNCING
↓
SYNCED
```

Failure:

```text
FAILED
```

Conflict:

```text
CONFLICT
```

Never silently delete failed operations.

## 13. Synchronization Rules

When internet returns:

```text
Local Queue
    ↓
Push
    ↓
Server Validation
    ↓
Database Transaction
    ↓
Sync Confirmation
    ↓
Local Record = SYNCED
```

The sync system must:

- retry safely;
- prevent duplicates;
- detect conflicts;
- preserve failed operations;
- provide understandable sync status.

Never assume HTTP 200 alone means everything is permanently synchronized.

## 14. Return Rules

Return must reference the original sale.

A customer cannot return more quantity than was originally sold minus previous returns.

Conditions:

```text
GOOD
DAMAGED
LOST
```

GOOD returns to sellable stock.

DAMAGED does not automatically enter sellable stock.

## 15. Void Rules

Void is not deletion.

A void must:

- change transaction status;
- reverse stock effects;
- reverse cash effects where applicable;
- require a reason;
- create an audit log.

Historical transaction data must remain traceable.

## 16. Cash Rules

Cash session:

```text
Open Cash
↓
Transactions
↓
Cash In/Out
↓
Close Cash
```

Expected cash:

```text
Opening Balance
+ Cash In
- Cash Out
```

Difference:

```text
Actual Cash - Expected Cash
```

Never silently overwrite cash differences.

## 17. Finance Rules

Track:

- revenue;
- COGS;
- gross profit;
- operating expenses;
- estimated net profit;
- cash flow;
- supplier debt.

Definitions:

```text
Revenue
= value of completed sales

Gross Profit
= Revenue - COGS

Estimated Net Profit
= Gross Profit - Operating Expenses

Cash Flow
= actual movement of cash
```

Never label revenue as profit.

## 18. Supplier Rules

Purchase flow:

```text
Supplier
↓
Purchase
↓
Receive Items
↓
Stock In
↓
Payment / Debt
```

Partial payment:

```text
Debt = Total - Paid
```

## 19. Pom Mini / Fuel Rules

Fuel is represented as:

```text
product_type = FUEL
```

Fuel supports:

- price per liter;
- quantity in liters;
- nominal input;
- automatic conversion;
- decimal stock;
- fuel reporting.

Example:

```text
Price = Rp10,000/L
Nominal = Rp25,000
Liters = 2.5 L
```

Do not create a completely separate POS architecture for fuel.

## 20. Roles

### OWNER

Full access to monitoring, products, stock, suppliers, purchases, expenses, reports, users, devices, audit logs, and settings.

### ADMIN

Operational management access to products, stock, suppliers, purchases, expenses, transactions, and reports. Owner-only administration remains restricted.

### CASHIER

Transaction-focused access:

- open cash session;
- perform sales;
- search products;
- barcode/manual input;
- cash/digital payment;
- print receipt;
- permitted transaction history;
- permitted customer data.

Cashier must not have unrestricted access to stock adjustment, purchasing, user management, audit logs, critical settings, or owner administration.

## 21. Security Rules

Implement:

- secure password hashing;
- authentication;
- server-side authorization;
- RBAC;
- input validation;
- session security;
- rate limiting;
- audit logging.

Never store plaintext passwords.

Never trust frontend permission checks.

## 22. Audit Log Rules

Audit sensitive actions:

- price changes;
- stock adjustments;
- sale void;
- returns;
- expenses;
- purchases;
- cash closing;
- user changes;
- device deactivation;
- sync conflicts.

Audit should answer:

```text
Who?
What?
Which record?
When?
What changed?
```

## 23. UI/UX Rules

Prioritize:

- simplicity;
- speed;
- readability;
- large touch targets;
- obvious primary actions;
- minimal clicks;
- clear Indonesian language;
- fast search;
- responsive layout;
- keyboard support;
- offline visibility.

Avoid excessive animations, decorative charts, excessive modals, tiny buttons, technical error messages, and unnecessary configuration.

POS priority:

```text
Search
→ Product
→ Cart
→ Total
→ Payment
```

## 24. Error Handling

Errors must be understandable to non-technical users.

Bad:

```text
PrismaClientKnownRequestError P2002
```

Good:

```text
Barcode sudah digunakan oleh produk lain.
```

Never expose stack traces to normal users.

## 25. Code Quality

Use:

- TypeScript strict mode;
- clear naming;
- modular services;
- reusable UI components;
- schema validation;
- centralized error handling;
- consistent API responses;
- database transactions;
- proper indexes;
- environment variables.

Avoid excessive `any`, duplicated business logic, hardcoded secrets, business logic inside UI, huge components, huge route handlers, unnecessary abstractions, and premature optimization.

## 26. Frontend Rules

Use TanStack Query for server state, Zustand for appropriate client state, IndexedDB for offline data, and consistent loading/empty/error/offline states.

Do not put authoritative financial calculations only in the frontend.

## 27. Backend Rules

Backend must:

- validate every request;
- enforce authorization;
- contain business rules;
- use database transactions for critical operations;
- return consistent errors;
- use services for business logic;
- avoid giant controllers;
- protect sensitive endpoints;
- implement idempotency where required.

## 28. Database Rules

Use:

- UUID primary keys;
- foreign keys;
- indexes;
- unique constraints;
- decimal for money;
- decimal quantities where fuel requires fractions;
- timestamps;
- status fields.

Do not use floating point for money.

Do not hard-delete historical transactional data.

## 29. Development Workflow

For every feature:

```text
1. Read requirement
2. Check business rules
3. Check database impact
4. Check API impact
5. Check UI impact
6. Implement backend
7. Implement frontend
8. Implement offline behavior if required
9. Add validation
10. Add error handling
11. Add permission
12. Add tests
13. Run lint
14. Run type check
15. Verify business rules
```

A feature is not complete merely because the UI appears.

## 30. Testing Requirements

Test:

- happy path;
- validation;
- permission;
- error handling;
- duplicate action;
- network failure;
- offline behavior;
- database consistency;
- relevant audit logs.

Critical tests:

```text
Sale
Stock
Payment
Cash
Return
Void
Offline
Sync
RBAC
Backup
```

## 31. Critical Release Blockers

Never declare production-ready if there are:

- duplicate transactions;
- stock corruption;
- incorrect cash calculation;
- offline transaction loss;
- duplicate synchronization;
- unauthorized access;
- plaintext passwords;
- incorrect return reversal;
- incorrect void reversal;
- unrestorable backup.

## 32. Development Priority

```text
1. Data Integrity
2. Stock Integrity
3. Transaction Integrity
4. Cash Integrity
5. Offline/Sync Integrity
6. Security
7. Usability
8. Performance
9. Visual Polish
```

## 33. MVP Scope

MVP includes:

- authentication;
- RBAC;
- products;
- categories;
- units;
- stock;
- stock adjustment;
- POS;
- manual input;
- barcode;
- cash;
- digital payment;
- receipt;
- cash session;
- suppliers;
- purchases;
- supplier debt;
- expenses;
- customers;
- returns;
- void;
- dashboard;
- basic reports;
- offline POS;
- sync;
- PWA;
- audit logs.

Do not implement Future features unless explicitly requested.

## 34. Development Order

```text
01 Foundation
02 Database
03 Authentication
04 RBAC
05 Product
06 Category
07 Unit
08 Inventory
09 POS
10 Payment
11 Cash Session
12 Receipt
13 Supplier
14 Purchase
15 Expense
16 Customer
17 Return
18 Void
19 IndexedDB
20 Offline POS
21 Sync Engine
22 Dashboard
23 Reports
24 Fuel
25 Settings
26 Audit
27 PWA
28 Hardware
29 Testing
30 Pilot
31 Production
```

## 35. Repository Rules

Before modifying an existing repository:

1. Inspect the current structure.
2. Identify existing frontend/backend.
3. Identify existing database setup.
4. Identify existing dependencies.
5. Reuse healthy code where appropriate.
6. Avoid unnecessary rewrites.
7. Do not delete existing functionality without justification.

If the repository is empty, initialize according to the documented architecture.

## 36. Change Management

When making a significant architectural or business-rule change:

1. Identify affected documentation.
2. Explain the reason.
3. Keep database/API/frontend consistent.
4. Re-test affected flows.
5. Do not silently change business rules.

## 37. AI Agent Behavior

When starting a new session:

1. Read `AGENTS.md`.
2. Read relevant `/docs` files.
3. Inspect repository state.
4. Inspect existing implementation.
5. Continue from the current milestone.

Do not assume the project is empty.

Do not rebuild working features unnecessarily.

Do not ask for information already available in the documentation.

When information is missing, use the simplest reasonable assumption and document the decision.

## 38. Current Objective

Build a reliable, simple, offline-capable POS application that can actually be used by a family retail store and its owner.

The system must support:

```text
Retail POS
+
Manual Product Input
+
Barcode Input
+
Inventory
+
Purchasing
+
Supplier Debt
+
Cash Management
+
Expenses
+
Returns
+
Void
+
Profit Monitoring
+
Pom Mini / Fuel
+
Offline Operation
+
Synchronization
+
PWA
+
Owner Monitoring
```

Do not turn this project into a generic enterprise ERP.

Keep it practical, maintainable, and suitable for a real small/medium Indonesian retail store.
