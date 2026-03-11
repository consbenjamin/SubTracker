-- Compras planeadas del mes (wishlist + registro de compra)
CREATE TYPE purchase_payment_method AS ENUM ('card', 'transfer', 'cash');

CREATE TABLE planned_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link TEXT,
  image_url TEXT,
  planned_month INTEGER NOT NULL CHECK (planned_month >= 1 AND planned_month <= 12),
  planned_year INTEGER NOT NULL CHECK (planned_year >= 2000 AND planned_year <= 2100),
  bought BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method purchase_payment_method,
  card_name TEXT,
  bought_with_installments BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_planned_purchases_user_id ON planned_purchases(user_id);
CREATE INDEX idx_planned_purchases_planned ON planned_purchases(planned_year, planned_month);
CREATE INDEX idx_planned_purchases_bought ON planned_purchases(bought);

ALTER TABLE planned_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own planned purchases"
  ON planned_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planned purchases"
  ON planned_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned purchases"
  ON planned_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned purchases"
  ON planned_purchases FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_planned_purchases_updated_at
  BEFORE UPDATE ON planned_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
