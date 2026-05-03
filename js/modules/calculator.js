// ============================================================
// calculator.js — Algoritmos puros de cálculo fiscal
// Todos los valores monetarios en USD ($)
// ============================================================

import { DATA_2026 } from './constants.js';

/**
 * Aplica la tabla de ISR mensual y retorna el impuesto a retener.
 * @param {number} rentaNetaImponible - Salario neto después de deducciones ISSS/AFP
 * @returns {number} Monto de ISR mensual
 */
export function calcularISRMensual(rentaNetaImponible) {
  const tramos = DATA_2026.ISR_TRAMOS_MENSUAL;
  for (const tramo of tramos) {
    if (rentaNetaImponible >= tramo.desde && rentaNetaImponible <= tramo.hasta) {
      if (tramo.tasa === 0) return 0;
      return tramo.cuotaFija + (rentaNetaImponible - tramo.excesoDe) * tramo.tasa;
    }
  }
  return 0;
}

/**
 * Aplica la tabla de ISR anual para recálculos de Junio y Diciembre.
 * @param {number} rentaNetaAnual
 * @returns {number} ISR anual
 */
export function calcularISRAnual(rentaNetaAnual) {
  const tramos = DATA_2026.ISR_TRAMOS_ANUAL;
  for (const tramo of tramos) {
    if (rentaNetaAnual >= tramo.desde && rentaNetaAnual <= tramo.hasta) {
      if (tramo.tasa === 0) return 0;
      return tramo.cuotaFija + (rentaNetaAnual - tramo.excesoDe) * tramo.tasa;
    }
  }
  return 0;
}

/**
 * Calcula el salario neto mensual con todos los descuentos de ley.
 * @param {number} salarioBruto
 * @returns {object} Desglose completo
 */
export function calcularSalarioNeto(salarioBruto) {
  const { ISSS, AFP } = DATA_2026.DESCUENTOS;

  // ── Descuento ISSS ──
  const baseISS = Math.min(salarioBruto, ISSS.baseMaxima);
  const descuentoISSSRaw = baseISS * ISSS.tasa;
  const descuentoISSSFinal = Math.min(descuentoISSSRaw, ISSS.tope);

  // ── Descuento AFP ──
  const baseAFP = Math.min(salarioBruto, AFP.baseMaxima);
  const descuentoAFPRaw = baseAFP * AFP.tasa;
  const descuentoAFPFinal = Math.min(descuentoAFPRaw, AFP.tope);

  // ── Renta Neta Imponible (base para ISR) ──
  const totalDescuentosLey = descuentoISSSFinal + descuentoAFPFinal;
  const rentaNetaImponible = Math.max(0, salarioBruto - totalDescuentosLey);

  // ── ISR mensual ──
  const isrMensual = calcularISRMensual(rentaNetaImponible);

  // ── Total descuentos y neto ──
  const totalDescuentos = totalDescuentosLey + isrMensual;
  const salarioNeto = salarioBruto - totalDescuentos;

  // ── Tramo ISR aplicado ──
  const tramosISR = DATA_2026.ISR_TRAMOS_MENSUAL;
  let tramoAplicado = tramosISR[0];
  for (const t of tramosISR) {
    if (rentaNetaImponible >= t.desde && rentaNetaImponible <= t.hasta) {
      tramoAplicado = t;
      break;
    }
  }

  return {
    salarioBruto:       round2(salarioBruto),
    descuentoISSS:      round2(descuentoISSSFinal),
    descuentoAFP:       round2(descuentoAFPFinal),
    totalDescuentosLey: round2(totalDescuentosLey),
    rentaNetaImponible: round2(rentaNetaImponible),
    isrMensual:         round2(isrMensual),
    totalDescuentos:    round2(totalDescuentos),
    salarioNeto:        round2(salarioNeto),
    tramoISR:           tramoAplicado,
    efectividadISR:     salarioBruto > 0 ? round2((isrMensual / salarioBruto) * 100) : 0,
    efectividadTotal:   salarioBruto > 0 ? round2((totalDescuentos / salarioBruto) * 100) : 0,
  };
}

/**
 * Calcula la indemnización según Art. 58 del Código de Trabajo.
 * @param {number} salarioBruto - Salario mensual actual
 * @param {number} anios - Años laborados
 * @param {number} meses - Meses adicionales (0-11)
 * @param {number} dias - Días adicionales (0-30)
 * @returns {object} Desglose de indemnización
 */
