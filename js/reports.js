/* ============================================================
   reports.js — Reports & summary page v2
   No emojis, loss/waste trend, labour breakdown
   ============================================================ */

const REPORTS = {
  _from: '',
  _to:   '',

  async render() {
    const el = document.getElementById('page-container');
    if (!this._from) this._from = Utils.monthStart();
    if (!this._to)   this._to   = Utils.today();
    el.innerHTML = '<div class="loading">Loading reports</div>';
    try {
      const [purchases, sales, expenses] = await Promise.all([
        DB.getPurchases({ from: this._from, to: this._to }),
        DB.getSales({ from: this._from, to: this._to }),
        DB.getExpenses({ from: this._from, to: this._to })
      ]);
      el.innerHTML = this._html(purchases, sales, expenses);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html(purchases, sales, expenses) {
    const totalSales     = sales.reduce((s, r) => s + (r.total || 0), 0);
    const totalPurchases = purchases.reduce((s, r) => s + (r.total || 0), 0);
    const totalExpenses  = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const totalReceived  = sales.reduce((s, r) => s + (r.received_amount || 0), 0);
    const totalPaid      = purchases.reduce((s, r) => s + (r.paid_amount || 0), 0);
    const profit         = totalSales - totalPurchases - totalExpenses;
    const salesPending   = sales.reduce((s, r) => s + (r.pending || 0), 0);
    const purchPending   = purchases.reduce((s, r) => s + (r.pending || 0), 0);

    // Loss/waste
    const totalLoss     = sales.reduce((s, r) => s + (r.loss_quantity || 0), 0);
    const totalExpected = sales.reduce((s, r) => s + (r.expected_quantity || 0), 0);
    const lossPercent   = totalExpected > 0 ? ((totalLoss / totalExpected) * 100).toFixed(1) : 0;

    // Expense by category
    const expByCat = {};
    expenses.forEach(r => {
      const key = r.sub_category ? `${r.category} (${r.sub_category})` : r.category;
      expByCat[key] = (expByCat[key] || 0) + r.amount;
    });
    const catRows = Object.entries(expByCat).sort((a,b) => b[1]-a[1])
      .map(([cat, amt]) => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <span>${Utils.esc(cat)}</span>
          <strong>${Utils.currency(amt)}</strong>
        </div>`).join('');

    // Labour breakdown
    const labourExpenses  = expenses.filter(r => r.category === 'Labour');
    const permanentLabour = labourExpenses.filter(r => r.sub_category === 'Permanent Labour').reduce((s,r)=>s+(r.amount||0),0);
    const contractLabour  = labourExpenses.filter(r => r.sub_category === 'Contract Labour').reduce((s,r)=>s+(r.amount||0),0);

    return `
      <!-- Date Range -->
      <div class="section-title">Date Range</div>
      <div class="card">
        <div style="display:flex;gap:12px;align-items:flex-end">
          <div class="form-group" style="flex:1;margin:0">
            <label>From</label>
            <input type="date" id="report-from" value="${this._from}" onchange="REPORTS.setDate()" />
          </div>
          <div class="form-group" style="flex:1;margin:0">
            <label>To</label>
            <input type="date" id="report-to" value="${this._to}" onchange="REPORTS.setDate()" />
          </div>
        </div>
        <div class="btn-row" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="REPORTS.preset('today')">Today</button>
          <button class="btn btn-outline btn-sm" onclick="REPORTS.preset('week')">This Week</button>
          <button class="btn btn-outline btn-sm" onclick="REPORTS.preset('month')">This Month</button>
          <button class="btn btn-outline btn-sm" onclick="REPORTS.preset('year')">This Year</button>
        </div>
      </div>

      <!-- P&L Summary -->
      <div class="section-title">P&L Summary</div>
      <div class="report-summary">
        <div class="report-card">
          <div class="r-label">Total Sales</div>
          <div class="r-value" style="color:var(--success)">${Utils.currency(totalSales)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Total Purchases</div>
          <div class="r-value" style="color:var(--info)">${Utils.currency(totalPurchases)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Total Expenses</div>
          <div class="r-value" style="color:var(--warning)">${Utils.currency(totalExpenses)}</div>
        </div>
        <div class="report-card" style="${profit >= 0 ? 'border-color:#C8E6C9;background:#F1F8E9' : 'border-color:#FFCDD2;background:#FFF5F5'}">
          <div class="r-label">Net Profit</div>
          <div class="r-value" style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.currency(profit)}</div>
        </div>
      </div>

      <!-- Collections -->
      <div class="section-title">Collections</div>
      <div class="report-summary">
        <div class="report-card">
          <div class="r-label">Received</div>
          <div class="r-value" style="color:var(--success)">${Utils.currency(totalReceived)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Sales Pending</div>
          <div class="r-value" style="color:var(--warning)">${Utils.currency(salesPending)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Payments Made</div>
          <div class="r-value">${Utils.currency(totalPaid)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Purchase Pending</div>
          <div class="r-value" style="color:var(--danger)">${Utils.currency(purchPending)}</div>
        </div>
      </div>

      <!-- Loss / Waste -->
      <div class="section-title">Loss / Waste</div>
      <div class="report-summary">
        <div class="report-card">
          <div class="r-label">Expected Qty</div>
          <div class="r-value">${totalExpected.toFixed(2)} kg</div>
        </div>
        <div class="report-card" style="${totalLoss > 0 ? 'border-color:#FFE0B2;background:#FFF8F0' : ''}">
          <div class="r-label">Total Loss</div>
          <div class="r-value" style="color:${totalLoss > 0 ? 'var(--warning)' : 'var(--success)'}">
            ${totalLoss.toFixed(2)} kg
          </div>
        </div>
        <div class="report-card">
          <div class="r-label">Loss %</div>
          <div class="r-value" style="color:${parseFloat(lossPercent) > 5 ? 'var(--warning)' : 'var(--text)'}">${lossPercent}%</div>
        </div>
      </div>

      <!-- Labour -->
      ${(permanentLabour + contractLabour) > 0 ? `
      <div class="section-title">Labour Cost</div>
      <div class="report-summary">
        <div class="report-card">
          <div class="r-label">Permanent</div>
          <div class="r-value" style="color:#6A1B9A">${Utils.currency(permanentLabour)}</div>
        </div>
        <div class="report-card">
          <div class="r-label">Contract</div>
          <div class="r-value" style="color:#00695C">${Utils.currency(contractLabour)}</div>
        </div>
      </div>` : ''}

      <!-- Expense breakdown -->
      ${Object.keys(expByCat).length ? `
        <div class="section-title">Expenses by Category</div>
        <div class="card">${catRows}</div>
      ` : ''}

      <!-- Export -->
      <div class="section-title">Export</div>
      <div class="btn-row">
        <button class="btn btn-outline" onclick="REPORTS.export('purchases')">Purchases CSV</button>
        <button class="btn btn-outline" onclick="REPORTS.export('sales')">Sales CSV</button>
      </div>
      <button class="btn btn-outline btn-full mt-8" onclick="REPORTS.export('expenses')">Expenses CSV</button>
    `;
  },

  setDate() {
    this._from = document.getElementById('report-from')?.value || this._from;
    this._to   = document.getElementById('report-to')?.value   || this._to;
    this.render();
  },

  preset(range) {
    const today = Utils.today();
    const d = new Date();
    if (range === 'today') {
      this._from = today; this._to = today;
    } else if (range === 'week') {
      const start = new Date(d); start.setDate(d.getDate() - d.getDay());
      this._from = start.toISOString().slice(0,10); this._to = today;
    } else if (range === 'month') {
      this._from = Utils.monthStart(); this._to = today;
    } else if (range === 'year') {
      this._from = `${d.getFullYear()}-01-01`; this._to = today;
    }
    this.render();
  },

  async export(type) {
    try {
      let data;
      if (type === 'purchases')    data = await DB.getPurchases({ from: this._from, to: this._to });
      else if (type === 'sales')   data = await DB.getSales({ from: this._from, to: this._to });
      else                         data = await DB.getExpenses({ from: this._from, to: this._to });
      Utils.exportCSV(data.map(r => {
        const c = { ...r }; delete c.user_id; delete c.deleted; delete c.parties; return c;
      }), `${type}-${this._from}-to-${this._to}.csv`);
    } catch (e) {
      Utils.toast('Export failed', 'error');
    }
  }
};
