/* ============================================================
   app.js — App entry point, navigation, PWA setup
   ============================================================ */

/* ---- Navigation ---- */
const NAV = {
  _current: null,
  _pageRenderers: {
    dashboard:  () => DASHBOARD.render(),
    'add-entry':() => ADD_ENTRY.render(),
    parties:    () => PARTIES.render(),
    purchases:  () => LISTS.render('purchases'),
    sales:      () => LISTS.render('sales'),
    expenses:   () => LISTS.render('expenses'),
    reports:    () => REPORTS.render()
  },
  _titles: {
    dashboard: 'Dashboard',
    'add-entry': 'Add Entry',
    parties: 'Parties',
    purchases: 'Purchases',
    sales: 'Sales',
    expenses: 'Expenses',
    reports: 'Reports'
  },

  go(page, params = {}) {
    this.closeMenu();
    this._current = page;
    document.getElementById('header-title').textContent = this._titles[page] || page;
    // Highlight active menu item
    document.querySelectorAll('.menu-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    const fn = this._pageRenderers[page];
    if (fn) fn(params);
    window.scrollTo(0, 0);
  },

  toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    menu.classList.toggle('open');
    overlay.classList.toggle('show');
  },

  closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('show');
  }
};

/* ---- App Init ---- */
window.addEventListener('DOMContentLoaded', async () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
  }

  // Init auth (will show login or PIN or app)
  await AUTH.init();

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner(deferredPrompt);
  });
});

function showInstallBanner(deferredPrompt) {
  if (localStorage.getItem('tmr_install_dismissed')) return;
  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.innerHTML = `
    <span>📱 Add to Home Screen for quick access</span>
    <button onclick="installPWA(this.parentNode)">Install</button>
    <button style="background:none;color:white;border:none;padding:8px;font-size:20px" onclick="this.parentNode.remove();localStorage.setItem('tmr_install_dismissed','1')">✕</button>`;
  document.getElementById('main-app').prepend(banner);
  window._pwaPrompt = deferredPrompt;
}

async function installPWA(banner) {
  if (window._pwaPrompt) {
    window._pwaPrompt.prompt();
    await window._pwaPrompt.userChoice;
    banner.remove();
  }
}
