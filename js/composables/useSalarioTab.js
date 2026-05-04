// ============================================================
// useSalarioTab.js — Composable para TAB 1: Calculadora Salario
// ============================================================

import {
  calcularSalarioNeto,
} from '../modules/calculator.js';
import { DATA_APP } from '../modules/constants.js';
import { storage, KEYS } from '../modules/storage.js';

const { ref, computed, nextTick } = Vue;

export function useSalarioTab() {
  
  // ── Estado ──
  const salarioInput = ref('');
  const resultadoSalario = ref(null);
  const sectorSeleccionado = ref('COMERCIO_INDUSTRIA_SERVICIOS');
  let chartInst = null;

  // ── Computed ──
  const sectores = computed(() =>
    Object.entries(DATA_APP.SALARIOS_MINIMOS).map(([key, val]) => ({
      key,
      label: val.label,
      salarioMinimo: val.mensual,
    }))
  );

  const sectorActual = computed(() =>
    DATA_APP.SALARIOS_MINIMOS[sectorSeleccionado.value]
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

  // ── Chart.js ──
  function renderChart(resultado) {
    nextTick(() => {
      const ctx = document.getElementById('salarioChart');
      if (!ctx) return;
      if (chartInst) { chartInst.destroy(); }
      
      chartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['ISSS', 'AFP', 'Renta / ISR', 'Dinero a Recibir'],
          datasets: [{
            data: [
              resultado.descuentoISSS, 
              resultado.descuentoAFP, 
              resultado.isrMensual, 
              resultado.salarioNeto
            ].map(x => x || 0),
            backgroundColor: ['#f43f5e', '#ea580c', '#38bdf8', '#10b981'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } }
          },
          cutout: '65%'
        }
      });
    });
  }

  // ── Métodos ──
  function calcularSalario() {
    const bruto = parseFloat(salarioInput.value);
    if (!bruto || bruto <= 0) return;
    resultadoSalario.value = calcularSalarioNeto(bruto);
    storage.set(KEYS.SALARIO, { bruto, resultado: resultadoSalario.value });
    renderChart(resultadoSalario.value);
  }

  function limpiarSalario() {
    salarioInput.value = '';
    resultadoSalario.value = null;
    if (chartInst) { chartInst.destroy(); chartInst = null; }
    storage.remove(KEYS.SALARIO);
  }

  // ── Restaurar datos de sesión ──
  function restaurarDatos() {
    const savedSalario = storage.get(KEYS.SALARIO);
    if (savedSalario) {
      salarioInput.value = savedSalario.bruto;
      resultadoSalario.value = savedSalario.resultado;
      renderChart(savedSalario.resultado);
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
