/* ============================================================
   utils.js — Shared utility helpers
   ============================================================ */

const Utils = {

  /* Format number as Indian currency: ₹1,23,456 */
  currency(n) {
    if (n == null || isNaN(n)) return '₹0';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  },

  /* Format date as "12 Jun 2025" */
  dateDisplay(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  /* Today as YYYY-MM-DD */
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  /* Start of current month */
  monthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  },

  /* Is a date overdue? */
  isOverdue(due, pending) {
    if (!due || !pending || pending <= 0) return false;
    return new Date(due) < new Date(new Date().toDateString());
  },

  /* Days until due: negative = overdue, 0 = today, positive = days left */
  daysUntilDue(due) {
    if (!due) return null;
    const today  = new Date(new Date().toDateString());
    const dueDay = new Date(due);
    return Math.round((dueDay - today) / 86400000);
  },

  /* Due label HTML: "Overdue 3d" | "Due today" | "3d left" | "" */
  dueLabel(due, pending) {
    if (!due || pending <= 0) return '';
    const d = this.daysUntilDue(due);
    if (d === null) return '';
    if (d < 0)  return `<span style="color:var(--danger);font-size:12px;font-weight:600">Overdue ${Math.abs(d)}d</span>`;
    if (d === 0) return `<span style="color:var(--danger);font-size:12px;font-weight:600">Due today</span>`;
    if (d <= 7)  return `<span style="color:var(--warning);font-size:12px;font-weight:600">${d}d left</span>`;
    return `<span style="color:var(--text-muted);font-size:12px">${d}d left</span>`;
  },

  /* Compute live pending from record — uses paid_amount/received_amount as fallback */
  livePending(r) {
    const total = r.total || 0;
    const paid  = r.paid_amount ?? r.received_amount ?? 0;
    // If the DB pending column is stale (> total), recompute from paid amounts
    const dbPending = r.pending ?? (total - paid);
    return Math.max(0, dbPending);
  },

  /* Status string — uses livePending to avoid stale DB values */
  status(pending, due) {
    if (pending <= 0) return 'paid';
    if (this.isOverdue(due, pending)) return 'overdue';
    return 'pending';
  },

  /* Status badge HTML */
  badge(pending, due) {
    const s = this.status(pending, due);
    const labels = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' };
    return `<span class="badge badge-${s}">${labels[s]}</span>`;
  },

  /* Show toast */
  toast(msg, type = 'default', duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'toast'; }, duration);
  },

  /* Show a simple confirm dialog. Returns Promise<bool> */
  confirm(title, msg, confirmLabel = 'Delete', danger = true) {
    return new Promise(resolve => {
      let dlg = document.getElementById('confirm-dialog');
      if (!dlg) {
        dlg = document.createElement('div');
        dlg.id = 'confirm-dialog';
        dlg.className = 'confirm-dialog';
        dlg.innerHTML = `
          <div class="confirm-box">
            <h3 id="confirm-title"></h3>
            <p id="confirm-msg"></p>
            <div class="btn-row">
              <button class="btn btn-ghost" id="confirm-no">Cancel</button>
              <button class="btn" id="confirm-yes"></button>
            </div>
          </div>`;
        document.body.appendChild(dlg);
      }
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = msg;
      const yes = document.getElementById('confirm-yes');
      yes.textContent = confirmLabel;
      yes.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      dlg.classList.add('show');
      const no = document.getElementById('confirm-no');
      const cleanup = val => { dlg.classList.remove('show'); resolve(val); };
      yes.onclick = () => cleanup(true);
      no.onclick  = () => cleanup(false);
    });
  },

  /* Populate a <select> from an array */
  fillSelect(selectEl, options, placeholder = 'Select...') {
    selectEl.innerHTML = `<option value="">— ${placeholder} —</option>` +
      options.map(o => typeof o === 'string'
        ? `<option value="${o}">${o}</option>`
        : `<option value="${o.id}">${o.name}</option>`
      ).join('');
  },

  /* Escape HTML to prevent XSS */
  esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /* Export array of objects to CSV and download */
  exportCSV(data, filename) {
    if (!data.length) { this.toast('No data to export', 'error'); return; }
    const keys = Object.keys(data[0]);
    const rows = [keys.join(','), ...data.map(r =>
      keys.map(k => JSON.stringify(r[k] ?? '')).join(',')
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  }
};
