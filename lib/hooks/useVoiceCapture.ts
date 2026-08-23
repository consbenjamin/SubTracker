"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Dictado por voz sobre la Web Speech API del navegador.
 *
 * La transcripción la hace el sistema operativo (Apple o Google): no hay
 * servidor propio, ni clave de API, ni costo. Firefox no implementa la API, así
 * que ahí `supported` queda en false y la pantalla no ofrece el botón.
 *
 * Se usa la API directamente en vez de `react-speech-recognition`: esa librería
 * guarda el reconocimiento en un singleton con estado propio que se corrompe
 * cuando el navegador rechaza el micrófono —anula los manejadores y se queda
 * creyendo que sigue grabando— y no expone forma de repararlo. Acá cada dictado
 * crea su propia instancia, así que nunca arrastra el estado del anterior.
 */

/** Por qué no se pudo escuchar, o null si no hubo problema. */
export type VoiceProblem = "denied" | "service" | "noMic" | "network" | "insecure" | null;

export interface VoiceCapture {
  supported: boolean;
  listening: boolean;
  /** Lo que se va escuchando, para mostrarlo mientras habla. */
  transcript: string;
  problem: VoiceProblem;
  /** Código crudo del navegador, para diagnosticar lo que no previmos. */
  problemCode: string | null;
  /** Origen exacto al que hay que darle permiso (el puerto importa). */
  origin: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Cada uno se arregla en un lugar distinto. Decirlos todos como "el micrófono
 * está bloqueado" mandaba a revisar un permiso que podía estar bien puesto.
 */
const PROBLEMA_POR_ERROR: Record<string, VoiceProblem> = {
  // El sitio no tiene permiso: se arregla en el candado de la barra.
  "not-allowed": "denied",
  // El navegador no puede usar el dictado. En una Mac suele ser el permiso del
  // sistema operativo, que es aparte del del sitio y no se pide solo.
  "service-not-allowed": "service",
  "audio-capture": "noMic",
  network: "network",
  // `no-speech` y `aborted` son parte del uso normal, no fallas.
};

function obtenerMotor(): typeof globalThis.SpeechRecognition | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useVoiceCapture(
  locale: string,
  onResult: (texto: string) => void
): VoiceCapture {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [problem, setProblem] = useState<VoiceProblem>(null);
  const [problemCode, setProblemCode] = useState<string | null>(null);

  const reconocimiento = useRef<SpeechRecognition | null>(null);
  /** Lo último que se escuchó, para entregarlo cuando el dictado termina. */
  const textoFinal = useRef("");
  /** El permiso se pide una sola vez por pantalla. */
  const yaPedimosPermiso = useRef(false);

  // En un ref para que arrancar no dependa de la identidad de la función: quien
  // la pasa suele redefinirla en cada render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  /**
   * Soporte del navegador. Va por `useSyncExternalStore` y no por un efecto
   * porque es estado del navegador, no del componente: en el servidor devuelve
   * false —ahí no hay `window`— y renderizar distinto en cada lado rompería la
   * hidratación.
   */
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!obtenerMotor(),
    () => false
  );

  const stop = useCallback(() => {
    reconocimiento.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    textoFinal.current = "";
  }, []);

  const start = useCallback(function iniciar() {
    setProblem(null);
    setProblemCode(null);
    setTranscript("");
    textoFinal.current = "";

    if (!window.isSecureContext) {
      setProblem("insecure");
      return;
    }

    const Motor = obtenerMotor();
    if (!Motor) return;

    // Se corta lo anterior antes de empezar: dos reconocimientos a la vez hacen
    // que el navegador aborte los dos.
    reconocimiento.current?.abort();

    const instancia = new Motor();
    instancia.lang = locale === "en" ? "en-US" : "es-AR";
    // `continuous: false` a propósito: iOS no lo soporta y para dictar un gasto
    // alcanza con una frase.
    instancia.continuous = false;
    // Los parciales son los que se muestran mientras se habla.
    instancia.interimResults = true;

    instancia.onresult = (evento: SpeechRecognitionEvent) => {
      let final = "";
      let parcial = "";
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (resultado.isFinal) final += resultado[0].transcript;
        else parcial += resultado[0].transcript;
      }
      if (final) textoFinal.current = (textoFinal.current + " " + final).trim();
      setTranscript((textoFinal.current + " " + parcial).trim());
    };

    instancia.onerror = (evento: SpeechRecognitionErrorEvent) => {
      const causa = evento.error;

      // El reconocimiento usa el permiso del micrófono, pero no lo pide: si
      // nadie lo pidió antes para este sitio, falla sin mostrar nada. Se pide
      // acá con `getUserMedia`, que es lo que hace aparecer el cartel del
      // navegador, y si lo conceden se reintenta solo.
      if (causa === "not-allowed" && !yaPedimosPermiso.current) {
        yaPedimosPermiso.current = true;
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // El reconocimiento abre su propio micrófono: este era solo para
            // pedir el permiso, y dejarlo abierto deja prendida la lucecita.
            stream.getTracks().forEach((track) => track.stop());
            // Directo y no por una marca que lea `onend`: el reconocimiento ya
            // terminó mucho antes de que la persona toque "permitir" en el
            // cartel, así que esa marca llegaba siempre tarde.
            iniciar();
          })
          .catch(() => {
            setProblemCode(causa);
            // Si el sitio ya tenía permiso y aun así el navegador no consigue
            // el micrófono, el que falta es el del sistema operativo: en una
            // Mac, Chrome puede tener permitido el sitio y tener el micrófono
            // denegado para Chrome entero. Ese no lo pide la página.
            if (!navigator.permissions) {
              setProblem("denied");
              return;
            }
            navigator.permissions
              .query({ name: "microphone" as PermissionName })
              .then((estado) => setProblem(estado.state === "granted" ? "service" : "denied"))
              .catch(() => setProblem("denied"));
          });
        return;
      }

      const problema = PROBLEMA_POR_ERROR[causa];
      if (!problema) return;
      setProblem(problema);
      setProblemCode(causa);
    };

    // `onend` llega siempre: al terminar bien, al cortar, y también después de
    // un error. Es el único lugar donde apagar el estado de escucha.
    instancia.onend = () => {
      setListening(false);
      const texto = textoFinal.current.trim();
      if (texto) onResultRef.current(texto);

    };

    reconocimiento.current = instancia;
    setListening(true);
    try {
      instancia.start();
    } catch {
      // `start()` tira si ya venía escuchando; el estado se corrige solo con el
      // `onend` de la instancia anterior.
      setListening(false);
    }
  }, [locale]);

  // Cortar el micrófono si la pantalla se cierra mientras escucha.
  useEffect(() => {
    return () => {
      reconocimiento.current?.abort();
    };
  }, []);

  return {
    supported,
    listening,
    transcript,
    problem,
    problemCode,
    origin: typeof window === "undefined" ? "" : window.location.host,
    start,
    stop,
    reset,
  };
}
