# API Specification

Base: `/api/v1`

## Auth
`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh`

## Products
`GET /products`, `GET /products/search`, `GET /products/barcode/:barcode`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`

## Inventory
`GET /stock/summary`, `GET /stock`, `POST /stock/adjustments`, `GET /stock/movements`

## Sales
`GET /sales`, `POST /sales`, `GET /sales/:id`, `GET /sales/:id/receipt`, `POST /sales/:id/void`

## Purchases
`GET /purchases`, `POST /purchases`, `GET /purchases/:id`

## Returns
`GET /returns`, `POST /returns`, `GET /returns/:id`

## Finance
`GET/POST /expenses`
`POST /cash-sessions`
`GET /cash-sessions/current`
`POST /cash-sessions/:id/close`

## Dashboard/Reports
`GET /dashboard`
`GET /reports/*`

## Sync
`POST /sync/push`
`GET /sync/pull`
`GET /sync/status`

Use validation, RBAC, pagination and idempotency for retryable operations.
