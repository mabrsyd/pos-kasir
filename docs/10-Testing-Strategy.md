# Testing Strategy

## Levels
- Unit
- Integration
- E2E
- Offline
- Hardware
- Security
- Usability
- Performance

## Critical tests
- Sale
- Stock
- Payment
- Cash
- Return
- Void
- Offline
- Sync
- RBAC
- Backup/restore

## Edge cases
Unknown barcode, stock 0, insufficient stock, price change, inactive product, duplicate barcode, insufficient payment, overpayment, double checkout, timeout retry, offline/reconnect, duplicate sync, failed sync, stock conflict, printer failure, scanner failure, partial return, excessive return, damaged return, void, cash shortage, purchase debt, negative values, session expiry, browser close offline, PWA update, database failure and concurrent sales.

## Release blockers
No production if there is data loss, duplicate transactions, stock corruption, incorrect cash, duplicate sync, unauthorized access, plaintext passwords, incorrect return/void reversal, or unrestorable backup.
