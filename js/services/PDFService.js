// ============================================================
// PDFService.js — Servicio para generación de PDF con jsPDF
// ============================================================

export class PDFService {
  constructor() {
    this.jsPDF = window.jspdf?.jsPDF;
    if (!this.jsPDF) {
      console.error('jsPDF no está disponible');
    }
  }

  /**
   * Genera PDF para TAB 1: Salario Neto
   */
  generarPDFSalario(resultadoSalario) {
    const doc = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fmtUSD = (n) => `$${(n || 0).toFixed(2)}`;
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header
    this._crearHeader(doc, pageW, y);
    y = 38;

    // Título
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('CÁLCULO DE SALARIO NETO MENSUAL', 14, y);
    y += 8;

    // Contenido
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const filas = [
      ['Salario Bruto', fmtUSD(resultadoSalario.salarioBruto)],
      ['Descuento ISSS (3%)', `- ${fmtUSD(resultadoSalario.descuentoISSS)}`],
      ['Descuento AFP (7.25%)', `- ${fmtUSD(resultadoSalario.descuentoAFP)}`],
      ['Renta Neta Imponible', fmtUSD(resultadoSalario.rentaNetaImponible)],
      ['ISR Retenido', `- ${fmtUSD(resultadoSalario.isrMensual)}`],
      ['SALARIO NETO A RECIBIR', fmtUSD(resultadoSalario.salarioNeto)],
    ];

    filas.forEach(([label, valor], i) => {
      const esTotal = i === filas.length - 1;
      if (esTotal) {
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 253, 250);
        doc.rect(12, y - 5, pageW - 24, 8, 'F');
      }
      doc.text(label, 16, y);
      doc.text(valor, pageW - 16, y, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'normal');
    });

    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const tramoLabel = resultadoSalario.tramoISR.tasa === 0 ? 'Exento' : (resultadoSalario.tramoISR.tasa * 100) + '%';
    doc.text(`Tramo ISR: ${tramoLabel} | Tasa efectiva: ${resultadoSalario.efectividadTotal}%`, 14, y);

    this._crearFooter(doc, pageW);
    this._descargarPDF(doc, 'salario-neto');
  }

  /**
   * Genera PDF para TAB 2: Prestaciones
   */
  generarPDFPrestaciones(resultadoAguinaldo, resultadoIndemnizacion) {
    const doc = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fmtUSD = (n) => `$${(n || 0).toFixed(2)}`;
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    this._crearHeader(doc, pageW, y);
    y = 38;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('PRESTACIONES LABORALES', 14, y);
    y += 8;

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Aguinaldo
    if (resultadoAguinaldo?.elegible) {
      const a = resultadoAguinaldo;
      doc.setFont('helvetica', 'bold');
      doc.text('Aguinaldo', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');

      const filasAguinaldo = [
        ['Antigüedad', a.tramoLabel],
        ['Días a pagar', a.diasAguinaldo],
        ['Monto bruto', fmtUSD(a.montoAguinaldo)],
        ['Exento ISR', fmtUSD(a.exentoISR)],
        ['Monto neto', fmtUSD(a.montoNeto)],
      ];

      filasAguinaldo.forEach(([l, v]) => {
        doc.text(l, 16, y);
        doc.text(String(v), pageW - 16, y, { align: 'right' });
        y += 7;
      });
      y += 4;
    }

    // Indemnización
    if (resultadoIndemnizacion) {
      const ind = resultadoIndemnizacion;
      doc.setFont('helvetica', 'bold');
      doc.text('Indemnización (Art. 58 CT)', 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');

      const filasIndem = [
        ['Salario base cálculo', fmtUSD(ind.salarioBaseCalculo)],
        ['Años laborados', ind.anios],
        ['Días a indemnizar', ind.diasIndemnizacion.toFixed(2)],
        ['TOTAL INDEMNIZACIÓN', fmtUSD(ind.montoTotal)],
      ];

      filasIndem.forEach(([l, v], i) => {
        if (i === 3) doc.setFont('helvetica', 'bold');
        doc.text(l, 16, y);
        doc.text(String(v), pageW - 16, y, { align: 'right' });
        y += 7;
        if (i === 3) doc.setFont('helvetica', 'normal');
      });
    }

    this._crearFooter(doc, pageW);
    this._descargarPDF(doc, 'prestaciones');
  }

  /**
   * Genera PDF para TAB 3: Declaración Anual
   */
  generarPDFDeclaracion(resultadoAnual) {
    const doc = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fmtUSD = (n) => `$${(n || 0).toFixed(2)}`;
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    this._crearHeader(doc, pageW, y);
    y = 38;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('SIMULACIÓN DECLARACIÓN ANUAL ISR (F-11)', 14, y);
    y += 8;

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const filas = [
      ['Total Salarios Brutos', fmtUSD(resultadoAnual.totalSalariosBruto)],
      ['Otros Ingresos', fmtUSD(resultadoAnual.otrosIngresos)],
      ['Deducción ISSS Anual', `- ${fmtUSD(resultadoAnual.deduccionISSSAnual)}`],
      ['Deducción AFP Anual', `- ${fmtUSD(resultadoAnual.deduccionAFPAnual)}`],
      ['Gastos Deducibles', `- ${fmtUSD(resultadoAnual.gastosDeducibles)}`],
      ['Renta Neta Anual', fmtUSD(resultadoAnual.rentaNetaAnual)],
      ['ISR Determinado', fmtUSD(resultadoAnual.isrDeterminado)],
      ['Total Retenciones', `- ${fmtUSD(resultadoAnual.totalRetenciones)}`],
      [resultadoAnual.tipoSaldo === 'A_FAVOR' ? 'SALDO A FAVOR' : 'IMPUESTO A PAGAR', fmtUSD(resultadoAnual.saldo)],
    ];

    filas.forEach(([label, valor], i) => {
      const esTotal = i === filas.length - 1;
      if (esTotal) {
        doc.setFont('helvetica', 'bold');
        const colorBg = resultadoAnual.tipoSaldo === 'A_FAVOR' ? [240, 253, 250] : [255, 240, 240];
        doc.setFillColor(...colorBg);
        doc.rect(12, y - 5, pageW - 24, 8, 'F');
      }
      doc.text(label, 16, y);
      doc.text(valor, pageW - 16, y, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'normal');
    });

    y += 3;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Tasa efectiva: ${resultadoAnual.tasaEfectiva}% | Total ingresos: ${fmtUSD(resultadoAnual.totalIngresosGravados)}`,
      14,
      y
    );

    this._crearFooter(doc, pageW);
    this._descargarPDF(doc, 'declaracion-anual');
  }

  // ── Helpers privados ──

  _crearHeader(doc, pageW, y) {
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SIMULADOR ISR EL SALVADOR 2025-2026', pageW / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Simulación con fines informativos · No sustituye asesoría profesional', pageW / 2, 20, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleDateString('es-SV')}`, pageW / 2, 25, { align: 'center' });
  }

  _crearFooter(doc, pageW) {
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 247, 250);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(
      'Documento informativo generado por Simulador ISR SV · No tiene validez legal · El Salvador',
      pageW / 2,
      pageH - 5,
      { align: 'center' }
    );
  }

  _descargarPDF(doc, tipo) {
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`simulador-isr-${tipo}-${fecha}.pdf`);
  }
}

export default PDFService;
