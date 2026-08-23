# Database Design

## Core tables
`roles`, `users`, `devices`, `categories`, `units`, `products`, `price_histories`, `suppliers`, `customers`, `sales`, `sale_items`, `payments`, `purchases`, `purchase_items`, `stock_movements`, `returns`, `return_items`, `cash_sessions`, `cash_transactions`, `expenses`, `settings`, `audit_logs`, `sync_operations`.

## Key fields
Products: id, name, sku, barcode, category_id, unit_id, product_type, purchase_price, selling_price, minimum_stock, current_stock, is_active.

Sales: id, invoice_number, client_transaction_id, device_id, cashier_id, customer_id, subtotal, discount_amount, tax_amount, total, status, created_at.

Sale items preserve product name, selling price, cost snapshot and quantity.

Stock movements preserve product, movement type, quantity, before/after, reference and reason.

Use UUIDs, foreign keys, unique constraints, indexes and decimal money values.
