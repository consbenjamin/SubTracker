ALTER TABLE subscriptions
ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'recurring',
ADD COLUMN installment_count INTEGER,
ADD COLUMN installments_paid INTEGER NOT NULL DEFAULT 0,
ADD COLUMN total_amount DECIMAL(10, 2);

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_payment_type_check
CHECK (payment_type IN ('recurring', 'installment'));

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_installment_count_check
CHECK (
  installment_count IS NULL
  OR installment_count IN (3, 6, 9, 12)
);

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_installments_paid_check
CHECK (installments_paid >= 0);

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_installment_required_fields_check
CHECK (
  payment_type <> 'installment'
  OR (
    installment_count IS NOT NULL
    AND total_amount IS NOT NULL
  )
);
