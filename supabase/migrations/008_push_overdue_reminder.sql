-- Recordatorio de suscripciones vencidas.
--
-- Una vencida sigue vencida hasta que el usuario confirma el pago, asi que
-- avisar todos los dias seria spam. Esta columna lleva la fecha del ultimo
-- recordatorio de vencidas por dispositivo, para espaciarlos (ver
-- OVERDUE_REMINDER_DAYS en app/api/cron/notify/route.ts).
--
-- Es distinta de last_notified_on, que limita a un aviso por dia sin importar
-- el motivo.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS last_overdue_notified_on DATE;
