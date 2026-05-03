// ============================================================
// useSalarioTab.js — Composable para TAB 1: Calculadora Salario
// ============================================================

import {
  calcularSalarioNeto,
} from '../modules/calculator.js';
import { DATA_2026 } from '../modules/constants.js';
import { storage, KEYS } from '../modules/storage.js';

const { ref, computed } = Vue;

export function useSalarioTab() {
  
  // ── Estado ──
  const salarioInput = ref('');
  const resultadoSalario = ref(null);
  const sectorSeleccionado = ref('COMERCIO_INDUSTRIA_SERVICIOS');

  // ── Computed ──
  const sectores = computed(() =>
    Object.entries(DATA_2026.SALARIOS_MINIMOS).map(([key, val]) => ({
      key,
      label: val.label,
      salarioMinimo: val.mensual,
    }))
  );

  const sectorActual = computed(() =>
    DATA_2026.SALARIOS_MINIMOS[sectorSeleccionado.value]
  );

  const salarioEsSufiMinimo = computed(() => {
    if (!salarioInput.value) return null;
    const min = sectorActual.value.mensual;
    const bruto = parseFloat(salarioInput.value);
    return {
      cumple: bruto >= min,
      diferencia: Math.abs(bruto - min),
      porcentaje: Math.round((bruto / min) * 100),
    };
  });

  // ── Métodos ──
  function calcularSalario() {
    const bruto = parseFloat(salarioInput.value);
    if (!bruto || bruto <= 0) return;
    resultadoSalario.value = calcularSalarioNeto(bruto);
    storage.set(KEYS.SALARIO, { bruto, resultado: resultadoSalario.value });
  }

  function limpiarSalario() {
    salarioInput.value = '';
    resultadoSalario.value = null;
    storage.remove(KEYS.SALARIO);
  }

  // ── Restaurar datos de sesión ──
  function restaurarDatos() {
    const savedSalario = storage.get(KEYS.SALARIO);
    if (savedSalario) {
      salarioInput.value = savedSalario.bruto;
      resultadoSalario.value = savedSalario.resultado;
    }
  }

  return {
    // State
    salarioInput,
    resultadoSalario,
    sectorSeleccionado,
    // Computed
    sectores,
    sectorActual,
    salarioEsSufiMinimo,
    // Methods
    calcularSalario,
    limpiarSalario,
    restaurarDatos,
  };
}
