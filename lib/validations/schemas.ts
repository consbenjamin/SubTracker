import { z } from "zod";

/** UUID v4 básico para validar IDs en rutas */
const uuidSchema = z.string().uuid("ID inválido");

/** Solo se admiten planes de 3, 6, 9 o 12 cuotas (igual que el CHECK en la base). */
export const installmentCountSchema = z.union([
  z.literal(3),
  z.literal(6),
  z.literal(9),
  z.literal(12),
]);

/** El count llega como string desde los `<select>`; "" y null significan "sin cuotas". */
const optionalInstallmentCount = z.preprocess(
  (val) => (val === "" || val == null ? null : Number(val)),
  installmentCountSchema.nullable().optional()
);

/**
 * Fecha real, no solo con forma de fecha: el regex por sí solo dejaba pasar
 * "2026-13-05" y "2026-02-31", que después `new Date(y, m-1, d)` corría en
 * silencio a enero de 2027 y al 3 de marzo.
 */
function isRealDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

const dateOnly = (message = "Formato fecha: YYYY-MM-DD") =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine(isRealDate, "Esa fecha no existe");

/**
 * Tope de los importes: igual al DECIMAL(10,2) de las columnas.
 * No bajarlo: en monedas como ARS o COP un importe de siete cifras es normal
 * (un celular en 12 cuotas supera el millón sin problema).
 */
const MAX_AMOUNT = 99999999.99;

const amount = (message = "El importe debe ser >= 0") =>
  z.coerce.number().min(0, message).max(MAX_AMOUNT, "Importe demasiado grande");

const subscriptionFields = {
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(200, "Nombre demasiado largo"),
  price: amount("El precio debe ser >= 0"),
  billing_cycle: z.enum(["monthly", "yearly", "quarterly"]),
  payment_type: z.enum(["recurring", "installment"]).default("recurring"),
  installment_count: optionalInstallmentCount,
  installments_paid: z.coerce.number().int().min(0).max(999).optional(),
  total_amount: amount().nullable().optional(),
  // Sin `.min(1)`: el regex ya exige los 10 caracteres.
  next_payment_date: dateOnly("La fecha es requerida"),
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

      // La regla estaba solo en el formulario: la API aceptaba 10 cuotas
      // pagadas sobre un plan de 3 y guardaba un plan imposible.
      if (
        data.installment_count != null &&
        (data.installments_paid ?? 0) > data.installment_count
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installments_paid"],
          message: `No podés tener más de ${data.installment_count} cuotas pagadas`,
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
export const paymentBodySchema = z
  .object({
    amount: amount(),
    payment_date: dateOnly(),
    /** Si es true (solo recurrentes), la API usa la fecha de vencimiento del servidor y valida contra expected_due. */
    confirm_due: z.boolean().optional(),
    /** Vencimiento que el usuario vio al abrir el modal; debe coincidir con next_payment_date en servidor (anti doble envío). */
    expected_due: dateOnly().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.confirm_due && !data.expected_due) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expected_due"],
        message: "Indicá el vencimiento que estás confirmando",
      });
    }
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

// --- Compras planeadas ---
const plannedPurchasePaymentMethod = z.enum(["card", "transfer", "cash"]);

const MAX_URL_LENGTH = 2000;

/**
 * `z.string().url()` acepta cualquier esquema, incluidos `javascript:` y
 * `data:text/html`, y el link se pinta como un `<a href>` en el que se puede
 * hacer clic. Se restringe a http y https.
 */
function isSafeUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const optionalUrl = z
  .string()
  // Acotado antes de validar: sin tope se podría mandar una URL enorme.
  .max(MAX_URL_LENGTH, "El link es demasiado largo")
  .transform((s) => (s?.trim() === "" ? undefined : s))
  .optional()
  .refine((s) => s === undefined || isSafeUrl(s), "El link debe empezar con http:// o https://");

export const plannedPurchaseBodySchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido").max(200, "Nombre demasiado largo"),
    /** Opcional: al planear una compra no siempre se sabe el precio. */
    price: z.preprocess(
      (val) => (val === "" || val == null || Number.isNaN(val) ? null : val),
      amount("El precio debe ser >= 0").nullable().optional()
    ),
    link: optionalUrl,
    planned_month: z.coerce.number().int().min(1).max(12),
    planned_year: z.coerce.number().int().min(2000).max(2100),
    bought: z.boolean().default(false),
    bought_date: dateOnly().nullable().optional(),
    payment_method: plannedPurchasePaymentMethod.nullable().optional(),
    card_name: z.string().max(100).nullable().optional(),
    bought_with_installments: z.boolean().optional().default(false),
    installment_count: optionalInstallmentCount,
    installments_paid: z.coerce.number().int().min(0).max(12).optional(),
    installments_start_next_month: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bought && data.payment_method === "card" && !data.card_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["card_name"],
        message: "Indicá con qué tarjeta pagaste",
      });
    }
    if (data.bought && data.bought_with_installments) {
      if (data.payment_method !== "card") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bought_with_installments"],
          message: "Las cuotas solo aplican si pagaste con tarjeta",
        });
      }
      if (data.installment_count == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installment_count"],
          message: "Seleccioná en cuántas cuotas pagaste",
        });
      } else if (
        data.installments_paid != null &&
        data.installments_paid > data.installment_count
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installments_paid"],
          message: "La cuota actual no puede ser mayor al total de cuotas",
        });
      }
    }
    if (!data.bought && data.bought_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bought_date"],
        message: "La fecha de compra solo aplica si está marcado como comprado",
      });
    }
  });

export type PlannedPurchaseBody = z.infer<typeof plannedPurchaseBodySchema>;

export function isValidPlannedPurchaseId(id: unknown): id is string {
  return uuidSchema.safeParse(id).success;
}
