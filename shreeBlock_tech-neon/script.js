/*!
 * ShreeBlock Tech — site interactions
 * Vanilla ES6+, no external dependencies.
 * Sections: nav & scroll UI, reveal animations, ripple, accordion,
 * theme toggle, contact form validation, toasts, misc utilities.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Shared helpers
   * ------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* A single rAF-throttled scroll dispatcher so multiple features can
   * listen to scroll without each attaching its own listener. */
  const scrollListeners = [];
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollListeners.forEach((fn) => fn());
      scrollTicking = false;
    });
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * Header: sticky background + scroll progress + active nav link
   * ------------------------------------------------------------------ */
  const header = $('.header');
  const progressBar = $('#scrollProgressBar');
  const navAnchors = $$('.nav-links a[data-nav]');
  const sections = navAnchors
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  function updateHeaderState() {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }

  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${pct}%`;
  }

  function updateActiveNav() {
    const fromTop = window.scrollY + 140;
    let current = null;
    sections.forEach((section) => {
      if (section.offsetTop <= fromTop) current = section;
    });
    navAnchors.forEach((a) => {
      const match = current && a.getAttribute('href') === `#${current.id}`;
      a.classList.toggle('active', Boolean(match));
    });
  }

  scrollListeners.push(updateHeaderState, updateScrollProgress, updateActiveNav);
  updateHeaderState();
  updateScrollProgress();
  updateActiveNav();

  /* ------------------------------------------------------------------ *
   * Back-to-top button
   * ------------------------------------------------------------------ */
  const backTop = $('#backTop');
  scrollListeners.push(() => backTop.classList.toggle('show', window.scrollY > 600));
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------------ *
   * Mobile menu
   * ------------------------------------------------------------------ */
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');

  function closeMenu() {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    const open = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  menuToggle.addEventListener('click', toggleMenu);
  $$('.nav-links a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMenu();
      menuToggle.focus();
    }
  });

  /* ------------------------------------------------------------------ *
   * Smooth-scroll for in-page anchors (with sticky-header offset)
   * ------------------------------------------------------------------ */
  const HEADER_OFFSET = 84;
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#top') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      // Move focus for keyboard/screen-reader users once the scroll settles.
      target.setAttribute('tabindex', '-1');
      target.addEventListener('transitionend', () => {}, { once: true });
      window.setTimeout(() => target.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 500);
    });
  });

  /* ------------------------------------------------------------------ *
   * Scroll-reveal animations (IntersectionObserver)
   * ------------------------------------------------------------------ */
  if (prefersReducedMotion) {
    $$('.reveal').forEach((el) => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    $$('.reveal').forEach((el, index) => {
      el.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * Button ripple effect
   * ------------------------------------------------------------------ */
  $$('.btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      if (prefersReducedMotion) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  /* ------------------------------------------------------------------ *
   * FAQ accordion (single-open, fully keyboard accessible)
   * ------------------------------------------------------------------ */
  const accordion = $('#faqAccordion');
  if (accordion) {
    const triggers = $$('.accordion-trigger', accordion);

    function setItemState(trigger, expand) {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(expand));
      if (!panel) return;
      if (expand) {
        panel.hidden = false;
        panel.style.height = '0px';
        requestAnimationFrame(() => {
          panel.style.height = `${panel.scrollHeight}px`;
        });
        panel.addEventListener('transitionend', function onEnd() {
          panel.style.height = '';
          panel.removeEventListener('transitionend', onEnd);
        }, { once: true });
      } else {
        panel.style.height = `${panel.scrollHeight}px`;
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        panel.addEventListener('transitionend', function onEnd() {
          panel.hidden = true;
          panel.style.height = '';
          panel.removeEventListener('transitionend', onEnd);
        }, { once: true });
      }
    }

    triggers.forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (panel) panel.style.transition = prefersReducedMotion ? 'none' : 'height .3s ease';

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        triggers.forEach((other) => {
          if (other !== trigger && other.getAttribute('aria-expanded') === 'true') {
            setItemState(other, false);
          }
        });
        setItemState(trigger, !isOpen);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Theme toggle (persisted in localStorage, respects system default)
   * ------------------------------------------------------------------ */
  const THEME_KEY = 'shreeblock-theme';
  const themeToggle = $('#themeToggle');
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  (function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* storage unavailable */ }
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
    } else {
      const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(systemLight ? 'light' : 'dark');
    }
  }());

  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
  });

  /* ------------------------------------------------------------------ *
   * Toast notifications
   * ------------------------------------------------------------------ */
  const toastRegion = $('#toastRegion');
  function showToast(message, type = 'success', duration = 4200) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  /* ------------------------------------------------------------------ *
   * Contact form validation + mailto hand-off
   * ------------------------------------------------------------------ */
  
