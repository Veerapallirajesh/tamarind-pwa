/* ============================================================
   auth.js — Authentication + PIN lock logic
   ============================================================ */

const AUTH = {
  _user: null,

  async init() {
    const session = await DB.getSession();
    if (session) {
      this._user = session.user;
      this._afterLogin();
    } else {
      this._showLogin();
    }
  },

  _showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('signup-screen').style.display = 'none';
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
  },

  showSignup() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('signup-screen').style.display = 'flex';
  },

  showLogin() {
    document.getElementById('signup-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    if (!email || !pass) { errEl.textContent = 'Please enter email and password.'; return; }
    try {
      const data = await DB.signIn(email, pass);
      this._user = data.user;
      this._afterLogin();
    } catch (e) {
      errEl.textContent = e.message || 'Login failed. Check your details.';
    }
  },

  async signup() {
    const email = document.getElementById('signup-email').value.trim();
    const pass  = document.getElementById('signup-password').value;
    const name  = document.getElementById('signup-name').value.trim();
    const errEl = document.getElementById('signup-error');
    errEl.textContent = '';
    if (!email || !pass) { errEl.textContent = 'Email and password are required.'; return; }
    if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
    try {
      await DB.signUp(email, pass);
      if (name) localStorage.setItem('tmr_biz_name', name);
      Utils.toast('Account created! Please check your email to confirm.', 'success', 5000);
      this.showLogin();
    } catch (e) {
      errEl.textContent = e.message || 'Signup failed.';
    }
  },

  async logout() {
    if (!await Utils.confirm('Log Out', 'Are you sure you want to log out?', 'Log Out', false)) return;
    await DB.signOut();
    this._user = null;
    sessionStorage.removeItem(SESSION_KEY);
    this._showLogin();
  },

  _afterLogin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('signup-screen').style.display = 'none';
    // Check PIN
    const pinEnabled = localStorage.getItem(PIN_ENABLED_KEY);
    const sessionOk  = sessionStorage.getItem(SESSION_KEY);
    if (pinEnabled && !sessionOk) {
      PIN.show('verify');
    } else {
      this._enterApp();
    }
  },

  _enterApp() {
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    const email = this._user?.email || '';
    document.getElementById('menu-user-email').textContent = email;
    const bizName = localStorage.getItem('tmr_biz_name') || 'Tamarind Business';
    document.getElementById('menu-biz-name').textContent = bizName;
    NAV.go('dashboard');
  }
};

/* ============================================================
   PIN — 4-digit PIN lock
   ============================================================ */
const PIN = {
  _mode: 'verify',   // 'verify' | 'set' | 'change'
  _buf: '',
  _newPin: '',

  show(mode = 'verify') {
    this._mode = mode;
    this._buf = '';
    this._newPin = '';
    this._updateDots();
    document.getElementById('pin-error').textContent = '';
    const subtitles = {
      verify: 'Enter your PIN',
      set:    'Create a 4-digit PIN',
      change: 'Enter new 4-digit PIN'
    };
    document.getElementById('pin-subtitle').textContent = subtitles[mode] || 'Enter PIN';
    document.getElementById('pin-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  },

  press(n) {
    if (this._buf.length >= 4) return;
    this._buf += String(n);
    this._updateDots();
    if (this._buf.length === 4) setTimeout(() => this.submit(), 120);
  },

  clear() {
    this._buf = this._buf.slice(0, -1);
    this._updateDots();
  },

  submit() {
    if (this._buf.length < 4) return;
    if (this._mode === 'verify') {
      const stored = localStorage.getItem(PIN_KEY);
      if (this._buf === stored) {
        sessionStorage.setItem(SESSION_KEY, '1');
        AUTH._enterApp();
      } else {
        document.getElementById('pin-error').textContent = 'Wrong PIN. Try again.';
        this._buf = '';
        this._updateDots();
      }
    } else if (this._mode === 'set' || this._mode === 'change') {
      if (!this._newPin) {
        this._newPin = this._buf;
        this._buf = '';
        this._updateDots();
        document.getElementById('pin-subtitle').textContent = 'Confirm your PIN';
        document.getElementById('pin-error').textContent = '';
      } else {
        if (this._buf === this._newPin) {
          localStorage.setItem(PIN_KEY, this._buf);
          localStorage.setItem(PIN_ENABLED_KEY, '1');
          sessionStorage.setItem(SESSION_KEY, '1');
          Utils.toast('PIN set successfully', 'success');
          AUTH._enterApp();
        } else {
          document.getElementById('pin-error').textContent = 'PINs do not match. Try again.';
          this._buf = '';
          this._newPin = '';
          this._updateDots();
          document.getElementById('pin-subtitle').textContent = 'Create a 4-digit PIN';
        }
      }
    }
  },

  disable() {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    Utils.toast('PIN lock disabled');
  },

  isEnabled() {
    return !!localStorage.getItem(PIN_ENABLED_KEY);
  },

  _updateDots() {
    const spans = document.querySelectorAll('#pin-dots span');
    spans.forEach((s, i) => s.classList.toggle('filled', i < this._buf.length));
  }
};
