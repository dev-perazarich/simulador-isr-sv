// ============================================================
// useComparadorTab.js — Planilla vs. servicios profesionales
// ============================================================

import { compararPlanillaVsHonorarios } from '../modules/calculator.js';
import { storage, KEYS } from '../modules/storage.js';

export function useComparadorTab() {
  const montoInput = Vue.ref('');
  const resultado = Vue.ref(null);
  const errores = Vue.ref([]);

  const ganadorNeto = Vue.computed(() => {
    if (!resultado.value) return null;
    return resultado.value.diferenciaNetoMensual >= 0 ? 'honorarios' : 'planilla';
  });

  const ganadorReal = Vue.computed(() => {
    if (!resultado.value) return null;
    return resultado.value.ventajaRealMensual >= 0 ? 'honorarios' : 'planilla';
  });

  function validar() {
    const problemas = [];
    const monto = parseFloat(montoInput.value);
    if (!montoInput.value) problemas.push('Ingrese el monto bruto mensual a comparar.');
    else if (!isFinite(monto) || monto <= 0) problemas.push('El monto debe ser mayor que cero.');
    errores.value = problemas;
    return problemas.length === 0;
  }

  function comparar({ silencioso = false } = {}) {
    if (!validar()) {
      if (!silencioso) resultado.value = null;
      return false;
    }
    resultado.value = compararPlanillaVsHonorarios(parseFloat(montoInput.value));
    storage.set(KEYS.COMPARADOR, { monto: montoInput.value });
    return true;
  }

  function limpiar() {
    montoInput.value = '';
    resultado.value = null;
    errores.value = [];
    storage.remove(KEYS.COMPARADOR);
  }

  function restaurarDatos() {
    const saved = storage.get(KEYS.COMPARADOR);
    if (!saved || !saved.monto) return;
    montoInput.value = saved.monto;
    comparar({ silencioso: true });
    errores.value = [];
  }

  Vue.watch(montoInput, () => { resultado.value = null; });

  return {
    montoInput,
    resultado,
    errores,
    ganadorNeto,
    ganadorReal,
    comparar,
    limpiar,
    restaurarDatos,
  };
}
