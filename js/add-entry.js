/* ============================================================
   add-entry.js — Smart Add Entry form v2
   Purchase (with 5% tax) / Sale (expected vs actual qty) / Expense (Labour sub-category)
   ============================================================ */

const ADD_ENTRY = {
  _type: 'purchase',
  _suppliers: [],
  _customers: [],
  _editData: null,
  _saving: false,   // guard against double-tap

  async render(params = {}) {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading form</div>';
    this._editData = params.edit || null;
    if (params.entryType) this._type = params.entryType;
    try {
      const parties = await DB.getParties();
      this._suppliers = parties.filter(p => p.type === 'supplier');
      this._customers = parties.filter(p => p.type === 'customer');
      el.innerHTML = this._html();
      this.switchType(this._editData ? this._type : 'purchase');
      if (this._editData) this._fillEdit(this._editData);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html() {
    const isEdit = !!this._editData;
    return `
      ${isEdit ? `
        <div style="display:flex;align-items:center;gap:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <svg width="18" height="18" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span style="font-size:14px;font-weight:600;color:#1D4ED8">Editing ${this._type} — changes will update the existing record</span>
        </div>` : ''}
      <div class="type-selector" id="type-selector" style="${isEdit ? 'opacity:0.4;pointer-events:none' : ''}">
        <button class="type-btn" id="type-btn-purchase" onclick="ADD_ENTRY.switchType('purchase')">
          <div class="type-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          Purchase
        </button>
        <button class="type-btn" id="type-btn-sale" onclick="ADD_ENTRY.switchType('sale')">
          <div class="type-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          Sale
        </button>
        <button class="type-btn" id="type-btn-expense" onclick="ADD_ENTRY.switchType('expense')">
          <div class="type-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          </div>
          Expense
        </button>
      </div>
      <div id="form-area"></div>
    `;
  },

  switchType(type) {
    this._type = type;
    ['purchase', 'sale', 'expense'].forEach(t => {
      document.getElementById(`type-btn-${t}`)?.classList.toggle('active', t === type);
    });
    const forms = {
      purchase: this._purchaseForm(),
      sale:     this._saleForm(),
      expense:  this._expenseForm()
    };
    document.getElementById('form-area').innerHTML = forms[type] || '';

    if (type === 'purchase') {
      document.getElementById('qty')?.addEventListener('input', () => this._calcPurchaseTotal());
      document.getElementById('rate')?.addEventListener('input', () => this._calcPurchaseTotal());
    } else if (type === 'sale') {
      document.getElementById('expected-qty')?.addEventListener('input', () => this._calcSaleTotal());
      document.getElementById('actual-qty')?.addEventListener('input',   () => this._calcSaleTotal());
      document.getElementById('rate')?.addEventListener('input',         () => this._calcSaleTotal());
    } else if (type === 'expense') {
      document.getElementById('category')?.addEventListener('change', () => this._toggleLabourSubcat());
    }
  },

  /* ---- PURCHASE FORM ---- */
  _purchaseForm() {
    const supplierOpts = this._suppliers.map(p =>
      `<option value="${p.id}">${Utils.esc(p.name)}</option>`).join('');
    const materialOpts = RAW_MATERIALS.map(m =>
      `<option value="${m}">${m}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Supplier *</label>
          <select id="party-id">
            <option value="">— Select Supplier —</option>
            ${supplierOpts}
          </select>
          <button class="btn btn-link" style="padding:6px 0;font-size:13px" onclick="ADD_ENTRY.quickAddParty('supplier')">+ Add new supplier</button>
        </div>
        <div class="form-group">
          <label>Material</label>
          <select id="material">
            ${materialOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Quantity (kg) *</label>
          <input type="number" id="qty" inputmode="decimal" placeholder="0" min="0" step="0.1" />
        </div>
        <div class="form-group">
          <label>Rate (per kg) *</label>
          <input type="number" id="rate" inputmode="decimal" placeholder="0" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>Amount Breakdown</label>
          <div class="tax-breakdown" id="tax-breakdown">
            <div class="tb-row"><span>Subtotal</span><span id="tb-subtotal">—</span></div>
            <div class="tb-row"><span>GST (5%)</span><span id="tb-tax">—</span></div>
            <div class="tb-row tb-total"><span>Total Payable</span><span id="tb-total">—</span></div>
          </div>
        </div>
        <div class="form-group">
          <label>Amount Paid</label>
          <input type="number" id="paid" inputmode="decimal" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="due-date" />
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="notes" placeholder="Any extra details..."></textarea>
        </div>
        <input type="hidden" id="edit-id" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">${this._editData ? 'Update Purchase' : 'Save Purchase'}</button>
      </div>`;
  },

  /* ---- SALE FORM ---- */
  _saleForm() {
    const customerOpts = this._customers.map(p =>
      `<option value="${p.id}">${Utils.esc(p.name)}</option>`).join('');
    const productOpts  = PRODUCTS.map(p =>
      `<option value="${p}">${p}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Customer *</label>
          <select id="party-id">
            <option value="">— Select Customer —</option>
            ${customerOpts}
          </select>
          <button class="btn btn-link" style="padding:6px 0;font-size:13px" onclick="ADD_ENTRY.quickAddParty('customer')">+ Add new customer</button>
        </div>
        <div class="form-group">
          <label>Product *</label>
          <select id="product">
            <option value="">— Select Product —</option>
            ${productOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Expected Quantity (kg) *</label>
          <input type="number" id="expected-qty" inputmode="decimal" placeholder="0" min="0" step="0.1" />
        </div>
        <div class="form-group">
          <label>Actual Quantity (kg) *</label>
          <input type="number" id="actual-qty" inputmode="decimal" placeholder="0" min="0" step="0.1" />
          <div id="loss-indicator"></div>
        </div>
        <div class="form-group">
          <label>Rate (per kg) *</label>
          <input type="number" id="rate" inputmode="decimal" placeholder="0" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>Total Amount</label>
          <div class="auto-total" id="auto-total">—</div>
          <p class="tax-note">Based on actual quantity</p>
        </div>
        <div class="form-group">
          <label>Amount Received</label>
          <input type="number" id="paid" inputmode="decimal" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="due-date" />
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="notes" placeholder="Any extra details..."></textarea>
        </div>
        <input type="hidden" id="edit-id" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">${this._editData ? 'Update Sale' : 'Save Sale'}</button>
      </div>`;
  },

  /* ---- EXPENSE FORM ---- */
  _expenseForm() {
    const catOpts = EXPENSE_CATEGORIES.map(c =>
      `<option value="${c}">${c}</option>`).join('');
    const subcatOpts = LABOUR_SUBCATEGORIES.map(s =>
      `<option value="${s}">${s}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Category *</label>
          <select id="category" onchange="ADD_ENTRY._toggleLabourSubcat()">
            <option value="">— Select Category —</option>
            ${catOpts}
          </select>
        </div>
        <div class="form-group" id="subcat-group" style="display:none">
          <label>Labour Type *</label>
          <select id="sub-category">
            <option value="">— Select Type —</option>
            ${subcatOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Amount (Rs.) *</label>
          <input type="number" id="exp-amount" inputmode="decimal" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label>Date *</label>
          <input type="date" id="exp-date" value="${Utils.today()}" />
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="notes" placeholder="What was this for?"></textarea>
        </div>
        <input type="hidden" id="edit-id" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">${this._editData ? 'Update Expense' : 'Save Expense'}</button>
      </div>`;
  },

  /* ---- CALCULATIONS ---- */
  _calcPurchaseTotal() {
    const qty  = parseFloat(document.getElementById('qty')?.value) || 0;
    const rate = parseFloat(document.getElementById('rate')?.value) || 0;
    const subtotal   = qty * rate;
    const taxAmount  = subtotal * PURCHASE_TAX_PCT / 100;
    const total      = subtotal + taxAmount;
    const fmt = v => Utils.currency(v);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
    set('tb-subtotal', subtotal);
    set('tb-tax',      taxAmount);
    set('tb-total',    total);
  },

  _calcSaleTotal() {
    const expected = parseFloat(document.getElementById('expected-qty')?.value) || 0;
    const actual   = parseFloat(document.getElementById('actual-qty')?.value) || 0;
    const rate     = parseFloat(document.getElementById('rate')?.value) || 0;
    const total    = actual * rate;
    const loss     = expected - actual;

    const totalEl = document.getElementById('auto-total');
    if (totalEl) totalEl.textContent = Utils.currency(total);

    const lossEl = document.getElementById('loss-indicator');
    if (lossEl) {
      if (expected > 0 && actual > 0) {
        if (loss > 0) {
          lossEl.innerHTML = `<div class="loss-indicator">Loss / Waste: ${loss.toFixed(2)} kg (${((loss/expected)*100).toFixed(1)}%)</div>`;
        } else {
          lossEl.innerHTML = `<div class="loss-indicator no-loss">No loss recorded</div>`;
        }
      } else {
        lossEl.innerHTML = '';
      }
    }
    return total;
  },

  _toggleLabourSubcat() {
    const cat   = document.getElementById('category')?.value;
    const group = document.getElementById('subcat-group');
    if (group) group.style.display = cat === 'Labour' ? 'block' : 'none';
  },

  /* ---- SAVE ---- */
  async save() {
    if (this._saving) return;           // block double-tap
    this._saving = true;
    const btn = document.querySelector('#form-area .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
      if (this._type === 'purchase')      await this._savePurchase();
      else if (this._type === 'sale')     await this._saveSale();
      else                                await this._saveExpense();
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Save'; }
    } finally {
      this._saving = false;
    }
  },

  async _savePurchase() {
    const partyId  = document.getElementById('party-id').value;
    const material = document.getElementById('material').value;
    const qty      = parseFloat(document.getElementById('qty').value) || 0;
    const rate     = parseFloat(document.getElementById('rate').value) || 0;
    const paid     = parseFloat(document.getElementById('paid').value) || 0;
    const due      = document.getElementById('due-date').value;
    const notes    = document.getElementById('notes').value.trim();
    // Use _editData.id as primary source; hidden field as fallback
    const editId   = this._editData?.id || document.getElementById('edit-id').value || null;
    console.log('[ADD_ENTRY] savePurchase editId=', editId, editId ? 'UPDATE' : 'INSERT');
    if (!partyId)  { Utils.toast('Please select a supplier', 'error'); return; }
    if (!material) { Utils.toast('Please select material', 'error'); return; }
    if (qty <= 0)  { Utils.toast('Enter a valid quantity', 'error'); return; }
    if (rate <= 0) { Utils.toast('Enter a valid rate', 'error'); return; }
    const rec = { party_id: partyId, material, quantity: qty, rate, paid_amount: paid, due_date: due || null, notes };
    if (editId) rec.id = editId;
    await DB.savePurchase(rec);
    Utils.toast(editId ? 'Purchase updated!' : 'Purchase saved!', 'success');
    NAV.go('purchases');
  },

  async _saveSale() {
    const partyId  = document.getElementById('party-id').value;
    const product  = document.getElementById('product').value;
    const expected = parseFloat(document.getElementById('expected-qty').value) || 0;
    const actual   = parseFloat(document.getElementById('actual-qty').value) || 0;
    const rate     = parseFloat(document.getElementById('rate').value) || 0;
    const recv     = parseFloat(document.getElementById('paid').value) || 0;
    const due      = document.getElementById('due-date').value;
    const notes    = document.getElementById('notes').value.trim();
    const editId   = this._editData?.id || document.getElementById('edit-id').value || null;
    console.log('[ADD_ENTRY] saveSale editId=', editId, editId ? 'UPDATE' : 'INSERT');
    if (!partyId)      { Utils.toast('Please select a customer', 'error'); return; }
    if (!product)      { Utils.toast('Please select a product', 'error'); return; }
    if (expected <= 0) { Utils.toast('Enter expected quantity', 'error'); return; }
    if (actual <= 0)   { Utils.toast('Enter actual quantity', 'error'); return; }
    if (rate <= 0)     { Utils.toast('Enter a valid rate', 'error'); return; }
    const rec = { party_id: partyId, product, expected_quantity: expected, actual_quantity: actual, rate, received_amount: recv, due_date: due || null, notes };
    if (editId) rec.id = editId;
    await DB.saveSale(rec);
    Utils.toast(editId ? 'Sale updated!' : 'Sale saved!', 'success');
    NAV.go('sales');
  },

  async _saveExpense() {
    const category = document.getElementById('category').value;
    const subCat   = document.getElementById('sub-category')?.value || '';
    const amount   = parseFloat(document.getElementById('exp-amount').value) || 0;
    const date     = document.getElementById('exp-date').value;
    const notes    = document.getElementById('notes').value.trim();
    const editId   = this._editData?.id || document.getElementById('edit-id').value || null;
    console.log('[ADD_ENTRY] saveExpense editId=', editId, editId ? 'UPDATE' : 'INSERT');
    if (!category) { Utils.toast('Please select a category', 'error'); return; }
    if (category === 'Labour' && !subCat) { Utils.toast('Please select labour type', 'error'); return; }
    if (amount <= 0){ Utils.toast('Enter a valid amount', 'error'); return; }
    if (!date)      { Utils.toast('Please select a date', 'error'); return; }
    const rec = { category, sub_category: subCat || null, amount, date, notes };
    if (editId) rec.id = editId;
    await DB.saveExpense(rec);
    Utils.toast(editId ? 'Expense updated!' : 'Expense saved!', 'success');
    NAV.go('expenses');
  },

  _fillEdit(data) {
    const type = this._type;
    if (type === 'expense') {
      this._setVal('category', data.category);
      this._toggleLabourSubcat();
      if (data.sub_category) this._setVal('sub-category', data.sub_category);
      this._setVal('exp-amount', data.amount);
      this._setVal('exp-date', data.date);
      this._setVal('notes', data.notes);
    } else if (type === 'purchase') {
      this._setVal('party-id', data.party_id);
      this._setVal('material', data.material || 'Tamarind Seeds');
      this._setVal('qty', data.quantity);
      this._setVal('rate', data.rate);
      this._setVal('paid', data.paid_amount);
      this._setVal('due-date', data.due_date || '');
      this._setVal('notes', data.notes);
      this._calcPurchaseTotal();
    } else {
      this._setVal('party-id', data.party_id);
      this._setVal('product', data.product);
      this._setVal('expected-qty', data.expected_quantity);
      this._setVal('actual-qty', data.actual_quantity);
      this._setVal('rate', data.rate);
      this._setVal('paid', data.received_amount);
      this._setVal('due-date', data.due_date || '');
      this._setVal('notes', data.notes);
      this._calcSaleTotal();
    }
    document.getElementById('edit-id').value = data.id || '';
  },

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
  },

  async quickAddParty(type) {
    const name = prompt(`Enter ${type} name:`);
    if (!name?.trim()) return;
    const phone = prompt('Phone number (optional):') || '';
    try {
      const party = await DB.saveParty({ name: name.trim(), type, phone });
      if (type === 'supplier') this._suppliers.push(party);
      else this._customers.push(party);
      this.switchType(this._type);
      Utils.toast(`${type} added!`, 'success');
      setTimeout(() => {
        const s = document.getElementById('party-id');
        if (s) s.value = party.id;
      }, 50);
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  }
};
