// ============================================================
// useShared.js — Composable para estado y helpers compartidos
// ============================================================

const { ref } = Vue;

const NOMBRES_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export function useShared() {
  
  // ── Estado global ──
  const tabActiva = ref('salario');
  const mostrarPrivacidad = ref(false);
  const isMenuOpen = ref(false);

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
    // Formatters — exponer ambos nombres para template y JS externo
    fmt,
    pct,
    formatUSD,
    formatPercent,
  };
}
