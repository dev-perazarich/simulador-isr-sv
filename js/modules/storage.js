// ============================================================
// storage.js — Persistencia temporal en sessionStorage
// ------------------------------------------------------------
// Arquitectura sin servidores: los datos nunca salen del
// dispositivo y se borran solos al cerrar la pestaña.
// ============================================================

const PREFIX = 'sv_isr_';

/** sessionStorage no existe en modo privado de algunos navegadores. */
function disponible() {
  try {
    const k = '__probe__';
    sessionStorage.setItem(k, '1');
    sessionStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}

const OK = typeof sessionStorage !== 'undefined' && disponible();

export const storage = {
  disponible: OK,

  set(key, value) {
    if (!OK) return false;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  get(key, defaultValue = null) {
    if (!OK) return defaultValue;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  remove(key) {
    if (!OK) return;
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch (e) {}
  },

  /** Borra todo lo que la app haya guardado. */
  clear() {
    if (!OK) return;
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {}
  },
};

export const KEYS = {
  SALARIO: 'salario',
  LIQUIDACION: 'liquidacion',
  DECLARACION: 'declaracion',
  COMPARADOR: 'comparador',
};

export default storage;
