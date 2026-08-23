"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

/**
 * Dictado por voz sobre la API del navegador.
 *
 * La transcripción la hace el sistema operativo (Apple o Google): no hay
 * servidor propio, ni clave de API, ni costo. Firefox no implementa la API, así
 * que ahí `supported` queda en false y la pantalla se limita a no ofrecer el
 * botón.
 *
 * `react-speech-recognition` se encarga de la parte fea: reiniciar el
 * reconocimiento cuando el navegador lo corta solo, el estado de escucha y
 * abortar al desmontar.
 */

/** Por qué no se pudo escuchar, para poder decir algo útil en pantalla. */
export type VoiceProblem = "denied" | "noMic" | "insecure" | null;

export interface VoiceCapture {
  supported: boolean;
  listening: boolean;
  /** Lo que se va escuchando, para mostrarlo mientras habla. */
  transcript: string;
  /** Qué impidió escuchar, o null si no hubo problema. */
  problem: VoiceProblem;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useVoiceCapture(
  locale: string,
  onResult: (texto: string) => void
): VoiceCapture {
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const [problem, setProblem] = useState<VoiceProblem>(null);

  // En un ref para que el efecto no dependa de la identidad de la función:
  // quien la pasa suele redefinirla en cada render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  /**
   * Se entrega en cuanto hay un resultado final, sin esperar a que la persona
   * toque "listo": el dictado se corta solo tras una pausa, sobre todo en iOS.
   *
   * Antes esto miraba el flanco de `listening` (pasar de true a false), y solo
   * andaba el primer dictado: en el segundo el cambio de estado llegaba
   * agrupado y el flanco nunca se veía. `finalTranscript` no depende de eso.
   */
  useEffect(() => {
    const texto = finalTranscript.trim();
    if (!texto) return;
    onResultRef.current(texto);
    // Deja el buffer limpio para el próximo dictado; también corta este efecto.
    resetTranscript();
  }, [finalTranscript, resetTranscript]);

  const start = useCallback(async () => {
    setProblem(null);
    resetTranscript();

    // El permiso se pide acá y no dentro del reconocimiento: así el navegador
    // muestra su cartel en el momento del toque, que es cuando se entiende para
    // qué se pide. Además distingue "lo negaste" de "no hay micrófono", cosa
    // que la API de dictado no informa.
    if (!window.isSecureContext) {
      setProblem("insecure");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // El reconocimiento abre su propio micrófono: este solo servía para pedir
      // el permiso, y dejarlo abierto deja el indicador de grabación encendido.
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const nombre = (error as DOMException)?.name;
      setProblem(nombre === "NotFoundError" || nombre === "OverconstrainedError" ? "noMic" : "denied");
      return;
    }

    // `continuous: false` a propósito: iOS no lo soporta y para dictar un gasto
    // alcanza con una frase.
    void SpeechRecognition.startListening({
      continuous: false,
      language: locale === "en" ? "en-US" : "es-AR",
    });
  }, [locale, resetTranscript]);

  const stop = useCallback(() => {
    void SpeechRecognition.stopListening();
  }, []);

  // Cortar el micrófono si la pantalla se cierra mientras escucha.
  useEffect(() => {
    return () => {
      void SpeechRecognition.abortListening();
    };
  }, []);

  return {
    supported: browserSupportsSpeechRecognition,
    listening,
    transcript,
    // `isMicrophoneAvailable` de la librería solo se entera después de fallar;
    // el permiso que pedimos nosotros da el motivo antes de intentar.
    problem: problem ?? (isMicrophoneAvailable ? null : "denied"),
    start,
    stop,
    reset: resetTranscript,
  };
}
