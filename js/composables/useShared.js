// ============================================================
// useShared.js — Estado y utilidades comunes a todas las apps
// ============================================================

import { DATA_2026 } from '../modules/constants.js';
import { formatUSD, formatPercent, round2 } from '../modules/calculator.js';

export const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export function useShared() {
  // Mensaje temporal de confirmación (sustituye a los `alert()`)
  const toast = Vue.ref(null);
  let toastTimer = null;

  function notificar(mensaje, tipo = 'info') {
    toast.value = { mensaje, tipo };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.value = null; }, 4000);
  }

  function cerrarToast() {
    clearTimeout(toastTimer);
    toast.value = null;
  }

  return {
    DATA_2026,
    NOMBRES_MESES,
    MESES_CORTOS,
    currentYear: DATA_2026.CURRENT_YEAR,
    fiscalYear: DATA_2026.FISCAL_YEAR,
    // Formateadores disponibles en las plantillas
    fmt: formatUSD,
    pct: formatPercent,
    round2,
    // Avisos
    toast,
    notificar,
    cerrarToast,
  };
}

export default useShared;
