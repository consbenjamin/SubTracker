-- Suscripciones Web Push: un navegador/dispositivo por fila.
--
-- Cada navegador donde el usuario acepta notificaciones genera un endpoint
-- distinto, asi que un mismo usuario puede tener varias filas (celular, laptop).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- URL unica que da el navegador; identifica al dispositivo.
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Ultimo dia (YYYY-MM-DD) en que se envio un aviso a este dispositivo.
  -- Evita repetir el recordatorio si el cron corre mas de una vez.
  last_notified_on DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El usuario solo ve y administra sus propios dispositivos.
-- El cron no usa estas policies: entra con la service role key, que las saltea.
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
