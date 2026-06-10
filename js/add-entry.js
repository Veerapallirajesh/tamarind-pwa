/* ============================================================
   add-entry.js — Smart Add Entry form (Purchase / Sale / Expense)
   ============================================================ */

const ADD_ENTRY = {
  _type: 'purchase',
  _suppliers: [],
  _customers: [],
  _editData: null,

  async render(params = {}) {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading form</div>';
    this._editData = params.edit || null;
    try {
      const parties = await DB.getParties();
      this._suppliers = parties.filter(p => p.type === 'supplier');
      this._customers = parties.filter(p => p.type === 'customer');
      // Determine initial type from edit data
      if (this._editData) {
        this._type = params.entryType || 'purchase';
      }
      el.innerHTML = this._html();
      this.switchType(this._editData ? this._type : 'purchase');
      if (this._editData) this._fillEdit(this._editData);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html() {
    return `
      <div class="type-selector">
        <button class="type-btn" id="type-btn-purchase" onclick="ADD_ENTRY.switchType('purchase')">
          <span class="type-icon">🛒</span>Purchase
        </button>
        <button class="type-btn" id="type-btn-sale" onclick="ADD_ENTRY.switchType('sale')">
          <span class="type-icon">💰</span>Sale
        </button>
        <button class="type-btn" id="type-btn-expense" onclick="ADD_ENTRY.switchType('expense')">
          <span class="type-icon">🧾</span>Expense
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
    // Hook up auto-total
    if (type !== 'expense') {
      document.getElementById('qty')?.addEventListener('input', () => this._calcTotal());
      document.getElementById('rate')?.addEventListener('input', () => this._calcTotal());
    }
  },

  _purchaseForm() {
    const supplierOptions = this._suppliers.map(p => `<option value="${p.id}">${Utils.esc(p.name)}</option>`).join('');
    const seedOptions = SEED_TYPES.map(s => `<option value="${s}">${s}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Supplier *</label>
          <select id="party-id">
            <option value="">— Select Supplier —</option>
            ${supplierOptions}
          </select>
          <button class="btn btn-link" style="padding:6px 0;font-size:14px" onclick="ADD_ENTRY.quickAddParty('supplier')">+ Add new supplier</button>
        </div>
        <div class="form-group">
          <label>Seed Type *</label>
          <select id="product">
            <option value="">— Select Type —</option>
            ${seedOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Quantity (kg) *</label>
          <input type="number" id="qty" inputmode="decimal" placeholder="0" min="0" step="0.1" />
        </div>
        <div class="form-group">
          <label>Rate (₹ per kg) *</label>
          <input type="number" id="rate" inputmode="decimal" placeholder="0" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>Total Amount</label>
          <div class="auto-total" id="auto-total">₹0</div>
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
        <input type="hidden" id="edit-id" value="" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">💾 Save Purchase</button>
      </div>`;
  },

  _saleForm() {
    const customerOptions = this._customers.map(p => `<option value="${p.id}">${Utils.esc(p.name)}</option>`).join('');
    const productOptions = PRODUCTS.map(s => `<option value="${s}">${s}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Customer *</label>
          <select id="party-id">
            <option value="">— Select Customer —</option>
            ${customerOptions}
          </select>
          <button class="btn btn-link" style="padding:6px 0;font-size:14px" onclick="ADD_ENTRY.quickAddParty('customer')">+ Add new customer</button>
        </div>
        <div class="form-group">
          <label>Product *</label>
          <select id="product">
            <option value="">— Select Product —</option>
            ${productOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Quantity (kg) *</label>
          <input type="number" id="qty" inputmode="decimal" placeholder="0" min="0" step="0.1" />
        </div>
        <div class="form-group">
          <label>Rate (₹ per kg) *</label>
          <input type="number" id="rate" inputmode="decimal" placeholder="0" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>Total Amount</label>
          <div class="auto-total" id="auto-total">₹0</div>
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
        <input type="hidden" id="edit-id" value="" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">💾 Save Sale</button>
      </div>`;
  },

  _expenseForm() {
    const catOptions = EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    return `
      <div class="card">
        <div class="form-group">
          <label>Category *</label>
          <select id="category">
            <option value="">— Select Category —</option>
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Amount (₹) *</label>
          <input type="number" id="exp-amount" inputmode="decimal" placeholder="0" min="0" />
        </div>
        <div class="form-group">
          <label>Date *</label>
          <input type="date" id="exp-date" value="${Utils.today()}" />
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="notes" placeholder="What was this expense for?"></textarea>
        </div>
        <input type="hidden" id="edit-id" value="" />
        <button class="btn btn-primary btn-full" onclick="ADD_ENTRY.save()">💾 Save Expense</button>
      </div>`;
  },

  _calcTotal() {
    const qty  = parseFloat(document.getElementById('qty')?.value) || 0;
    const rate = parseFloat(document.getElementById('rate')?.value) || 0;
    const total = qty * rate;
    const el = document.getElementById('auto-total');
    if (el) el.textContent = Utils.currency(total);
    return total;
  },

  async save() {
    const type = this._type;
    try {
      if (type === 'purchase') await this._savePurchase();
      else if (type === 'sale') await this._saveSale();
      else await this._saveExpense();
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  },

  async _savePurchase() {
    const partyId = document.getElementById('party-id').value;
    const product = document.getElementById('product').value;
    const qty     = parseFloat(document.getElementById('qty').value) || 0;
    const rate    = parseFloat(document.getElementById('rate').value) || 0;
    const paid    = parseFloat(document.getElementById('paid').value) || 0;
    const due     = document.getElementById('due-date').value;
    const notes   = document.getElementById('notes').value.trim();
    const editId  = document.getElementById('edit-id').value;
    if (!partyId) { Utils.toast('Please select a supplier', 'error'); return; }
    if (!product) { Utils.toast('Please select seed type', 'error'); return; }
    if (qty <= 0)  { Utils.toast('Enter a valid quantity', 'error'); return; }
    if (rate <= 0) { Utils.toast('Enter a valid rate', 'error'); return; }
    const total = qty * rate;
    const rec = { party_id: partyId, seed_type: product, quantity: qty, rate, total, paid_amount: paid, due_date: due || null, notes };
    if (editId) rec.id = editId;
    await DB.savePurchase(rec);
    Utils.toast('Purchase saved!', 'success');
    NAV.go('purchases');
  },

  async _saveSale() {
    const partyId = document.getElementById('party-id').value;
    const product = document.getElementById('product').value;
    const qty     = parseFloat(document.getElementById('qty').value) || 0;
    const rate    = parseFloat(document.getElementById('rate').value) || 0;
    const recv    = parseFloat(document.getElementById('paid').value) || 0;
    const due     = document.getElementById('due-date').value;
    const notes   = document.getElementById('notes').value.trim();
    const editId  = document.getElementById('edit-id').value;
    if (!partyId) { Utils.toast('Please select a customer', 'error'); return; }
    if (!product) { Utils.toast('Please select a product', 'error'); return; }
    if (qty <= 0)  { Utils.toast('Enter a valid quantity', 'error'); return; }
    if (rate <= 0) { Utils.toast('Enter a valid rate', 'error'); return; }
    const total = qty * rate;
    const rec = { party_id: partyId, product, quantity: qty, rate, total, received_amount: recv, due_date: due || null, notes };
    if (editId) rec.id = editId;
    await DB.saveSale(rec);
    Utils.toast('Sale saved!', 'success');
    NAV.go('sales');
  },

  async _saveExpense() {
    const category = document.getElementById('category').value;
    const amount   = parseFloat(document.getElementById('exp-amount').value) || 0;
    const date     = document.getElementById('exp-date').value;
    const notes    = document.getElementById('notes').value.trim();
    const editId   = document.getElementById('edit-id').value;
    if (!category) { Utils.toast('Please select a category', 'error'); return; }
    if (amount <= 0){ Utils.toast('Enter a valid amount', 'error'); return; }
    if (!date)      { Utils.toast('Please select a date', 'error'); return; }
    const rec = { category, amount, date, notes };
    if (editId) rec.id = editId;
    await DB.saveExpense(rec);
    Utils.toast('Expense saved!', 'success');
    NAV.go('expenses');
  },

  _fillEdit(data) {
    const type = this._type;
    if (type === 'expense') {
      this._setVal('category', data.category);
      this._setVal('exp-amount', data.amount);
      this._setVal('exp-date', data.date);
      this._setVal('notes', data.notes);
    } else {
      this._setVal('party-id', data.party_id);
      this._setVal('product', type === 'purchase' ? data.seed_type : data.product);
      this._setVal('qty', data.quantity);
      this._setVal('rate', data.rate);
      this._setVal('paid', type === 'purchase' ? data.paid_amount : data.received_amount);
      this._setVal('due-date', data.due_date || '');
      this._setVal('notes', data.notes);
      this._calcTotal();
    }
    document.getElementById('edit-id').value = data.id;
  },

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.value = val;
  },

  /* Quick-add party from within the form */
  async quickAddParty(type) {
    const name = prompt(`Enter ${type} name:`);
    if (!name?.trim()) return;
    const phone = prompt('Phone number (optional):') || '';
    try {
      const party = await DB.saveParty({ name: name.trim(), type, phone });
      if (type === 'supplier') this._suppliers.push(party);
      else this._customers.push(party);
      this.switchType(this._type); // Re-render form
      Utils.toast(`${type} added!`, 'success');
      // Pre-select the new party
      setTimeout(() => { const s = document.getElementById('party-id'); if (s) s.value = party.id; }, 50);
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  }
};
