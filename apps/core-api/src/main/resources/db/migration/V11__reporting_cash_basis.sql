-- ---------------------------------------------------------------------------
-- Reporting on a cash basis
-- ---------------------------------------------------------------------------
-- Reports answer "what money arrived in this period", so they anchor on the day an
-- invoice settled. issue_date cannot answer that: an invoice issued in August and paid
-- in September belongs to September, and only paid_at says so.

ALTER TABLE invoices ADD COLUMN paid_at TIMESTAMPTZ;

COMMENT ON COLUMN invoices.paid_at IS
    'When the balance reached zero. Cleared again if a voided payment reopens the invoice, so a report rerun after a void self-corrects.';

-- Category is snapshotted per line for the same reason titles and prices are: renaming a
-- category must not rewrite last year''s report. NULL on manual lines, which have no product.
ALTER TABLE invoice_items ADD COLUMN category VARCHAR(100);

COMMENT ON COLUMN invoice_items.category IS
    'Root category name as it stood at the sale (Men / Women / Children), rolled up from the product''s leaf category.';

-- Existing PAID invoices settled on their last completed payment. payment_date is a DATE,
-- so it is anchored to the start of that day in the zone the rest of the app writes in.
UPDATE invoices i
SET paid_at = (p.last_payment_date AT TIME ZONE 'Asia/Phnom_Penh')
FROM (
    SELECT invoice_id, MAX(payment_date) AS last_payment_date
    FROM payments
    WHERE payment_status = 'COMPLETED'
    GROUP BY invoice_id
) p
WHERE p.invoice_id = i.id
  AND i.invoice_status = 'PAID';

UPDATE invoice_items ii
SET category = root.name
FROM products p
    JOIN categories leaf ON leaf.id = p.category_id
    JOIN categories root ON root.id = COALESCE(leaf.parent_id, leaf.id)
WHERE p.id = ii.product_id;

-- Every report filters on this pair.
CREATE INDEX idx_invoices_paid_at ON invoices (paid_at) WHERE invoice_status = 'PAID';
