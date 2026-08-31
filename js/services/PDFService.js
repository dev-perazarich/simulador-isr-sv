// ============================================================
// PDFService.js — Exportación de resultados a PDF
// ------------------------------------------------------------
// jsPDF pesa ~350 KB, así que se carga solo cuando el usuario pide
// un PDF. El Service Worker lo mantiene en caché para que también
// funcione sin conexión.
// ============================================================

import { formatUSD } from '../modules/calculator.js';
import { DATA_2026 } from '../modules/constants.js';

const JSPDF_URL = '/vendor/jspdf.umd.min.js';
const MARCA = [29, 67, 216];   // brand-700
const TEXTO = [13, 18, 32];
const SUAVE = [101, 116, 147];

let cargando = null;

/** Inyecta jsPDF una sola vez y resuelve con el constructor. */
function cargarJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (cargando) return cargando;

  cargando = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.onload = () =>
      window.jspdf?.jsPDF
        ? resolve(window.jspdf.jsPDF)
        : reject(new Error('jsPDF se cargó pero no quedó disponible.'));
    s.onerror = () => {
      cargando = null;
      reject(new Error('No se pudo cargar el generador de PDF.'));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

export class PDFService {
  async _nuevoDoc(subtitulo) {
    const JsPDF = await cargarJsPDF();
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(...MARCA);
    doc.rect(0, 0, w, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RentaSV', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Simulador fiscal y laboral de El Salvador', 14, 18);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-SV')}`,
      w - 14,
      12,
      { align: 'right' }
    );
    doc.text(DATA_2026.VERSION, w - 14, 18, { align: 'right' });

    doc.setTextColor(...TEXTO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(subtitulo, 14, 38);
    return { doc, w };
  }

  _filas(doc, w, y, filas) {
    doc.setFontSize(10);
    for (const [label, valor, estilo] of filas) {
      if (estilo === 'total') {
        doc.setFillColor(240, 245, 255);
        doc.rect(12, y - 5.5, w - 24, 9, 'F');
        doc.setFont('helvetica', 'bold');
      } else if (estilo === 'seccion') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MARCA);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXTO);
      }
      doc.text(String(label), 16, y);
      if (valor !== null && valor !== undefined) {
        doc.text(String(valor), w - 16, y, { align: 'right' });
      }
      y += estilo === 'seccion' ? 7.5 : 7;
      doc.setTextColor(...TEXTO);
    }
    return y;
  }

  _pie(doc, w) {
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, h - 16, w - 14, h - 16);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SUAVE);
    doc.text(
      'Documento informativo generado por RentaSV. No tiene validez legal ni sustituye el dictamen del Ministerio de Hacienda.',
      w / 2,
      h - 10,
      { align: 'center', maxWidth: w - 28 }
    );
  }

  _guardar(doc, nombre) {
    doc.save(`rentasv-${nombre}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ── Salario neto ──────────────────────────────────────────
  async generarPDFSalario(r, extras = null, patronal = null) {
    const { doc, w } = await this._nuevoDoc('Cálculo de salario neto mensual');
    let y = 48;

    const filas = [
      ['Salario bruto', formatUSD(r.salarioBruto)],
    ];
    if (r.otrasRentasGravadas > 0) filas.push(['Horas extras', `+ ${formatUSD(r.otrasRentasGravadas)}`]);
    filas.push(
      ['Descuento ISSS (3%)', `- ${formatUSD(r.descuentoISSS)}`],
      ['Descuento AFP (7.25%)', `- ${formatUSD(r.descuentoAFP)}`],
      ['Base imponible del ISR', formatUSD(r.rentaNetaImponible)],
      ['Retención de ISR', `- ${formatUSD(r.isrMensual)}`]
    );
    if (r.otrasDeducciones > 0) filas.push(['Otros descuentos', `- ${formatUSD(r.otrasDeducciones)}`]);
    filas.push(['SALARIO NETO A RECIBIR', formatUSD(r.salarioNeto), 'total']);

    y = this._filas(doc, w, y, filas);

    y += 4;
    doc.setFontSize(8.5);
    doc.setTextColor(...SUAVE);
    doc.text(
      `Tramo aplicado: ${r.tramoISR.label}  ·  Tasa ISR efectiva: ${r.efectividadISR}%  ·  Carga total: ${r.efectividadTotal}%`,
      16,
      y
    );
    y += 10;

    if (extras && extras.total > 0) {
      y = this._filas(doc, w, y, [
        ['Detalle de horas extras', null, 'seccion'],
        ...extras.lineas.map((l) => [`${l.label} — ${l.horas} h (${l.recargo})`, formatUSD(l.monto)]),
        ['Total horas extras', formatUSD(extras.total), 'total'],
      ]);
      y += 6;
    }

    if (patronal) {
      this._filas(doc, w, y, [
        ['Costo para el empleador', null, 'seccion'],
        ['ISSS patronal (7.5%)', formatUSD(patronal.isssPatronal)],
        ['AFP patronal (8.75%)', formatUSD(patronal.afpPatronal)],
        ['Provisión de aguinaldo', formatUSD(patronal.provisionAguinaldo)],
        ['Provisión de vacación', formatUSD(patronal.provisionVacacion)],
        ['Costo mensual real', formatUSD(patronal.costoTotal), 'total'],
      ]);
    }

    this._pie(doc, w);
    this._guardar(doc, 'salario-neto');
  }

  // ── Prestaciones y liquidación ────────────────────────────
  async generarPDFLiquidacion(datos) {
    const { doc, w } = await this._nuevoDoc('Cálculo de prestaciones laborales');
    let y = 48;
    const { periodo, principal, aguinaldo, vacacion, modo, granTotal } = datos;

    if (periodo) {
      y = this._filas(doc, w, y, [
        ['Tiempo laborado', null, 'seccion'],
        ['Antigüedad', `${periodo.anios} años, ${periodo.meses} meses, ${periodo.dias} días`],
        ['Total de días', String(periodo.totalDias)],
      ]);
      y += 4;
    }

    if (principal?.elegible) {
      const esDespido = modo !== 'renuncia';
      y = this._filas(doc, w, y, [
        [esDespido ? 'Indemnización (Art. 58 CT)' : 'Renuncia voluntaria (D.L. 592/2013)', null, 'seccion'],
        ['Salario diario de cálculo', formatUSD(principal.salarioDiarioCalculo)],
        ...(principal.topeAplicado
          ? [['Tope legal aplicado', formatUSD(principal.topeSalarioDiario) + ' / día']]
          : []),
        ['Días a pagar', String(esDespido ? principal.diasIndemnizacion : principal.diasPrestacion)],
        [esDespido ? 'Total indemnización (exenta de ISR)' : 'Total prestación', formatUSD(principal.montoTotal), 'total'],
      ]);
      y += 4;
    }

    if (aguinaldo) {
      y = this._filas(doc, w, y, [
        ['Aguinaldo', null, 'seccion'],
        ['Antigüedad', aguinaldo.tramoLabel],
        ['Días de aguinaldo', String(aguinaldo.diasAguinaldoBase)],
        ['Días del período', String(aguinaldo.diasProporcionales)],
        ['Monto bruto', formatUSD(aguinaldo.montoAguinaldo)],
        ['Exento de ISR', formatUSD(aguinaldo.exentoISR)],
        ['Retención de ISR', `- ${formatUSD(aguinaldo.isrRetenido)}`],
        ['Aguinaldo neto', formatUSD(aguinaldo.montoNeto), 'total'],
      ]);
      y += 4;
    }

    if (vacacion) {
      y = this._filas(doc, w, y, [
        ['Vacación (Art. 177 CT)', null, 'seccion'],
        ['Días del ciclo', String(vacacion.diasTrabajados)],
        ['Pago ordinario', formatUSD(vacacion.pagoOrdinarioProporcional)],
        ['Prima del 30%', formatUSD(vacacion.primaProporcional)],
        ['Vacación neta', formatUSD(vacacion.montoNeto), 'total'],
      ]);
      y += 4;
    }

    if (granTotal != null) {
      this._filas(doc, w, y, [['TOTAL A RECIBIR', formatUSD(granTotal), 'total']]);
    }

    this._pie(doc, w);
    this._guardar(doc, 'prestaciones');
  }

  // ── Declaración anual ─────────────────────────────────────
  async generarPDFDeclaracion(r) {
    const { doc, w } = await this._nuevoDoc(`Simulación de declaración anual (F-11) — ${DATA_2026.FISCAL_YEAR}`);
    let y = 48;

    const filas = [
      ['Ingresos', null, 'seccion'],
      ['Total de salarios brutos', formatUSD(r.totalSalariosBruto)],
    ];
    if (r.totalIngresosServicios > 0) filas.push(['Servicios profesionales', formatUSD(r.totalIngresosServicios)]);
    if (r.otrosIngresos > 0) filas.push(['Otros ingresos gravados', formatUSD(r.otrosIngresos)]);
    if (r.aguinaldoRecibido > 0) {
      filas.push(['Aguinaldo recibido', formatUSD(r.aguinaldoRecibido)]);
      filas.push(['  Exento de ISR', `- ${formatUSD(r.aguinaldoExento)}`]);
    }
    filas.push(['Total de renta obtenida', formatUSD(r.totalIngresosGravados), 'total']);

    filas.push(['Deducciones', null, 'seccion']);
    filas.push(['Cotización al ISSS', `- ${formatUSD(r.deduccionISSSAnual)}`]);
    filas.push(['Cotización a la AFP', `- ${formatUSD(r.deduccionAFPAnual)}`]);
    if (r.usaDeduccionFija) {
      filas.push(['Deducción fija (Art. 29 LISR)', `- ${formatUSD(r.deduccionFija)}`]);
    } else {
      if (r.gastosMedicos > 0) filas.push(['Gastos médicos (tope $800)', `- ${formatUSD(r.gastosMedicos)}`]);
      if (r.colegiaturas > 0) filas.push(['Colegiaturas (tope $800)', `- ${formatUSD(r.colegiaturas)}`]);
    }
    filas.push(['Total de deducciones', formatUSD(r.totalDeducciones), 'total']);

    filas.push(['Determinación', null, 'seccion']);
    filas.push(['Renta neta imponible', formatUSD(r.rentaNetaAnual)]);
    filas.push(['Impuesto determinado', formatUSD(r.isrDeterminado)]);
    filas.push(['Retenciones de planilla', `- ${formatUSD(r.totalRetencionesAsalariado)}`]);
    if (r.totalRetencionesServicios > 0) {
      filas.push(['Retenciones por servicios (10%)', `- ${formatUSD(r.totalRetencionesServicios)}`]);
    }
    filas.push([
      r.tipoSaldo === 'A_FAVOR' ? 'SALDO A FAVOR' : 'IMPUESTO A PAGAR',
      formatUSD(r.saldo),
      'total',
    ]);

    y = this._filas(doc, w, y, filas);

    y += 4;
    doc.setFontSize(8.5);
    doc.setTextColor(...SUAVE);
    doc.text(`Tasa efectiva sobre la renta obtenida: ${r.tasaEfectiva}%`, 16, y);

    this._pie(doc, w);
    this._guardar(doc, 'declaracion-f11');
  }
}

export default PDFService;