const contactForm = $('#contactForm');

if (contactForm) {
  const fields = {
    name: {
      input: $('#cf-name'),
      error: $('#cf-name-error')
    },

    email: {
      input: $('#cf-email'),
      error: $('#cf-email-error')
    },

    phone: {
      input: $('#cf-phone'),
      error: $('#cf-phone-error')
    },

    region: {
      input: $('#cf-region'),
      error: $('#cf-region-error')
    },

    message: {
      input: $('#cf-message'),
      error: $('#cf-message-error')
    }
  };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateField(key) {
    const { input, error } = fields[key];

    let message = '';
    const value = input.value.trim();

    if (!value) {
      message = 'This field is required.';
    }

    // Email validation
    else if (key === 'email' && !emailPattern.test(value)) {
      message = 'Enter a valid email address.';
    }

    // Phone validation
    else if (key === 'phone') {
      const phonePattern = /^[0-9+\-\s()]{7,20}$/;

      if (!phonePattern.test(value)) {
        message = 'Enter a valid phone number.';
      }
    }

    // Message validation
    else if (key === 'message' && value.length < 10) {
      message = 'Tell us a little more (10+ characters).';
    }

    input.classList.toggle('invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));

    error.textContent = message;

    return !message;
  }

  // Validate fields on blur/input
  Object.keys(fields).forEach((key) => {
    fields[key].input.addEventListener('blur', () => {
      validateField(key);
    });

    fields[key].input.addEventListener('input', () => {
      if (fields[key].input.classList.contains('invalid')) {
        validateField(key);
      }
    });

    // For select/region field
    fields[key].input.addEventListener('change', () => {
      validateField(key);
    });
  });

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const results = Object.keys(fields).map(validateField);
    const isValid = results.every(Boolean);

    if (!isValid) {
      showToast('Please fix the highlighted fields.', 'error');

      const firstInvalid = Object.values(fields).find(
        (field) => field.input.classList.contains('invalid')
      );

      firstInvalid?.input.focus();

      return;
    }

    // Get form values
    const name = fields.name.input.value.trim();
    const email = fields.email.input.value.trim();
    const phone = fields.phone.input.value.trim();
    const region = fields.region.input.value;
    const message = fields.message.input.value.trim();

    // Get readable region name
    const regionName =
      fields.region.input.options[
        fields.region.input.selectedIndex
      ].text;

    // Email subject
    const subject = encodeURIComponent(
      `New project inquiry from ${name}`
    );

    // Email body
    const body = encodeURIComponent(
      `New Project Inquiry

Name: ${name}
Email: ${email}
Phone: ${phone}
Region: ${regionName}

What are you building:
${message}

—
Sent from ShreeBlock Tech website`
    );

    // Open user's email application
    window.location.href =
      `mailto:hello@shreeblocktech.com?subject=${subject}&body=${body}`;

    showToast(
      'Opening your email app to send the message…',
      'success'
    );

    // Reset form
    contactForm.reset();

    // Clear validation states
    Object.values(fields).forEach(({ input, error }) => {
      input.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
      error.textContent = '';
    });
  });
}

  /* ------------------------------------------------------------------ *
   * Misc: footer year, lazy-load safety net for future <img> tags
   * ------------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // If images are added later, default them to lazy-loading unless
  // explicitly marked otherwise (e.g. above-the-fold hero imagery).
  $$('img:not([loading])').forEach((img) => img.setAttribute('loading', 'lazy'));
})();
