// ============================================================
// Pruebas de la lógica fiscal — `npm test`
// ------------------------------------------------------------
// Casos "golden" tomados de las tablas oficiales y de los bordes
// exactos de cada tramo. Si un cambio rompe uno de estos números,
// el cálculo dejó de coincidir con la ley.
// ============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DATA_2026 } from '../js/modules/constants.js';
import {
  round2,
  parseFechaLocal,
  calcularDiferenciaFechas,
  buscarTramo,
  calcularISRMensual,
  calcularISRAnual,
  calcularISRPeriodico,
  calcularISRMarginal,
  detectarSaltoDeTramo,
  calcularCotizaciones,
  calcularSalarioNeto,
  calcularCostoPatronal,
  calcularHorasExtras,
  calcularIndemnizacion,
  calcularRenunciaVoluntaria,
  calcularAguinaldo,
  calcularVacacion,
  calcularLiquidacionCompleta,
  calcularHonorarios,
  simularDeclaracionAnual,
  calcularRecalculo,
} from '../js/modules/calculator.js';

const cerca = (a, b, tol = 0.02) =>
  assert.ok(Math.abs(a - b) <= tol, `esperaba ~${b} pero fue ${a} (dif ${Math.abs(a - b).toFixed(4)})`);

// ════════════════════════════════════════════════════════════
describe('Tabla ISR mensual — Art. 37 reformado (D.L. 293/2025)', () => {
  test('tramo I: exento hasta $550.00', () => {
    assert.equal(calcularISRMensual(0), 0);
    assert.equal(calcularISRMensual(300), 0);
    assert.equal(calcularISRMensual(550.0), 0);
  });

  test('tramo II: 10% sobre el exceso de $550 + cuota fija $17.67', () => {
    cerca(calcularISRMensual(550.01), 17.67);
    cerca(calcularISRMensual(700), 17.67 + 15.0);
    cerca(calcularISRMensual(895.24), 52.19);
  });

  test('tramo III: 20% sobre el exceso de $895.24 + cuota fija $60.00', () => {
    cerca(calcularISRMensual(895.25), 60.0);
    cerca(calcularISRMensual(1500), 60.0 + (1500 - 895.24) * 0.2);
    cerca(calcularISRMensual(2038.1), 288.57);
  });

  test('tramo IV: 30% sobre el exceso de $2,038.10 + cuota fija $288.57', () => {
    cerca(calcularISRMensual(2038.11), 288.57);
    cerca(calcularISRMensual(5000), 288.57 + (5000 - 2038.1) * 0.3);
  });

  test('REGRESIÓN: no existen huecos entre tramos', () => {
    // Antes, una base entre `hasta` y el `desde` siguiente devolvía $0.
    for (const base of [550.005, 895.245, 2038.105]) {
      assert.ok(calcularISRMensual(base) >= 0);
    }
    cerca(calcularISRMensual(895.245), 60.0); // redondea a 895.25 → tramo III
    cerca(calcularISRMensual(2038.105), 288.57);
  });

  test('REGRESIÓN: ningún salario bruto produce ISR $0 fuera del tramo exento', () => {
    const fallos = [];
    for (let c = 40000; c <= 1000000; c += 1) {
      const r = calcularSalarioNeto(c / 100);
      if (r.isrMensual === 0 && r.rentaNetaImponible > 550.0) fallos.push(c / 100);
    }
    assert.deepEqual(fallos, [], `salarios con ISR incorrecto: ${fallos.slice(0, 10).join(', ')}`);
  });

  test('la retención nunca decrece al subir el salario bruto', () => {
    let anterior = -1;
    for (let c = 40000; c <= 600000; c += 7) {
      const isr = calcularSalarioNeto(c / 100).isrMensual;
      assert.ok(isr >= anterior - 0.001, `retención bajó en bruto $${c / 100}`);
      anterior = isr;
    }
  });
});