export function calcularIndemnizacion(salarioBruto, anios, meses = 0, dias = 0) {
  const { DIAS_POR_ANIO, TOPE_SALARIO_MENSUAL } = DATA_2026.INDEMNIZACION;

  // Aplicar tope salarial ($1,635.20)
  const salarioBase = Math.min(salarioBruto, TOPE_SALARIO_MENSUAL);
  const salarioDiario = salarioBase / 30;

  // Convertir todo a fracción de año
  const totalAnios = anios + (meses / 12) + (dias / 365);

  // Días a indemnizar = 30 días × años laborados
  const diasIndemnizacion = totalAnios * DIAS_POR_ANIO;

  const montoTotal = diasIndemnizacion * salarioDiario;

  const topeAplicado = salarioBruto > TOPE_SALARIO_MENSUAL;

  return {
    salarioBruto:        round2(salarioBruto),
    salarioBaseCalculo:  round2(salarioBase),
    salarioDiario:       round2(salarioDiario),
    topeAplicado,
    topeSalarial:        round2(TOPE_SALARIO_MENSUAL),
    anios,
    meses,
    dias,
    totalAniosDecimal:   round4(totalAnios),
    diasIndemnizacion:   round2(diasIndemnizacion),
    montoTotal:          round2(montoTotal),
  };
}

/**
 * Calcula el aguinaldo según el Decreto Legislativo No. 432.
 * @param {number} salarioBruto - Salario mensual
 * @param {number} aniosServicio - Años de servicio cumplidos
 * @returns {object} Desglose de aguinaldo
 */
export function calcularAguinaldo(salarioBruto, aniosServicio) {
  const { TRAMOS_DIAS, EXENCION_ISR } = DATA_2026.AGUINALDO;

  // Determinar días de aguinaldo
  let diasAguinaldo = 0;
  let tramoAplicado = null;

  for (const tramo of TRAMOS_DIAS) {
    if (aniosServicio >= tramo.aniosDesde && aniosServicio < tramo.aniosHasta) {
      diasAguinaldo = tramo.dias;
      tramoAplicado = tramo;
      break;
    }
  }

  if (aniosServicio < 1) {
    // Proporcional si < 1 año. Art. 200. "Los que no tuvieren un año..."
    // Reciben el equivalente a lo que tocaba por 15 días, dividido entre 365 y multiplicado por los días.
    // Usaremos aniosServicio como fracción decimal para el cálculo exacto proporcional.
    diasAguinaldo = 15; // Base del primer tramo
    const salarioDiario = salarioBruto / 30;
    const montoProporcional = (diasAguinaldo * salarioDiario) * aniosServicio;
    
    const exentoISR = Math.min(montoProporcional, EXENCION_ISR);
    const gravadoISR = Math.max(0, montoProporcional - EXENCION_ISR);
    const isrSobreExcedente = gravadoISR > 0 ? calcularISRAnual(gravadoISR) : 0;

    return {
      elegible: true,
      aniosServicio,
      tramoLabel: 'Proporcional (< 1 año)',
      diasAguinaldo: round2(diasAguinaldo * aniosServicio),
      salarioDiario: round2(salarioDiario),
      montoAguinaldo: round2(montoProporcional),
      exentoISR: round2(exentoISR),
      gravadoISR: round2(gravadoISR),
      isrSobreExcedente: round2(isrSobreExcedente),
      montoNeto: round2(montoProporcional - isrSobreExcedente),
      EXENCION_ISR,
    };
  }

  const salarioDiario = salarioBruto / 30;
  const montoAguinaldo = diasAguinaldo * salarioDiario;

  // ISR sobre aguinaldo: exento hasta $1,500
  // El excedente se trata como ingreso anual adicional — usar tabla ANUAL
  const exentoISR = Math.min(montoAguinaldo, EXENCION_ISR);
  const gravadoISR = Math.max(0, montoAguinaldo - EXENCION_ISR);
  // Bug fix: usar calcularISRAnual() en lugar de calcularISRMensual()
  // ya que el aguinaldo es un pago único, no un ingreso mensual recurrente
  const isrSobreExcedente = gravadoISR > 0 ? calcularISRAnual(gravadoISR) : 0;

  return {
    elegible: true,
    aniosServicio,
    tramoLabel: tramoAplicado?.label,
    diasAguinaldo,
    salarioDiario:      round2(salarioDiario),
    montoAguinaldo:     round2(montoAguinaldo),
    exentoISR:          round2(exentoISR),
    gravadoISR:         round2(gravadoISR),
    isrSobreExcedente:  round2(isrSobreExcedente),
    montoNeto:          round2(montoAguinaldo - isrSobreExcedente),
    EXENCION_ISR,
  };
}

