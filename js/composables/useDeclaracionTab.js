// ============================================================
// useDeclaracionTab.js — Composable para TAB 3: Declaración Anual ISR
// ============================================================

import {
  simularDeclaracionAnual,
} from '../modules/calculator.js';
import { storage, KEYS } from '../modules/storage.js';

const { ref } = Vue;

const NOMBRES_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export function useDeclaracionTab() {
  
  // ── Estado ──
  const mesesDeclaracion = ref(
    NOMBRES_MESES.map((nombre, i) => ({
      nombre,
      index: i,
      activo: true,
      salarioBruto: '',
      retencionServicios: '',
    }))
  );

  const otrosIngresos = ref('');
  const gastosDeducibles = ref('');
  const resultadoAnual = ref(null);
  const mostrandoMeses = ref(false);
  // Ref reactiva para el campo "Relleno rápido" — reemplaza document.getElementById()
  const salarioRapidoInput = ref('');

  // ── Métodos ──
  function simularAnual() {
    const mesesData = mesesDeclaracion.value.map(m => ({
      activo: m.activo,
      salarioBruto: parseFloat(m.salarioBruto) || 0,
      retencionServicios: parseFloat(m.retencionServicios) || 0,
    }));
    
    resultadoAnual.value = simularDeclaracionAnual(
      mesesData,
      parseFloat(otrosIngresos.value) || 0,
      parseFloat(gastosDeducibles.value) || 0,
    );
    
    storage.set(KEYS.DECLARACION, {
      meses: mesesData,
      resultado: resultadoAnual.value,
    });
  }

  function limpiarAnual() {
    mesesDeclaracion.value.forEach(m => {
      m.activo = true;
      m.salarioBruto = '';
      m.retencionServicios = '';
    });
    otrosIngresos.value = '';
    gastosDeducibles.value = '';
    resultadoAnual.value = null;
    storage.remove(KEYS.DECLARACION);
  }

  function toggleMes(index) {
    mesesDeclaracion.value[index].activo = !mesesDeclaracion.value[index].activo;
  }

  function llenarSalarioUniforme(salario) {
    mesesDeclaracion.value.forEach(m => {
      if (m.activo) m.salarioBruto = salario;
    });
  }

  // ── Sincronizar con Tab 1 (Salario) ──
  function usarSalarioCalculado(resultadoSalarioTab) {
    if (resultadoSalarioTab) {
      const bruto = resultadoSalarioTab.salarioBruto.toString();
      llenarSalarioUniforme(bruto);
      return true; // Indica que se debe cambiar a tab 'declaracion'
    }
    return false;
  }

  // ── Restaurar datos de sesión ──
  function restaurarDatos() {
    const saved = storage.get(KEYS.DECLARACION);
    if (saved) {
      const { meses, resultado } = saved;
      mesesDeclaracion.value.forEach((m, i) => {
        if (meses[i]) {
          m.activo = meses[i].activo;
          m.salarioBruto = meses[i].salarioBruto || '';
          m.retencionServicios = meses[i].retencionServicios || '';
        }
      });
      resultadoAnual.value = resultado;
    }
  }

  return {
    // State
    mesesDeclaracion,
    otrosIngresos,
    gastosDeducibles,
    resultadoAnual,
    mostrandoMeses,
    salarioRapidoInput, // ref para el campo de relleno rápido
    // Methods
    simularAnual,
    limpiarAnual,
    toggleMes,
    llenarSalarioUniforme,
    usarSalarioCalculado,
    restaurarDatos,
  };
}
