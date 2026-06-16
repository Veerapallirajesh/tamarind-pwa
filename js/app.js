/* ============================================================
   app.js — App entry point, navigation, PWA setup
   ============================================================ */

const NAV = {
  _current: null,
  _pageRenderers: {
    dashboard:   ()       => DASHBOARD.render(),
    'add-entry': (params) => ADD_ENTRY.render(params),
    parties:     ()       => PARTIES.render(),
    purchases:   ()       => LISTS.render('purchases'),
    sales:       ()       => LISTS.render('sales'),
    expenses:    ()       => LISTS.render('expenses'),
    reports:     ()       => REPORTS.render()
  },
  _titles: {
    dashboard:   'Dashboard',
    'add-entry': 'Add Entry',
    parties:     'Parties',
    purchases:   'Purchases',
    sales:       'Sales',
    expenses:    'Expenses',
    reports:     'Reports'
  },

  go(page, params = {}) {
    this.closeMenu();
    this._current = page;
    document.getElementById('header-title').textContent = this._titles[page] || page;
    document.querySelectorAll('.menu-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    const fn = this._pageRenderers[page];
    if (fn) fn(params);
    window.scrollTo(0, 0);
  },

  toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('show');
  },

  closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('show');
  }
};

/* ---- App Init ---- */
window.addEventListener('DOMContentLoaded', async () => {
  await AUTH.init();
  registerSW();
});

/* ---- Service Worker Registration with update detection ---- */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').then(reg => {

    // If there's already a waiting SW (user reopened the app), show update banner
    if (reg.waiting) showUpdateBanner(reg.waiting);

    // Listen for a new SW entering "waiting" state
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newSW);
        }
      });
    });

  }).catch(err => console.warn('SW registration failed:', err));

  // When the SW activates (after SKIP_WAITING), reload the page
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload(); }
  });
}

function showUpdateBanner(swWaiting) {
  if (document.getElementById('update-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:#1B5E20', 'color:white',
    'padding:14px 16px', 'display:flex',
    'align-items:center', 'gap:12px',
    'z-index:9999', 'font-size:15px',
    'box-shadow:0 -2px 12px rgba(0,0,0,0.2)'
  ].join(';');
  banner.innerHTML = `
    <span style="flex:1">App update available</span>
    <button onclick="applyUpdate()" style="background:white;color:#1B5E20;border:none;border-radius:20px;padding:8px 18px;font-size:14px;font-weight:700;cursor:pointer">Update Now</button>
    <button onclick="this.parentNode.remove()" style="background:none;color:white;border:none;font-size:22px;cursor:pointer;padding:0 4px">&#x2715;</button>`;
  document.body.appendChild(banner);
  window._pendingSW = swWaiting;
}

function applyUpdate() {
  if (window._pendingSW) {
    window._pendingSW.postMessage('SKIP_WAITING');
  }
}

/* ---- PWA Install Prompt ---- */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  if (localStorage.getItem('tmr_install_dismissed')) return;
  showInstallBanner(e);
});

function showInstallBanner(deferredPrompt) {
  if (document.getElementById('install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <span style="flex:1">Add to Home Screen for quick access</span>
    <button class="install-btn" onclick="installPWA()">Install</button>
    <button style="background:none;color:white;border:none;padding:8px;font-size:20px;cursor:pointer" onclick="this.parentNode.remove();localStorage.setItem('tmr_install_dismissed','1')">&#x2715;</button>`;
  document.getElementById('main-app').prepend(banner);
  window._pwaPrompt = deferredPrompt;
}

async function installPWA() {
  if (window._pwaPrompt) {
    window._pwaPrompt.prompt();
    await window._pwaPrompt.userChoice;
    document.getElementById('install-banner')?.remove();
  }
}
