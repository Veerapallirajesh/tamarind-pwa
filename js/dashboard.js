/* ============================================================
   dashboard.js — Dashboard page
   ============================================================ */

const DASHBOARD = {
  async render() {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading dashboard</div>';
    try {
      const d = await DB.getDashboard();
      el.innerHTML = this._html(d);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load: ${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html(d) {
    const overdueCount = d.overduePurchases.length + d.overdueSales.length;
    return `
      <div class="section-title">📊 Overview</div>

      <div class="dash-grid">
        <div class="dash-card red-card">
          <div class="label">Total Payable</div>
          <div class="value">${Utils.currency(d.totalPayable)}</div>
        </div>
        <div class="dash-card green-card">
          <div class="label">Total Receivable</div>
          <div class="value">${Utils.currency(d.totalReceivable)}</div>
        </div>
        <div class="dash-card orange-card">
          <div class="label">Total Expenses</div>
          <div class="value">${Utils.currency(d.totalExpenses)}</div>
        </div>
        <div class="dash-card blue-card">
          <div class="label">Overdue</div>
          <div class="value">${overdueCount} entries</div>
        </div>
      </div>

      <div class="section-title">💰 Sales</div>
      <div class="dash-grid">
        <div class="dash-card">
          <div class="label">Today</div>
          <div class="value">${Utils.currency(d.todaySales)}</div>
        </div>
        <div class="dash-card">
          <div class="label">This Month</div>
          <div class="value">${Utils.currency(d.monthSales)}</div>
        </div>
      </div>

      <div class="section-title">🛒 Purchases</div>
      <div class="dash-grid">
        <div class="dash-card">
          <div class="label">Today</div>
          <div class="value">${Utils.currency(d.todayPurchases)}</div>
        </div>
        <div class="dash-card">
          <div class="label">This Month</div>
          <div class="value">${Utils.currency(d.monthPurchases)}</div>
        </div>
      </div>

      ${overdueCount > 0 ? this._overdueSection(d.overduePurchases, d.overdueSales) : ''}

      <div class="section-title">⚡ Quick Actions</div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="NAV.go('add-entry')">➕ Add Entry</button>
        <button class="btn btn-outline" onclick="NAV.go('reports')">📊 Reports</button>
      </div>
      <div class="btn-row mt-8">
        <button class="btn btn-outline" onclick="NAV.go('parties')">👥 Parties</button>
        <button class="btn btn-outline" onclick="DASHBOARD.openSettings()">⚙️ Settings</button>
      </div>

      ${this._settingsModal()}
    `;
  },

  _overdueSection(purchases, sales) {
    const allOverdue = [
      ...purchases.map(r => ({ name: r.parties?.name || 'Unknown', amount: r.pending, type: 'Supplier', due: r.due_date })),
      ...sales.map(r => ({ name: r.parties?.name || 'Unknown', amount: r.pending, type: 'Customer', due: r.due_date }))
    ];
    const rows = allOverdue.map(o => `
      <div class="overdue-item">
        <div>
          <div class="name">${Utils.esc(o.name)}</div>
          <div class="text-muted" style="font-size:13px">${o.type} · Due: ${Utils.dateDisplay(o.due)}</div>
        </div>
        <div class="amount">${Utils.currency(o.amount)}</div>
      </div>`).join('');
    return `
      <div class="overdue-alert">
        <div class="oa-title">⚠️ Overdue Payments (${allOverdue.length})</div>
        ${rows}
      </div>`;
  },

  _settingsModal() {
    const pinEnabled = PIN.isEnabled();
    const bizName = localStorage.getItem('tmr_biz_name') || '';
    return `
      <div class="modal-overlay" id="settings-modal">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">⚙️ Settings <button class="modal-close" onclick="DASHBOARD.closeSettings()">✕</button></div>

          <div class="form-group">
            <label>Business Name</label>
            <input type="text" id="settings-biz-name" value="${Utils.esc(bizName)}" placeholder="e.g. Ravi Tamarind Co." />
          </div>
          <button class="btn btn-primary btn-full" onclick="DASHBOARD.saveBizName()">Save Name</button>

          <hr class="divider" />
          <div class="section-title">🔐 PIN Lock</div>
          ${pinEnabled ? `
            <p class="text-muted" style="margin-bottom:12px">PIN lock is <strong>enabled</strong>. App requires PIN on each session.</p>
            <div class="btn-row">
              <button class="btn btn-outline" onclick="PIN.show('change');DASHBOARD.closeSettings()">Change PIN</button>
              <button class="btn btn-danger" onclick="PIN.disable();DASHBOARD.closeSettings()">Disable PIN</button>
            </div>
          ` : `
            <p class="text-muted" style="margin-bottom:12px">PIN lock is <strong>off</strong>. Enable to protect your data.</p>
            <button class="btn btn-primary btn-full" onclick="PIN.show('set');DASHBOARD.closeSettings()">Enable PIN Lock</button>
          `}

          <hr class="divider" />
          <div class="section-title">📤 Export Data</div>
          <div class="btn-row">
            <button class="btn btn-outline" onclick="DASHBOARD.exportAll('purchases')">Purchases CSV</button>
            <button class="btn btn-outline" onclick="DASHBOARD.exportAll('sales')">Sales CSV</button>
          </div>
          <button class="btn btn-outline btn-full mt-8" onclick="DASHBOARD.exportAll('expenses')">Expenses CSV</button>
        </div>
      </div>`;
  },

  openSettings() {
    document.getElementById('settings-modal')?.classList.add('show');
  },

  closeSettings() {
    document.getElementById('settings-modal')?.classList.remove('show');
  },

  saveBizName() {
    const name = document.getElementById('settings-biz-name').value.trim();
    if (name) {
      localStorage.setItem('tmr_biz_name', name);
      document.getElementById('menu-biz-name').textContent = name;
      Utils.toast('Business name saved', 'success');
      this.closeSettings();
    }
  },

  async exportAll(type) {
    try {
      let data;
      if (type === 'purchases') data = await DB.getPurchases();
      else if (type === 'sales') data = await DB.getSales();
      else data = await DB.getExpenses();
      Utils.exportCSV(data.map(r => {
        const clean = { ...r };
        delete clean.user_id; delete clean.deleted;
        return clean;
      }), `${type}-${Utils.today()}.csv`);
    } catch (e) {
      Utils.toast('Export failed: ' + e.message, 'error');
    }
  }
};
