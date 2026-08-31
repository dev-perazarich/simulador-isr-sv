// js/app-salario.js — Calculadora de salario neto
import { useSalarioTab } from './composables/useSalarioTab.js';
import { useShared } from './composables/useShared.js';
import PDFService from './services/PDFService.js';
import { DATA_2026 } from './modules/constants.js';

const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const shared = useShared();
    const salario = useSalarioTab();
    const pdf = new PDFService();
    const generandoPDF = ref(false);

    async function descargarPDF() {
      if (!salario.resultado.value || generandoPDF.value) return;
      generandoPDF.value = true;
      try {
        await pdf.generarPDFSalario(
          salario.resultado.value,
          salario.resultadoExtras.value,
          salario.costoPatronal.value
        );
        shared.notificar('PDF descargado.', 'success');
      } catch (e) {
        shared.notificar(e.message || 'No se pudo generar el PDF.', 'danger');
      } finally {
        generandoPDF.value = false;
      }
    }

    onMounted(salario.restaurarDatos);

    return { ...shared, ...salario, DATA_2026, generandoPDF, descargarPDF };
  },
}).mount('#app-salario');
