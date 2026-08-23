# ERD

Core entities:

```text
roles → users → devices

categories → products ← units
products → price_histories
products → stock_movements

suppliers → purchases → purchase_items → products

customers → sales → sale_items → products
sales → payments
sales → returns → return_items

cash_sessions → cash_transactions
expenses → cash_transactions

users → audit_logs
devices → sync_operations
```

Core rules:
- Product barcode/SKU unique.
- Historical transactions remain traceable.
- Stock changes use stock movements.
- Cash changes use cash transactions.
- Sensitive actions use audit logs.
