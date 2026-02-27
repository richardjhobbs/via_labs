/* ═══════════════════════════════════════════════════
   VIA Shared UI — nav, modals, mobile menu
   ═══════════════════════════════════════════════════ */

// ── Mobile menu ──────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  menu.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Clients modal ─────────────────────────────────────
function openClientsModal(e) {
  if (e) e.preventDefault();
  closeMobileMenu();
  document.getElementById('clientsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeClientsModal() {
  document.getElementById('clientsModal').classList.remove('open');
  document.body.style.overflow = '';
}
function handleClientsOverlay(e) {
  if (e.target === document.getElementById('clientsModal')) closeClientsModal();
}
function handleNotify() {
  const input = document.getElementById('notifyEmail');
  const btn   = document.querySelector('.modal-btn');
  if (!input || !btn) return;
  if (!input.value || !input.value.includes('@')) { input.focus(); return; }
  btn.textContent = 'Done ✓';
  btn.style.background = '#16a34a';
  setTimeout(closeClientsModal, 1600);
}

// ── Video modal ───────────────────────────────────────
function _killVideoAudio() {
  var overlay = document.getElementById('videoModal');
  if (!overlay) return;
  var iframe = overlay.querySelector('iframe');
  if (!iframe) return;
  // Store original src once
  if (!iframe.getAttribute('data-src')) {
    iframe.setAttribute('data-src', iframe.src);
  }
  // Hard-stop all audio: blank the src, then pause via postMessage as belt+braces
  try { iframe.contentWindow.postMessage('{"method":"pause"}', '*'); } catch(e) {}
  iframe.src = 'about:blank';
}
function openVideoModal(e) {
  if (e) e.preventDefault();
  var overlay = document.getElementById('videoModal');
  var iframe = overlay.querySelector('iframe');
  // Restore src from data-src
  if (iframe) {
    var src = iframe.getAttribute('data-src');
    if (src && (iframe.src === 'about:blank' || iframe.src === '' || iframe.src.indexOf('about:blank') !== -1)) {
      iframe.src = src;
    }
  }
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeVideoModal() {
  var overlay = document.getElementById('videoModal');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  _killVideoAudio();
}
function handleVideoOverlay(e) {
  if (e.target === document.getElementById('videoModal')) closeVideoModal();
}

// ── Vimeo sound toggle (ambient players) ─────────────
function initVimeoSound(iframeId, btnId) {
  const iframe = document.getElementById(iframeId);
  const btn    = document.getElementById(btnId);
  if (!iframe || !btn || typeof Vimeo === 'undefined') return;

  let isMuted = true;
  const player = new Vimeo.Player(iframe);
  player.setVolume(0);
  player.setLoop(true);

  btn.addEventListener('click', function () {
    isMuted = !isMuted;
    player.setVolume(isMuted ? 0 : 1);
    btn.textContent = isMuted ? '🔇' : '🔊';
  });
}

// ── Escape key ────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  closeClientsModal();
  closeVideoModal();
  closeMobileMenu();
});

// ── Mark active nav link ──────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-primary-links a, .mobile-menu a').forEach(function(a) {
    const href = a.getAttribute('href');
    if (href && (href === path || (path === '' && href === 'index.html'))) {
      a.classList.add('active');
    }
  });
});