// ════════════════════════════════════════════════════════════
describe('Tabla ISR anual — F-11 (segundo recálculo)', () => {
  // Valores transcritos del Decreto Ejecutivo No. 10 (abril 2025):
  // I 0.01–6,600.00 sin retención · II 6,600.01–10,742.86 10% s/6,600.00 +212.12
  // III 10,742.87–24,457.14 20% s/10,742.86 +720.00 · IV 24,457.15+ 30% s/24,457.14 +3,462.86
  test('bordes de cada tramo', () => {
    assert.equal(calcularISRAnual(6600.0), 0);
    cerca(calcularISRAnual(6600.01), 212.12);
    cerca(calcularISRAnual(10742.86), 212.12 + (10742.86 - 6600) * 0.1);
    cerca(calcularISRAnual(10742.87), 720.0);
    cerca(calcularISRAnual(24457.14), 720.0 + (24457.14 - 10742.86) * 0.2);
    cerca(calcularISRAnual(24457.15), 3462.86);
    cerca(calcularISRAnual(50000), 3462.86 + (50000 - 24457.14) * 0.3);
  });

  test('el límite del tramo II es 10,742.86 y no 10,742.88', () => {
    // Dos centavos que sí cambian el resultado: con 10,742.88 la tabla
    // aplicaba el tramo II donde ya corresponde el III.
    assert.equal(DATA_2026.ISR_TRAMOS_ANUAL[1].hasta, 10742.86);
    assert.equal(DATA_2026.ISR_TRAMOS_ANUAL[2].desde, 10742.87);
    assert.equal(DATA_2026.ISR_TRAMOS_ANUAL[2].excesoDe, 10742.86);
    cerca(calcularISRAnual(10742.88), 720.0);
  });

  test('sin huecos entre tramos anuales', () => {
    cerca(calcularISRAnual(10742.865), 720.0);
    cerca(calcularISRAnual(24457.144), 3462.86, 0.05);
  });
});

// ════════════════════════════════════════════════════════════
describe('Tablas de retención quincenal y semanal', () => {
  // Decreto Ejecutivo No. 10 (abril 2025), Art. 1 literales b) y c).
  test('quincenal: bordes oficiales', () => {
    assert.equal(calcularISRPeriodico(275.0, 'QUINCENAL'), 0);
    cerca(calcularISRPeriodico(275.01, 'QUINCENAL'), 8.83);
    cerca(calcularISRPeriodico(447.62, 'QUINCENAL'), 8.83 + (447.62 - 275) * 0.1);
    cerca(calcularISRPeriodico(447.63, 'QUINCENAL'), 30.0);
    cerca(calcularISRPeriodico(1019.05, 'QUINCENAL'), 30.0 + (1019.05 - 447.62) * 0.2);
    cerca(calcularISRPeriodico(1019.06, 'QUINCENAL'), 144.28);
  });

  test('semanal: bordes oficiales', () => {
    assert.equal(calcularISRPeriodico(137.5, 'SEMANAL'), 0);
    cerca(calcularISRPeriodico(137.51, 'SEMANAL'), 4.42);
    cerca(calcularISRPeriodico(223.81, 'SEMANAL'), 4.42 + (223.81 - 137.5) * 0.1);
    cerca(calcularISRPeriodico(223.82, 'SEMANAL'), 15.0);
    cerca(calcularISRPeriodico(509.53, 'SEMANAL'), 72.14);
  });

  test('las tres tablas son coherentes entre sí', () => {
    // El exento mensual debe equivaler a dos quincenas y a cuatro semanas.
    cerca(DATA_2026.ISR_TRAMOS_QUINCENAL[0].hasta * 2, DATA_2026.ISR_TRAMOS_MENSUAL[0].hasta);
    cerca(DATA_2026.ISR_TRAMOS_SEMANAL[0].hasta * 4, DATA_2026.ISR_TRAMOS_MENSUAL[0].hasta);
  });

  test('los topes de cotización se prorratean por periodicidad', () => {
    const quincenal = calcularCotizaciones(5000, { pagosAlAnio: 24 });
    cerca(quincenal.isss, 15.0); // la mitad del tope mensual de $30
    const semanal = calcularCotizaciones(5000, { pagosAlAnio: 52 });
    cerca(semanal.isss, round2((30 * 12) / 52), 0.01);
  });

  test('el neto anual no depende de la periodicidad elegida', () => {
    const mensual = calcularSalarioNeto(1200, { periodicidad: 'MENSUAL' });
    const quincenal = calcularSalarioNeto(600, { periodicidad: 'QUINCENAL' });
    cerca(mensual.netoAnualEstimado, quincenal.netoAnualEstimado, 3);
  });
});

