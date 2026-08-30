/**
 * Spec del saneo del `?next=` del login. `npm test`.
 *
 * Cada caso de acá es un ataque concreto que el filtro anterior —"empieza con
 * `/` y no con `//`"— dejaba pasar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "./safeRedirect.ts";

/** Lo que nunca puede sobrevivir: rompe el HTML de respaldo del callback. */
const ROMPE_HTML = /[<>"]/;

test("no deja escapar a otro sitio", () => {
  for (const destino of [
    "//evil.com",
    "//evil.com/robo",
    "https://evil.com",
    "http://evil.com",
    "evil.com",
    "\\\\evil.com",
  ]) {
    const salida = safeInternalPath(destino);
    assert.ok(salida.startsWith("/"), `${destino} → ${salida}`);
    assert.ok(!salida.startsWith("//"), `${destino} → ${salida} sigue siendo protocol-relative`);
  }
});

test("neutraliza lo que cerraría el <script> de la página de respaldo", () => {
  for (const destino of [
    "/</script><script>alert(1)</script>",
    "/dashboard\"onload=\"alert(1)",
    "/<img src=x onerror=alert(1)>",
    "/dashboard?x=</script><script>alert(1)</script>",
    "/dashboard#</script><script>alert(1)</script>",
  ]) {
    const salida = safeInternalPath(destino);
    assert.ok(!ROMPE_HTML.test(salida), `${destino} → ${salida} todavía trae < > o "`);
  }
});

test("los destinos legítimos de la app pasan intactos", () => {
  for (const destino of [
    "/dashboard",
    "/subscriptions",
    "/subscriptions/8f14e45f-ceea-467a-9a3b-1e3a1b2c3d4e",
    "/subscriptions/8f14e45f-ceea-467a-9a3b-1e3a1b2c3d4e?confirmDue=true&due=2026-01-31",
    "/settings",
    "/analytics",
  ]) {
    assert.equal(safeInternalPath(destino), destino);
  }
});

test("lo vacío o ausente cae al dashboard", () => {
  for (const destino of [null, undefined, "", "dashboard", "?x=1", "#x"]) {
    assert.equal(safeInternalPath(destino), "/dashboard", String(destino));
  }
});
