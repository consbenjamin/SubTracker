import { z } from "zod";

/** UUID v4 básico para validar IDs en rutas */
const uuidSchema = z.string().uuid("ID inválido");
const installmentCountSchema = z.union([
  z.literal(3),
  z.literal(6),
  z.literal(9),
  z.literal(12),
]);

const subscriptionFields = {
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(200, "Nombre demasiado largo"),
  price: z.coerce.number().min(0, "El precio debe ser >= 0").max(999999.99),
  billing_cycle: z.enum(["monthly", "yearly", "quarterly"]),
  payment_type: z.enum(["recurring", "installment"]).default("recurring"),
  installment_count: z.preprocess(
    (val) => (val === "" || val == null ? null : Number(val)),
    installmentCountSchema.nullable().optional()
  ),
  installments_paid: z.coerce.number().int().min(0).max(999).optional(),
  total_amount: z.coerce.number().min(0).max(999999.99).nullable().optional(),
  next_payment_date: z
    .string()
    .min(1, "La fecha es requerida")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato fecha: YYYY-MM-DD"),
  category: z
    .string()
    .trim()
    .min(1, "La categoría es requerida")
    .max(100),
  status: z.enum(["active", "cancelled", "paused"]),
  notes: z.string().max(2000).optional().nullable(),
};

function withInstallmentValidation<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((data, ctx) => {
    if (data.payment_type === "installment") {
      if (!data.installment_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installment_count"],
          message: "Selecciona la cantidad de cuotas",
        });
      }

      if (data.total_amount == null || data.total_amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["total_amount"],
          message: "El monto total debe ser mayor a 0",
        });
      }
    }
  });
}

/** Schema para suscripción (API POST/PUT). Límites razonables para evitar payloads enormes. */
export const subscriptionBodySchema = withInstallmentValidation(
  z.object(subscriptionFields)
);

/** Schema para body de PUT con opción record_payment */
export const subscriptionUpdateBodySchema = withInstallmentValidation(z.object({
  ...subscriptionFields,
  record_payment: z.boolean().optional(),
}));

/** Schema para registro de pago (amount puede venir como string en JSON) */
export const paymentBodySchema = z.object({
  amount: z.coerce.number().min(0).max(999999.99),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato fecha: YYYY-MM-DD"),
});

/** Schema para login/registro con email y contraseña */
export const emailAuthSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type SubscriptionBody = z.infer<typeof subscriptionBodySchema>;
export type PaymentBody = z.infer<typeof paymentBodySchema>;

/** Valida que un string sea un UUID válido (para params [id]) */
export function isValidSubscriptionId(id: unknown): id is string {
  return uuidSchema.safeParse(id).success;
}
