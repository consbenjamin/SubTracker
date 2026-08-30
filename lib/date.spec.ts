/**
 * Spec de la aritmética de vencimientos.
 *
 * Se corre con el runner de Node, sin dependencias: `npm run test:date`.
 * Node quita los tipos al vuelo, así que importa el módulo real y no una copia.
 *
 * El caso que motivó el archivo: un cobro del 31 pasaba por febrero, quedaba en
 * 28 y ya no volvía nunca al 31.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addBillingCycle,
  addMonthsAnchored,
  addMonthsDateOnly,
  billingDayOf,
  nextBillingDate,
  parseDateOnly,
  toDateOnly,
} from "./date.ts";
import type { BillingCycle } from "../types/index.ts";

/** Encadena `veces` cobros, como hace el servidor al confirmar pagos seguidos. */
function cadena(
  desde: string,
  ciclo: BillingCycle,
  veces: number,
  ancla?: number | null
): string[] {
  const fechas: string[] = [];
  let actual = desde;
  for (let i = 0; i < veces; i += 1) {
    actual = nextBillingDate(actual, ciclo, ancla);
    fechas.push(actual);
  }
  return fechas;
}

test("con ancla, el día 31 sobrevive a febrero", () => {
  assert.deepEqual(cadena("2026-01-31", "monthly", 4, 31), [
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
    "2026-05-31",
  ]);
});

test("sin ancla se arrastra el recorte: es el bug que documenta el ancla", () => {
  assert.deepEqual(cadena("2026-01-31", "monthly", 3), [
    "2026-02-28",
    "2026-03-28",
    "2026-04-28",
  ]);
});

test("el 30 se recorta solo en febrero", () => {
  assert.deepEqual(cadena("2026-01-30", "monthly", 3, 30), [
    "2026-02-28",
    "2026-03-30",
    "2026-04-30",
  ]);
});

test("el 29 sobrevive a un febrero de 28 y cae justo en uno bisiesto", () => {
  // 2027 no es bisiesto; 2028 sí.
  assert.deepEqual(cadena("2027-01-29", "monthly", 13, 29).slice(0, 2), [
    "2027-02-28",
    "2027-03-29",
  ]);
  assert.equal(nextBillingDate("2028-01-29", "monthly", 29), "2028-02-29");
});

test("año bisiesto: el 31 de enero cae en 29 de febrero", () => {
  assert.equal(nextBillingDate("2028-01-31", "monthly", 31), "2028-02-29");
  assert.equal(nextBillingDate("2028-02-29", "monthly", 31), "2028-03-31");
});

test("trimestral mantiene el día y cruza el año", () => {
  assert.deepEqual(cadena("2026-08-31", "quarterly", 4, 31), [
    "2026-11-30",
    "2027-02-28",
    "2027-05-31",
    "2027-08-31",
  ]);
});

test("anual: el 29 de febrero bisiesto vuelve al 29 en el siguiente bisiesto", () => {
  assert.equal(nextBillingDate("2028-02-29", "yearly", 29), "2029-02-28");
  // El ancla es 29, así que al llegar a un febrero de 29 días lo recupera.
  assert.deepEqual(cadena("2028-02-29", "yearly", 4, 29), [
    "2029-02-28",
    "2030-02-28",
    "2031-02-28",
    "2032-02-29",
  ]);
});

test("un día que existe en todos los meses no se toca nunca", () => {
  for (const ciclo of ["monthly", "quarterly", "yearly"] as BillingCycle[]) {
    for (const fecha of cadena("2026-01-15", ciclo, 12, 15)) {
      assert.equal(billingDayOf(fecha), 15, `${ciclo} movió el día en ${fecha}`);
    }
  }
});

test("addBillingCycle sigue comportándose como antes (sin ancla)", () => {
  // Se apoya en el comportamiento viejo a propósito: los llamadores que no
  // tienen ancla no deben cambiar de resultado por esta refactorización.
  for (const fecha of ["2026-01-31", "2026-03-15", "2026-12-31", "2028-02-29"]) {
    for (const [ciclo, meses] of [
      ["monthly", 1],
      ["quarterly", 3],
      ["yearly", 12],
    ] as [BillingCycle, number][]) {
      assert.equal(
        addBillingCycle(fecha, ciclo),
        addMonthsDateOnly(fecha, meses),
        `${fecha} ${ciclo}`
      );
    }
  }
});

test("nunca devuelve una fecha inválida ni salta de mes", () => {
  // Cada día ancla posible, arrancando en cada mes del año.
  for (let mes = 1; mes <= 12; mes += 1) {
    for (let ancla = 28; ancla <= 31; ancla += 1) {
      const inicio = `2026-${String(mes).padStart(2, "0")}-01`;
      for (const fecha of cadena(inicio, "monthly", 14, ancla)) {
        const d = parseDateOnly(fecha);
        assert.equal(toDateOnly(d), fecha, `fecha irreal: ${fecha}`);
        const ultimoDelMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        assert.equal(
          d.getDate(),
          Math.min(ancla, ultimoDelMes),
          `${fecha} no respeta el ancla ${ancla}`
        );
      }
    }
  }
});

test("addMonthsAnchored proyecta la cuota N sin encadenar", () => {
  // El calendario de cuotas calcula cada fila de una sola vez desde el próximo
  // vencimiento, así que tiene que coincidir con avanzar de a un mes.
  const ancla = 31;
  let paso = "2026-01-31";
  for (let n = 1; n <= 12; n += 1) {
    paso = nextBillingDate(paso, "monthly", ancla);
    assert.equal(
      addMonthsAnchored("2026-01-31", n, ancla),
      paso,
      `la cuota ${n} no coincide con avanzar ${n} veces`
    );
  }
});

test("addMonthsAnchored acepta offsets negativos", () => {
  assert.equal(addMonthsAnchored("2026-03-31", -1, 31), "2026-02-28");
  assert.equal(addMonthsAnchored("2026-03-31", 0, 31), "2026-03-31");
});

test("el ancla ausente equivale al día de la fecha de partida", () => {
  for (const fecha of ["2026-05-17", "2026-01-31", "2026-02-28"]) {
    assert.equal(
      nextBillingDate(fecha, "monthly", null),
      nextBillingDate(fecha, "monthly", billingDayOf(fecha)),
      fecha
    );
  }
});
