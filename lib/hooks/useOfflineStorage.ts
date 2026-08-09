"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Subscription } from "@/types";

const DB_NAME = "subghost-db";
const DB_VERSION = 1;
const STORE_NAME = "subscriptions";

/** `navigator.onLine` es estado externo al render: se lee con la API de stores. */
function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    // En el servidor asumimos con conexión: es el estado normal y evita
    // renderizar el cartel de "sin conexión" en el HTML inicial.
    () => true
  );
}

/**
 * Caché de solo lectura para modo offline: guarda la última respuesta del servidor
 * en IndexedDB y la devuelve cuando no hay conexión. No es un almacén de escritura;
 * crear o editar sin red requiere servidor.
 */
export function useOfflineStorage() {
  const dbRef = useRef<IDBDatabase | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => console.error("Error opening IndexedDB");
    request.onsuccess = () => {
      dbRef.current = request.result;
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  }, []);

  const saveSubscriptions = useCallback(async (subscriptions: Subscription[]) => {
    const db = dbRef.current;
    if (!db) return;

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      subscriptions.forEach((sub) => store.put(sub));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, []);

  const getSubscriptions = useCallback(async (): Promise<Subscription[]> => {
    const db = dbRef.current;
    if (!db) return [];

    return new Promise((resolve) => {
      const request = db
        .transaction([STORE_NAME], "readonly")
        .objectStore(STORE_NAME)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }, []);

  return { isOnline, saveSubscriptions, getSubscriptions };
}
