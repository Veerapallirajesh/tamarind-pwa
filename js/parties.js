/* ============================================================
   parties.js — Parties list + Ledger view v2
   No emojis, clean initials avatars
   ============================================================ */

const PARTIES = {
  _list: [],
  _filter: 'all',

  async render() {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading parties</div>';
    try {
      this._list = await DB.getParties();
      el.innerHTML = this._html();
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _html() {
    const filtered = this._filter === 'all'
      ? this._list
      : this._list.filter(p => p.type === this._filter);

    const rows = filtered.length
      ? filtered.map(p => this._partyRow(p)).join('')
      : `<div class="empty-state">
           <div class="empty-icon">P</div>
           <p>No parties yet</p>
           <button class="btn btn-primary" onclick="PARTIES.openForm()">Add First Party</button>
         </div>`;

    return `
      <div class="tab-bar">
        <button class="tab-btn ${this._filter==='all'?'active':''}"      onclick="PARTIES.setFilter('all')">All</button>
        <button class="tab-btn ${this._filter==='customer'?'active':''}" onclick="PARTIES.setFilter('customer')">Customers</button>
        <button class="tab-btn ${this._filter==='supplier'?'active':''}" onclick="PARTIES.setFilter('supplier')">Suppliers</button>
      </div>
      <div class="search-bar">
        <input type="search" placeholder="Search parties..." id="party-search" oninput="PARTIES.search(this.value)" />
      </div>
      ${rows}

      <button class="fab" onclick="PARTIES.openForm()" title="Add Party">+</button>

      <!-- Add/Edit Modal -->
      <div class="modal-overlay" id="party-modal">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">
            <span id="party-modal-title">Add Party</span>
            <button class="modal-close" onclick="PARTIES.closeForm()">&#x2715;</button>
          </div>
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="party-name" placeholder="Full name" />
          </div>
          <div class="form-group">
            <label>Type *</label>
            <select id="party-type">
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div class="form-group">
            <label>Phone (optional)</label>
            <input type="tel" id="party-phone" placeholder="Phone number" inputmode="tel" />
          </div>
          <div class="form-group">
            <label>Notes (optional)</label>
            <textarea id="party-notes" placeholder="Any notes..."></textarea>
          </div>
          <input type="hidden" id="party-edit-id" />
          <button class="btn btn-primary btn-full" onclick="PARTIES.saveParty()">Save</button>
          <button class="btn btn-danger btn-full mt-8" id="party-delete-btn" style="display:none" onclick="PARTIES.deleteParty()">Delete Party</button>
        </div>
      </div>
    `;
  },

  _partyRow(p) {
    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const typeLabel = p.type === 'customer' ? 'Customer' : 'Supplier';
    const typeCls   = p.type === 'customer' ? 'badge-pending' : 'badge-paid';
    return `
      <div class="list-item" onclick="PARTIES.viewLedger('${p.id}')">
        <div class="li-avatar party">${initials}</div>
        <div class="li-body">
          <div class="li-name">${Utils.esc(p.name)}</div>
          <div class="li-sub">
            <span class="badge ${typeCls}" style="font-size:10px">${typeLabel}</span>
            ${p.phone ? ' · ' + Utils.esc(p.phone) : ''}
          </div>
        </div>
        <div class="li-right">
          <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();PARTIES.openForm('${p.id}')">Edit</button>
        </div>
      </div>`;
  },

  setFilter(f) {
    this._filter = f;
    this.render();
  },

  search(q) {
    const lower = q.toLowerCase();
    document.querySelectorAll('.list-item').forEach(row => {
      const name = row.querySelector('.li-name')?.textContent.toLowerCase() || '';
      row.style.display = name.includes(lower) ? '' : 'none';
    });
  },

  openForm(id = null) {
    document.getElementById('party-name').value  = '';
    document.getElementById('party-type').value  = 'customer';
    document.getElementById('party-phone').value = '';
    document.getElementById('party-notes').value = '';
    document.getElementById('party-edit-id').value = '';
    document.getElementById('party-modal-title').textContent = id ? 'Edit Party' : 'Add Party';
    document.getElementById('party-delete-btn').style.display = 'none';
    if (id) {
      const party = this._list.find(p => p.id === id);
      if (party) {
        document.getElementById('party-name').value    = party.name;
        document.getElementById('party-type').value    = party.type;
        document.getElementById('party-phone').value   = party.phone || '';
        document.getElementById('party-notes').value   = party.notes || '';
        document.getElementById('party-edit-id').value = party.id;
        document.getElementById('party-delete-btn').style.display = 'block';
      }
    }
    document.getElementById('party-modal').classList.add('show');
  },

  closeForm() {
    document.getElementById('party-modal')?.classList.remove('show');
  },

  async saveParty() {
    const name  = document.getElementById('party-name').value.trim();
    const type  = document.getElementById('party-type').value;
    const phone = document.getElementById('party-phone').value.trim();
    const notes = document.getElementById('party-notes').value.trim();
    const id    = document.getElementById('party-edit-id').value;
    if (!name) { Utils.toast('Party name is required', 'error'); return; }
    try {
      const rec = { name, type, phone, notes };
      if (id) rec.id = id;
      await DB.saveParty(rec);
      Utils.toast('Party saved!', 'success');
      this.closeForm();
      await this.render();
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  },

  async deleteParty() {
    const id = document.getElementById('party-edit-id').value;
    if (!id) return;
    if (!await Utils.confirm('Delete Party', 'This will hide the party. All transactions remain.')) return;
    try {
      await DB.deleteParty(id);
      Utils.toast('Party deleted');
      this.closeForm();
      await this.render();
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  },

  /* ---- Ledger View ---- */
  async viewLedger(id) {
    const el = document.getElementById('page-container');
    el.innerHTML = '<div class="loading">Loading ledger</div>';
    try {
      const [party, txns] = await Promise.all([DB.getParty(id), DB.getPartyLedger(id)]);
      el.innerHTML = this._ledgerHtml(party, txns);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p class="text-danger">${Utils.esc(e.message)}</p></div>`;
    }
  },

  _ledgerHtml(party, txns) {
    let balance = 0, totalDebit = 0, totalCredit = 0;

    const rows = txns.map(t => {
      let debit = 0, credit = 0, label = '', statusHtml = '';

      if (t._type === 'payment') {
        /* Payment rows are always credits (money going out to supplier / coming in from customer) */
        credit = t.amount || 0;
        label  = 'Payment' + (t.notes ? ` · ${t.notes}` : '');
      } else if (party.type === 'supplier') {
        if (t._type === 'purchase') {
          debit  = t.total || 0;
          label  = `Purchase · ${t.material || 'Seeds'}`;
          statusHtml = Utils.badge(t.pending || 0, t.due_date);
        }
      } else {
        if (t._type === 'sale') {
          credit = t.total || 0;
          label  = `Sale · ${t.product || ''}`;
          statusHtml = Utils.badge(t.pending || 0, t.due_date);
        }
      }

      balance = party.type === 'supplier'
        ? balance + debit - credit
        : balance + credit - debit;

      totalDebit  += debit;
      totalCredit += credit;

      return `
        <tr>
          <td>${Utils.dateDisplay(t.date)}</td>
          <td>${Utils.esc(label)}</td>
          <td class="debit">${debit  > 0 ? Utils.currency(debit)  : '—'}</td>
          <td class="credit">${credit > 0 ? Utils.currency(credit) : '—'}</td>
          <td class="balance">${Utils.currency(Math.abs(balance))}</td>
          <td>${statusHtml}</td>
        </tr>`;
    }).join('');

    const netBalance = party.type === 'supplier' ? totalDebit - totalCredit : totalCredit - totalDebit;
    const balLabel   = party.type === 'supplier' ? 'Payable' : 'Receivable';
    const balCard    = netBalance > 0 ? 'orange-card' : 'green-card';
    const initials   = party.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    return `
      <button class="btn btn-link" style="padding:0 0 14px;font-size:14px" onclick="PARTIES.render()">Back to Parties</button>

      <div class="card">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div class="li-avatar party" style="width:52px;height:52px;font-size:18px;border-radius:14px">${initials}</div>
          <div>
            <div style="font-size:19px;font-weight:700">${Utils.esc(party.name)}</div>
            <div class="text-muted">${party.type === 'customer' ? 'Customer' : 'Supplier'}${party.phone ? ' · ' + Utils.esc(party.phone) : ''}</div>
          </div>
        </div>
        <div class="party-stats">
          <div class="dash-card">
            <div class="label">${party.type === 'supplier' ? 'Total Purchased' : 'Total Sold'}</div>
            <div class="value">${Utils.currency(party.type === 'supplier' ? totalDebit : totalCredit)}</div>
          </div>
          <div class="dash-card ${balCard}">
            <div class="label">${balLabel}</div>
            <div class="value">${Utils.currency(Math.abs(netBalance))}</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline btn-sm" onclick="PARTIES.openForm('${party.id}')">Edit</button>
          ${party.type === 'supplier'
            ? `<button class="btn btn-primary btn-sm" onclick="NAV.go('add-entry')">+ Purchase</button>`
            : `<button class="btn btn-primary btn-sm" onclick="NAV.go('add-entry')">+ Sale</button>`}
        </div>
      </div>

      <div class="section-title">Ledger</div>
      ${txns.length ? `
        <div style="overflow-x:auto">
          <table class="ledger-table">
            <thead>
              <tr><th>Date</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      ` : `<div class="empty-state"><div class="empty-icon">L</div><p>No transactions yet</p></div>`}
    `;
  }
};
