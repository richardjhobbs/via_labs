/**
 * VIA Website - Theme Management
 * Handles dark/light mode switching and logo changes
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    LOGO_LIGHT: 'images/VIA_logo_large_black.png',
    LOGO_DARK: 'images/VIA_logo_large_white.png',
    X_LOGO_LIGHT: 'images/logo-black.png',
    X_LOGO_DARK: 'images/logo-white.png',
    STORAGE_KEY: 'via-theme',
    THEME_DARK: 'dark',
    THEME_LIGHT: 'light'
  };

  // DOM Elements
  let elements = {};

  /**
   * Initialize theme on page load
   */
  function initTheme() {
    cacheElements();
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === CONFIG.THEME_DARK : prefersDark;
    
    setTheme(isDark);
    attachEventListeners();
  }

  /**
   * Cache DOM elements
   */
  function cacheElements() {
    elements = {
      html: document.documentElement,
      logo: document.getElementById('logo'),
      socialIcon: document.getElementById('socialIcon'),
      themeToggle: document.getElementById('themeToggle')
    };
  }

  /**
   * Set theme (dark or light)
   * @param {boolean} isDark - Whether to enable dark mode
   */
  function setTheme(isDark) {
    if (!elements.html) return;

    if (isDark) {
      elements.html.classList.add(CONFIG.THEME_DARK);
      updateLogos(CONFIG.LOGO_DARK, CONFIG.X_LOGO_DARK);
      localStorage.setItem(CONFIG.STORAGE_KEY, CONFIG.THEME_DARK);
    } else {
      elements.html.classList.remove(CONFIG.THEME_DARK);
      updateLogos(CONFIG.LOGO_LIGHT, CONFIG.X_LOGO_LIGHT);
      localStorage.setItem(CONFIG.STORAGE_KEY, CONFIG.THEME_LIGHT);
    }
  }

  /**
   * Update logo images
   * @param {string} logoSrc - Main logo source
   * @param {string} socialSrc - Social icon source
   */
  function updateLogos(logoSrc, socialSrc) {
    if (elements.logo) {
      elements.logo.src = logoSrc;
    }
    if (elements.socialIcon) {
      elements.socialIcon.src = socialSrc;
    }
  }

  /**
   * Toggle between dark and light themes
   */
  function toggleTheme() {
    const isDark = elements.html.classList.contains(CONFIG.THEME_DARK);
    setTheme(!isDark);
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(CONFIG.STORAGE_KEY)) {
        setTheme(e.matches);
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Expose theme functions globally if needed
  window.VIATheme = {
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    getCurrentTheme: () => elements.html.classList.contains(CONFIG.THEME_DARK) ? CONFIG.THEME_DARK : CONFIG.THEME_LIGHT
  };

})();