// ════════════════════════════════════════════════════════════
describe('buscarTramo', () => {
  test('devuelve siempre un tramo válido', () => {
    for (const base of [-100, 0, 0.001, 550.004, 895.2449, 1e9]) {
      const r = buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, base);
      assert.ok(r.tramo, `sin tramo para ${base}`);
      assert.ok(r.indice >= 0 && r.indice < 4);
    }
  });

  test('clasifica correctamente los bordes', () => {
    assert.equal(buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, 550.0).indice, 0);
    assert.equal(buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, 550.01).indice, 1);
    assert.equal(buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, 895.24).indice, 1);
    assert.equal(buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, 895.25).indice, 2);
    assert.equal(buscarTramo(DATA_2026.ISR_TRAMOS_MENSUAL, 2038.11).indice, 3);
  });
});

// ════════════════════════════════════════════════════════════
describe('Cotizaciones ISSS y AFP', () => {
  test('porcentajes normales por debajo de los topes', () => {
    const c = calcularCotizaciones(800);
    cerca(c.isss, 24.0);
    cerca(c.afp, 58.0);
  });

  test('tope ISSS: $30 a partir de $1,000 de base', () => {
    assert.equal(calcularCotizaciones(1000).isss, 30.0);
    assert.equal(calcularCotizaciones(5000).isss, 30.0);
    assert.equal(calcularCotizaciones(100000).isss, 30.0);
  });

  test('tope AFP: $581.21 a partir de $8,016.71 de base', () => {
    cerca(calcularCotizaciones(8016.71).afp, 581.21);
    cerca(calcularCotizaciones(50000).afp, 581.21);
  });

  test('cuotas patronales ISSS 7.5% y AFP 8.75% con sus topes', () => {
    const c = calcularCotizaciones(1000);
    cerca(c.isssPatronal, 75.0);
    cerca(c.afpPatronal, 87.5);
    const alto = calcularCotizaciones(20000);
    cerca(alto.isssPatronal, 75.0);
    cerca(alto.afpPatronal, 701.46);
  });
});

// ════════════════════════════════════════════════════════════
describe('Salario neto', () => {
  test('caso típico $1,000 bruto', () => {
    const r = calcularSalarioNeto(1000);
    cerca(r.descuentoISSS, 30.0);
    cerca(r.descuentoAFP, 72.5);
    cerca(r.rentaNetaImponible, 897.5);
    cerca(r.isrMensual, 60.45);
    cerca(r.salarioNeto, 837.05);
  });

  test('salario mínimo de comercio queda exento de ISR', () => {
    const r = calcularSalarioNeto(408.8);
    assert.equal(r.isrMensual, 0);
    cerca(r.salarioNeto, 408.8 - r.descuentoISSS - r.descuentoAFP);
  });

  test('el desglose siempre cuadra', () => {
    for (const bruto of [408.8, 600, 997.49, 1000, 2229.76, 3000, 9000, 20000]) {
      const r = calcularSalarioNeto(bruto);
      cerca(r.salarioNeto + r.totalDescuentos, r.totalGravado);
      cerca(r.descuentoISSS + r.descuentoAFP, r.totalDescuentosLey);
    }
  });

  test('otras rentas gravadas (horas extras, bonos) entran a la base', () => {
    const base = calcularSalarioNeto(800);
    const conExtra = calcularSalarioNeto(800, { otrasRentasGravadas: 200 });
    assert.ok(conExtra.isrMensual > base.isrMensual);
    cerca(conExtra.totalGravado, 1000);
  });

  test('entradas basura no rompen el cálculo', () => {
    for (const v of [null, undefined, '', 'abc', -500, NaN]) {
      const r = calcularSalarioNeto(v);
      assert.equal(r.salarioNeto, 0);
      assert.equal(r.isrMensual, 0);
    }
  });
});

// ════════════════════════════════════════════════════════════
describe('Aviso de salto de tramo', () => {
  test('avisa cerca del borde de $895.25 donde la tabla salta $7.81', () => {
    const aviso = detectarSaltoDeTramo(895.0);
    assert.ok(aviso, 'debía avisar cerca del borde');
    assert.equal(aviso.umbral, 895.25);
    assert.ok(aviso.perdidaNeta > 0);
  });

  test('no avisa en zonas donde el salto no penaliza', () => {
    assert.equal(detectarSaltoDeTramo(300), null);
    assert.equal(detectarSaltoDeTramo(1500), null);
    assert.equal(detectarSaltoDeTramo(5000), null);
  });
});

