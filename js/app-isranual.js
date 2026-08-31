// js/app-isranual.js — Declaración anual F-11
import { useDeclaracionTab } from './composables/useDeclaracionTab.js';
import { useShared } from './composables/useShared.js';
import PDFService from './services/PDFService.js';
import { DATA_2026 } from './modules/constants.js';

const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const shared = useShared();
    const decl = useDeclaracionTab();
    const pdf = new PDFService();
    const generandoPDF = ref(false);

    function usarSalarioGuardado() {
      if (decl.importarDeSalario()) {
        shared.notificar('Se aplicó su salario a los 12 meses.', 'success');
      } else {
        shared.notificar('Primero calcule su salario en la sección «Salario neto».', 'warning');
      }
    }

    async function descargarPDF() {
      if (!decl.resultado.value || generandoPDF.value) return;
      generandoPDF.value = true;
      try {
        await pdf.generarPDFDeclaracion(decl.resultado.value);
        shared.notificar('Borrador descargado.', 'success');
      } catch (e) {
        shared.notificar(e.message || 'No se pudo generar el PDF.', 'danger');
      } finally {
        generandoPDF.value = false;
      }
    }

    onMounted(decl.restaurarDatos);

    return { ...shared, ...decl, DATA_2026, generandoPDF, descargarPDF, usarSalarioGuardado };
  },
}).mount('#app-isranual');
