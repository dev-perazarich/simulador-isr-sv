// ============================================================
// constants.js — Parámetros fiscales y laborales de El Salvador
// ------------------------------------------------------------
// Cada bloque cita su base legal. Al actualizar un valor, actualiza
// también `fuente` y `VIGENCIA.revisado` para mantener la trazabilidad.
// ============================================================

const currentYear = new Date().getFullYear();
const fiscalYear = currentYear - 1;

// ── Vigencia y trazabilidad ───────────────────────────────────
const VIGENCIA = {
  // Fecha en que se verificaron por última vez todos los parámetros
  revisado: '2026-08-16',
  // Última reforma incorporada
  ultimaReforma: 'D.L. 293 del 30/04/2025 (D.O. N° 79, T. 447) — base exenta ISR a $550/mes',
  // Las tablas de retención se transcribieron del texto oficial
  tablasRetencion: 'Decreto Ejecutivo No. 10 (abril 2025) — Tablas de Retención del ISR',
  fuenteTablas:
    'https://www.jurisprudencia.gob.sv/DocumentosBoveda/D/2/2020-2029/2025/04/10A052.PDF',
};

// ── Salarios mínimos (Consejo Nacional del Salario Mínimo) ────
// Vigentes desde junio 2025. El mensual se obtiene con el factor
// legal de 30.4167 días (365 / 12), no con 30 días.
const SALARIOS_MINIMOS = {
  COMERCIO_INDUSTRIA_SERVICIOS: {
    mensual: 408.80,
    diario: 13.44,
    label: 'Comercio, Industria y Servicios',
    fuente: 'Decreto Ejecutivo de Salarios Mínimos, vigente desde junio 2025',
  },
  MAQUILA: {
    mensual: 402.32,
    diario: 13.227,
    label: 'Maquila Textil y Confección',
    fuente: 'Decreto Ejecutivo de Salarios Mínimos, vigente desde junio 2025',
  },
  AGROPECUARIO: {
    mensual: 305.23,
    diario: 10.035,
    label: 'Sector Agropecuario',
    fuente: 'Decreto Ejecutivo de Salarios Mínimos, vigente desde junio 2025',
  },
};

const SM_COMERCIO = SALARIOS_MINIMOS.COMERCIO_INDUSTRIA_SERVICIOS;

