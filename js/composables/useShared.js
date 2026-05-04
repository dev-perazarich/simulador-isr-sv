import { DATA_APP } from '../modules/constants.js';

const NOMBRES_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export function useShared() {
  const currentYear = DATA_APP.CURRENT_YEAR;
  const fiscalYear = DATA_APP.FISCAL_YEAR;
  
  // ── Estado global ──
  const tabActiva = Vue.ref('salario');
  const mostrarPrivacidad = Vue.ref(false);
  const isMenuOpen = Vue.ref(false);

  const toggleMenu = () => isMenuOpen.value = !isMenuOpen.value;
  const closeMenu = () => isMenuOpen.value = false;

    // ── Helpers de formato (reutilizables) ──
  // Alias cortos para el template (fmt/pct) + nombres completos para JS
  const fmt = (num) => `$${(num || 0).toFixed(2)}`;
  const pct = (num) => `${(num || 0).toFixed(1)}%`;
  // Alias largos — misma función, por compatibilidad
  const formatUSD = fmt;
  const formatPercent = pct;

  return {
    // State
    tabActiva,
    mostrarPrivacidad,
    isMenuOpen,
    toggleMenu,
    closeMenu,
    // Constants
    NOMBRES_MESES,
    DATA_APP,
    currentYear,
    fiscalYear,
    // Formatters — exponer ambos nombres para template y JS externo
    fmt,
    pct,
    formatUSD,
    formatPercent,
  };
}
