// ============================================================
// shell.js — Comportamiento del armazón
// ------------------------------------------------------------
// Vanilla a propósito: funciona en todas las páginas, incluidas
// las legales y la portada que no cargan Vue, y no bloquea el
// renderizado.
// ============================================================

(function () {
  'use strict';

  var THEME_KEY = 'sv-isr-theme';
  var root = document.documentElement;

  // ── Tema ──────────────────────────────────────────────────
  // El predeterminado es CLARO. No se sigue la preferencia del
  // sistema: en una herramienta de dinero el modo claro es el que
  // la gente espera, y el oscuro queda como elección explícita.
  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* modo privado: el tema simplemente no persiste */
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
    });
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });

  // ── Barra lateral del panel (móvil) ───────────────────────
  var sidebar = document.querySelector('[data-sidebar]');
  var backdrop = document.querySelector('[data-sidebar-backdrop]');
  var openBtn = document.querySelector('[data-sidebar-open]');
  var closeBtn = document.querySelector('[data-sidebar-close]');

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle('hidden', !open);
    }
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = sidebar.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    } else if (openBtn) {
      openBtn.focus({ preventScroll: true });
    }
  }

  if (openBtn) openBtn.addEventListener('click', function () { setSidebar(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setSidebar(false); });
  if (backdrop) backdrop.addEventListener('click', function () { setSidebar(false); });

  try {
    var wide = window.matchMedia('(min-width: 1024px)');
    var onWide = function (e) { if (e.matches) setSidebar(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  } catch (e) {}

  // ── Menú de la portada (móvil) ────────────────────────────
  var menu = document.querySelector('[data-landing-menu]');
  var menuBtn = document.querySelector('[data-landing-menu-open]');

  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    menu.classList.toggle('hidden', !open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(menu.hidden);
    });
  }
  // Al tocar un ancla de la misma página, el menú debe cerrarse
  document.querySelectorAll('[data-landing-link]').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  // ── Cerrar con Escape ─────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sidebar && sidebar.classList.contains('is-open')) setSidebar(false);
    if (menu && !menu.hidden) setMenu(false);
  });

  // ── Sombra de la cabecera al desplazarse ──────────────────
  var header = document.querySelector('[data-site-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
