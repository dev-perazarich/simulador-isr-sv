// ============================================================
// useLiquidacionesTab.js — Prestaciones y liquidación laboral
// ============================================================

import {
  calcularDiferenciaFechas,
  calcularIndemnizacion,
  calcularRenunciaVoluntaria,
  calcularAguinaldo,
  calcularVacacion,
  calcularLiquidacionCompleta,
  formatFechaLocal,
  parseFechaLocal,
  tiempoADias,
} from '../modules/calculator.js';
import { DATA_2026 } from '../modules/constants.js';
import { storage, KEYS } from '../modules/storage.js';

export const MODOS = [
  { key: 'completa',  label: 'Liquidación completa', desc: 'Indemnización + aguinaldo + vacación' },
  { key: 'despido',   label: 'Indemnización',        desc: 'Despido sin causa justificada (Art. 58 CT)' },
  { key: 'renuncia',  label: 'Renuncia voluntaria',  desc: 'Prestación del D.L. 592/2013' },
  { key: 'aguinaldo', label: 'Aguinaldo',            desc: 'Arts. 196-202 CT' },
  { key: 'vacacion',  label: 'Vacación',             desc: '15 días + 30% de prima (Art. 177 CT)' },
];

export function useLiquidacionesTab() {
  const hoy = formatFechaLocal(new Date());

  // ── Estado ────────────────────────────────────────────────
  const form = Vue.ref({
    modo: 'completa',
    salario: '',
    fechaInicio: '',
    fechaFin: hoy,
    manual: false,
    anios: '',
    meses: '',
    dias: '',
  });

  const resultado = Vue.ref(null);
  const errores = Vue.ref([]);

  // ── Antigüedad calculada a partir de las fechas ───────────
  const antiguedad = Vue.computed(() => {
    if (form.value.manual) {
      const totalDias = tiempoADias(form.value.anios, form.value.meses, form.value.dias);
      return {
        anios: parseInt(form.value.anios, 10) || 0,
        meses: parseInt(form.value.meses, 10) || 0,
        dias: parseInt(form.value.dias, 10) || 0,
        totalDias,
        aniosDecimal: totalDias / 365,
      };
    }
    if (!form.value.fechaInicio || !form.value.fechaFin) return null;
    return calcularDiferenciaFechas(form.value.fechaInicio, form.value.fechaFin);
  });

  const modoActual = Vue.computed(() => MODOS.find((m) => m.key === form.value.modo));

  /** Días del período de aguinaldo (12 dic → 11 dic) ya trabajados. */
  function diasPeriodoAguinaldo() {
    const ant = antiguedad.value;
    if (form.value.manual || !form.value.fechaInicio) {
      return Math.min(365, ant ? ant.totalDias : 0);
    }
    const cfg = DATA_2026.AGUINALDO;
    const inicio = parseFechaLocal(form.value.fechaInicio);
    const fin = parseFechaLocal(form.value.fechaFin);
    if (!inicio || !fin) return 0;

    const finPeriodo = new Date(fin.getFullYear(), cfg.PERIODO_FIN.mes - 1, cfg.PERIODO_FIN.dia);
    const anioInicioPeriodo = fin > finPeriodo ? fin.getFullYear() : fin.getFullYear() - 1;
    let base = new Date(anioInicioPeriodo, cfg.PERIODO_INICIO.mes - 1, cfg.PERIODO_INICIO.dia);
    if (inicio > base) base = inicio;
    if (fin < base) return 0;
    return Math.min(365, calcularDiferenciaFechas(base, fin).totalDias);
  }

  /** Días transcurridos del ciclo anual de vacación en curso. */
  function diasCicloVacacion() {
    const ant = antiguedad.value;
    if (form.value.manual || !form.value.fechaInicio) {
      return Math.min(365, ant ? ant.totalDias : 0);
    }
    const inicio = parseFechaLocal(form.value.fechaInicio);
    const fin = parseFechaLocal(form.value.fechaFin);
    if (!inicio || !fin) return 0;

    let aniversario = new Date(fin.getFullYear(), inicio.getMonth(), inicio.getDate());
    if (aniversario > fin) aniversario = new Date(fin.getFullYear() - 1, inicio.getMonth(), inicio.getDate());
    if (aniversario < inicio) aniversario = inicio;
    return Math.min(365, calcularDiferenciaFechas(aniversario, fin).totalDias);
  }

  // ── Validación ────────────────────────────────────────────
  function validar() {
    const problemas = [];
    const sal = parseFloat(form.value.salario);

    if (!form.value.salario) problemas.push('Ingrese su salario bruto mensual.');
    else if (!isFinite(sal) || sal <= 0) problemas.push('El salario debe ser mayor que cero.');

    if (form.value.manual) {
      const total = tiempoADias(form.value.anios, form.value.meses, form.value.dias);
      if (total <= 0) problemas.push('Indique cuánto tiempo lleva laborando.');
      const meses = parseInt(form.value.meses, 10) || 0;
      const dias = parseInt(form.value.dias, 10) || 0;
      if (meses > 11) problemas.push('Los meses deben ir de 0 a 11.');
      if (dias > 30) problemas.push('Los días deben ir de 0 a 30.');
    } else {
      if (!form.value.fechaInicio) problemas.push('Indique la fecha de ingreso.');
      if (!form.value.fechaFin) problemas.push('Indique la fecha de salida.');
      if (form.value.fechaInicio && form.value.fechaFin) {
        const ini = parseFechaLocal(form.value.fechaInicio);
        const fin = parseFechaLocal(form.value.fechaFin);
        if (ini && fin && ini > fin) problemas.push('La fecha de ingreso no puede ser posterior a la de salida.');
      }
    }

    errores.value = problemas;
    return problemas.length === 0;
  }

  // ── Cálculo ───────────────────────────────────────────────
  function calcular({ silencioso = false } = {}) {
    if (!validar()) {
      if (!silencioso) resultado.value = null;
      return false;
    }

    const sal = parseFloat(form.value.salario);
    const ant = antiguedad.value;
    const opts = { totalDias: ant.totalDias };

    switch (form.value.modo) {
      case 'completa':
        resultado.value = form.value.manual
          ? construirCompletaManual(sal, ant)
          : calcularLiquidacionCompleta({
              salarioBruto: sal,
              fechaInicio: form.value.fechaInicio,
              fechaFin: form.value.fechaFin,
              modo: 'despido',
            });
        break;
      case 'despido':
        resultado.value = calcularIndemnizacion(sal, ant.anios, ant.meses, ant.dias, opts);
        break;
      case 'renuncia':
        resultado.value = calcularRenunciaVoluntaria(sal, ant.anios, ant.meses, ant.dias, opts);
        break;
      case 'aguinaldo':
        resultado.value = calcularAguinaldo(sal, ant.aniosDecimal, diasPeriodoAguinaldo());
        break;
      case 'vacacion':
        resultado.value = calcularVacacion(sal, diasCicloVacacion(), { cotiza: true });
        break;
    }

    storage.set(KEYS.LIQUIDACION, { ...form.value });
    return true;
  }

  /** En modo manual se arma la liquidación completa pieza por pieza. */
  function construirCompletaManual(sal, ant) {
    const principal = calcularIndemnizacion(sal, ant.anios, ant.meses, ant.dias, {
      totalDias: ant.totalDias,
    });
    const diasProporcion = Math.min(365, (ant.meses * 30) + ant.dias || ant.totalDias);
    const aguinaldo = calcularAguinaldo(sal, ant.aniosDecimal, diasProporcion);
    const vacacion = calcularVacacion(sal, diasProporcion, { cotiza: false });
    return {
      modo: 'despido',
      periodo: ant,
      principal,
      aguinaldo,
      vacacion,
      diasAguinaldo: diasProporcion,
      diasVacacion: diasProporcion,
      granTotal:
        Math.round((principal.montoNeto + aguinaldo.montoNeto + vacacion.montoNeto) * 100) / 100,
    };
  }

  function limpiar() {
    form.value = {
      modo: form.value.modo,
      salario: '',
      fechaInicio: '',
      fechaFin: hoy,
      manual: false,
      anios: '',
      meses: '',
      dias: '',
    };
    resultado.value = null;
    errores.value = [];
    storage.remove(KEYS.LIQUIDACION);
  }

  function cambiarModo(modo) {
    form.value.modo = modo;
    resultado.value = null;
    errores.value = [];
  }

  function restaurarDatos() {
    const saved = storage.get(KEYS.LIQUIDACION);
    if (!saved) return;
    form.value = { ...form.value, ...saved };
    // Silencioso: al volver a la página nunca mostramos errores de validación.
    if (parseFloat(form.value.salario) > 0) {
      errores.value = [];
      calcular({ silencioso: true });
      errores.value = [];
    }
  }

  // Si cambian los datos de entrada, el resultado anterior deja de ser válido.
  Vue.watch(
    () => [form.value.salario, form.value.fechaInicio, form.value.fechaFin, form.value.manual,
           form.value.anios, form.value.meses, form.value.dias],
    () => { resultado.value = null; }
  );

  return {
    MODOS,
    form,
    resultado,
    errores,
    antiguedad,
    modoActual,
    calcular,
    limpiar,
    cambiarModo,
    restaurarDatos,
  };
}