/**
 * Calcula la Vacación Anual (15 días + 30% prima) proporcional o completa.
 * @param {number} salarioBruto
 * @param {number} anios - Si anios < 1 procesa vacación proporcional (como fraccion de año)
 * @returns {object}
 */
export function calcularVacacion(salarioBruto, anios = 1) {
  const { DIAS_REMUNERADOS, PRIMA } = DATA_2026.VACACIONES;
  const salarioDiario = salarioBruto / 30;
  
  // Si anios > 1, calculamos vacacion de 1 año (completa). 
  // Si anios < 1 (fracción decimal), calculamos la parte proporcional del año en curso.
  const periodo = anios >= 1 ? 1 : anios; 
  
  const diasAOtorgar = DIAS_REMUNERADOS * periodo;
  const pagoOrdinario = diasAOtorgar * salarioDiario;
  const primaVacacional = pagoOrdinario * PRIMA;
  const montoBruto = pagoOrdinario + primaVacacional;
  
  // Las vacaciones cotizan ISSS, AFP y se gravan con renta
  const calculoNeto = calcularSalarioNeto(montoBruto);

  return {
    salarioDiario: round2(salarioDiario),
    diasOtorgados: round2(diasAOtorgar),
    pagoOrdinario: round2(pagoOrdinario),
    primaVacacional: round2(primaVacacional),
    montoBruto: round2(montoBruto),
    descuentoISSS: calculoNeto.descuentoISSS,
    descuentoAFP: calculoNeto.descuentoAFP,
    isrRetenido: calculoNeto.isrMensual,
    montoNeto: calculoNeto.salarioNeto
  };
}

/**
 * Calcula la Compensación por Renuncia Voluntaria (Ley Reguladora de la Prestación Económica por Renuncia Voluntaria)
 * @param {number} salarioBruto - Salario mensual actual
 * @param {number} anios - Años laborados
 * @param {number} meses - Meses adicionales (0-11)
 * @param {number} dias - Días adicionales (0-30)
 */
export function calcularRenunciaVoluntaria(salarioBruto, anios, meses = 0, dias = 0) {
  const { DIAS_POR_ANIO, TOPE_SALARIO_MENSUAL } = DATA_2026.RENUNCIA_VOLUNTARIA;

  // Si no tiene al menos 2 años laborados completos, no aplica por ley (Art. 2)
  const totalAnios = anios + (meses / 12) + (dias / 365);
  if (totalAnios < 2) {
    return {
      elegible: false,
      mensaje: "La ley exige un mínimo de 2 años continuos laborados para la prestación por renuncia."
    };
  }

  // Aplicar tope salarial (2 salarios mínimos, no 4 como despido)
  const salarioBase = Math.min(salarioBruto, TOPE_SALARIO_MENSUAL);
  const salarioDiario = salarioBase / 30;

  // 15 días por cada año laborado
  const diasCompensacion = totalAnios * DIAS_POR_ANIO;
  
  const montoTotal = diasCompensacion * salarioDiario;
  const topeAplicado = salarioBruto > TOPE_SALARIO_MENSUAL;

  return {
    elegible: true,
    salarioBruto: round2(salarioBruto),
    salarioBaseCalculo: round2(salarioBase),
    salarioDiario: round2(salarioDiario),
    topeAplicado,
    topeSalarial: round2(TOPE_SALARIO_MENSUAL),
    totalAniosDecimal: round4(totalAnios),
    diasCompensacion: round2(diasCompensacion),
    montoTotal: round2(montoTotal),
  };
}

/**
 * Calcula el ingreso si actúas como Servicios Profesionales (Freelancer)
 * Retención del 10% según Art. 156 del Código Tributario.
 * @param {number} montoBruto
 */
export function calcularHonorarios(montoBruto) {
  const { TASA_RETENCION, EXENCION_MENSUAL } = DATA_2026.SERVICIOS_PROFESIONALES;
  
  const retencion = montoBruto >= EXENCION_MENSUAL ? (montoBruto * TASA_RETENCION) : 0;
  const neto = montoBruto - retencion;

  return {
    montoBruto: round2(montoBruto),
    tasa: TASA_RETENCION,
    retencion: round2(retencion),
    neto: round2(neto)
  };
}

/**
 * Simula la declaración anual de ISR (F-11) para asalariados y/o servicios profesionales.
 * @param {Array} meses - Array de 12 objetos { salarioBruto, retencionServicios }
 * @param {number} otrosIngresos - Otros ingresos gravados (alquileres, etc.)
 * @param {number} gastosDeducibles - Gastos médicos, donativos, etc.
 * @returns {object} Proyección anual F-11
 */
