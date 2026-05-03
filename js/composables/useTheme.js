// ============================================================
// useTheme.js — Composable para gestión de Temas (Light/Dark)
// ============================================================

const { ref, watch, onMounted } = Vue;

export function useTheme() {
  
  // ── Estado ──
  const theme = ref('light');
  const isDarkMode = ref(false);

  // Clave de localStorage
  const THEME_KEY = 'sv-isr-theme';

  // ── Detectar preferencia del SO ──
  function getSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  // ── Obtener tema guardado o predeterminado ──
  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved;
    } catch (e) {
      console.warn('localStorage no disponible');
    }
    return getSystemTheme();
  }

  // ── Aplicar tema al DOM ──
  function applyTheme(themeName) {
    theme.value = themeName;
    isDarkMode.value = themeName === 'dark';

    // Aplicar data-theme attribute
    document.documentElement.setAttribute('data-theme', themeName);

    // Guardar preferencia
    try {
      localStorage.setItem(THEME_KEY, themeName);
    } catch (e) {
      console.warn('No se pudo guardar tema en localStorage');
    }
  }

  // ── Toggle entre light/dark ──
  function toggleTheme() {
    const newTheme = theme.value === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }

  // ── Establecer tema explícitamente ──
  function setTheme(themeName) {
    if (['light', 'dark'].includes(themeName)) {
      applyTheme(themeName);
    }
  }

  // ── Watch para cambios en preferencia del SO ──
  function setupSystemThemeListener() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Listener para cambios de preferencia del SO
      const handleChange = (e) => {
        // Solo cambiar si el usuario NO ha guardado una preferencia manual
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (!savedTheme) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      };

      // Soporte para navegadores antiguos y modernos
      if (darkModeQuery.addEventListener) {
        darkModeQuery.addEventListener('change', handleChange);
      } else if (darkModeQuery.addListener) {
        darkModeQuery.addListener(handleChange);
      }
    }
  }

  // ── Inicializar al montar ──
  onMounted(() => {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    setupSystemThemeListener();
  });

  return {
    // State
    theme,
    isDarkMode,
    // Methods
    toggleTheme,
    setTheme,
    applyTheme,
    getSavedTheme,
    getSystemTheme,
  };
}

export default useTheme;
