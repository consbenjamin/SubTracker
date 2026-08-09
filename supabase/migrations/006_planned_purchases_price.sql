-- Precio estimado de la compra planeada.
--
-- Nullable a propósito: al anotar algo que querés comprar no siempre sabés
-- cuánto sale. Las filas existentes quedan en NULL y el dashboard las cuenta
-- pero no las suma.
--
-- Cuando la compra es en cuotas, `price` es el TOTAL de la compra; el valor de
-- cada cuota se deriva como price / installment_count.

ALTER TABLE planned_purchases
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

ALTER TABLE planned_purchases
  DROP CONSTRAINT IF EXISTS planned_purchases_price_check;
ALTER TABLE planned_purchases
  ADD CONSTRAINT planned_purchases_price_check
  CHECK (price IS NULL OR price >= 0);
