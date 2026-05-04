import { useLiquidacionesTab } from './composables/useLiquidacionesTab.js';
import { useShared }           from './composables/useShared.js';
import { useTheme }            from './composables/useTheme.js';
import PDFService              from './services/PDFService.js';
import { DATA_APP }           from './modules/constants.js';

Vue.createApp({
  setup() {
    const shared         = useShared();
    const liqTab         = useLiquidacionesTab();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const pdfService     = new PDFService();

    function generarPDF() {
      alert("La exportación a PDF para la suite extendida de liquidación estará disponible en la próxima versión.");
    }

    Vue.onMounted(() => {
      liqTab.restaurarDatos();
    });

    return {
      ...shared,
      ...liqTab,
      theme, isDarkMode, toggleTheme,
      generarPDF,
      DATA_APP,
    };
  },
}).mount('#app-liquidaciones');
