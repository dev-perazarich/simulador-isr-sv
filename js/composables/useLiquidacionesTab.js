import { calcularAguinaldo, calcularIndemnizacion, calcularVacacion, calcularRenunciaVoluntaria } from '../modules/calculator.js';
import { storage } from '../modules/storage.js';


export function useLiquidacionesTab() {
  // Estado del formulario
  const liqForm = Vue.ref({
    modo: 'despido', // 'despido', 'renuncia', 'aguinaldo', 'vacacion'
    salario: null,
    fechaInicio: '',
    fechaFin: new Date().toISOString().split('T')[0],
    anios: 0,
    meses: 0,
    dias: 0,
    manual: false,
  });


  // Resultados
  const resultadoDespido = Vue.ref(null);
  const resultadoRenuncia = Vue.ref(null);
  const resultadoAguinaldo = Vue.ref(null);
  const resultadoVacacion = Vue.ref(null);

  // Computado auxiliar
  import { calcularAguinaldo, calcularIndemnizacion, calcularVacacion, calcularRenunciaVoluntaria, calcularDiferenciaFechas } from '../modules/calculator.js';

  // Watcher para calcular tiempo desde fechas
  Vue.watch([() => liqForm.value.fechaInicio, () => liqForm.value.fechaFin], ([inicio, fin]) => {
    if (!liqForm.value.manual && inicio && fin) {
      const diff = calcularDiferenciaFechas(inicio, fin);
      if (diff) {
        liqForm.value.anios = diff.anios;
        liqForm.value.meses = diff.meses;
        liqForm.value.dias = diff.dias;
      }
    }
  });


  function calcularLiquidaciones() {
    const sal = parseFloat(liqForm.value.salario);
    if (!sal || sal <= 0) {
      alert('Ingresa un salario bruto válido.');
      return;
    }

    // Años, meses, días para indemnización/renuncia (tiempo total)
    const d = parseInt(liqForm.value.dias, 10) || 0;
    const m = parseInt(liqForm.value.meses, 10) || 0;
    const a = parseInt(liqForm.value.anios, 10) || 0;
    
    // --- Lógica de períodos para proporcionalidad ---
    let diasAguinaldo = 0;
    let diasVacacion = 0;

    if (liqForm.value.fechaInicio && liqForm.value.fechaFin) {
      const fIni = new Date(liqForm.value.fechaInicio);
      const fFin = new Date(liqForm.value.fechaFin);
      
      // 1. Aguinaldo: Días en el año calendario actual (desde 1 de Enero o fIni)
      const inicioAnioActual = new Date(fFin.getFullYear(), 0, 1);
      const baseAguinaldo = fIni > inicioAnioActual ? fIni : inicioAnioActual;
      const diffAguinaldo = calcularDiferenciaFechas(baseAguinaldo, fFin);
      diasAguinaldo = diffAguinaldo ? diffAguinaldo.totalDias : 0;

      // 2. Vacación: Días desde el último aniversario
      let ultimoAniversario = new Date(fIni);
      ultimoAniversario.setFullYear(fFin.getFullYear());
      if (ultimoAniversario > fFin) {
        ultimoAniversario.setFullYear(fFin.getFullYear() - 1);
      }
      const diffVacacion = calcularDiferenciaFechas(ultimoAniversario, fFin);
      diasVacacion = diffVacacion ? diffVacacion.totalDias : 0;
    } else {
      // Si es manual, estimamos 30 días por mes
      diasAguinaldo = (m * 30) + d;
      diasVacacion = (m * 30) + d;
    }

    // Calcular según el modo
    if (liqForm.value.modo === 'despido') {
      resultadoDespido.value = calcularIndemnizacion(sal, a, m, d);
    } else if (liqForm.value.modo === 'renuncia') {
      resultadoRenuncia.value = calcularRenunciaVoluntaria(sal, a, m, d);
    } else if (liqForm.value.modo === 'aguinaldo') {
      resultadoAguinaldo.value = calcularAguinaldo(sal, a, diasAguinaldo);
    } else if (liqForm.value.modo === 'vacacion') {
      resultadoVacacion.value = calcularVacacion(sal, diasVacacion);
    }



    storage.set('liquidaciones', liqForm.value);
  }

  function limpiarLiquidaciones() {
    liqForm.value = { 
      modo: liqForm.value.modo, 
      salario: null, 
      fechaInicio: '', 
      fechaFin: new Date().toISOString().split('T')[0],
      anios: 0, 
      meses: 0, 
      dias: 0,
      manual: false
    };
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
  Vue.watch(() => liqForm.value.salario, () => {
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
