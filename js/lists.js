/* ============================================================
   lists.js — Purchases, Sales, Expenses list pages v3
   Full payment system: modal, history, validation
   ============================================================ */

const LISTS = {
  _type: 'purchases',
  _data: [],
  _filterStatus: 'all',
  _saving: false,

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
        <button class="btn btn-ghost btn-icon" onclick="LISTS.exportList()" title="Export CSV">
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

  /* ---- Detail View ---- */
  async viewDetail(id) {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading detail</div>';
    try {
      const data = this._data.find(r => r.id === id);
      if (!data) throw new Error('Record not found');
      // Load payment history for purchases and sales
      let payments = [];
      if (this._type !== 'expenses') {
        const filter = this._type === 'purchases' ? { purchase_id: id } : { sale_id: id };
        payments = await DB.getPayments(filter);
      }
      el.innerHTML = this._detailHtml(data, payments);
    } catch (e) {
      Utils.toast(e.message, 'error');
      this.render(this._type);
    }
  },

  _detailHtml(r, payments = []) {
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
        <div class="form-group"><label>Pending</label>
          <input readonly value="${Utils.currency(pending)}" style="color:${pending > 0 ? 'var(--warning)' : 'var(--success)'}; font-weight:700" /></div>
        ${r.due_date ? `<div class="form-group"><label>Due Date</label><input readonly value="${Utils.dateDisplay(r.due_date)}" /></div>` : ''}
        <div class="form-group"><label>Status</label><div style="padding:6px 0">${Utils.badge(pending, r.due_date)}</div></div>
        ${r.notes ? `<div class="form-group"><label>Notes</label><textarea readonly>${Utils.esc(r.notes)}</textarea></div>` : ''}`;

    } else {
      const lossQty  = r.loss_quantity || 0;
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
        <div class="form-group"><label>Pending</label>
          <input readonly value="${Utils.currency(pending)}" style="color:${pending > 0 ? 'var(--warning)' : 'var(--success)'}; font-weight:700" /></div>
        ${r.due_date ? `<div class="form-group"><label>Due Date</label><input readonly value="${Utils.dateDisplay(r.due_date)}" /></div>` : ''}
        <div class="form-group"><label>Status</label><div style="padding:6px 0">${Utils.badge(pending, r.due_date)}</div></div>
        ${r.notes ? `<div class="form-group"><label>Notes</label><textarea readonly>${Utils.esc(r.notes)}</textarea></div>` : ''}`;
    }

    /* Payment history block */
    const paymentHistory = !isExpense && payments.length ? `
      <div class="section-title" style="margin-top:20px">Payment History</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${payments.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:12px 16px;border-bottom:1px solid var(--border);font-size:14px">
            <div>
              <div style="font-weight:600;color:var(--text)">${Utils.currency(p.amount)}</div>
              <div style="color:var(--text-muted);font-size:12px;margin-top:2px">
                ${Utils.dateDisplay(p.created_at?.slice(0,10))}${p.notes ? ' · ' + Utils.esc(p.notes) : ''}
              </div>
            </div>
            <span class="badge badge-paid">Paid</span>
          </div>`).join('')}
      </div>` : '';

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    return `
      <button class="btn btn-link" style="padding:0 0 14px;font-size:14px" onclick="LISTS.render('${type}')">Back to ${typeLabel}</button>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:17px;font-weight:700">${Utils.esc(name)}</div>
          <div>${isExpense ? '' : Utils.badge(pending, r.due_date)}</div>
        </div>
        ${details}
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-ghost" onclick="LISTS.editRecord('${r.id}')">Edit</button>
          <button class="btn btn-danger" onclick="LISTS.deleteRecord('${r.id}')">Delete</button>
        </div>
        ${!isExpense && pending > 0 ? `
          <button class="btn btn-success btn-full mt-8"
            onclick="LISTS.openPaymentModal('${r.id}', ${pending})">
            Record Payment
          </button>` : ''}
      </div>
      ${paymentHistory}

      <!-- Payment modal -->
      <div class="modal-overlay" id="payment-modal">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">
            Record Payment
            <button class="modal-close" onclick="LISTS.closePaymentModal()">&#x2715;</button>
          </div>
          <div style="background:var(--surface-2);border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Pending Amount</div>
            <div style="font-size:24px;font-weight:800;color:var(--warning);margin-top:2px" id="pay-pending-display">${Utils.currency(pending)}</div>
          </div>
          <div class="form-group">
            <label>Payment Amount *</label>
            <input type="number" id="pay-amount" inputmode="decimal" placeholder="0" min="1" step="0.01" />
          </div>
          <button class="btn btn-ghost btn-full" style="margin-bottom:10px"
            onclick="LISTS._fillFullPayment()">
            Pay Full Amount (${Utils.currency(pending)})
          </button>
          <div class="form-group">
            <label>Notes (optional)</label>
            <input type="text" id="pay-notes" placeholder="e.g. Bank transfer, cheque no..." />
          </div>
          <p id="pay-error" style="color:var(--danger);font-size:13px;min-height:18px;margin-bottom:8px"></p>
          <button class="btn btn-success btn-full" id="pay-submit-btn"
            onclick="LISTS.submitPayment()">
            Confirm Payment
          </button>
        </div>
      </div>
    `;
  },

  /* ---- Payment modal ---- */
  _currentPaymentId: null,
  _currentPending: 0,

  openPaymentModal(id, pending) {
    this._currentPaymentId = id;
    this._currentPending   = pending;
    document.getElementById('pay-amount').value  = '';
    document.getElementById('pay-notes').value   = '';
    document.getElementById('pay-error').textContent = '';
    document.getElementById('pay-pending-display').textContent = Utils.currency(pending);
    document.getElementById('payment-modal').classList.add('show');
    setTimeout(() => document.getElementById('pay-amount').focus(), 200);
  },

  closePaymentModal() {
    document.getElementById('payment-modal')?.classList.remove('show');
    this._currentPaymentId = null;
    this._currentPending   = 0;
  },

  _fillFullPayment() {
    const el = document.getElementById('pay-amount');
    if (el) el.value = this._currentPending.toFixed(2);
  },

  async submitPayment() {
    if (this._saving) return;
    const amtStr = document.getElementById('pay-amount').value;
    const notes  = document.getElementById('pay-notes').value.trim();
    const errEl  = document.getElementById('pay-error');
    const btn    = document.getElementById('pay-submit-btn');
    errEl.textContent = '';

    const amt = parseFloat(amtStr);
    if (!amtStr || isNaN(amt) || amt <= 0) {
      errEl.textContent = 'Please enter a valid amount.'; return;
    }
    if (amt > this._currentPending + 0.01) {
      errEl.textContent = `Amount cannot exceed pending (${Utils.currency(this._currentPending)}).`; return;
    }

    this._saving = true;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const isP = this._type === 'purchases';
      await DB.addPayment({
        purchase_id: isP ? this._currentPaymentId : null,
        sale_id:    !isP ? this._currentPaymentId : null,
        amount: amt,
        notes
      });
      this.closePaymentModal();
      Utils.toast('Payment recorded!', 'success');
      // Reload the list and re-open the detail with fresh data
      this._data = await this._fetch();
      const updated = this._data.find(r => r.id === this._currentPaymentId);
      // _currentPaymentId cleared by closePaymentModal, use local ref
      const detailId = updated?.id;
      if (detailId) await this.viewDetail(detailId);
      else this.render(this._type);
    } catch (e) {
      errEl.textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = 'Confirm Payment';
    } finally {
      this._saving = false;
    }
  },

  /* ---- Edit / Delete ---- */
  editRecord(id) {
    const rec = this._data.find(r => r.id === id);
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
