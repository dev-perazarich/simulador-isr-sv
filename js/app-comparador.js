// js/app-comparador.js — Planilla vs. servicios profesionales
import { useComparadorTab } from './composables/useComparadorTab.js';
import { useShared } from './composables/useShared.js';
import { DATA_2026 } from './modules/constants.js';

const { createApp, onMounted } = Vue;

createApp({
  setup() {
    const shared = useShared();
    const comparador = useComparadorTab();

    onMounted(comparador.restaurarDatos);

    return { ...shared, ...comparador, DATA_2026, Math };
  },
}).mount('#app-comparador');
