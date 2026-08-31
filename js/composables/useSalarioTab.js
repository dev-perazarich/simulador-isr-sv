// ============================================================
// useSalarioTab.js — Calculadora de salario neto
// ============================================================

import {
  calcularSalarioNeto,
  calcularHorasExtras,
  calcularCostoPatronal,
  round2,
} from '../modules/calculator.js';
import { DATA_2026 } from '../modules/constants.js';
import { storage, KEYS } from '../modules/storage.js';

const COLORES_DONA = {
  isss: '#f43f5e',
  afp: '#f59e0b',
  isr: '#3b76f6',
  neto: '#10b981',
};

export function useSalarioTab() {
  // ── Estado ────────────────────────────────────────────────
  const salarioInput = Vue.ref('');
  const periodicidad = Vue.ref('MENSUAL');
  const sectorSeleccionado = Vue.ref('COMERCIO_INDUSTRIA_SERVICIOS');
  const otrasDeducciones = Vue.ref('');
  const mostrarExtras = Vue.ref(false);
  const horasExtras = Vue.ref(
    DATA_2026.HORAS_EXTRAS.TIPOS.filter((t) => t.key !== 'NOCTURNIDAD').map((t) => ({
      key: t.key,
      label: t.label,
      recargo: t.recargo,
      horas: '',
    }))
  );

  const resultado = Vue.ref(null);
  const resultadoExtras = Vue.ref(null);
  const costoPatronal = Vue.ref(null);
  const errores = Vue.ref([]);

  // ── Derivados ─────────────────────────────────────────────
  const sectores = Vue.computed(() =>
    Object.entries(DATA_2026.SALARIOS_MINIMOS).map(([key, val]) => ({
      key,
      label: val.label,
      salarioMinimo: val.mensual,
      salarioDiario: val.diario,
    }))
  );

  const sectorActual = Vue.computed(() => DATA_2026.SALARIOS_MINIMOS[sectorSeleccionado.value]);

  const periodicidades = DATA_2026.PERIODICIDADES;

  const periodoActual = Vue.computed(
    () => periodicidades.find((p) => p.key === periodicidad.value) || periodicidades[0]
  );

  /** Tabla de retención que corresponde a la periodicidad elegida. */
  const tablaActual = Vue.computed(() => DATA_2026[periodoActual.value.tabla]);

  /** El salario mínimo es mensual: se lleva a la periodicidad elegida. */
  const comparacionMinimo = Vue.computed(() => {
    const bruto = parseFloat(salarioInput.value);
    if (!isFinite(bruto) || bruto <= 0) return null;
    const min = round2((sectorActual.value.mensual * 12) / periodoActual.value.pagosAlAnio);
    return {
      cumple: bruto >= min,
      minimo: min,
      diferencia: round2(Math.abs(bruto - min)),
      porcentaje: Math.round((bruto / min) * 100),
    };
  });

  /** Segmentos del gráfico de dona, calculados como SVG puro. */
  const segmentos = Vue.computed(() => {
    const r = resultado.value;
    if (!r || r.totalGravado <= 0) return [];
    const partes = [
      { key: 'isss', label: 'ISSS', valor: r.descuentoISSS, color: COLORES_DONA.isss },
      { key: 'afp', label: 'AFP', valor: r.descuentoAFP, color: COLORES_DONA.afp },
      { key: 'isr', label: 'ISR', valor: r.isrMensual, color: COLORES_DONA.isr },
      { key: 'neto', label: 'Recibe', valor: r.salarioNeto, color: COLORES_DONA.neto },
    ].filter((p) => p.valor > 0);

    const total = partes.reduce((s, p) => s + p.valor, 0);
    const CIRC = 2 * Math.PI * 42; // radio 42 en el viewBox de 120
    let offset = 0;
    return partes.map((p) => {
      const fraccion = p.valor / total;
      const largo = fraccion * CIRC;
      const seg = {
        ...p,
        porcentaje: round2(fraccion * 100),
        dash: `${largo} ${CIRC - largo}`,
        offset: -offset,
      };
      offset += largo;
      return seg;
    });
  });

  // ── Acciones ──────────────────────────────────────────────
  function validar() {
    const problemas = [];
    const bruto = parseFloat(salarioInput.value);
    if (!salarioInput.value) problemas.push('Ingrese su salario bruto mensual.');
    else if (!isFinite(bruto) || bruto <= 0) problemas.push('El salario debe ser un número mayor que cero.');
    else if (bruto > 1000000) problemas.push('Revise el monto: parece fuera de rango.');
    errores.value = problemas;
    return problemas.length === 0;
  }

  function calcular() {
    if (!validar()) {
      resultado.value = null;
      return;
    }
    const bruto = parseFloat(salarioInput.value);

    const pagos = periodoActual.value.pagosAlAnio;
    // Las horas extras se calculan sobre el equivalente mensual.
    const brutoMensual = round2((bruto * pagos) / 12);
    const extras = calcularHorasExtras(
      brutoMensual,
      horasExtras.value.map((h) => ({ key: h.key, horas: parseFloat(h.horas) || 0 }))
    );
    resultadoExtras.value = extras.total > 0 ? extras : null;

    // Lo devengado en extras se reparte en el pago del período.
    const extrasDelPeriodo = round2((extras.total * 12) / pagos);

    resultado.value = calcularSalarioNeto(bruto, {
      periodicidad: periodicidad.value,
      otrasRentasGravadas: extrasDelPeriodo,
      otrasDeducciones: parseFloat(otrasDeducciones.value) || 0,
    });
    costoPatronal.value = calcularCostoPatronal(brutoMensual + extras.total);

    storage.set(KEYS.SALARIO, {
      bruto: salarioInput.value,
      brutoMensual,
      periodicidad: periodicidad.value,
      sector: sectorSeleccionado.value,
      otrasDeducciones: otrasDeducciones.value,
      horasExtras: horasExtras.value.map((h) => ({ key: h.key, horas: h.horas })),
    });
  }

  function limpiar() {
    salarioInput.value = '';
    otrasDeducciones.value = '';
    horasExtras.value.forEach((h) => { h.horas = ''; });
    resultado.value = null;
    resultadoExtras.value = null;
    costoPatronal.value = null;
    errores.value = [];
    storage.remove(KEYS.SALARIO);
  }

  function restaurarDatos() {
    const saved = storage.get(KEYS.SALARIO);
    if (!saved) return;
    salarioInput.value = saved.bruto ?? '';
    periodicidad.value = saved.periodicidad || 'MENSUAL';
    sectorSeleccionado.value = saved.sector || sectorSeleccionado.value;
    otrasDeducciones.value = saved.otrasDeducciones ?? '';
    if (Array.isArray(saved.horasExtras)) {
      for (const guardada of saved.horasExtras) {
        const fila = horasExtras.value.find((h) => h.key === guardada.key);
        if (fila) fila.horas = guardada.horas ?? '';
      }
      mostrarExtras.value = saved.horasExtras.some((h) => parseFloat(h.horas) > 0);
    }
    // Se recalcula en silencio: nunca mostramos avisos al restaurar.
    if (parseFloat(salarioInput.value) > 0) calcular();
  }

  return {
    // Estado
    salarioInput,
    periodicidad,
    periodicidades,
    periodoActual,
    tablaActual,
    sectorSeleccionado,
    otrasDeducciones,
    horasExtras,
    mostrarExtras,
    resultado,
    resultadoExtras,
    costoPatronal,
    errores,
    // Derivados
    sectores,
    sectorActual,
    comparacionMinimo,
    segmentos,
    // Acciones
    calcular,
    limpiar,
    restaurarDatos,
  };
}