// ════════════════════════════════════════════════════════════
describe('ISR marginal', () => {
  test('un pago adicional sobre base exenta puede no generar impuesto', () => {
    assert.equal(calcularISRMarginal(400, 100), 0);
  });

  test('el marginal equivale a la diferencia entre dos retenciones', () => {
    const base = 900;
    const extra = 500;
    cerca(calcularISRMarginal(base, extra), calcularISRMensual(base + extra) - calcularISRMensual(base));
  });

  test('nunca es negativo', () => {
    for (let b = 0; b < 5000; b += 137) {
      assert.ok(calcularISRMarginal(b, 250) >= 0);
    }
  });
});

// ════════════════════════════════════════════════════════════
describe('Fechas locales (sin desfase UTC)', () => {
  test('parsea la fecha en horario local, no en UTC', () => {
    const d = parseFechaLocal('2025-01-01');
    assert.equal(d.getFullYear(), 2025);
    assert.equal(d.getMonth(), 0);
    assert.equal(d.getDate(), 1);
  });

  test('un año exacto son 365 días inclusivos', () => {
    const r = calcularDiferenciaFechas('2024-01-01', '2024-12-31');
    assert.equal(r.totalDias, 366); // 2024 es bisiesto
    const r2 = calcularDiferenciaFechas('2025-01-01', '2025-12-31');
    assert.equal(r2.totalDias, 365);
  });

  test('desglose en años, meses y días', () => {
    const r = calcularDiferenciaFechas('2020-03-15', '2025-08-20');
    assert.equal(r.anios, 5);
    assert.equal(r.meses, 5);
    assert.equal(r.dias, 5);
  });

  test('el mismo día cuenta como 1 día', () => {
    assert.equal(calcularDiferenciaFechas('2025-06-10', '2025-06-10').totalDias, 1);
  });

  test('fechas inválidas devuelven null', () => {
    assert.equal(calcularDiferenciaFechas('', '2025-01-01'), null);
    assert.equal(calcularDiferenciaFechas('no-es-fecha', 'tampoco'), null);
  });
});

// ════════════════════════════════════════════════════════════
describe('Indemnización — Art. 58 CT', () => {
  test('30 días de salario por año trabajado', () => {
    const r = calcularIndemnizacion(600, 3, 0, 0);
    cerca(r.salarioDiarioCalculo, 20.0);
    cerca(r.diasIndemnizacion, 90, 0.5);
    cerca(r.montoTotal, 1800, 10);
  });

  test('tope de 4 salarios mínimos DIARIOS ($53.76/día)', () => {
    const r = calcularIndemnizacion(5000, 2, 0, 0);
    assert.ok(r.topeAplicado);
    cerca(r.salarioDiarioCalculo, 53.76);
    cerca(r.montoTotal, 53.76 * 60, 5);
  });

  test('mínimo garantizado de 15 días', () => {
    const r = calcularIndemnizacion(600, 0, 2, 0);
    assert.ok(r.minimoAplicado);
    assert.equal(r.diasIndemnizacion, 15);
    cerca(r.montoTotal, 20 * 15);
  });

  test('está exenta de ISR: el neto es igual al bruto', () => {
    const r = calcularIndemnizacion(2000, 5, 0, 0);
    assert.equal(r.exentaISR, true);
    assert.equal(r.montoNeto, r.montoTotal);
  });

  test('es proporcional y monótona con la antigüedad', () => {
    let anterior = 0;
    for (let a = 1; a <= 20; a++) {
      const m = calcularIndemnizacion(700, a, 0, 0).montoTotal;
      assert.ok(m >= anterior, `no creció en el año ${a}`);
      anterior = m;
    }
  });
});

