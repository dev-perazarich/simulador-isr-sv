// ============================================================
// constants.js — "La Biblia" de datos fiscales El Salvador 2026
// Parámetros vigentes según decretos legislativos 2025-2026
// ============================================================

export const DATA_2026 = {

  // ── ISR: Tabla de Retención Mensual (Art. 37 reformado) ──
  ISR_TRAMOS_MENSUAL: [
    { desde: 0,       hasta: 550.00,   tasa: 0,    cuotaFija: 0,      excesoDe: 0       }, // Tramo I: Exento
    { desde: 550.01,  hasta: 895.24,   tasa: 0.10, cuotaFija: 17.67,  excesoDe: 550.00  }, // Tramo II: 10%
    { desde: 895.25,  hasta: 2038.10,  tasa: 0.20, cuotaFija: 60.00,  excesoDe: 895.24  }, // Tramo III: 20%
    { desde: 2038.11, hasta: Infinity, tasa: 0.30, cuotaFija: 288.57, excesoDe: 2038.10 }, // Tramo IV: 30%
  ],

  // ── ISR: Tabla Anual para Recálculo (Junio y Diciembre) ──
  ISR_TRAMOS_ANUAL: [
    { desde: 0,        hasta: 6600.00,   tasa: 0,    cuotaFija: 0,       excesoDe: 0        },
    { desde: 6600.01,  hasta: 10742.88,  tasa: 0.10, cuotaFija: 212.12,  excesoDe: 6600.00  },
    { desde: 10742.89, hasta: 24457.14,  tasa: 0.20, cuotaFija: 720.00,  excesoDe: 10742.88 },
    { desde: 24457.15, hasta: Infinity,  tasa: 0.30, cuotaFija: 3462.86, excesoDe: 24457.14 },
  ],

  // ── Descuentos de Ley ──
  DESCUENTOS: {
    ISSS: {
      tasa: 0.03,
      tope: 30.00,          // Tope máximo de descuento mensual
      baseMaxima: 1000.00,  // Base salarial máxima afecta
    },
    AFP: {
      tasa: 0.0725,
      tope: 581.21,          // Tope máximo de descuento mensual
      baseMaxima: 8016.71,   // Base salarial máxima afecta
    },
  },

  // ── Salarios Mínimos Vigentes (desde Junio 2025) ──
  SALARIOS_MINIMOS: {
    COMERCIO_INDUSTRIA_SERVICIOS: {
      mensual: 408.80,
      diario: 13.44,
      label: 'Comercio, Industria y Servicios',
    },
    MAQUILA: {
      mensual: 402.32,
      diario: 13.227,
      label: 'Maquila Textil y Confección',
    },
    AGROPECUARIO: {
      mensual: 305.23,
      diario: 10.035,
      label: 'Sector Agrícola / Agropecuario',
    },
  },

  // ── Aguinaldo (Decreto Legislativo No. 432) ──
  AGUINALDO: {
    EXENCION_ISR: 1500.00,   // Monto exento de ISR
    TRAMOS_DIAS: [
      { aniosDesde: 1,  aniosHasta: 3,        dias: 15, label: '1 a 3 años'  },
      { aniosDesde: 3,  aniosHasta: 10,       dias: 19, label: '3 a 10 años' },
      { aniosDesde: 10, aniosHasta: Infinity, dias: 21, label: '10 o más años' },
    ],
  },

  // ── Indemnización (Art. 58 Código de Trabajo) ──
  INDEMNIZACION: {
    DIAS_POR_ANIO: 30,
    // Tope: 4 salarios mínimos del sector comercio
    get TOPE_SALARIO_MENSUAL() {
      return DATA_2026.SALARIOS_MINIMOS.COMERCIO_INDUSTRIA_SERVICIOS.mensual * 4; // $1,635.20
    },
  },

  // ── Vacaciones (Art. 177 Código de Trabajo) ──
  VACACIONES: {
    DIAS_REMUNERADOS: 15,
    PRIMA: 0.30, // 30% sobre los 15 días ordinarios
  },

  // ── Ley de Renuncia Voluntaria (Art. 8) ──
  RENUNCIA_VOLUNTARIA: {
    DIAS_POR_ANIO: 15,
    // Tope: 2 salarios mínimos del sector comercio
    get TOPE_SALARIO_MENSUAL() {
      return DATA_2026.SALARIOS_MINIMOS.COMERCIO_INDUSTRIA_SERVICIOS.mensual * 2; // $817.60
    },
  },

  // ── Retención por Servicios Profesionales ──
  SERVICIOS_PROFESIONALES: {
    TASA_RETENCION: 0.10, // 10% de retención en la fuente
    EXENCION_MENSUAL: 100.00, // Si el pago es menor a $100, no hay retención
  },

  // ── Año Fiscal ──
  ANIO_FISCAL: 2025,
  VERSION: '2026.1',
};

export default DATA_2026;