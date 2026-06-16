/* ============================================================
   payments.js — Payments list page
   Shows all payment records with party name, type, amount, date
   ============================================================ */

const PAYMENTS_PAGE = {
  _data: [],
  _filter: 'all',   // 'all' | 'purchase' | 'sale'

  async render() {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading payments</div>';
    try {
      this._data = await DB.getAllPayments();
      el.innerHTML = this._html();
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html() {
    const filtered = this._filter === 'all'
      ? this._data
      : this._data.filter(p => (this._filter === 'purchase' ? p.purchase_id : p.sale_id));

    const totalPaid = filtered.reduce((s, p) => s + (p.amount || 0), 0);

    const rows = filtered.length
      ? filtered.map(p => this._row(p)).join('')
      : `<div class="empty-state">
           <div class="empty-icon">P</div>
           <p>No payments recorded yet</p>
           <button class="btn btn-primary" onclick="NAV.go('purchases')">View Purchases</button>
         </div>`;

    return `
      <!-- Summary card -->
      <div class="card" style="display:flex;gap:16px;align-items:center;padding:16px 20px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">
            Total Paid${this._filter !== 'all' ? ' (' + this._filter + 's)' : ''}
          </div>
          <div style="font-size:26px;font-weight:800;color:var(--success);margin-top:2px">
            ${Utils.currency(totalPaid)}
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-muted);text-align:right">
          ${filtered.length} payment${filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="tab-bar">
        <button class="tab-btn ${this._filter==='all'?'active':''}"      onclick="PAYMENTS_PAGE.setFilter('all')">All</button>
        <button class="tab-btn ${this._filter==='purchase'?'active':''}" onclick="PAYMENTS_PAGE.setFilter('purchase')">Purchases</button>
        <button class="tab-btn ${this._filter==='sale'?'active':''}"     onclick="PAYMENTS_PAGE.setFilter('sale')">Sales</button>
      </div>

      <!-- List -->
      <div id="payment-rows">${rows}</div>
    `;
  },

  _row(p) {
    const partyName = p._party_name || '—';
    const initials  = partyName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const type      = p.purchase_id ? 'Purchase' : 'Sale';
    const typeCls   = p.purchase_id ? 'purchase' : 'sale';
    const refId     = p.purchase_id || p.sale_id || '';
    const refShort  = refId ? refId.slice(0, 8) + '…' : '';

    return `
      <div class="list-item paid" style="border-left-color:var(--success)">
        <div class="li-avatar ${typeCls}">${initials}</div>
        <div class="li-body">
          <div class="li-name">${Utils.esc(partyName)}</div>
          <div class="li-sub">
            <span class="badge badge-paid" style="font-size:10px">${type}</span>
            &nbsp;${Utils.dateDisplay(p.created_at?.slice(0,10))}
            ${p.notes ? ' · ' + Utils.esc(p.notes.slice(0,30)) : ''}
          </div>
        </div>
        <div class="li-right">
          <div class="li-amount" style="color:var(--success)">${Utils.currency(p.amount)}</div>
          <div class="li-sub">${refShort}</div>
        </div>
      </div>`;
  },

  setFilter(f) {
    this._filter = f;
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', ['all','purchase','sale'][i] === f);
    });
    const filtered = f === 'all'
      ? this._data
      : this._data.filter(p => f === 'purchase' ? p.purchase_id : p.sale_id);
    document.getElementById('payment-rows').innerHTML = filtered.length
      ? filtered.map(p => this._row(p)).join('')
      : `<div class="empty-state"><p>No ${f} payments</p></div>`;
  }
};