// ════════════════════════════════════════════════════════════
describe('Renuncia voluntaria — D.L. 592/2013', () => {
  test('exige 2 años continuos', () => {
    const r = calcularRenunciaVoluntaria(800, 1, 6, 0);
    assert.equal(r.elegible, false);
    assert.match(r.mensaje, /2 años/);
  });

  test('15 días por año con tope de 2 salarios mínimos diarios', () => {
    const r = calcularRenunciaVoluntaria(2000, 4, 0, 0);
    assert.equal(r.elegible, true);
    assert.ok(r.topeAplicado);
    cerca(r.salarioDiarioCalculo, 26.88);
    cerca(r.montoTotal, 26.88 * 60, 5);
  });

  test('sin tope cuando el salario es bajo', () => {
    const r = calcularRenunciaVoluntaria(600, 3, 0, 0);
    assert.equal(r.topeAplicado, false);
    cerca(r.montoTotal, 20 * 45, 3);
  });
});

// ════════════════════════════════════════════════════════════
describe('Aguinaldo — Decreto 432 / D.L. 596', () => {
  test('días según antigüedad', () => {
    assert.equal(calcularAguinaldo(600, 0.5).diasAguinaldoBase, 15);
    assert.equal(calcularAguinaldo(600, 2).diasAguinaldoBase, 15);
    assert.equal(calcularAguinaldo(600, 3).diasAguinaldoBase, 19);
    assert.equal(calcularAguinaldo(600, 9.9).diasAguinaldoBase, 19);
    assert.equal(calcularAguinaldo(600, 10).diasAguinaldoBase, 21);
    assert.equal(calcularAguinaldo(600, 30).diasAguinaldoBase, 21);
  });

  test('monto completo con año completo trabajado', () => {
    const r = calcularAguinaldo(900, 5, 365);
    cerca(r.salarioDiario, 30.0);
    cerca(r.aguinaldoCompleto, 570.0);
    cerca(r.montoAguinaldo, 570.0);
  });

  test('proporcional a los días del período', () => {
    const completo = calcularAguinaldo(900, 5, 365).montoAguinaldo;
    const medio = calcularAguinaldo(900, 5, 182).montoAguinaldo;
    cerca(medio, completo * (182 / 365), 0.05);
  });

  test('exento hasta $1,500', () => {
    const r = calcularAguinaldo(900, 5, 365);
    assert.equal(r.gravadoISR, 0);
    assert.equal(r.isrRetenido, 0);
    assert.equal(r.montoNeto, r.montoAguinaldo);
  });

  test('REGRESIÓN: el excedente sobre $1,500 SÍ genera retención', () => {
    // Antes se pasaba el excedente por la tabla anual y siempre daba $0.
    const r = calcularAguinaldo(4000, 12, 365);
    assert.ok(r.montoAguinaldo > 1500, 'el caso debe superar la exención');
    assert.equal(r.exentoISR, 1500);
    assert.ok(r.gravadoISR > 0);
    assert.ok(r.isrRetenido > 0, 'el excedente debe generar ISR');
    cerca(r.montoNeto, r.montoAguinaldo - r.isrRetenido);
  });

  test('no cotiza ISSS ni AFP', () => {
    assert.equal(calcularAguinaldo(1000, 5).cotizaISSSAFP, false);
  });
});

// ════════════════════════════════════════════════════════════
describe('Vacación anual — Art. 177 CT', () => {
  test('15 días + 30% de prima', () => {
    const r = calcularVacacion(900, 365, { cotiza: false });
    cerca(r.pagoOrdinarioProporcional, 450.0);
    cerca(r.primaProporcional, 135.0);
    cerca(r.montoBruto, 585.0);
  });

  test('proporcional al ciclo trabajado', () => {
    const r = calcularVacacion(900, 180, { cotiza: false });
    cerca(r.montoBruto, 585.0 * (180 / 365), 0.05);
  });

  test('sin cotizaciones cuando se paga en finiquito', () => {
    const r = calcularVacacion(900, 365, { cotiza: false });
    assert.equal(r.descuentoISSS, 0);
    assert.equal(r.descuentoAFP, 0);
  });

  test('con cotizaciones en vacación anual ordinaria', () => {
    const r = calcularVacacion(900, 365, { cotiza: true });
    assert.ok(r.descuentoISSS > 0);
    assert.ok(r.descuentoAFP > 0);
  });
});

