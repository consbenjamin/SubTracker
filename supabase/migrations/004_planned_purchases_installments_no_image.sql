-- Agregar cuotas a compras planeadas (solo 3, 6, 9, 12) y quitar image_url
ALTER TABLE planned_purchases
  ADD COLUMN IF NOT EXISTS installment_count INTEGER CHECK (installment_count IS NULL OR installment_count IN (3, 6, 9, 12)),
  ADD COLUMN IF NOT EXISTS installments_paid INTEGER NOT NULL DEFAULT 0 CHECK (installments_paid >= 0 AND installments_paid <= 12);

-- Quitar image_url
ALTER TABLE planned_purchases DROP COLUMN IF EXISTS image_url;

-- installments_paid no puede superar installment_count cuando hay cuotas
ALTER TABLE planned_purchases
  DROP CONSTRAINT IF EXISTS planned_purchases_installments_check;
ALTER TABLE planned_purchases
  ADD CONSTRAINT planned_purchases_installments_check
  CHECK (
    (installment_count IS NULL AND installments_paid = 0) OR
    (installment_count IS NOT NULL AND installments_paid >= 0 AND installments_paid <= COALESCE(installment_count, 12))
  );
