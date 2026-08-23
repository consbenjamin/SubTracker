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
export type VoiceProblem = "denied" | "insecure" | null;

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

  /**
   * Se escucha el error del reconocimiento en vez de mirar el
   * `isMicrophoneAvailable` de la librería, que una vez que se apaga no vuelve
   * a encenderse: el aviso quedaba para siempre en pantalla aunque después se
   * concediera el permiso.
   *
   * Además, cuando el navegador niega el micrófono la librería deja el
   * reconocimiento inservible —reemplaza sus manejadores por funciones vacías—.
   * El síntoma es engañoso: el botón vuelve a ponerse en "grabando" pero ya no
   * llega ningún resultado. Rearmando el motor acá, el siguiente intento
   * funciona sin recargar la página.
   */
  const manejarError = useCallback((evento: Event) => {
    const causa = (evento as unknown as { error?: string }).error;
    if (causa !== "not-allowed" && causa !== "service-not-allowed") return;

    setProblem("denied");

    const actual = SpeechRecognition.getRecognition();
    const motor =
      (actual?.constructor as typeof globalThis.SpeechRecognition | undefined) ??
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;
    if (motor) SpeechRecognition.applyPolyfill(motor);

    // Y se fuerza el fin de la escucha. Al anular `onend`, la librería se queda
    // creyendo que sigue grabando: el botón mostraba "Listo" para siempre y el
    // toque siguiente lo tomaba como parar, no como empezar. De ahí la
    // sensación de que tocarlo no hacía nada.
    void SpeechRecognition.abortListening();
  }, []);

  // Sin lista de dependencias a propósito: rearmar el motor crea una instancia
  // nueva, y así el listener se vuelve a colocar sobre la vigente. Registrarlo
  // dentro de `start` llegaba tarde y el primer fallo pasaba desapercibido.
  useEffect(() => {
    const reconocimiento = SpeechRecognition.getRecognition();
    if (!reconocimiento) return;
    reconocimiento.addEventListener("error", manejarError);
    return () => reconocimiento.removeEventListener("error", manejarError);
  });

  const start = useCallback(() => {
    setProblem(null);
    resetTranscript();

    if (!window.isSecureContext) {
      setProblem("insecure");
      return;
    }

    // El permiso lo pide el propio reconocimiento, no nosotros.
    //
    // Pedirlo aparte con `getUserMedia` parecía más claro —el cartel salía justo
    // al tocar el botón— pero son dos permisos distintos: el de micrófono y el
    // de dictado. En Safari el primero no se recuerda entre recargas, así que
    // el cartel reaparecía en cada dictado aunque ya estuviera concedido.
    //
    // Si el navegador lo tiene bloqueado, la librería lo marca en
    // `isMicrophoneAvailable` y abajo se traduce a un mensaje que explica cómo
    // habilitarlo.
    void SpeechRecognition.startListening({
      // `continuous: false` a propósito: iOS no lo soporta y para dictar un
      // gasto alcanza con una frase.
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
    problem,
    start,
    stop,
    reset: resetTranscript,
  };
}