// ════════════════════════════════════════════════════════════
describe('Horas extras — Arts. 168-170 CT', () => {
  test('valor de la hora ordinaria = salario / 30 / 8', () => {
    const r = calcularHorasExtras(480, []);
    cerca(r.valorHoraOrdinaria, 2.0);
  });

  test('extra diurna paga el doble (recargo 100%)', () => {
    const r = calcularHorasExtras(480, [{ key: 'EXTRA_DIURNA', horas: 10 }]);
    cerca(r.total, 2.0 * 2 * 10);
  });

  test('multiplicadores por tipo de jornada', () => {
    const casos = [
      ['EXTRA_DIURNA', 2.0],
      ['EXTRA_NOCTURNA', 2.25],
      ['EXTRA_DESCANSO_DIURNA', 4.0],
      ['EXTRA_DESCANSO_NOCTURNA', 4.75],
      ['EXTRA_ASUETO_DIURNA', 5.0],
      ['EXTRA_ASUETO_NOCTURNA', 6.0],
    ];
    for (const [key, factor] of casos) {
      const r = calcularHorasExtras(480, [{ key, horas: 1 }]);
      cerca(r.total, 2.0 * factor);
    }
  });

  test('suma varias líneas', () => {
    const r = calcularHorasExtras(480, [
      { key: 'EXTRA_DIURNA', horas: 5 },
      { key: 'EXTRA_ASUETO_DIURNA', horas: 2 },
    ]);
    cerca(r.total, 2.0 * 2 * 5 + 2.0 * 5 * 2);
    assert.equal(r.totalHoras, 7);
  });

  test('ignora tipos desconocidos y horas en cero', () => {
    const r = calcularHorasExtras(480, [{ key: 'NO_EXISTE', horas: 5 }, { key: 'EXTRA_DIURNA', horas: 0 }]);
    assert.equal(r.total, 0);
    assert.equal(r.lineas.length, 0);
  });
});

// ════════════════════════════════════════════════════════════
describe('Costo patronal', () => {
  test('incluye cuotas patronales y provisiones', () => {
    const r = calcularCostoPatronal(1000);
    cerca(r.isssPatronal, 75.0);
    cerca(r.afpPatronal, 87.5);
    assert.ok(r.costoTotal > 1000);
    assert.ok(r.sobrecostoPorcentaje > 15);
  });
});

// ════════════════════════════════════════════════════════════
describe('Servicios profesionales y comparador', () => {
  test('retención del 10%', () => {
    const r = calcularHonorarios(1000);
    cerca(r.retencion, 100.0);
    cerca(r.neto, 900.0);
  });
});

