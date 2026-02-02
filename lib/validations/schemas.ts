import { z } from "zod";

/** UUID v4 básico para validar IDs en rutas */
const uuidSchema = z.string().uuid("ID inválido");

/** Schema para suscripción (API POST/PUT). Límites razonables para evitar payloads enormes. */
export const subscriptionBodySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(200, "Nombre demasiado largo"),
  price: z.coerce.number().min(0, "El precio debe ser >= 0").max(999999.99),
  billing_cycle: z.enum(["monthly", "yearly", "quarterly"]),
  next_payment_date: z
    .string()
    .min(1, "La fecha es requerida")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato fecha: YYYY-MM-DD"),
  category: z
    .string()
    .min(1, "La categoría es requerida")
    .max(100),
  status: z.enum(["active", "cancelled", "paused"]),
  notes: z.string().max(2000).optional(),
});

/** Schema para body de PUT con opción record_payment */
export const subscriptionUpdateBodySchema = subscriptionBodySchema.extend({
  record_payment: z.boolean().optional(),
});

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
