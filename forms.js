/**
 * VIA Website - Form Management
 * Handles form interactions and submissions
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    FORM_ID: 'emailForm',
    CTA_BUTTON_CLASS: 'cta-button',
    REGISTER_CARD_ID: 'register-card'
  };

  /**
   * Initialize form handling
   */
  function initForms() {
    const ctaButton = document.querySelector('.' + CONFIG.CTA_BUTTON_CLASS);
    const emailForm = document.getElementById(CONFIG.FORM_ID);
    const registerCard = document.getElementById(CONFIG.REGISTER_CARD_ID);

    if (ctaButton && emailForm) {
      setupRegistrationToggle(ctaButton, emailForm, registerCard);
      setupFormSubmission(emailForm);
    }
  }

  /**
   * Setup registration form toggle
   * @param {HTMLElement} button - CTA button
   * @param {HTMLElement} form - Email form
   * @param {HTMLElement} card - Register card (optional)
   */
  function setupRegistrationToggle(button, form, card) {
    const showForm = () => {
      form.style.display = 'block';
      button.style.display = 'none';
      
      // Smooth scroll to form
      setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      // Focus first input
      const firstInput = form.querySelector('input[type="text"], input[type="email"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }
    };

    button.addEventListener('click', showForm);

    // Also allow clicking the register card to show form
    if (card) {
      card.addEventListener('click', showForm);
    }
  }

  /**
   * Setup form submission handling
   * @param {HTMLElement} form - Form element
   */
  function setupFormSubmission(form) {
    form.addEventListener('submit', function(e) {
      const firstName = document.getElementById('firstName');
      const email = document.getElementById('email');

      // Basic validation
      if (!firstName || !firstName.value.trim()) {
        e.preventDefault();
        alert('Please enter your first name.');
        return;
      }

      if (!email || !email.value.trim()) {
        e.preventDefault();
        alert('Please enter your email address.');
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        e.preventDefault();
        alert('Please enter a valid email address.');
        return;
      }

      // Show thank you message
      // Note: Form will actually submit to Web3Forms
      setTimeout(() => {
        alert('Thank you for registering, ' + firstName.value.trim() + '! We will be in touch soon.');
      }, 100);
    });
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} Whether email is valid
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }

  // Expose form utilities globally if needed
  window.VIAForms = {
    isValidEmail: isValidEmail
  };

})();
