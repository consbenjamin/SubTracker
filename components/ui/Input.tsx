import { forwardRef, InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Texto de ayuda debajo del campo. Se oculta cuando hay error. */
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, type, onKeyDown, onWheel, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const isNumber = type === "number";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          // Teclado numérico en móvil sin perder el separador decimal.
          inputMode={isNumber ? props.inputMode ?? "decimal" : props.inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onKeyDown={(e) => {
            // `type="number"` igual deja tipear notación científica y signos,
            // que luego el navegador reporta como valor vacío sin explicar nada.
            if (isNumber && ["e", "E", "+", "-"].includes(e.key)) {
              e.preventDefault();
            }
            onKeyDown?.(e);
          }}
          onWheel={(e) => {
            // Sin esto, rodar la rueda sobre un campo enfocado cambia el importe
            // sin que el usuario se dé cuenta.
            if (isNumber) e.currentTarget.blur();
            onWheel?.(e);
          }}
          className={cn(
            "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[15px] text-foreground",
            "placeholder:text-muted-foreground",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500/30",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
