"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mic, Square } from "lucide-react";
import { useVoiceCapture } from "@/lib/hooks/useVoiceCapture";
import { parseSpeech, type SpeechResult } from "@/lib/voice/parseSpeech";
import { cn } from "@/lib/utils";

interface VoiceFillButtonProps {
  /** Recibe los campos entendidos para volcarlos en el formulario. */
  onParsed: (result: SpeechResult) => void;
  className?: string;
}

/**
 * Botón de dictado: escucha una frase, la interpreta y prellena el formulario.
 *
 * Nunca guarda: completa los campos y la persona revisa. Con reglas el acierto
 * es alto pero no total, y un importe mal entendido y guardado en silencio es
 * peor que no tener la función.
 */
export function VoiceFillButton({ onParsed, className }: VoiceFillButtonProps) {
  const t = useTranslations("voice");
  const locale = useLocale();
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [nothingFound, setNothingFound] = useState(false);

  const handleResult = useCallback(
    (texto: string) => {
      setLastHeard(texto);
      const result = parseSpeech(texto);
      setNothingFound(result.detected.length === 0);
      if (result.detected.length) onParsed(result);
    },
    [onParsed]
  );

  const voice = useVoiceCapture(locale, handleResult);

  if (!voice.supported) return null;

  const texto = voice.listening ? voice.transcript : lastHeard;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => {
          if (voice.listening) {
            voice.stop();
            return;
          }
          setLastHeard(null);
          setNothingFound(false);
          voice.start();
        }}
        aria-pressed={voice.listening}
        className={cn(
          // h-11: es el objetivo táctil, y acá se toca con el pulgar.
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)]",
          "border text-sm font-medium transition-colors sm:w-auto sm:px-4",
          voice.listening
            ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
            : "border-border bg-transparent text-foreground hover:bg-muted/40"
        )}
      >
        {voice.listening ? (
          <>
            {/* El pulso es la única señal de que sigue escuchando. */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <Square className="h-4 w-4" aria-hidden />
            {t("stop")}
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" aria-hidden />
            {t("dictate")}
          </>
        )}
      </button>

      {voice.problem && (
        <div role="alert" className="space-y-1">
          <p className="text-sm text-red-600 dark:text-red-400">
            {t(voice.problem, { origin: voice.origin })}
          </p>
          {/* El código crudo del navegador: sin esto, dos causas muy distintas
              se ven igual y no hay por dónde empezar a mirar. */}
          {voice.problemCode && (
            <p className="text-xs text-muted-foreground">
              {t("errorCode", { code: voice.problemCode })}
            </p>
          )}
        </div>
      )}

      {!voice.problem && (voice.listening || texto) && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {texto ? `“${texto}”` : t("listening")}
        </p>
      )}

      {nothingFound && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{t("nothingFound")}</p>
      )}

      {!voice.listening && !texto && !voice.problem && (
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      )}
    </div>
  );
}