export function simularDeclaracionAnual(meses, otrosIngresos = 0, gastosDeducibles = 0) {
  let totalSalariosBruto = 0;
  let totalRetencionesAsalariado = 0;
  let totalRetencionesServicios = 0;
  const detalles = [];

  for (let i = 0; i < meses.length; i++) {
    const mes = meses[i];
    if (!mes || !mes.activo) {
      detalles.push({ mes: i + 1, activo: false });
      continue;
    }

    const salB = mes.salarioBruto || 0;
    const retServ = mes.retencionServicios || 0;

    const calculo = salB > 0 ? calcularSalarioNeto(salB) : null;
    const retencionAsalariado = calculo ? calculo.isrMensual : 0;

    totalSalariosBruto += salB;
    totalRetencionesAsalariado += retencionAsalariado;
    totalRetencionesServicios += retServ;

    detalles.push({
      mes: i + 1,
      activo: true,
      salarioBruto: round2(salB),
      isrRetenido: round2(retencionAsalariado),
      retencionServicios: round2(retServ),
    });
  }

  // ── Consolidación Anual ──
  // Bug fix: acumular deducciones ISSS/AFP mes a mes (respetando el tope
  // mensual individual) en lugar de aplicar la tasa sobre el total anual.
  // Esto garantiza resultados correctos cuando los salarios varían entre meses.
  let deduccionISSSAnual = 0;
  let deduccionAFPAnual  = 0;
  for (const mes of meses) {
    if (!mes || !mes.activo || !mes.salarioBruto) continue;
    const salB = mes.salarioBruto || 0;
    const { ISSS, AFP } = DATA_2026.DESCUENTOS;
    // ISSS mensual con tope
    deduccionISSSAnual += Math.min(Math.min(salB, ISSS.baseMaxima) * ISSS.tasa, ISSS.tope);
    // AFP mensual con tope
    deduccionAFPAnual  += Math.min(Math.min(salB, AFP.baseMaxima)  * AFP.tasa,  AFP.tope);
  }
  deduccionISSSAnual = round2(deduccionISSSAnual);
  deduccionAFPAnual  = round2(deduccionAFPAnual);

  const totalIngresosGravados = totalSalariosBruto + otrosIngresos;
  const totalDeducciones = deduccionISSSAnual + deduccionAFPAnual + gastosDeducibles;
  const rentaNetaAnual = Math.max(0, totalIngresosGravados - totalDeducciones);

  const isrDeterminado = calcularISRAnual(rentaNetaAnual);
  const totalRetenciones = totalRetencionesAsalariado + totalRetencionesServicios;

  const saldo = totalRetenciones - isrDeterminado;
  const tipoSaldo = saldo >= 0 ? 'A_FAVOR' : 'A_PAGAR';

  return {
    // Ingresos
    totalSalariosBruto:         round2(totalSalariosBruto),
    otrosIngresos:              round2(otrosIngresos),
    totalIngresosGravados:      round2(totalIngresosGravados),
    // Deducciones
    deduccionISSSAnual:         round2(deduccionISSSAnual),
    deduccionAFPAnual:          round2(deduccionAFPAnual),
    gastosDeducibles:           round2(gastosDeducibles),
    totalDeducciones:           round2(totalDeducciones),
    // Base y determinación
    rentaNetaAnual:             round2(rentaNetaAnual),
    isrDeterminado:             round2(isrDeterminado),
    // Retenciones
    totalRetencionesAsalariado: round2(totalRetencionesAsalariado),
    totalRetencionesServicios:  round2(totalRetencionesServicios),
    totalRetenciones:           round2(totalRetenciones),
    // Resultado
    saldo:                      round2(Math.abs(saldo)),
    tipoSaldo,
    tasaEfectiva:               totalIngresosGravados > 0 ? round2((isrDeterminado / totalIngresosGravados) * 100) : 0,
    // Detalle mensual
    detallesMensual: detalles,
  };
}

/**
 * Compara el salario bruto ingresado con los salarios mínimos vigentes.
 * @param {number} salario
 * @returns {object}
 */
export function compararConSalarioMinimo(salario) {
  const sm = DATA_2026.SALARIOS_MINIMOS;
  return {
    vsComercio:  round2((salario / sm.COMERCIO_INDUSTRIA_SERVICIOS.mensual) * 100),
    vsMaquila:   round2((salario / sm.MAQUILA.mensual) * 100),
    vsAgricola:  round2((salario / sm.AGROPECUARIO.mensual) * 100),
  };
}

// ── Helpers ──
function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

export const formatUSD = (n) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n || 0);