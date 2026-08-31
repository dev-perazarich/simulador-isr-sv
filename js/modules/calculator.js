// ============================================================
// calculator.js — Algoritmos fiscales y laborales (funciones puras)
// ------------------------------------------------------------
// Sin dependencias del DOM: se puede importar desde Node para tests.
// Todas las funciones reciben números y devuelven objetos con el
// desglose completo, de forma que la UI nunca recalcule nada.
// ============================================================

import { DATA_2026 } from './constants.js';

// ════════════════════════════════════════════════════════════
// Helpers numéricos
// ════════════════════════════════════════════════════════════

/** Redondeo monetario a centavos, robusto ante errores de coma flotante. */
export function round2(n) {
  if (!isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round4(n) {
  if (!isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** Convierte cualquier entrada de formulario a número seguro (>= 0 opcional). */
export function num(value, { min = -Infinity, fallback = 0 } = {}) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  if (!isFinite(n)) return fallback;
  return n < min ? min : n;
}

// ════════════════════════════════════════════════════════════
// Fechas — SIEMPRE en horario local
// ------------------------------------------------------------
// `new Date('2025-01-01')` se interpreta como UTC y en El Salvador
// (UTC−6) retrocede al 31/12/2024. Estas funciones evitan ese
// desfase parseando los componentes a mano.
// ════════════════════════════════════════════════════════════

/** Parsea 'YYYY-MM-DD' (o un Date) como fecha LOCAL a medianoche. */
export function parseFechaLocal(valor) {
  if (valor instanceof Date) {
    return isNaN(valor) ? null : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor !== 'string') return null;
  const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(valor);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

/** Formatea un Date como 'YYYY-MM-DD' local (sin pasar por UTC). */
export function formatFechaLocal(fecha) {
  const d = parseFechaLocal(fecha);
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Diferencia entre dos fechas en años, meses, días y total de días.
 * `totalDias` es inclusivo del día inicial (como cuenta la antigüedad laboral).
 */
export function calcularDiferenciaFechas(inicio, fin) {
  const dInicio = parseFechaLocal(inicio);
  const dFin = parseFechaLocal(fin);
  if (!dInicio || !dFin) return null;

  const MS_DIA = 1000 * 60 * 60 * 24;
  // Se normaliza a mediodía para inmunizar el cálculo contra cambios de horario.
  const a = new Date(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate(), 12);
  const b = new Date(dFin.getFullYear(), dFin.getMonth(), dFin.getDate(), 12);
  const totalDias = Math.max(0, Math.round((b - a) / MS_DIA) + 1);

  let anios = dFin.getFullYear() - dInicio.getFullYear();
  let meses = dFin.getMonth() - dInicio.getMonth();
  let dias = dFin.getDate() - dInicio.getDate();

  if (dias < 0) {
    meses--;
    dias += new Date(dFin.getFullYear(), dFin.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anios--;
    meses += 12;
  }

  return {
    anios: Math.max(0, anios),
    meses: Math.max(0, meses),
    dias: Math.max(0, dias),
    totalDias,
    aniosDecimal: round4(totalDias / 365),
  };
}

/** Convierte años/meses/días declarados manualmente a un total de días. */
export function tiempoADias(anios = 0, meses = 0, dias = 0) {
  return Math.max(0, num(anios) * 365 + num(meses) * 30 + num(dias));
}

// ════════════════════════════════════════════════════════════
// ISR — aplicación de tablas
// ════════════════════════════════════════════════════════════

/**
 * Localiza el tramo que corresponde a una base imponible.
 *
 * La base se redondea a centavos ANTES de comparar: las tablas
 * oficiales están definidas sobre montos monetarios (…895.24 |
 * 895.25…) y sin redondear existen valores intermedios que no caen
 * en ningún tramo. Además se incluye un respaldo descendente para
 * que la función nunca pueda devolver `null`.
 */
export function buscarTramo(tramos, baseImponible) {
  const base = round2(Math.max(0, num(baseImponible)));
  for (let i = 0; i < tramos.length; i++) {
    if (base >= tramos[i].desde && base <= tramos[i].hasta) {
      return { tramo: tramos[i], indice: i, base };
    }
  }
  // Respaldo: último tramo cuyo piso no supera la base.
  for (let i = tramos.length - 1; i >= 0; i--) {
    if (base >= tramos[i].excesoDe) return { tramo: tramos[i], indice: i, base };
  }
  return { tramo: tramos[0], indice: 0, base };
}

/** Calcula el impuesto con una tabla dada y devuelve el desglose. */
export function calcularISRConTabla(baseImponible, tramos) {
  const { tramo, indice, base } = buscarTramo(tramos, baseImponible);
  const excedente = Math.max(0, base - tramo.excesoDe);
  const impuesto = tramo.tasa === 0 ? 0 : round2(tramo.cuotaFija + excedente * tramo.tasa);
  return {
    base,
    impuesto,
    tramo,
    indice,
    excedente: round2(excedente),
    cuotaFija: tramo.cuotaFija,
    tasa: tramo.tasa,
  };
}

/** ISR de retención mensual (Art. 37 LISR — tabla mensual). */
export function calcularISRMensual(baseImponible) {
  return calcularISRConTabla(baseImponible, DATA_2026.ISR_TRAMOS_MENSUAL).impuesto;
}

/** Configuración de una periodicidad de pago (mensual, quincenal, semanal). */
export function periodicidadDe(key = 'MENSUAL') {
  return (
    DATA_2026.PERIODICIDADES.find((p) => p.key === key) || DATA_2026.PERIODICIDADES[0]
  );
}

/** Tabla de retención que corresponde a una periodicidad. */
export function tablaDePeriodicidad(key = 'MENSUAL') {
  return DATA_2026[periodicidadDe(key).tabla];
}

/** ISR de retención para cualquier periodicidad de pago. */
export function calcularISRPeriodico(baseImponible, periodicidad = 'MENSUAL') {
  return calcularISRConTabla(baseImponible, tablaDePeriodicidad(periodicidad)).impuesto;
}

/** ISR anual determinado (Art. 37 LISR — tabla anual, F-11). */
export function calcularISRAnual(baseImponible) {
  return calcularISRConTabla(baseImponible, DATA_2026.ISR_TRAMOS_ANUAL).impuesto;
}

/**
 * ISR marginal de un pago adicional (aguinaldo, bono, vacación…).
 *
 * Es el método correcto: el pago extra se suma a la renta gravable del
 * mes y se retiene la DIFERENCIA de impuesto, en lugar de pasar el
 * monto suelto por una tabla (que casi siempre daría cero).
 */
export function calcularISRMarginal(baseMensualExistente, montoAdicionalGravado) {
  const base = Math.max(0, num(baseMensualExistente));
  const extra = Math.max(0, num(montoAdicionalGravado));
  if (extra === 0) return 0;
  const isrSin = calcularISRMensual(base);
  const isrCon = calcularISRMensual(base + extra);
  return round2(Math.max(0, isrCon - isrSin));
}

/**
 * Detecta si la base imponible cae en la zona donde la tabla oficial
 * da un salto (la reforma subió la base exenta pero conservó las
 * cuotas fijas anteriores, así que un centavo más puede costar $7.81).
 * Devuelve un aviso listo para mostrar, o `null`.
 */
export function detectarSaltoDeTramo(baseImponible, tramos = DATA_2026.ISR_TRAMOS_MENSUAL) {
  const base = round2(num(baseImponible));
  const { indice } = buscarTramo(tramos, base);
  const siguiente = tramos[indice + 1];
  if (!siguiente) return null;

  const isrActual = calcularISRConTabla(base, tramos).impuesto;
  const isrSiguiente = calcularISRConTabla(siguiente.desde, tramos).impuesto;
  const salto = round2(isrSiguiente - isrActual);
  const distancia = round2(siguiente.desde - base);

  // Solo avisamos si el salto es desproporcionado respecto al aumento
  // de base necesario para provocarlo, y si el usuario está cerca.
  if (salto <= distancia || distancia > 25) return null;

  return {
    baseActual: base,
    proximoTramo: siguiente.label,
    umbral: siguiente.desde,
    distancia,
    saltoImpuesto: salto,
    perdidaNeta: round2(salto - distancia),
    mensaje:
      `Está a ${formatUSD(distancia)} del tramo ${siguiente.label}. ` +
      `Cruzarlo aumenta la retención en ${formatUSD(salto)}, así que un aumento ` +
      `pequeño puede dejarle ${formatUSD(salto - distancia)} menos en la mano.`,
  };
}

// ════════════════════════════════════════════════════════════
// Cotizaciones de seguridad social
// ════════════════════════════════════════════════════════════

/**
 * ISSS y AFP del trabajador y del patrono, con sus topes legales.
 *
 * Los topes de la ley son mensuales. Si el pago es quincenal o semanal
 * se prorratean con el mismo factor, para que la suma del año coincida
 * con el tope anual.
 */
export function calcularCotizaciones(salarioBruto, opts = {}) {
  const { ISSS, AFP } = DATA_2026.DESCUENTOS;
  const bruto = Math.max(0, num(salarioBruto));
  const pagosAlAnio = Math.max(1, num(opts.pagosAlAnio) || 12);
  const factor = 12 / pagosAlAnio; // 1 mensual · 0.5 quincenal · 0.2308 semanal

  const baseMaxISSS = ISSS.baseMaxima * factor;
  const baseMaxAFP = AFP.baseMaxima * factor;

  const baseISSS = Math.min(bruto, baseMaxISSS);
  const baseAFP = Math.min(bruto, baseMaxAFP);

  const isss = round2(Math.min(baseISSS * ISSS.tasa, ISSS.tope * factor));
  const afp = round2(Math.min(baseAFP * AFP.tasa, AFP.tope * factor));
  const isssPatronal = round2(Math.min(baseISSS * ISSS.tasaPatronal, ISSS.topePatronal * factor));
  const afpPatronal = round2(Math.min(baseAFP * AFP.tasaPatronal, AFP.topePatronal * factor));

  return {
    isss,
    afp,
    total: round2(isss + afp),
    isssPatronal,
    afpPatronal,
    totalPatronal: round2(isssPatronal + afpPatronal),
    topeISSSAplicado: bruto > baseMaxISSS,
    topeAFPAplicado: bruto > baseMaxAFP,
    topeISSSMonto: round2(ISSS.tope * factor),
    topeAFPMonto: round2(AFP.tope * factor),
  };
}

/**
 * Salario neto mensual con todos los descuentos de ley.
 * @param {number} salarioBruto
 * @param {object} [opts]
 * @param {number} [opts.otrasRentasGravadas]  Bonos, comisiones, horas extras…
 * @param {number} [opts.otrasDeducciones]     Descuentos no legales (préstamos, etc.)
 */
export function calcularSalarioNeto(salarioBruto, opts = {}) {
  const bruto = Math.max(0, num(salarioBruto));
  const otrasRentas = Math.max(0, num(opts.otrasRentasGravadas));
  const otrasDeducciones = Math.max(0, num(opts.otrasDeducciones));

  const periodo = periodicidadDe(opts.periodicidad);
  const tramos = DATA_2026[periodo.tabla];

  const totalGravado = bruto + otrasRentas;
  const cot = calcularCotizaciones(totalGravado, { pagosAlAnio: periodo.pagosAlAnio });

  const rentaNetaImponible = Math.max(0, round2(totalGravado - cot.total));
  const isr = calcularISRConTabla(rentaNetaImponible, tramos);

  const totalDescuentosLey = round2(cot.total + isr.impuesto);
  const totalDescuentos = round2(totalDescuentosLey + otrasDeducciones);
  const salarioNeto = round2(totalGravado - totalDescuentos);

  // ── Deducción fija del Art. 29 numeral 7 ──
  // El Decreto Ejecutivo No. 10, literal e), advierte que las tablas de
  // retención NO la incorporan y que el patrono debe considerarla. Se
  // informa cuánto cambiaría la retención si efectivamente se aplicara.
  const cfgFija = DATA_2026.DEDUCCIONES_ANUALES.DEDUCCION_FIJA;
  const rentaAnualEstimada = round2(totalGravado * periodo.pagosAlAnio);
  let deduccionFija = null;

  if (totalGravado > 0 && rentaAnualEstimada <= cfgFija.rentaMaxima) {
    const porPago = round2(cfgFija.monto / periodo.pagosAlAnio);
    const baseConDeduccion = Math.max(0, round2(rentaNetaImponible - porPago));
    const isrConDeduccion = calcularISRConTabla(baseConDeduccion, tramos).impuesto;
    deduccionFija = {
      aplica: true,
      montoAnual: cfgFija.monto,
      porPago,
      rentaAnualEstimada,
      rentaMaxima: cfgFija.rentaMaxima,
      isrSinDeduccion: isr.impuesto,
      isrConDeduccion,
      ahorroPorPago: round2(isr.impuesto - isrConDeduccion),
      ahorroAnual: round2((isr.impuesto - isrConDeduccion) * periodo.pagosAlAnio),
      netoConDeduccion: round2(salarioNeto + (isr.impuesto - isrConDeduccion)),
    };
  }

  return {
    periodicidad: periodo.key,
    periodicidadLabel: periodo.label,
    pagosAlAnio: periodo.pagosAlAnio,
    salarioBruto: round2(bruto),
    otrasRentasGravadas: round2(otrasRentas),
    totalGravado: round2(totalGravado),
    descuentoISSS: cot.isss,
    descuentoAFP: cot.afp,
    totalDescuentosLey: cot.total,
    rentaNetaImponible,
    isrMensual: isr.impuesto, // nombre conservado por compatibilidad
    isrRetenido: isr.impuesto,
    tramoISR: isr.tramo,
    indiceTramo: isr.indice,
    otrasDeducciones: round2(otrasDeducciones),
    totalDescuentos,
    salarioNeto,
    topeISSSAplicado: cot.topeISSSAplicado,
    topeAFPAplicado: cot.topeAFPAplicado,
    topeISSSMonto: cot.topeISSSMonto,
    topeAFPMonto: cot.topeAFPMonto,
    rentaAnualEstimada,
    netoAnualEstimado: round2(salarioNeto * periodo.pagosAlAnio),
    deduccionFija,
    efectividadISR: totalGravado > 0 ? round2((isr.impuesto / totalGravado) * 100) : 0,
    efectividadTotal: totalGravado > 0 ? round2((totalDescuentos / totalGravado) * 100) : 0,
    avisoTramo: detectarSaltoDeTramo(rentaNetaImponible, tramos),
  };
}

/** Costo total para el empleador (salario + cuotas patronales). */
export function calcularCostoPatronal(salarioBruto) {
  const bruto = Math.max(0, num(salarioBruto));
  const cot = calcularCotizaciones(bruto);
  // Provisiones mensuales de prestaciones (base 30 días de salario):
  // aguinaldo mínimo (15 días) y vacación (15 días + 30% de prima).
  const salarioDiario = bruto / 30;
  const provisionAguinaldo = round2((salarioDiario * DATA_2026.AGUINALDO.DIAS_PROPORCIONAL) / 12);
  const provisionVacacion = round2(
    (salarioDiario * DATA_2026.VACACIONES.DIAS_REMUNERADOS * (1 + DATA_2026.VACACIONES.PRIMA)) / 12
  );

  const costoDirecto = round2(bruto + cot.totalPatronal);
  const costoTotal = round2(costoDirecto + provisionAguinaldo + provisionVacacion);

  return {
    salarioBruto: round2(bruto),
    isssPatronal: cot.isssPatronal,
    afpPatronal: cot.afpPatronal,
    totalPatronal: cot.totalPatronal,
    provisionAguinaldo,
    provisionVacacion,
    costoDirecto,
    costoTotal,
    sobrecostoPorcentaje: bruto > 0 ? round2(((costoTotal - bruto) / bruto) * 100) : 0,
  };
}

// ════════════════════════════════════════════════════════════
// Jornada extraordinaria — Arts. 168-170 CT
// ════════════════════════════════════════════════════════════

/**
 * Calcula el pago de horas extras.
 * @param {number} salarioMensual
 * @param {Array<{key:string, horas:number}>} detalle
 */
export function calcularHorasExtras(salarioMensual, detalle = []) {
  const { TIPOS, HORAS_JORNADA_DIURNA, DIAS_MES } = DATA_2026.HORAS_EXTRAS;
  const bruto = Math.max(0, num(salarioMensual));
  const valorHora = bruto / DIAS_MES / HORAS_JORNADA_DIURNA;

  const lineas = [];
  let totalHoras = 0;
  let total = 0;

  for (const item of detalle) {
    const tipo = TIPOS.find((t) => t.key === item.key);
    const horas = Math.max(0, num(item?.horas));
    if (!tipo || horas === 0) continue;
    const monto = round2(valorHora * tipo.factor * horas);
    lineas.push({
      key: tipo.key,
      label: tipo.label,
      recargo: tipo.recargo,
      factor: tipo.factor,
      horas,
      valorHoraExtra: round2(valorHora * tipo.factor),
      monto,
    });
    totalHoras += horas;
    total += monto;
  }

  return {
    salarioMensual: round2(bruto),
    valorHoraOrdinaria: round2(valorHora),
    lineas,
    totalHoras: round4(totalHoras),
    total: round2(total),
  };
}

// ════════════════════════════════════════════════════════════
// Prestaciones laborales
// ════════════════════════════════════════════════════════════

/**
 * Indemnización por despido sin causa justificada (Art. 58 CT).
 *
 * • 30 días de salario básico por año y proporcional por fracción.
 * • Mínimo garantizado por ley: 15 días.
 * • El salario DIARIO de cálculo se topa en 4 salarios mínimos diarios.
 * • Exenta de ISR y sin cotizaciones (Art. 4 LISR).
 */
export function calcularIndemnizacion(salarioBruto, anios = 0, meses = 0, dias = 0, opts = {}) {
  const cfg = DATA_2026.INDEMNIZACION;
  const bruto = Math.max(0, num(salarioBruto));

  const totalDias = opts.totalDias != null ? Math.max(0, num(opts.totalDias)) : tiempoADias(anios, meses, dias);

  const salarioDiarioReal = round2(bruto / 30);
  const salarioDiarioCalculo = Math.min(salarioDiarioReal, cfg.TOPE_SALARIO_DIARIO);
  const topeAplicado = salarioDiarioReal > cfg.TOPE_SALARIO_DIARIO;

  const aniosDecimal = totalDias / 365;
  const diasCalculados = cfg.DIAS_POR_ANIO * aniosDecimal;
  const diasIndemnizacion = Math.max(diasCalculados, cfg.DIAS_MINIMO);
  const minimoAplicado = diasCalculados < cfg.DIAS_MINIMO;

  const montoTotal = round2(diasIndemnizacion * salarioDiarioCalculo);

  return {
    elegible: true,
    salarioBruto: round2(bruto),
    salarioDiarioReal,
    salarioDiarioCalculo: round2(salarioDiarioCalculo),
    topeAplicado,
    topeSalarioDiario: round2(cfg.TOPE_SALARIO_DIARIO),
    topeSalarioMensual: round2(cfg.TOPE_SALARIO_MENSUAL),
    anios: num(anios),
    meses: num(meses),
    dias: num(dias),
    totalDias,
    aniosDecimal: round4(aniosDecimal),
    diasIndemnizacion: round2(diasIndemnizacion),
    minimoAplicado,
    montoTotal,
    exentaISR: true,
    montoNeto: montoTotal,
  };
}

/**
 * Prestación económica por renuncia voluntaria (D.L. 592/2013).
 * 15 días de salario básico por año; exige 2 años continuos;
 * el salario diario de cálculo se topa en 2 salarios mínimos diarios.
 */
export function calcularRenunciaVoluntaria(salarioBruto, anios = 0, meses = 0, dias = 0, opts = {}) {
  const cfg = DATA_2026.RENUNCIA_VOLUNTARIA;
  const bruto = Math.max(0, num(salarioBruto));
  const totalDias = opts.totalDias != null ? Math.max(0, num(opts.totalDias)) : tiempoADias(anios, meses, dias);
  const aniosDecimal = totalDias / 365;

  if (aniosDecimal < cfg.ANIOS_MINIMO) {
    return {
      elegible: false,
      anios: num(anios),
      aniosDecimal: round4(aniosDecimal),
      aniosMinimo: cfg.ANIOS_MINIMO,
      montoTotal: 0,
      mensaje:
        `La ley exige ${cfg.ANIOS_MINIMO} años continuos de trabajo para tener derecho ` +
        `a esta prestación. Lleva ${round2(aniosDecimal)} años.`,
    };
  }

  const salarioDiarioReal = round2(bruto / 30);
  const salarioDiarioCalculo = Math.min(salarioDiarioReal, cfg.TOPE_SALARIO_DIARIO);
  const topeAplicado = salarioDiarioReal > cfg.TOPE_SALARIO_DIARIO;

  const diasPrestacion = cfg.DIAS_POR_ANIO * aniosDecimal;
  const montoTotal = round2(diasPrestacion * salarioDiarioCalculo);

  return {
    elegible: true,
    salarioBruto: round2(bruto),
    salarioDiarioReal,
    salarioDiarioCalculo: round2(salarioDiarioCalculo),
    topeAplicado,
    topeSalarioDiario: round2(cfg.TOPE_SALARIO_DIARIO),
    topeSalarioMensual: round2(cfg.TOPE_SALARIO_MENSUAL),
    anios: num(anios),
    totalDias,
    aniosDecimal: round4(aniosDecimal),
    diasPrestacion: round2(diasPrestacion),
    montoTotal,
    montoNeto: montoTotal,
  };
}

/**
 * Aguinaldo (Arts. 196-202 CT) con su tratamiento correcto de ISR.
 *
 * El excedente sobre la exención de $1,500 se suma a la renta gravada
 * del mes y se retiene la diferencia de impuesto (ISR marginal). El
 * aguinaldo no cotiza ISSS ni AFP.
 *
 * @param {number} salarioBruto
 * @param {number} aniosServicio
 * @param {number} diasProporcionales Días laborados en el período (12 dic – 11 dic)
 */
export function calcularAguinaldo(salarioBruto, aniosServicio = 0, diasProporcionales = 365) {
  const cfg = DATA_2026.AGUINALDO;
  const bruto = Math.max(0, num(salarioBruto));
  const anios = Math.max(0, num(aniosServicio));
  const diasPeriodo = Math.min(365, Math.max(0, num(diasProporcionales) || 365));

  const salarioDiario = bruto / 30;

  let diasBase = cfg.DIAS_PROPORCIONAL;
  let tramoLabel = 'Proporcional (menos de 1 año)';
  if (anios >= 1) {
    for (const tramo of cfg.TRAMOS_DIAS) {
      if (anios >= tramo.aniosDesde && anios < tramo.aniosHasta) {
        diasBase = tramo.dias;
        tramoLabel = tramo.label;
        break;
      }
    }
  }

  const aguinaldoCompleto = round2(diasBase * salarioDiario);
  const proporcion = diasPeriodo / 365;
  const montoAguinaldo = round2(aguinaldoCompleto * proporcion);

  // ── ISR: solo el excedente sobre $1,500, calculado al margen ──
  const exentoISR = round2(Math.min(montoAguinaldo, cfg.EXENCION_ISR));
  const gravadoISR = round2(Math.max(0, montoAguinaldo - cfg.EXENCION_ISR));
  const cot = calcularCotizaciones(bruto);
  const baseMensual = round2(Math.max(0, bruto - cot.total));
  const isrRetenido = calcularISRMarginal(baseMensual, gravadoISR);

  return {
    elegible: true,
    aniosServicio: anios,
    diasProporcionales: diasPeriodo,
    proporcion: round4(proporcion),
    tramoLabel,
    diasAguinaldoBase: diasBase,
    salarioDiario: round2(salarioDiario),
    aguinaldoCompleto,
    montoAguinaldo,
    exentoISR,
    gravadoISR,
    isrRetenido,
    // alias conservado por compatibilidad con vistas anteriores
    isrSobreExcedente: isrRetenido,
    montoNeto: round2(montoAguinaldo - isrRetenido),
    exencionLimite: cfg.EXENCION_ISR,
    cotizaISSSAFP: false,
  };
}

/**
 * Vacación anual: 15 días de salario + 30% de prima (Art. 177 CT).
 * @param {number} salarioBruto
 * @param {number} diasProporcionales Días del ciclo anual ya trabajados
 * @param {object} [opts]
 * @param {boolean} [opts.cotiza=true] Si aplica ISSS/AFP (falso en finiquito proporcional)
 */
export function calcularVacacion(salarioBruto, diasProporcionales = 365, opts = {}) {
  const { DIAS_REMUNERADOS, PRIMA } = DATA_2026.VACACIONES;
  const cotiza = opts.cotiza !== false;
  const bruto = Math.max(0, num(salarioBruto));
  const diasPeriodo = Math.min(365, Math.max(0, num(diasProporcionales) || 365));

  const salarioDiario = bruto / 30;
  const proporcion = diasPeriodo / 365;

  const pagoOrdinario = round2(DIAS_REMUNERADOS * salarioDiario * proporcion);
  const prima = round2(pagoOrdinario * PRIMA);
  const montoBruto = round2(pagoOrdinario + prima);

  // Cotizaciones: se calculan sobre el propio pago de vacación.
  const cot = cotiza ? calcularCotizaciones(montoBruto) : { isss: 0, afp: 0, total: 0 };

  // ISR marginal: la vacación se suma a la renta gravada del mes.
  const cotMes = calcularCotizaciones(bruto);
  const baseMensual = round2(Math.max(0, bruto - cotMes.total));
  const isrRetenido = calcularISRMarginal(baseMensual, round2(montoBruto - cot.total));

  return {
    salarioDiario: round2(salarioDiario),
    diasTrabajados: diasPeriodo,
    proporcion: round4(proporcion),
    diasRemunerados: DIAS_REMUNERADOS,
    pagoOrdinarioProporcional: pagoOrdinario,
    primaProporcional: prima,
    montoBruto,
    descuentoISSS: cot.isss,
    descuentoAFP: cot.afp,
    isrRetenido,
    totalDescuentos: round2(cot.total + isrRetenido),
    montoNeto: round2(montoBruto - cot.total - isrRetenido),
    cotiza,
  };
}

/**
 * Liquidación completa: indemnización o renuncia + aguinaldo y
 * vacación proporcionales, con el gran total a recibir.
 */
export function calcularLiquidacionCompleta({
  salarioBruto,
  fechaInicio,
  fechaFin,
  modo = 'despido',
  incluirAguinaldo = true,
  incluirVacacion = true,
} = {}) {
  const bruto = Math.max(0, num(salarioBruto));
  const periodo = calcularDiferenciaFechas(fechaInicio, fechaFin);
  if (!periodo) return null;

  const fin = parseFechaLocal(fechaFin);
  const inicio = parseFechaLocal(fechaInicio);

  // Aguinaldo: días dentro del período 12/dic → 11/dic que abarca `fin`.
  const cfgAg = DATA_2026.AGUINALDO;
  let inicioPeriodoAg = new Date(fin.getFullYear() - 1, cfgAg.PERIODO_INICIO.mes - 1, cfgAg.PERIODO_INICIO.dia);
  const finPeriodoAg = new Date(fin.getFullYear(), cfgAg.PERIODO_FIN.mes - 1, cfgAg.PERIODO_FIN.dia);
  if (fin > finPeriodoAg) {
    inicioPeriodoAg = new Date(fin.getFullYear(), cfgAg.PERIODO_INICIO.mes - 1, cfgAg.PERIODO_INICIO.dia);
  }
  const baseAg = inicio > inicioPeriodoAg ? inicio : inicioPeriodoAg;
  const diasAguinaldo = fin >= baseAg ? calcularDiferenciaFechas(baseAg, fin).totalDias : 0;

  // Vacación: días desde el último aniversario de ingreso.
  let ultimoAniversario = new Date(fin.getFullYear(), inicio.getMonth(), inicio.getDate());
  if (ultimoAniversario > fin) ultimoAniversario = new Date(fin.getFullYear() - 1, inicio.getMonth(), inicio.getDate());
  if (ultimoAniversario < inicio) ultimoAniversario = inicio;
  const diasVacacion = calcularDiferenciaFechas(ultimoAniversario, fin).totalDias;

  const principal =
    modo === 'renuncia'
      ? calcularRenunciaVoluntaria(bruto, periodo.anios, periodo.meses, periodo.dias, { totalDias: periodo.totalDias })
      : calcularIndemnizacion(bruto, periodo.anios, periodo.meses, periodo.dias, { totalDias: periodo.totalDias });

  const aguinaldo = incluirAguinaldo
    ? calcularAguinaldo(bruto, periodo.aniosDecimal, Math.min(365, diasAguinaldo))
    : null;
  const vacacion = incluirVacacion
    ? calcularVacacion(bruto, Math.min(365, diasVacacion), { cotiza: false })
    : null;

  const granTotal = round2(
    (principal.elegible ? principal.montoNeto : 0) +
      (aguinaldo ? aguinaldo.montoNeto : 0) +
      (vacacion ? vacacion.montoNeto : 0)
  );

  return {
    modo,
    periodo,
    principal,
    aguinaldo,
    vacacion,
    diasAguinaldo: Math.min(365, diasAguinaldo),
    diasVacacion: Math.min(365, diasVacacion),
    granTotal,
  };
}

// ════════════════════════════════════════════════════════════
// Servicios profesionales (Art. 156 Código Tributario)
// ════════════════════════════════════════════════════════════

export function calcularHonorarios(montoBruto) {
  const { TASA_RETENCION } = DATA_2026.SERVICIOS_PROFESIONALES;
  const monto = Math.max(0, num(montoBruto));
  const retencion = round2(monto * TASA_RETENCION);
  return {
    montoBruto: round2(monto),
    tasa: TASA_RETENCION,
    retencion,
    neto: round2(monto - retencion),
  };
}

/**
 * Compara trabajar en planilla vs. por honorarios con el mismo monto
 * bruto, incluyendo lo que se deja de acumular en prestaciones.
 */
export function compararPlanillaVsHonorarios(montoBruto) {
  const monto = Math.max(0, num(montoBruto));
  const planilla = calcularSalarioNeto(monto);
  const honorarios = calcularHonorarios(monto);
  const patronal = calcularCostoPatronal(monto);

  // Valor anualizado de lo que un honorario NO recibe.
  const salarioDiario = monto / 30;
  const aguinaldoAnual = round2(salarioDiario * DATA_2026.AGUINALDO.DIAS_PROPORCIONAL);
  const vacacionAnual = round2(
    salarioDiario * DATA_2026.VACACIONES.DIAS_REMUNERADOS * (1 + DATA_2026.VACACIONES.PRIMA)
  );
  const pensionAnual = round2(patronal.afpPatronal * 12);
  const saludAnual = round2(patronal.isssPatronal * 12);
  const prestacionesAnuales = round2(aguinaldoAnual + vacacionAnual + pensionAnual + saludAnual);

  return {
    planilla,
    honorarios,
    patronal,
    diferenciaNetoMensual: round2(honorarios.neto - planilla.salarioNeto),
    prestaciones: {
      aguinaldoAnual,
      vacacionAnual,
      pensionPatronalAnual: pensionAnual,
      saludPatronalAnual: saludAnual,
      total: prestacionesAnuales,
      equivalenteMensual: round2(prestacionesAnuales / 12),
    },
    ventajaRealMensual: round2(honorarios.neto - planilla.salarioNeto - prestacionesAnuales / 12),
  };
}

export function compararConSalarioMinimo(salario) {
  const sm = DATA_2026.SALARIOS_MINIMOS;
  const s = Math.max(0, num(salario));
  return {
    vsComercio: round2((s / sm.COMERCIO_INDUSTRIA_SERVICIOS.mensual) * 100),
    vsMaquila: round2((s / sm.MAQUILA.mensual) * 100),
    vsAgricola: round2((s / sm.AGROPECUARIO.mensual) * 100),
  };
}

// ════════════════════════════════════════════════════════════
// Declaración anual (F-11)
// ════════════════════════════════════════════════════════════

/**
 * Simula la declaración anual de ISR.
 *
 * @param {Array} meses  12 objetos { activo, salarioBruto, retencionServicios, ingresosServicios }
 * @param {object} [opts]
 * @param {number} [opts.otrosIngresos]      Alquileres y otras rentas gravadas
 * @param {number} [opts.gastosMedicos]      Art. 33 — tope $800
 * @param {number} [opts.colegiaturas]       Art. 33 — tope $800
 * @param {boolean}[opts.usarDeduccionFija]  Deducción fija de $1,600 (renta ≤ $9,100)
 * @param {number} [opts.aguinaldoRecibido]  Se excluye la parte exenta ($1,500)
 */
export function simularDeclaracionAnual(meses = [], opts = {}) {
  const ded = DATA_2026.DEDUCCIONES_ANUALES;
  const otrosIngresos = Math.max(0, num(opts.otrosIngresos));
  const aguinaldoRecibido = Math.max(0, num(opts.aguinaldoRecibido));

  let totalSalariosBruto = 0;
  let totalIngresosServicios = 0;
  let totalRetencionesAsalariado = 0;
  let totalRetencionesServicios = 0;
  let deduccionISSSAnual = 0;
  let deduccionAFPAnual = 0;
  const detallesMensual = [];

  for (let i = 0; i < 12; i++) {
    const mes = meses[i];
    if (!mes || !mes.activo) {
      detallesMensual.push({ mes: i + 1, activo: false });
      continue;
    }

    const salB = Math.max(0, num(mes.salarioBruto));
    const retServ = Math.max(0, num(mes.retencionServicios));
    const ingServ = Math.max(0, num(mes.ingresosServicios));

    // Cotizaciones con su tope MENSUAL individual (no anualizado).
    const cot = calcularCotizaciones(salB);
    const calculo = salB > 0 ? calcularSalarioNeto(salB) : null;
    const retencionAsalariado = calculo ? calculo.isrMensual : 0;

    totalSalariosBruto += salB;
    totalIngresosServicios += ingServ;
    totalRetencionesAsalariado += retencionAsalariado;
    totalRetencionesServicios += retServ;
    deduccionISSSAnual += cot.isss;
    deduccionAFPAnual += cot.afp;

    detallesMensual.push({
      mes: i + 1,
      activo: true,
      salarioBruto: round2(salB),
      isss: cot.isss,
      afp: cot.afp,
      isrRetenido: round2(retencionAsalariado),
      ingresosServicios: round2(ingServ),
      retencionServicios: round2(retServ),
    });
  }

  totalSalariosBruto = round2(totalSalariosBruto);
  totalIngresosServicios = round2(totalIngresosServicios);
  deduccionISSSAnual = round2(deduccionISSSAnual);
  deduccionAFPAnual = round2(deduccionAFPAnual);

  // ── Aguinaldo: solo el excedente sobre $1,500 es renta gravada ──
  const aguinaldoExento = round2(Math.min(aguinaldoRecibido, DATA_2026.AGUINALDO.EXENCION_ISR));
  const aguinaldoGravado = round2(Math.max(0, aguinaldoRecibido - DATA_2026.AGUINALDO.EXENCION_ISR));

  const totalIngresosGravados = round2(
    totalSalariosBruto + totalIngresosServicios + otrosIngresos + aguinaldoGravado
  );

  // ── Deducciones (Art. 29 / Art. 33) ──
  const cotizaciones = round2(deduccionISSSAnual + deduccionAFPAnual);
  const esAsalariado = totalSalariosBruto > 0;
  const califica = esAsalariado && totalIngresosGravados <= ded.DEDUCCION_FIJA.rentaMaxima;

  // La deducción fija es EXCLUYENTE de gastos médicos y colegiaturas:
  // se aplica la opción que más convenga al contribuyente.
  const gastosMedicos = Math.min(Math.max(0, num(opts.gastosMedicos)), ded.GASTOS_MEDICOS.tope);
  const colegiaturas = Math.min(Math.max(0, num(opts.colegiaturas)), ded.COLEGIATURA.tope);
  const gastosDocumentados = round2(gastosMedicos + colegiaturas);

  const quiereFija = opts.usarDeduccionFija !== false;
  const usaDeduccionFija =
    califica && quiereFija && ded.DEDUCCION_FIJA.monto >= gastosDocumentados;

  const deduccionFija = usaDeduccionFija ? ded.DEDUCCION_FIJA.monto : 0;
  const deduccionesPersonales = usaDeduccionFija ? deduccionFija : gastosDocumentados;
  const totalDeducciones = round2(cotizaciones + deduccionesPersonales);

  const rentaNetaAnual = round2(Math.max(0, totalIngresosGravados - totalDeducciones));
  const detalleISR = calcularISRConTabla(rentaNetaAnual, DATA_2026.ISR_TRAMOS_ANUAL);
  const isrDeterminado = detalleISR.impuesto;

  const totalRetenciones = round2(totalRetencionesAsalariado + totalRetencionesServicios);
  const saldo = round2(totalRetenciones - isrDeterminado);

  return {
    // Ingresos
    totalSalariosBruto,
    totalIngresosServicios,
    otrosIngresos: round2(otrosIngresos),
    aguinaldoRecibido: round2(aguinaldoRecibido),
    aguinaldoExento,
    aguinaldoGravado,
    totalIngresosGravados,
    // Deducciones
    deduccionISSSAnual,
    deduccionAFPAnual,
    cotizaciones,
    gastosMedicos: round2(gastosMedicos),
    colegiaturas: round2(colegiaturas),
    gastosDocumentados,
    deduccionFija,
    usaDeduccionFija,
    califacaDeduccionFija: califica,
    deduccionesPersonales: round2(deduccionesPersonales),
    totalDeducciones,
    // Determinación
    rentaNetaAnual,
    isrDeterminado,
    tramoAnual: detalleISR.tramo,
    // Retenciones
    totalRetencionesAsalariado: round2(totalRetencionesAsalariado),
    totalRetencionesServicios: round2(totalRetencionesServicios),
    totalRetenciones,
    // Resultado
    saldo: round2(Math.abs(saldo)),
    tipoSaldo: saldo >= 0 ? 'A_FAVOR' : 'A_PAGAR',
    tasaEfectiva: totalIngresosGravados > 0 ? round2((isrDeterminado / totalIngresosGravados) * 100) : 0,
    detallesMensual,
  };
}

/**
 * Recálculo obligatorio de la retención (junio y diciembre).
 *
 * Procedimiento del Decreto Ejecutivo No. 10, Art. 1 literal f):
 * se acumulan las remuneraciones gravadas del período, se les resta la
 * cotización de seguridad social y se aplica la tabla propia de cada
 * recálculo. La diferencia contra lo ya retenido se ajusta en la
 * planilla de ese mes.
 *
 * El primer recálculo acumula enero–junio; el segundo acumula TODO el
 * año, no solo el segundo semestre.
 *
 * @param {'JUNIO'|'DICIEMBRE'} periodoKey
 * @param {Array} meses 12 objetos { activo, salarioBruto }
 * @param {object} [opts]
 * @param {boolean} [opts.aplicarDeduccionFija=true] Considerar el $1,600 del Art. 29 n.º 7
 */
export function calcularRecalculo(periodoKey, meses = [], opts = {}) {
  const periodo = DATA_2026.RECALCULO.PERIODOS.find((p) => p.key === periodoKey);
  if (!periodo) return null;

  const tramos = DATA_2026[periodo.tabla];
  const cfgFija = DATA_2026.DEDUCCIONES_ANUALES.DEDUCCION_FIJA;

  let rentaGravadaPeriodo = 0;
  let cotizacionesPeriodo = 0;
  let retenidoPeriodo = 0;
  let mesesConSalario = 0;
  const detalle = [];

  for (let i = periodo.mesInicio - 1; i <= periodo.mesFin - 1; i++) {
    const mes = meses[i];
    const salB = mes && mes.activo ? Math.max(0, num(mes.salarioBruto)) : 0;
    if (salB <= 0) {
      detalle.push({ mes: i + 1, activo: false });
      continue;
    }
    const calc = calcularSalarioNeto(salB);
    rentaGravadaPeriodo += salB;
    cotizacionesPeriodo += calc.totalDescuentosLey;
    retenidoPeriodo += calc.isrMensual;
    mesesConSalario++;
    detalle.push({
      mes: i + 1,
      activo: true,
      salarioBruto: round2(salB),
      isrRetenido: calc.isrMensual,
    });
  }

  rentaGravadaPeriodo = round2(rentaGravadaPeriodo);
  cotizacionesPeriodo = round2(cotizacionesPeriodo);
  retenidoPeriodo = round2(retenidoPeriodo);

  // Proyección anual solo para decidir si aplica la deducción fija.
  const proporcionAnual = mesesConSalario > 0 ? 12 / mesesConSalario : 0;
  const rentaAnualProyectada = round2(rentaGravadaPeriodo * proporcionAnual);
  const califica = mesesConSalario > 0 && rentaAnualProyectada <= cfgFija.rentaMaxima;

  const usarFija = opts.aplicarDeduccionFija !== false && califica;
  // En el primer recálculo corresponde la mitad de la deducción anual.
  const mesesPeriodo = periodo.mesFin - periodo.mesInicio + 1;
  const deduccionFija = usarFija ? round2((cfgFija.monto * mesesPeriodo) / 12) : 0;

  const baseImponiblePeriodo = round2(
    Math.max(0, rentaGravadaPeriodo - cotizacionesPeriodo - deduccionFija)
  );

  const detalleISR = calcularISRConTabla(baseImponiblePeriodo, tramos);
  const isrCorrespondiente = detalleISR.impuesto;
  const diferencia = round2(isrCorrespondiente - retenidoPeriodo);

  return {
    periodo: periodo.key,
    periodoLabel: periodo.label,
    periodoDetalle: periodo.detalle,
    mesesConSalario,
    rentaGravadaPeriodo,
    cotizacionesPeriodo,
    deduccionFija,
    aplicaDeduccionFija: usarFija,
    califacaDeduccionFija: califica,
    baseImponiblePeriodo,
    tramo: detalleISR.tramo,
    retenidoPeriodo,
    isrCorrespondiente,
    diferencia: round2(Math.abs(diferencia)),
    tipoAjuste: diferencia > 0 ? 'RETENER_MAS' : diferencia < 0 ? 'DEVOLVER' : 'SIN_AJUSTE',
    detalle,
  };
}

// ════════════════════════════════════════════════════════════
// Formato
// ════════════════════════════════════════════════════════════

// Formato fijo (no depende del locale del dispositivo) para que el
// mismo número se vea igual en la página, en el PDF y en los tests.
export const formatUSD = (n) =>
  `$${num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPercent = (n) => `${round2(num(n)).toFixed(2)}%`;
