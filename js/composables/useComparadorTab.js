import { calcularSalarioNeto, calcularHonorarios } from '../modules/calculator.js';
import { storage } from '../modules/storage.js';

export function useComparadorTab() {
  const montoInput = Vue.ref('');
  const resultadoPlanilla = Vue.ref(null);
  const resultadoHonorarios = Vue.ref(null);

  function compararOpciones() {
    const monto = parseFloat(montoInput.value);
    if (!monto || monto <= 0) {
      alert('Ingresa un monto bruto válido para comparar.');
      return;
    }

    resultadoPlanilla.value = calcularSalarioNeto(monto);
    resultadoHonorarios.value = calcularHonorarios(monto);

    storage.set('comparador', { monto });
  }

  function limpiarComparador() {
    montoInput.value = '';
    resultadoPlanilla.value = null;
    resultadoHonorarios.value = null;
  }

  function restaurarDatos() {
    const saved = storage.get('comparador');
    if (saved && saved.monto) {
      montoInput.value = saved.monto;
      compararOpciones();
    }
  }

  return {
    montoInput,
    resultadoPlanilla,
    resultadoHonorarios,
    compararOpciones,
    limpiarComparador,
    restaurarDatos,
  };
}
