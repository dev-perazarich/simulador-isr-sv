// ============================================================
// useDeclaracionTab.js — Declaración anual (F-11) y recálculos
// ============================================================

import { simularDeclaracionAnual, calcularRecalculo } from '../modules/calculator.js';
import { DATA_2026 } from '../modules/constants.js';
import { storage, KEYS } from '../modules/storage.js';
import { NOMBRES_MESES } from './useShared.js';

export function useDeclaracionTab() {
  // ── Estado ────────────────────────────────────────────────
  const meses = Vue.ref(
    NOMBRES_MESES.map((nombre, i) => ({
      nombre,
      index: i,
      activo: true,
      salarioBruto: '',
      ingresosServicios: '',
      retencionServicios: '',
    }))
  );

  const salarioRapido = Vue.ref('');
  const aguinaldoRecibido = Vue.ref('');
  const otrosIngresos = Vue.ref('');
  const gastosMedicos = Vue.ref('');
  const colegiaturas = Vue.ref('');
  const usarDeduccionFija = Vue.ref(true);
  const mostrarServicios = Vue.ref(false);

  const resultado = Vue.ref(null);
  const recalculos = Vue.ref(null);
  const errores = Vue.ref([]);

  // ── Derivados ─────────────────────────────────────────────
  const mesesActivos = Vue.computed(() => meses.value.filter((m) => m.activo).length);

  const hayDatos = Vue.computed(() =>
    meses.value.some((m) => m.activo && parseFloat(m.salarioBruto) > 0) ||
    parseFloat(otrosIngresos.value) > 0
  );

  const topeGastos = DATA_2026.DEDUCCIONES_ANUALES.GASTOS_MEDICOS.tope;
  const deduccionFijaInfo = DATA_2026.DEDUCCIONES_ANUALES.DEDUCCION_FIJA;

  function payload() {
    return meses.value.map((m) => ({
      activo: m.activo,
      salarioBruto: parseFloat(m.salarioBruto) || 0,
      ingresosServicios: parseFloat(m.ingresosServicios) || 0,
      retencionServicios: parseFloat(m.retencionServicios) || 0,
    }));
  }

  // ── Acciones ──────────────────────────────────────────────
  function validar() {
    const problemas = [];
    if (!hayDatos.value) problemas.push('Ingrese al menos un mes con salario, o algún otro ingreso.');
    if (mesesActivos.value === 0) problemas.push('Debe dejar activo al menos un mes.');
    errores.value = problemas;
    return problemas.length === 0;
  }

  function simular({ silencioso = false } = {}) {
    if (!validar()) {
      if (!silencioso) resultado.value = null;
      return false;
    }
    const datos = payload();

    resultado.value = simularDeclaracionAnual(datos, {
      otrosIngresos: parseFloat(otrosIngresos.value) || 0,
      aguinaldoRecibido: parseFloat(aguinaldoRecibido.value) || 0,
      gastosMedicos: parseFloat(gastosMedicos.value) || 0,
      colegiaturas: parseFloat(colegiaturas.value) || 0,
      usarDeduccionFija: usarDeduccionFija.value,
    });

    recalculos.value = DATA_2026.RECALCULO.PERIODOS.map((p) => calcularRecalculo(p.key, datos));

    storage.set(KEYS.DECLARACION, {
      meses: meses.value.map((m) => ({
        activo: m.activo,
        salarioBruto: m.salarioBruto,
        ingresosServicios: m.ingresosServicios,
        retencionServicios: m.retencionServicios,
      })),
      aguinaldoRecibido: aguinaldoRecibido.value,
      otrosIngresos: otrosIngresos.value,
      gastosMedicos: gastosMedicos.value,
      colegiaturas: colegiaturas.value,
      usarDeduccionFija: usarDeduccionFija.value,
    });
    return true;
  }

  function limpiar() {
    meses.value.forEach((m) => {
      m.activo = true;
      m.salarioBruto = '';
      m.ingresosServicios = '';
      m.retencionServicios = '';
    });
    salarioRapido.value = '';
    aguinaldoRecibido.value = '';
    otrosIngresos.value = '';
    gastosMedicos.value = '';
    colegiaturas.value = '';
    usarDeduccionFija.value = true;
    resultado.value = null;
    recalculos.value = null;
    errores.value = [];
    storage.remove(KEYS.DECLARACION);
  }

  function toggleMes(i) {
    meses.value[i].activo = !meses.value[i].activo;
    resultado.value = null;
  }

  /** Rellena todos los meses activos con el mismo salario. */
  function llenarTodos() {
    const valor = parseFloat(salarioRapido.value);
    if (!isFinite(valor) || valor <= 0) {
      errores.value = ['Escriba un salario válido para rellenar los 12 meses.'];
      return false;
    }
    meses.value.forEach((m) => {
      if (m.activo) m.salarioBruto = String(valor);
    });
    errores.value = [];
    resultado.value = null;
    return true;
  }

  /** Toma el salario guardado en la calculadora de salario neto. */
  function importarDeSalario() {
    const guardado = storage.get(KEYS.SALARIO);
    const bruto = guardado ? parseFloat(guardado.bruto) : NaN;
    if (!isFinite(bruto) || bruto <= 0) return false;
    salarioRapido.value = String(bruto);
    return llenarTodos();
  }

  function restaurarDatos() {
    const saved = storage.get(KEYS.DECLARACION);
    if (!saved) return;
    if (Array.isArray(saved.meses)) {
      meses.value.forEach((m, i) => {
        const s = saved.meses[i];
        if (!s) return;
        m.activo = s.activo !== false;
        m.salarioBruto = s.salarioBruto ?? '';
        m.ingresosServicios = s.ingresosServicios ?? '';
        m.retencionServicios = s.retencionServicios ?? '';
      });
      mostrarServicios.value = saved.meses.some(
        (m) => parseFloat(m.ingresosServicios) > 0 || parseFloat(m.retencionServicios) > 0
      );
    }
    aguinaldoRecibido.value = saved.aguinaldoRecibido ?? '';
    otrosIngresos.value = saved.otrosIngresos ?? '';
    gastosMedicos.value = saved.gastosMedicos ?? '';
    colegiaturas.value = saved.colegiaturas ?? '';
    usarDeduccionFija.value = saved.usarDeduccionFija !== false;
    if (hayDatos.value) {
      simular({ silencioso: true });
      errores.value = [];
    }
  }

  return {
    // Estado
    meses,
    salarioRapido,
    aguinaldoRecibido,
    otrosIngresos,
    gastosMedicos,
    colegiaturas,
    usarDeduccionFija,
    mostrarServicios,
    resultado,
    recalculos,
    errores,
    // Derivados
    mesesActivos,
    hayDatos,
    topeGastos,
    deduccionFijaInfo,
    // Acciones
    simular,
    limpiar,
    toggleMes,
    llenarTodos,
    importarDeSalario,
    restaurarDatos,
  };
}
