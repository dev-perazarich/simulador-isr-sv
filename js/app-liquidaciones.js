// js/app-liquidaciones.js — Prestaciones y liquidación
import { useLiquidacionesTab } from './composables/useLiquidacionesTab.js';
import { useShared } from './composables/useShared.js';
import PDFService from './services/PDFService.js';
import { DATA_2026 } from './modules/constants.js';

const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const shared = useShared();
    const liq = useLiquidacionesTab();
    const pdf = new PDFService();
    const generandoPDF = ref(false);

    /** Normaliza cualquier modo a la forma que espera el PDF. */
    function datosParaPDF() {
      const r = liq.resultado.value;
      const modo = liq.form.value.modo;
      if (!r) return null;

      if (modo === 'completa') return r;
      if (modo === 'despido' || modo === 'renuncia') {
        return { modo, periodo: liq.antiguedad.value, principal: r, granTotal: r.montoTotal };
      }
      if (modo === 'aguinaldo') {
        return { modo, periodo: liq.antiguedad.value, aguinaldo: r, granTotal: r.montoNeto };
      }
      return { modo, periodo: liq.antiguedad.value, vacacion: r, granTotal: r.montoNeto };
    }

    async function descargarPDF() {
      const datos = datosParaPDF();
      if (!datos || generandoPDF.value) return;
      generandoPDF.value = true;
      try {
        await pdf.generarPDFLiquidacion(datos);
        shared.notificar('PDF descargado.', 'success');
      } catch (e) {
        shared.notificar(e.message || 'No se pudo generar el PDF.', 'danger');
      } finally {
        generandoPDF.value = false;
      }
    }

    onMounted(liq.restaurarDatos);

    return { ...shared, ...liq, DATA_2026, generandoPDF, descargarPDF };
  },
}).mount('#app-liquidaciones');
