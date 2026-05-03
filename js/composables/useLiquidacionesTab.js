import { calcularAguinaldo, calcularIndemnizacion, calcularVacacion, calcularRenunciaVoluntaria } from '../modules/calculator.js';
import { storage } from '../modules/storage.js';

const { ref, watch, computed } = Vue;

export function useLiquidacionesTab() {
  // Estado del formulario
  const liqForm = ref({
    modo: 'despido', // 'despido', 'renuncia', 'aguinaldo', 'vacacion'
    salario: null,
    anios: 1,
    meses: 0,
    dias: 0,
  });

  // Resultados
  const resultadoDespido = ref(null);
  const resultadoRenuncia = ref(null);
  const resultadoAguinaldo = ref(null);
  const resultadoVacacion = ref(null);

  // Computado auxiliar
  const totalAniosDecimal = computed(() => {
    return Number(liqForm.value.anios) + (Number(liqForm.value.meses) / 12) + (Number(liqForm.value.dias) / 365);
  });

  function calcularLiquidaciones() {
    const sal = parseFloat(liqForm.value.salario);
    if (!sal || sal <= 0) {
      alert('Ingresa un salario bruto válido.');
      return;
    }

    const a = parseInt(liqForm.value.anios, 10) || 0;
    const m = parseInt(liqForm.value.meses, 10) || 0;
    const d = parseInt(liqForm.value.dias, 10) || 0;

    // Calcular según el modo
    if (liqForm.value.modo === 'despido') {
      resultadoDespido.value = calcularIndemnizacion(sal, a, m, d);
    } else if (liqForm.value.modo === 'renuncia') {
      resultadoRenuncia.value = calcularRenunciaVoluntaria(sal, a, m, d);
    } else if (liqForm.value.modo === 'aguinaldo') {
      resultadoAguinaldo.value = calcularAguinaldo(sal, totalAniosDecimal.value);
    } else if (liqForm.value.modo === 'vacacion') {
      resultadoVacacion.value = calcularVacacion(sal, totalAniosDecimal.value);
    }

    storage.set('liquidaciones', liqForm.value);
  }

  function limpiarLiquidaciones() {
    liqForm.value = { modo: liqForm.value.modo, salario: null, anios: 1, meses: 0, dias: 0 };
    resultadoDespido.value = null;
    resultadoRenuncia.value = null;
    resultadoAguinaldo.value = null;
    resultadoVacacion.value = null;
  }

  function restaurarDatos() {
    const saved = storage.get('liquidaciones');
    if (saved) {
      liqForm.value = { ...liqForm.value, ...saved };
      if (saved.salario) calcularLiquidaciones();
    }
  }

  // Automáticamente borrar resultados si el usuario cambia montos (para no tener data vieja)
  watch(() => liqForm.value.salario, () => {
    resultadoDespido.value = null;
    resultadoRenuncia.value = null;
    resultadoAguinaldo.value = null;
    resultadoVacacion.value = null;
  });

  return {
    liqForm,
    resultadoDespido,
    resultadoRenuncia,
    resultadoAguinaldo,
    resultadoVacacion,
    calcularLiquidaciones,
    limpiarLiquidaciones,
    restaurarDatos,
  };
}