// ════════════════════════════════════════════════════════════
describe('Declaración anual F-11', () => {
  const doceMeses = (salario) =>
    Array.from({ length: 12 }, () => ({ activo: true, salarioBruto: salario }));

  test('salario uniforme: las retenciones cuadran con el año', () => {
    const r = simularDeclaracionAnual(doceMeses(1000), { usarDeduccionFija: false });
    cerca(r.totalSalariosBruto, 12000);
    cerca(r.deduccionISSSAnual, 360.0);
    cerca(r.deduccionAFPAnual, 870.0);
    cerca(r.totalRetencionesAsalariado, 60.45 * 12, 0.1);
  });

  test('REGRESIÓN: aplica la deducción fija de $1,600 cuando corresponde', () => {
    const r = simularDeclaracionAnual(doceMeses(700));
    assert.equal(r.califacaDeduccionFija, true);
    assert.equal(r.usaDeduccionFija, true);
    assert.equal(r.deduccionFija, 1600);
    // Sin ella el contribuyente pagaría de más.
    const sin = simularDeclaracionAnual(doceMeses(700), { usarDeduccionFija: false });
    assert.ok(r.isrDeterminado < sin.isrDeterminado);
  });

  test('no aplica la deducción fija sobre el límite de $9,100', () => {
    const r = simularDeclaracionAnual(doceMeses(1500));
    assert.equal(r.califacaDeduccionFija, false);
    assert.equal(r.deduccionFija, 0);
  });

  test('REGRESIÓN: topa gastos médicos y colegiaturas en $800 cada uno', () => {
    const r = simularDeclaracionAnual(doceMeses(1500), {
      gastosMedicos: 5000,
      colegiaturas: 5000,
    });
    assert.equal(r.gastosMedicos, 800);
    assert.equal(r.colegiaturas, 800);
    assert.equal(r.gastosDocumentados, 1600);
  });

  test('el aguinaldo solo tributa sobre el excedente de $1,500', () => {
    const base = simularDeclaracionAnual(doceMeses(1500), { usarDeduccionFija: false });
    const conAgui = simularDeclaracionAnual(doceMeses(1500), {
      aguinaldoRecibido: 1200,
      usarDeduccionFija: false,
    });
    assert.equal(conAgui.aguinaldoGravado, 0);
    cerca(conAgui.totalIngresosGravados, base.totalIngresosGravados);

    const conExceso = simularDeclaracionAnual(doceMeses(1500), {
      aguinaldoRecibido: 2500,
      usarDeduccionFija: false,
    });
    assert.equal(conExceso.aguinaldoGravado, 1000);
  });

  test('salarios variables: las cotizaciones respetan el tope mes a mes', () => {
    const meses = Array.from({ length: 12 }, (_, i) => ({
      activo: true,
      salarioBruto: i < 6 ? 500 : 5000,
    }));
    const r = simularDeclaracionAnual(meses, { usarDeduccionFija: false });
    // 6 meses con 3% de $500 + 6 meses topados en $30
    cerca(r.deduccionISSSAnual, 6 * 15 + 6 * 30);
  });

  test('meses inactivos no suman', () => {
    const meses = doceMeses(1000).map((m, i) => ({ ...m, activo: i < 6 }));
    const r = simularDeclaracionAnual(meses, { usarDeduccionFija: false });
    cerca(r.totalSalariosBruto, 6000);
  });

  test('con salario uniforme, lo retenido mes a mes cuadra con el impuesto anual', () => {
    // Las dos tablas oficiales están calibradas para coincidir: si alguien
    // gana lo mismo los 12 meses, no debería quedarle saldo relevante.
    const r = simularDeclaracionAnual(doceMeses(900));
    assert.ok(r.saldo < 5, `descuadre de ${r.saldo} entre retención y determinación`);
  });

  test('saldo a favor cuando solo se trabajó parte del año', () => {
    const meses = doceMeses(1000).map((m, i) => ({ ...m, activo: i < 6 }));
    const r = simularDeclaracionAnual(meses);
    assert.equal(r.usaDeduccionFija, true);
    assert.equal(r.isrDeterminado, 0);
    assert.equal(r.tipoSaldo, 'A_FAVOR');
    cerca(r.saldo, r.totalRetenciones);
  });

  test('sin ingresos, todo en cero', () => {
    const r = simularDeclaracionAnual([], {});
    assert.equal(r.totalIngresosGravados, 0);
    assert.equal(r.isrDeterminado, 0);
    assert.equal(r.saldo, 0);
  });
});

// ════════════════════════════════════════════════════════════
describe('Recálculo obligatorio de junio y diciembre', () => {
  const doceMeses = (salario) =>
    Array.from({ length: 12 }, () => ({ activo: true, salarioBruto: salario }));

  test('usa la tabla oficial de cada recálculo', () => {
    const junio = calcularRecalculo('JUNIO', doceMeses(1000), { aplicarDeduccionFija: false });
    assert.equal(junio.mesesConSalario, 6);
    // Base: 6 × (1000 − 30 − 72.50) = 5,385.00 → tramo III de la tabla de junio
    cerca(junio.baseImponiblePeriodo, 5385.0);
    cerca(junio.isrCorrespondiente, 360.0 + (5385.0 - 5371.44) * 0.2);
  });

  test('el segundo recálculo acumula todo el año, no solo el semestre', () => {
    const r = calcularRecalculo('DICIEMBRE', doceMeses(1000), { aplicarDeduccionFija: false });
    assert.equal(r.mesesConSalario, 12);
    cerca(r.rentaGravadaPeriodo, 12000);
    cerca(r.baseImponiblePeriodo, 10770.0);
  });

  test('con salario constante el ajuste anual es mínimo', () => {
    const r = calcularRecalculo('DICIEMBRE', doceMeses(1000), { aplicarDeduccionFija: false });
    assert.ok(r.diferencia < 5, `descuadre de ${r.diferencia} entre retención y recálculo`);
  });

  test('aplica la deducción fija cuando la renta proyectada califica', () => {
    const r = calcularRecalculo('DICIEMBRE', doceMeses(700));
    assert.equal(r.califacaDeduccionFija, true);
    assert.equal(r.deduccionFija, 1600);
    // En junio corresponde la mitad de la deducción anual
    const junio = calcularRecalculo('JUNIO', doceMeses(700));
    assert.equal(junio.deduccionFija, 800);
  });

  test('no aplica la deducción fija sobre el límite de $9,100', () => {
    const r = calcularRecalculo('DICIEMBRE', doceMeses(1500));
    assert.equal(r.califacaDeduccionFija, false);
    assert.equal(r.deduccionFija, 0);
  });

  test('detecta que hay que retener más si el salario subió a mitad de año', () => {
    const meses = Array.from({ length: 12 }, (_, i) => ({
      activo: true,
      salarioBruto: i < 3 ? 600 : 3000,
    }));
    const r = calcularRecalculo('JUNIO', meses);
    assert.ok(r.isrCorrespondiente > 0);
    assert.ok(['RETENER_MAS', 'DEVOLVER', 'SIN_AJUSTE'].includes(r.tipoAjuste));
  });

  test('período inválido devuelve null', () => {
    assert.equal(calcularRecalculo('MARZO', doceMeses(1000)), null);
  });
});

