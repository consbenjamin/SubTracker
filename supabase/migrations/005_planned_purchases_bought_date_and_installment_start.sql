-- planned_purchases: fecha exacta de compra + inicio de cuotas el próximo mes

ALTER TABLE planned_purchases
  ADD COLUMN IF NOT EXISTS bought_date DATE;

ALTER TABLE planned_purchases
  ADD COLUMN IF NOT EXISTS installments_start_next_month BOOLEAN NOT NULL DEFAULT FALSE;

-- Si no hay cuotas, no tiene sentido "start next month"
ALTER TABLE planned_purchases
  DROP CONSTRAINT IF EXISTS planned_purchases_installments_start_next_month_check;
ALTER TABLE planned_purchases
  ADD CONSTRAINT planned_purchases_installments_start_next_month_check
  CHECK (
    (installment_count IS NULL AND installments_start_next_month = FALSE) OR
    (installment_count IS NOT NULL)
  );

