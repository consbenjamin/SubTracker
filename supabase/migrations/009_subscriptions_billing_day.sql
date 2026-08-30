-- Día del mes en que se cobra: el ancla del ciclo.
--
-- Sin esto, la próxima fecha se calculaba sumándole un ciclo a la anterior, y
-- el resultado se arrastraba. Un cobro del 31 pasaba por febrero, quedaba en 28
-- y ya no volvía nunca al 31: marzo daba 28, abril 28, para siempre. Lo mismo
-- con el 29 y el 30. El día original no se puede recuperar una vez que se
-- corrió, así que hay que guardarlo.
--
-- Con el ancla, el cálculo elige primero el mes y recién después el día: el
-- ancla, o el último del mes si ese mes es más corto. El recorte de febrero
-- deja de heredarse (ver nextBillingDate en lib/date.ts).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_day_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_day_check
  CHECK (billing_day IS NULL OR (billing_day >= 1 AND billing_day <= 31));

-- Backfill: lo mejor que se puede saber hoy es el día que la fila tiene ahora.
-- Las que ya se corrieron quedan ancladas en el día corrido (un cobro que era
-- del 31 y hoy figura el 28 queda anclado al 28); no hay forma de distinguirlo,
-- pero a partir de acá deja de correrse más. Quien note que le quedó mal el día
-- lo corrige editando la fecha del próximo cobro, que vuelve a anclar.
--
-- Ojo: la tabla ya tiene un trigger `update_subscriptions_updated_at`, así que
-- este UPDATE le toca `updated_at` a todas las filas. No se usa para ordenar ni
-- se muestra, pero conviene saberlo antes de correrlo.
UPDATE subscriptions
  SET billing_day = EXTRACT(DAY FROM next_payment_date)::SMALLINT
  WHERE billing_day IS NULL;

-- Que ninguna fila nueva nazca sin ancla, venga de donde venga.
--
-- Solo actúa cuando llega en NULL, que es el caso de un INSERT que no la
-- menciona. En un UPDATE que no la nombra, Postgres deja el valor viejo (no
-- NULL) y el trigger no la toca: por eso avanzar la fecha de cobro no pisa el
-- ancla. Cuando el usuario reprograma la fecha a mano, la app manda el ancla
-- nueva explícita y esa gana.
CREATE OR REPLACE FUNCTION subscriptions_set_billing_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_day IS NULL AND NEW.next_payment_date IS NOT NULL THEN
    NEW.billing_day := EXTRACT(DAY FROM NEW.next_payment_date)::SMALLINT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_set_billing_day_trigger ON subscriptions;
CREATE TRIGGER subscriptions_set_billing_day_trigger
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION subscriptions_set_billing_day();