// ════════════════════════════════════════════════════════════
describe('Deducción fija en la retención (Art. 29 n.º 7)', () => {
  test('se informa cuando la renta anual proyectada no pasa de $9,100', () => {
    const r = calcularSalarioNeto(700);
    assert.ok(r.deduccionFija, 'debía informar la deducción disponible');
    assert.equal(r.deduccionFija.montoAnual, 1600);
    cerca(r.deduccionFija.porPago, 133.33);
    assert.ok(r.deduccionFija.isrConDeduccion <= r.deduccionFija.isrSinDeduccion);
  });

  test('no se informa cuando la renta supera el límite', () => {
    assert.equal(calcularSalarioNeto(1200).deduccionFija, null);
    assert.equal(calcularSalarioNeto(5000).deduccionFija, null);
  });

  test('el ahorro anual es coherente con el ahorro por pago', () => {
    const r = calcularSalarioNeto(700);
    cerca(r.deduccionFija.ahorroAnual, r.deduccionFija.ahorroPorPago * 12);
  });

  test('funciona igual en quincenal', () => {
    const r = calcularSalarioNeto(350, { periodicidad: 'QUINCENAL' });
    assert.ok(r.deduccionFija);
    cerca(r.deduccionFija.porPago, 1600 / 24);
  });
});

// ════════════════════════════════════════════════════════════
describe('Liquidación completa', () => {
  test('suma indemnización + aguinaldo + vacación', () => {
    const r = calcularLiquidacionCompleta({
      salarioBruto: 900,
      fechaInicio: '2020-01-15',
      fechaFin: '2025-06-30',
      modo: 'despido',
    });
    assert.ok(r.principal.elegible);
    assert.ok(r.aguinaldo.montoAguinaldo > 0);
    assert.ok(r.vacacion.montoBruto > 0);
    cerca(r.granTotal, r.principal.montoNeto + r.aguinaldo.montoNeto + r.vacacion.montoNeto);
  });

  test('modo renuncia usa la prestación de 15 días', () => {
    const r = calcularLiquidacionCompleta({
      salarioBruto: 900,
      fechaInicio: '2020-01-15',
      fechaFin: '2025-06-30',
      modo: 'renuncia',
    });
    assert.ok(r.principal.elegible);
    assert.ok(r.principal.montoTotal < 900 * 6);
  });

  test('fechas inválidas devuelven null', () => {
    assert.equal(calcularLiquidacionCompleta({ salarioBruto: 900, fechaInicio: '', fechaFin: '' }), null);
  });

  test('los días de aguinaldo nunca exceden 365', () => {
    const r = calcularLiquidacionCompleta({
      salarioBruto: 900,
      fechaInicio: '2010-01-01',
      fechaFin: '2025-12-31',
      modo: 'despido',
    });
    assert.ok(r.diasAguinaldo <= 365);
    assert.ok(r.diasVacacion <= 366);
  });
});

// ════════════════════════════════════════════════════════════
describe('Utilidades', () => {
  test('round2 corrige errores de coma flotante', () => {
    assert.equal(round2(0.1 + 0.2), 0.3);
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(NaN), 0);
  });
});