const DATA_2026 = {
  // ── Metadatos ──
  CURRENT_YEAR: currentYear,
  FISCAL_YEAR: fiscalYear,
  VERSION: 'v2.2.0',
  VIGENCIA,

  // ══════════════════════════════════════════════════════════
  // ISR — Tabla de RETENCIÓN mensual
  // Art. 37 LISR reformado por D.L. 293 (30/04/2025).
  // Nota: la tabla oficial NO es continua entre el tramo II y el
  // III (en $895.24 la fórmula del tramo II da $52.19, pero el
  // tramo III arranca en $60.00). Es una consecuencia de que la
  // reforma subió la base exenta y conservó las cuotas fijas
  // anteriores. Se reproduce tal cual porque así se retiene en
  // planilla; ver `detectarSaltoDeTramo()` en calculator.js, que
  // advierte al usuario cuando cae cerca de ese borde.
  // ══════════════════════════════════════════════════════════
  ISR_TRAMOS_MENSUAL: [
    { desde: 0.00,    hasta: 550.00,   tasa: 0,    cuotaFija: 0,      excesoDe: 0,       label: 'I — Exento' },
    { desde: 550.01,  hasta: 895.24,   tasa: 0.10, cuotaFija: 17.67,  excesoDe: 550.00,  label: 'II — 10%'   },
    { desde: 895.25,  hasta: 2038.10,  tasa: 0.20, cuotaFija: 60.00,  excesoDe: 895.24,  label: 'III — 20%'  },
    { desde: 2038.11, hasta: Infinity, tasa: 0.30, cuotaFija: 288.57, excesoDe: 2038.10, label: 'IV — 30%'   },
  ],

  // ── ISR — Retención QUINCENAL ──
  // Decreto Ejecutivo No. 10 (abril 2025), Art. 1 literal b).
  ISR_TRAMOS_QUINCENAL: [
    { desde: 0.00,    hasta: 275.00,   tasa: 0,    cuotaFija: 0,      excesoDe: 0,       label: 'I — Exento' },
    { desde: 275.01,  hasta: 447.62,   tasa: 0.10, cuotaFija: 8.83,   excesoDe: 275.00,  label: 'II — 10%'   },
    { desde: 447.63,  hasta: 1019.05,  tasa: 0.20, cuotaFija: 30.00,  excesoDe: 447.62,  label: 'III — 20%'  },
    { desde: 1019.06, hasta: Infinity, tasa: 0.30, cuotaFija: 144.28, excesoDe: 1019.05, label: 'IV — 30%'   },
  ],

  // ── ISR — Retención SEMANAL ──
  // Decreto Ejecutivo No. 10 (abril 2025), Art. 1 literal c).
  ISR_TRAMOS_SEMANAL: [
    { desde: 0.00,   hasta: 137.50,   tasa: 0,    cuotaFija: 0,     excesoDe: 0,      label: 'I — Exento' },
    { desde: 137.51, hasta: 223.81,   tasa: 0.10, cuotaFija: 4.42,  excesoDe: 137.50, label: 'II — 10%'   },
    { desde: 223.82, hasta: 509.52,   tasa: 0.20, cuotaFija: 15.00, excesoDe: 223.81, label: 'III — 20%'  },
    { desde: 509.53, hasta: Infinity, tasa: 0.30, cuotaFija: 72.14, excesoDe: 509.52, label: 'IV — 30%'   },
  ],

  // ── ISR — Tabla ANUAL (cálculo del impuesto, F-11) ──
  // Art. 37 LISR reformado por D.L. 293 (30/04/2025). Coincide con la
  // tabla del segundo recálculo del Decreto Ejecutivo No. 10.
  ISR_TRAMOS_ANUAL: [
    { desde: 0.00,     hasta: 6600.00,  tasa: 0,    cuotaFija: 0,       excesoDe: 0,        label: 'I — Exento' },
    { desde: 6600.01,  hasta: 10742.86, tasa: 0.10, cuotaFija: 212.12,  excesoDe: 6600.00,  label: 'II — 10%'   },
    { desde: 10742.87, hasta: 24457.14, tasa: 0.20, cuotaFija: 720.00,  excesoDe: 10742.86, label: 'III — 20%'  },
    { desde: 24457.15, hasta: Infinity, tasa: 0.30, cuotaFija: 3462.86, excesoDe: 24457.14, label: 'IV — 30%'   },
  ],

  // ── ISR — Recálculo de JUNIO (primer recálculo) ──
  // Decreto Ejecutivo No. 10 (abril 2025), Art. 1 literal f) numeral 1.
  ISR_TRAMOS_RECALCULO_JUNIO: [
    { desde: 0.00,     hasta: 3300.00,  tasa: 0,    cuotaFija: 0,       excesoDe: 0,        label: 'I — Exento' },
    { desde: 3300.01,  hasta: 5371.44,  tasa: 0.10, cuotaFija: 106.20,  excesoDe: 3300.00,  label: 'II — 10%'   },
    { desde: 5371.45,  hasta: 12228.60, tasa: 0.20, cuotaFija: 360.00,  excesoDe: 5371.44,  label: 'III — 20%'  },
    { desde: 12228.61, hasta: Infinity, tasa: 0.30, cuotaFija: 1731.42, excesoDe: 12228.60, label: 'IV — 30%'   },
  ],

  ISR_FUENTE: {
    ley: 'Ley de Impuesto sobre la Renta, Art. 37',
    reforma: 'D.L. 293 del 30/04/2025 (D.O. N° 79, Tomo 447)',
    tablas: 'Decreto Ejecutivo No. 10 (abril 2025) — Tablas de Retención del ISR',
    url: 'https://www.asamblea.gob.sv/node/13558',
    urlTablas: 'https://www.jurisprudencia.gob.sv/DocumentosBoveda/D/2/2020-2029/2025/04/10A052.PDF',
  },

  // ── Periodicidades de pago disponibles ──
  PERIODICIDADES: [
    { key: 'MENSUAL',   label: 'Mensual',    pagosAlAnio: 12, tabla: 'ISR_TRAMOS_MENSUAL'   },
    { key: 'QUINCENAL', label: 'Quincenal',  pagosAlAnio: 24, tabla: 'ISR_TRAMOS_QUINCENAL' },
    { key: 'SEMANAL',   label: 'Semanal',    pagosAlAnio: 52, tabla: 'ISR_TRAMOS_SEMANAL'   },
  ],

  // ══════════════════════════════════════════════════════════
  // Descuentos de ley (cuota laboral) y aporte patronal
  // ══════════════════════════════════════════════════════════
  DESCUENTOS: {
    ISSS: {
      tasa: 0.03,          // cuota del trabajador
      tasaPatronal: 0.075, // cuota del empleador
      baseMaxima: 1000.00, // techo de cotización (salario base máximo)
      tope: 30.00,         // 3% de $1,000
      topePatronal: 75.00, // 7.5% de $1,000
      fuente: 'Ley del Seguro Social y su Reglamento — régimen de salud',
    },
    AFP: {
      tasa: 0.0725,          // cuota del trabajador
      tasaPatronal: 0.0875,  // cuota del empleador
      baseMaxima: 8016.71,   // ingreso base de cotización máximo
      tope: 581.21,          // 7.25% de $8,016.71
      topePatronal: 701.46,  // 8.75% de $8,016.71
      fuente: 'Ley del Sistema de Ahorro para Pensiones (reforma D.L. 462/2022)',
    },
  },

  // ── Salarios mínimos vigentes ──
  SALARIOS_MINIMOS,

  // ══════════════════════════════════════════════════════════
  // Aguinaldo — Art. 196-202 Código de Trabajo
  // Exención de ISR hasta $1,500 (D.L. 596 del 2022, prorrogado).
  // El período de cómputo va del 12 de diciembre al 11 de diciembre.
  // ══════════════════════════════════════════════════════════
  AGUINALDO: {
    EXENCION_ISR: 1500.00,
    PERIODO_INICIO: { mes: 12, dia: 12 }, // 12 de diciembre del año anterior
    PERIODO_FIN: { mes: 12, dia: 11 },    // 11 de diciembre del año en curso
    PAGO_ENTRE: 'del 12 al 20 de diciembre',
    TRAMOS_DIAS: [
      { aniosDesde: 1,  aniosHasta: 3,        dias: 15, label: '1 a 3 años'     },
      { aniosDesde: 3,  aniosHasta: 10,       dias: 19, label: '3 a 10 años'    },
      { aniosDesde: 10, aniosHasta: Infinity, dias: 21, label: '10 o más años'  },
    ],
    DIAS_PROPORCIONAL: 15, // base para quienes tienen menos de 1 año
    fuente: {
      ley: 'Código de Trabajo, Arts. 196 a 202',
      exencion: 'D.L. 596 (2022) — aguinaldo exento de ISR hasta $1,500',
      url: 'https://www.asamblea.gob.sv/node/13399',
    },
  },

  // ══════════════════════════════════════════════════════════
  // Indemnización por despido sin causa justificada — Art. 58 CT
  // • 30 días de salario básico por año, proporcional por fracción.
  // • Mínimo garantizado: 15 días de salario básico.
  // • Tope: el salario diario de cálculo no puede exceder CUATRO
  //   VECES el salario mínimo DIARIO legal vigente ($13.44 × 4).
  // • Exenta de ISR (Art. 4 LISR) y sin descuento de ISSS ni AFP.
  // ══════════════════════════════════════════════════════════
  INDEMNIZACION: {
    DIAS_POR_ANIO: 30,
    DIAS_MINIMO: 15,
    FACTOR_TOPE_SM: 4,
    TOPE_SALARIO_DIARIO: SM_COMERCIO.diario * 4,        // $53.76
    TOPE_SALARIO_MENSUAL: SM_COMERCIO.diario * 4 * 30,  // $1,612.80 (base 30 días)
    EXENTA_ISR: true,
    fuente: {
      ley: 'Código de Trabajo, Art. 58',
      exencion: 'Ley de Impuesto sobre la Renta, Art. 4 (rentas no gravadas)',
      url: 'https://www.asamblea.gob.sv/sites/default/files/documents/decretos/AD778A29-F1B3-495E-AE19-E2B05D93685D.pdf',
    },
  },

  // ══════════════════════════════════════════════════════════
  // Vacación anual — Art. 177 Código de Trabajo
  // 15 días de salario ordinario + 30% de prima.
  // ══════════════════════════════════════════════════════════
  VACACIONES: {
    DIAS_REMUNERADOS: 15,
    PRIMA: 0.30,
    fuente: { ley: 'Código de Trabajo, Art. 177' },
  },

  // ══════════════════════════════════════════════════════════
  // Prestación por renuncia voluntaria
  // Ley Reguladora de la Prestación Económica por Renuncia
  // Voluntaria (D.L. 592/2013).
  // • 15 días de salario básico por año trabajado.
  // • Requisito: 2 años continuos de trabajo como mínimo.
  // • Tope: salario diario máximo = 2 salarios mínimos diarios.
  // ══════════════════════════════════════════════════════════
  RENUNCIA_VOLUNTARIA: {
    DIAS_POR_ANIO: 15,
    ANIOS_MINIMO: 2,
    FACTOR_TOPE_SM: 2,
    TOPE_SALARIO_DIARIO: SM_COMERCIO.diario * 2,        // $26.88
    TOPE_SALARIO_MENSUAL: SM_COMERCIO.diario * 2 * 30,  // $806.40
    fuente: {
      ley: 'Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (D.L. 592/2013)',
    },
  },

  // ══════════════════════════════════════════════════════════
  // Jornada extraordinaria — Arts. 168, 169 y 170 CT
  // Los factores son MULTIPLICADORES sobre la hora ordinaria
  // (un "recargo del 100%" equivale a pagar 2× la hora).
  // ══════════════════════════════════════════════════════════
  HORAS_EXTRAS: {
    HORAS_JORNADA_DIURNA: 8,
    HORAS_JORNADA_NOCTURNA: 7,
    DIAS_MES: 30,
    TIPOS: [
      { key: 'EXTRA_DIURNA',            factor: 2.00, recargo: '100%', label: 'Extra diurna (día ordinario)' },
      { key: 'EXTRA_NOCTURNA',          factor: 2.25, recargo: '125%', label: 'Extra nocturna (día ordinario)' },
      { key: 'EXTRA_DESCANSO_DIURNA',   factor: 4.00, recargo: '300%', label: 'Extra diurna en día de descanso' },
      { key: 'EXTRA_DESCANSO_NOCTURNA', factor: 4.75, recargo: '375%', label: 'Extra nocturna en día de descanso' },
      { key: 'EXTRA_ASUETO_DIURNA',     factor: 5.00, recargo: '400%', label: 'Extra diurna en día de asueto' },
      { key: 'EXTRA_ASUETO_NOCTURNA',   factor: 6.00, recargo: '500%', label: 'Extra nocturna en día de asueto' },
      { key: 'NOCTURNIDAD',             factor: 1.25, recargo: '25%',  label: 'Recargo por nocturnidad (hora ordinaria)' },
    ],
    fuente: { ley: 'Código de Trabajo, Arts. 168, 169 y 170' },
  },

  // ══════════════════════════════════════════════════════════
  // Deducciones de la declaración anual (F-11)
  // Art. 29 y 33 de la Ley de Impuesto sobre la Renta.
  // ══════════════════════════════════════════════════════════
  DEDUCCIONES_ANUALES: {
    // Art. 29 numeral 7) inciso primero: deducción fija para personas
    // asalariadas cuya renta anual sea igual o inferior a $9,100. No
    // está sujeta a comprobación.
    //
    // Ojo con un detalle que confirma el Decreto Ejecutivo No. 10,
    // literal e): las tablas de retención NO incorporan esta deducción,
    // así que el patrono debe considerarla al retener. Muchos no lo
    // hacen, y de ahí sale el saldo a favor de abril.
    DEDUCCION_FIJA: {
      monto: 1600.00,
      rentaMaxima: 9100.00,
      mensual: 1600.00 / 12,
      label: 'Deducción fija asalariados (renta ≤ $9,100)',
      fuente: 'LISR, Art. 29 numeral 7) inciso primero',
      notaRetencion:
        'Decreto Ejecutivo No. 10 (2025), literal e): las tablas de retención no ' +
        'incorporan esta deducción y debe considerarse al calcular la retención.',
    },
    // Art. 33: aplican a quienes superan los $9,100 de renta anual.
    GASTOS_MEDICOS: {
      tope: 800.00,
      label: 'Gastos médicos y hospitalarios',
      fuente: 'LISR, Art. 33',
    },
    COLEGIATURA: {
      tope: 800.00,
      label: 'Colegiaturas y escolaridad',
      fuente: 'LISR, Art. 33',
    },
  },

  // ══════════════════════════════════════════════════════════
  // Retención por servicios profesionales (rentas no salariales)
  // Art. 156 del Código Tributario — 10% sobre el monto pagado.
  // ══════════════════════════════════════════════════════════
  SERVICIOS_PROFESIONALES: {
    TASA_RETENCION: 0.10,
    fuente: { ley: 'Código Tributario, Art. 156' },
  },

  // ══════════════════════════════════════════════════════════
  // Recálculo obligatorio de la retención (junio y diciembre)
  // Art. 38 LISR / Reglamento de Retenciones: el patrono debe
  // recalcular en junio y diciembre para ajustar lo retenido.
  // ══════════════════════════════════════════════════════════
  // Se acumulan las remuneraciones gravadas del período y se aplica la
  // tabla propia de cada recálculo. Importante: el segundo recálculo
  // acumula TODO el año (enero–diciembre), no solo el segundo semestre.
  RECALCULO: {
    PERIODOS: [
      {
        key: 'JUNIO',
        mesInicio: 1,
        mesFin: 6,
        label: 'Primer recálculo — junio',
        detalle: 'Acumula las remuneraciones gravadas de enero a junio',
        tabla: 'ISR_TRAMOS_RECALCULO_JUNIO',
      },
      {
        key: 'DICIEMBRE',
        mesInicio: 1,
        mesFin: 12,
        label: 'Segundo recálculo — diciembre',
        detalle: 'Acumula las remuneraciones gravadas de todo el año',
        tabla: 'ISR_TRAMOS_ANUAL',
      },
    ],
    fuente: {
      ley: 'LISR Art. 38',
      decreto: 'Decreto Ejecutivo No. 10 (2025), Art. 1 literal f)',
    },
  },
};

export { DATA_2026, SALARIOS_MINIMOS, VIGENCIA };
export default DATA_2026;
