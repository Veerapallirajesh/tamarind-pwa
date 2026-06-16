/* ============================================================
   lists.js — Purchases, Sales, Expenses list pages v2
   No emojis, shows new fields (loss, tax, sub_category)
   ============================================================ */

const LISTS = {
  _type: 'purchases',
  _data: [],
  _filterStatus: 'all',

  async render(type) {
    this._type = type;
    this._filterStatus = 'all';
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading</div>';
    try {
      this._data = await this._fetch();
      el.innerHTML = this._html();
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  async _fetch() {
    if (this._type === 'purchases') return DB.getPurchases();
    if (this._type === 'sales')     return DB.getSales();
    return DB.getExpenses();
  },

  _html() {
    const isExpense = this._type === 'expenses';
    const rows = this._filteredData();
    const rowsHtml = rows.length
      ? rows.map(r => isExpense ? this._expenseRow(r) : this._txnRow(r)).join('')
      : `<div class="empty-state">
           <div class="empty-icon">${this._type.charAt(0).toUpperCase()}</div>
           <p>No ${this._type} found</p>
           <button class="btn btn-primary" onclick="NAV.go('add-entry')">Add Entry</button>
         </div>`;

    const statusBar = isExpense ? '' : `
      <div class="tab-bar">
        <button class="tab-btn ${this._filterStatus==='all'?'active':''}"     onclick="LISTS.setStatusFilter('all')">All</button>
        <button class="tab-btn ${this._filterStatus==='pending'?'active':''}" onclick="LISTS.setStatusFilter('pending')">Pending</button>
        <button class="tab-btn ${this._filterStatus==='overdue'?'active':''}" onclick="LISTS.setStatusFilter('overdue')">Overdue</button>
        <button class="tab-btn ${this._filterStatus==='paid'?'active':''}"    onclick="LISTS.setStatusFilter('paid')">Paid</button>
      </div>`;

    const totalAmt = this._data.reduce((s, r) => s + (r.total || r.amount || 0), 0);
    const pending  = this._data.reduce((s, r) => s + (r.pending || 0), 0);

    return `
      ${statusBar}
      <div class="search-bar">
        <input type="search" placeholder="Search..." id="list-search" oninput="LISTS.search(this.value)" />
        <button class="btn btn-outline btn-icon" onclick="LISTS.exportList()" title="Export CSV">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>

      ${!isExpense ? `
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <div class="dash-card" style="flex:1;padding:12px">
          <div class="label" style="font-size:11px">Total</div>
          <div class="value" style="font-size:17px">${Utils.currency(totalAmt)}</div>
        </div>
        <div class="dash-card orange-card" style="flex:1;padding:12px">
          <div class="label" style="font-size:11px">Pending</div>
          <div class="value" style="font-size:17px">${Utils.currency(pending)}</div>
        </div>
      </div>` : ''}

      <div id="list-rows">${rowsHtml}</div>
      <button class="fab" onclick="NAV.go('add-entry')" title="Add">+</button>
    `;
  },

  _filteredData() {
    if (this._type === 'expenses' || this._filterStatus === 'all') return this._data;
    return this._data.filter(r => Utils.status(r.pending, r.due_date) === this._filterStatus);
  },

  _txnRow(r) {
    const name      = r.parties?.name || 'Unknown';
    const pending   = r.pending || 0;
    const statusCls = Utils.status(pending, r.due_date);
    const isBuy     = this._type === 'purchases';
    const detail    = isBuy
      ? (r.material || 'Seeds') + ' · ' + (r.quantity || 0) + ' kg'
      : (r.product || '') + ' · ' + (r.actual_quantity || 0) + ' kg';
    const initials  = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    return `
      <div class="list-item ${statusCls}" onclick="LISTS.viewDetail('${r.id}')">
        <div class="li-avatar ${isBuy ? 'purchase' : 'sale'}">${initials}</div>
        <div class="li-body">
          <div class="li-name">${Utils.esc(name)}</div>
          <div class="li-sub">${Utils.esc(detail)} · ${Utils.dateDisplay(r.created_at?.slice(0,10))}</div>
        </div>
        <div class="li-right">
          <div class="li-amount">${Utils.currency(r.total)}</div>
          ${pending > 0
            ? `<div class="li-${statusCls}">${Utils.currency(pending)} due</div>`
            : '<div class="li-sub" style="color:var(--success);font-weight:600">Paid</div>'}
        </div>
      </div>`;
  },

  _expenseRow(r) {
    const sub  = r.sub_category ? ` · ${r.sub_category}` : '';
    const note = r.notes ? ` · ${r.notes.slice(0,30)}` : '';
    const init = (r.category || 'E').charAt(0).toUpperCase();
    return `
      <div class="list-item" onclick="LISTS.viewDetail('${r.id}')">
        <div class="li-avatar expense">${init}</div>
        <div class="li-body">
          <div class="li-name">${Utils.esc(r.category)}${Utils.esc(sub)}</div>
          <div class="li-sub">${Utils.dateDisplay(r.date)}${Utils.esc(note)}</div>
        </div>
        <div class="li-right">
          <div class="li-amount">${Utils.currency(r.amount)}</div>
        </div>
      </div>`;
  },

  setStatusFilter(f) {
    this._filterStatus = f;
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', ['all','pending','overdue','paid'][i] === f);
    });
    const rows = this._filteredData();
    const isExpense = this._type === 'expenses';
    document.getElementById('list-rows').innerHTML = rows.length
      ? rows.map(r => isExpense ? this._expenseRow(r) : this._txnRow(r)).join('')
      : `<div class="empty-state"><p>No ${f} entries</p></div>`;
  },

  search(q) {
    const lower = q.toLowerCase();
    document.querySelectorAll('#list-rows .list-item').forEach(row => {
      const text = row.querySelector('.li-name')?.textContent.toLowerCase() || '';
      const sub  = row.querySelector('.li-sub')?.textContent.toLowerCase() || '';
      row.style.display = (text + sub).includes(lower) ? '' : 'none';
    });
  },

  async viewDetail(id) {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading detail</div>';
    try {
      const data = this._data.find(r => r.id === id);
      if (!data) throw new Error('Record not found');
      el.innerHTML = this._detailHtml(data);
    } catch (e) {
      Utils.toast(e.message, 'error');
      this.render(this._type);
    }
  },

  _detailHtml(r) {
    const isExpense = this._type === 'expenses';
    const type      = this._type;
    const name      = r.parties?.name || r.category || 'Unknown';
    const pending   = r.pending || 0;
    let details     = '';

    if (isExpense) {
      const sub = r.sub_category ? `<div class="form-group"><label>Labour Type</label><input readonly value="${Utils.esc(r.sub_category)}" /></div>` : '';
      details = `
        <div class="form-group"><label>Category</label><input readonly value="${Utils.esc(r.category)}" /></div>
        ${sub}
        <div class="form-group"><label>Amount</label><input readonly value="${Utils.currency(r.amount)}" /></div>
        <div class="form-group"><label>Date</label><input readonly value="${Utils.dateDisplay(r.date)}" /></div>
        ${r.notes ? `<div class="form-group"><label>Notes</label><textarea readonly>${Utils.esc(r.notes)}</textarea></div>` : ''}`;
    } else if (type === 'purchases') {
      details = `
        <div class="form-group"><label>Supplier</label><input readonly value="${Utils.esc(name)}" /></div>
        <div class="form-group"><label>Material</label><input readonly value="${Utils.esc(r.material || 'Tamarind Seeds')}" /></div>
        <div class="form-group"><label>Quantity</label><input readonly value="${r.quantity} kg" /></div>
        <div class="form-group"><label>Rate</label><input readonly value="${Utils.currency(r.rate)} / kg" /></div>
        <div class="form-group"><label>Subtotal</label><input readonly value="${Utils.currency(r.subtotal)}" /></div>
        <div class="form-group"><label>GST (${r.tax_pct || 5}%)</label><input readonly value="${Utils.currency(r.tax_amount)}" /></div>
        <div class="form-group"><label>Total</label><div class="auto-total">${Utils.currency(r.total)}</div></div>
        <div class="form-group"><label>Amount Paid</label><input readonly value="${Utils.currency(r.paid_amount)}" /></div>
        <div class="form-group"><label>Pending</label><input readonly value="${Utils.currency(pending)}" style="color:${pending > 0 ? 'var(--warning)' : 'var(--success)'}" /></div>
        ${r.due_date ? `<div class="form-group"><label>Due Date</label><input readonly value="${Utils.dateDisplay(r.due_date)}" /></div>` : ''}
        <div class="form-group"><label>Status</label><div style="padding:8px">${Utils.badge(pending, r.due_date)}</div></div>
        ${r.notes ? `<div class="form-group"><label>Notes</label><textarea readonly>${Utils.esc(r.notes)}</textarea></div>` : ''}`;
    } else {
      const lossQty = r.loss_quantity || 0;
      const lossHtml = lossQty > 0
        ? `<div class="loss-indicator">Loss: ${lossQty.toFixed(2)} kg</div>`
        : `<div class="loss-indicator no-loss">No loss</div>`;
      details = `
        <div class="form-group"><label>Customer</label><input readonly value="${Utils.esc(name)}" /></div>
        <div class="form-group"><label>Product</label><input readonly value="${Utils.esc(r.product)}" /></div>
        <div class="form-group"><label>Expected Quantity</label><input readonly value="${r.expected_quantity} kg" /></div>
        <div class="form-group"><label>Actual Quantity</label><input readonly value="${r.actual_quantity} kg" />${lossHtml}</div>
        <div class="form-group"><label>Rate</label><input readonly value="${Utils.currency(r.rate)} / kg" /></div>
        <div class="form-group"><label>Total</label><div class="auto-total">${Utils.currency(r.total)}</div></div>
        <div class="form-group"><label>Amount Received</label><input readonly value="${Utils.currency(r.received_amount)}" /></div>
        <div class="form-group"><label>Pending</label><input readonly value="${Utils.currency(pending)}" style="color:${pending > 0 ? 'var(--warning)' : 'var(--success)'}" /></div>
        ${r.due_date ? `<div class="form-group"><label>Due Date</label><input readonly value="${Utils.dateDisplay(r.due_date)}" /></div>` : ''}
        <div class="form-group"><label>Status</label><div style="padding:8px">${Utils.badge(pending, r.due_date)}</div></div>
        ${r.notes ? `<div class="form-group"><label>Notes</label><textarea readonly>${Utils.esc(r.notes)}</textarea></div>` : ''}`;
    }

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    return `
      <button class="btn btn-link" style="padding:0 0 14px;font-size:14px" onclick="LISTS.render('${type}')">Back to ${typeLabel}</button>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:18px;font-weight:700">${Utils.esc(name)}</div>
          <div>${isExpense ? '' : Utils.badge(pending, r.due_date)}</div>
        </div>
        ${details}
        <div class="btn-row">
          <button class="btn btn-outline" onclick="LISTS.editRecord('${r.id}')">Edit</button>
          <button class="btn btn-danger"  onclick="LISTS.deleteRecord('${r.id}')">Delete</button>
        </div>
        ${!isExpense && pending > 0 ? `
          <button class="btn btn-success btn-full mt-8" onclick="LISTS.markPayment('${r.id}')">Record Payment</button>` : ''}
      </div>
    `;
  },

  editRecord(id) {
    const rec    = this._data.find(r => r.id === id);
    if (!rec) return;
    const typeMap = { purchases: 'purchase', sales: 'sale', expenses: 'expense' };
    NAV.go('add-entry', { edit: rec, entryType: typeMap[this._type] });
  },

  async deleteRecord(id) {
    if (!await Utils.confirm('Delete Record', 'This record will be hidden. Continue?')) return;
    try {
      if (this._type === 'purchases')  await DB.deletePurchase(id);
      else if (this._type === 'sales') await DB.deleteSale(id);
      else                              await DB.deleteExpense(id);
      Utils.toast('Deleted', 'success');
      await this.render(this._type);
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  },

  async markPayment(id) {
    const rec = this._data.find(r => r.id === id);
    if (!rec) return;
    const amtStr = prompt(`Enter payment amount\nPending: ${Utils.currency(rec.pending)}`);
    if (!amtStr) return;
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0) { Utils.toast('Invalid amount', 'error'); return; }
    try {
      const updated = { ...rec };
      if (this._type === 'purchases') {
        updated.paid_amount = (updated.paid_amount || 0) + amt;
        await DB.savePurchase(updated);
      } else {
        updated.received_amount = (updated.received_amount || 0) + amt;
        await DB.saveSale(updated);
      }
      Utils.toast('Payment recorded!', 'success');
      await this.render(this._type);
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  },

  async exportList() {
    try {
      const data = this._data.map(r => {
        const c = { ...r };
        delete c.user_id; delete c.deleted; delete c.parties;
        return c;
      });
      Utils.exportCSV(data, `${this._type}-${Utils.today()}.csv`);
    } catch (e) {
      Utils.toast('Export failed', 'error');
    }
  }
};
