-- ---------------------------------------------------------------------------
-- WALLET as a payment method
-- ---------------------------------------------------------------------------
-- The wallet gateway used to record its payments as OTHER, so every screen labelled OTHER
-- "Wallet balance" — which also mislabelled a genuine OTHER entered by staff.

ALTER TABLE payments DROP CONSTRAINT chk_payments_method;

ALTER TABLE payments ADD CONSTRAINT chk_payments_method
    CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'QR_CODE', 'CARD', 'WALLET', 'OTHER'));

-- Existing wallet payments, identified by the intent that produced them rather than by the
-- WALLET- reference prefix, which is only a convention of the adapter.
UPDATE payments p
SET payment_method = 'WALLET'
FROM payment_intents pi
WHERE p.payment_intent_id = pi.id
  AND pi.provider = 'WALLET'
  AND p.payment_method = 'OTHER';
