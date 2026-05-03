// ============================================================
// storage.js — Helpers para sessionStorage (Zero-Server)
// Los datos NUNCA salen del dispositivo del usuario.
// ============================================================

const PREFIX = 'sv_isr_';

export const storage = {
  /**
   * Guarda un valor en sessionStorage (se borra al cerrar la pestaña).
   */
  set(key, value) {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[storage] Error al guardar:', e);
    }
  },

  /**
   * Lee un valor del sessionStorage.
   */
  get(key, defaultValue = null) {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * Elimina un valor específico.
   */
  remove(key) {
    sessionStorage.removeItem(PREFIX + key);
  },

  /**
   * Limpia todos los datos de la app.
   */
  clear() {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  },

  /**
   * Retorna todos los datos de la app como objeto.
   */
  getAll() {
    const result = {};
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => {
        try {
          result[k.replace(PREFIX, '')] = JSON.parse(sessionStorage.getItem(k));
        } catch {}
      });
    return result;
  },
};

// Claves predefinidas para cada módulo
export const KEYS = {
  SALARIO:      'salario',
  INDEMNIZACION:'indemnizacion',
  AGUINALDO:    'aguinaldo',
  DECLARACION:  'declaracion',
  CONFIGURACION:'config',
};

export default storage;