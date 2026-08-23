# Business Rules

## Sale
Sale → items → payment → stock movement → cash transaction if cash. Must be atomic.

## Stock
`Current Stock = Opening + IN - OUT + Adjustments`.

Movement types: OPENING, PURCHASE, SALE, RETURN, DAMAGE, LOSS, ADJUSTMENT, VOID_REVERSAL.

## Payment
Cash change = received - total. Digital payment does not increase physical cash.

## Purchase
Supplier → purchase → receive → stock IN → payment/debt.
`Debt = Total - Paid`.

## Return
Must reference original sale. Cannot exceed remaining returnable quantity. GOOD can return to sellable stock; DAMAGED cannot.

## Void
Void is reversal, not deletion.

## Fuel
`product_type = FUEL`; support liters and nominal input.

## Offline
PENDING → SYNCING → SYNCED; FAILED and CONFLICT are retained. Sync must be idempotent.
