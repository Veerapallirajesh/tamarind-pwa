/* ============================================================
   db.js — Supabase data access layer v3
   ============================================================ */

let _supabase = null;

async function getClient() {
  if (_supabase) return _supabase;
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabase;
}

/* Columns that must NEVER be sent in an UPDATE payload */
function cleanForUpdate(rec) {
  const { id, created_at, updated_at, parties, user_id, ...payload } = rec;
  return payload;
}

const DB = {

  /* ---- AUTH ---- */
  async signIn(email, password) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUp(email, password) {
    const sb = await getClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut()    { const sb = await getClient(); await sb.auth.signOut(); },
  async getSession() { const sb = await getClient(); const { data } = await sb.auth.getSession(); return data.session; },
  async userId()     { const s = await this.getSession(); return s?.user?.id; },

  /* ---- PARTIES ---- */
  async getParties(type = null) {
    const sb = await getClient();
    let q = sb.from('parties').select('*').eq('deleted', false).order('name');
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async getParty(id) {
    const sb = await getClient();
    const { data, error } = await sb.from('parties').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async saveParty(party) {
    const sb = await getClient();
    party.user_id = await this.userId();
    if (party.id) {
      const { id, ...payload } = party;
      const { data, error } = await sb.from('parties').update(payload).eq('id', id).select().single();
      if (error) throw error; return data;
    } else {
      const { data, error } = await sb.from('parties').insert(party).select().single();
      if (error) throw error; return data;
    }
  },
  async deleteParty(id) {
    const sb = await getClient();
    const { error } = await sb.from('parties').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  },

  /* ---- PURCHASES ---- */
  async getPurchases(filters = {}) {
    const sb = await getClient();
    let q = sb.from('purchases').select('*, parties(name)')
      .eq('deleted', false).order('created_at', { ascending: false });
    if (filters.party_id) q = q.eq('party_id', filters.party_id);
    if (filters.from)     q = q.gte('created_at', filters.from);
    if (filters.to)       q = q.lte('created_at', filters.to + 'T23:59:59');
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async savePurchase(rec) {
    const sb  = await getClient();
    const uid = await this.userId();

    const subtotal  = (rec.quantity || 0) * (rec.rate || 0);
    const taxPct    = rec.tax_pct != null ? rec.tax_pct : PURCHASE_TAX_PCT;
    const taxAmount = subtotal * taxPct / 100;
    const total     = subtotal + taxAmount;
    const pending   = total - (rec.paid_amount || 0);

    if (rec.id) {
      const payload = {
        ...cleanForUpdate(rec),
        subtotal, tax_pct: taxPct, tax_amount: taxAmount, total, pending
      };
      console.log('[DB] UPDATE purchase id=', rec.id);
      const { data, error } = await sb.from('purchases').update(payload).eq('id', rec.id).select().single();
      if (error) { console.error('[DB] update error', error); throw error; }
      return data;
    } else {
      const payload = {
        ...cleanForUpdate(rec),
        user_id: uid, subtotal, tax_pct: taxPct, tax_amount: taxAmount, total, pending
      };
      console.log('[DB] INSERT purchase');
      const { data, error } = await sb.from('purchases').insert(payload).select().single();
      if (error) { console.error('[DB] insert error', error); throw error; }
      return data;
    }
  },
  async deletePurchase(id) {
    const sb = await getClient();
    const { error } = await sb.from('purchases').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  },

  /* ---- SALES ---- */
  async getSales(filters = {}) {
    const sb = await getClient();
    let q = sb.from('sales').select('*, parties(name)')
      .eq('deleted', false).order('created_at', { ascending: false });
    if (filters.party_id) q = q.eq('party_id', filters.party_id);
    if (filters.from)     q = q.gte('created_at', filters.from);
    if (filters.to)       q = q.lte('created_at', filters.to + 'T23:59:59');
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveSale(rec) {
    const sb  = await getClient();
    const uid = await this.userId();

    const loss    = Math.max(0, (rec.expected_quantity || 0) - (rec.actual_quantity || 0));
    const total   = (rec.actual_quantity || 0) * (rec.rate || 0);
    const pending = total - (rec.received_amount || 0);

    if (rec.id) {
      const payload = {
        ...cleanForUpdate(rec),
        loss_quantity: loss, total, pending
      };
      console.log('[DB] UPDATE sale id=', rec.id);
      const { data, error } = await sb.from('sales').update(payload).eq('id', rec.id).select().single();
      if (error) { console.error('[DB] update error', error); throw error; }
      return data;
    } else {
      const payload = {
        ...cleanForUpdate(rec),
        user_id: uid, loss_quantity: loss, total, pending
      };
      console.log('[DB] INSERT sale');
      const { data, error } = await sb.from('sales').insert(payload).select().single();
      if (error) { console.error('[DB] insert error', error); throw error; }
      return data;
    }
  },
  async deleteSale(id) {
    const sb = await getClient();
    const { error } = await sb.from('sales').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  },

  /* ---- EXPENSES ---- */
  async getExpenses(filters = {}) {
    const sb = await getClient();
    let q = sb.from('expenses').select('*').eq('deleted', false).order('date', { ascending: false });
    if (filters.from)     q = q.gte('date', filters.from);
    if (filters.to)       q = q.lte('date', filters.to);
    if (filters.category) q = q.eq('category', filters.category);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveExpense(rec) {
    const sb  = await getClient();
    const uid = await this.userId();
    if (rec.id) {
      const payload = cleanForUpdate(rec);
      console.log('[DB] UPDATE expense id=', rec.id);
      const { data, error } = await sb.from('expenses').update(payload).eq('id', rec.id).select().single();
      if (error) { console.error('[DB] update error', error); throw error; }
      return data;
    } else {
      const { data, error } = await sb.from('expenses').insert({ ...cleanForUpdate(rec), user_id: uid }).select().single();
      if (error) { console.error('[DB] insert error', error); throw error; }
      return data;
    }
  },
  async deleteExpense(id) {
    const sb = await getClient();
    const { error } = await sb.from('expenses').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  },

  /* ---- PAYMENTS ---- */
  async getPayments(filters = {}) {
    const sb = await getClient();
    let q = sb.from('payments').select('*').order('created_at', { ascending: true });
    if (filters.purchase_id) q = q.eq('purchase_id', filters.purchase_id);
    if (filters.sale_id)     q = q.eq('sale_id',     filters.sale_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /* Fetch ALL payments with party name resolved via the parent purchase/sale */
  async getAllPayments() {
    const sb = await getClient();
    const { data, error } = await sb.from('payments')
      .select(`
        *,
        purchases ( party_id, parties ( name ) ),
        sales     ( party_id, parties ( name ) )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      _party_name: p.purchases?.parties?.name || p.sales?.parties?.name || '—'
    }));
  },

  async addPayment({ purchase_id, sale_id, amount, notes }) {
    const sb  = await getClient();
    const uid = await this.userId();

    /* 1 — Insert payment row */
    const { data: payment, error: pErr } = await sb.from('payments').insert({
      user_id: uid,
      purchase_id: purchase_id || null,
      sale_id:     sale_id     || null,
      amount,
      notes: notes || null
    }).select().single();
    if (pErr) throw pErr;

    /* 2 — Re-sum ALL payments for this record, then update BOTH paid_amount AND pending */
    if (purchase_id) {
      const allPayments = await this.getPayments({ purchase_id });
      const totalPaid   = allPayments.reduce((s, p) => s + (p.amount || 0), 0);

      /* Fetch the purchase total so we can compute pending correctly */
      const { data: purchase, error: fErr } = await sb
        .from('purchases').select('total').eq('id', purchase_id).single();
      if (fErr) throw fErr;

      const pending = Math.max(0, (purchase.total || 0) - totalPaid);
      const { error: uErr } = await sb.from('purchases')
        .update({ paid_amount: totalPaid, pending })
        .eq('id', purchase_id);
      if (uErr) throw uErr;
    }

    if (sale_id) {
      const allPayments    = await this.getPayments({ sale_id });
      const totalReceived  = allPayments.reduce((s, p) => s + (p.amount || 0), 0);

      const { data: sale, error: fErr } = await sb
        .from('sales').select('total').eq('id', sale_id).single();
      if (fErr) throw fErr;

      const pending = Math.max(0, (sale.total || 0) - totalReceived);
      const { error: uErr } = await sb.from('sales')
        .update({ received_amount: totalReceived, pending })
        .eq('id', sale_id);
      if (uErr) throw uErr;
    }

    return payment;
  },

  /* ---- DASHBOARD SUMMARY ---- */
  async getDashboard() {
    const today      = Utils.today();
    const monthStart = Utils.monthStart();
    const [purchases, sales, expenses] = await Promise.all([
      this.getPurchases(), this.getSales(), this.getExpenses()
    ]);

    const totalPayable    = purchases.reduce((s, r) => s + (r.pending || 0), 0);
    const totalReceivable = sales.reduce((s, r) => s + (r.pending || 0), 0);
    const netPosition     = totalReceivable - totalPayable;
    const totalExpenses   = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const totalPurchases  = purchases.reduce((s, r) => s + (r.total || 0), 0);
    const totalSales      = sales.reduce((s, r) => s + (r.total || 0), 0);

    const todaySales      = sales.filter(r => r.created_at?.slice(0,10) === today).reduce((s,r)=>s+(r.total||0),0);
    const monthSales      = sales.filter(r => r.created_at?.slice(0,10) >= monthStart).reduce((s,r)=>s+(r.total||0),0);
    const todayPurchases  = purchases.filter(r => r.created_at?.slice(0,10) === today).reduce((s,r)=>s+(r.total||0),0);
    const monthPurchases  = purchases.filter(r => r.created_at?.slice(0,10) >= monthStart).reduce((s,r)=>s+(r.total||0),0);
    const overduePurchases = purchases.filter(r => Utils.isOverdue(r.due_date, r.pending));
    const overdueSales     = sales.filter(r => Utils.isOverdue(r.due_date, r.pending));
    const totalLoss        = sales.reduce((s, r) => s + (r.loss_quantity || 0), 0);

    const labourExpenses   = expenses.filter(r => r.category === 'Labour');
    const permanentLabour  = labourExpenses.filter(r => r.sub_category === 'Permanent Labour').reduce((s,r)=>s+(r.amount||0),0);
    const contractLabour   = labourExpenses.filter(r => r.sub_category === 'Contract Labour').reduce((s,r)=>s+(r.amount||0),0);
    const totalLabour      = permanentLabour + contractLabour;

    return {
      totalPayable, totalReceivable, netPosition,
      totalExpenses, totalPurchases, totalSales,
      todaySales, monthSales, todayPurchases, monthPurchases,
      overduePurchases, overdueSales,
      totalLoss, permanentLabour, contractLabour, totalLabour
    };
  },

  /* ---- PARTY LEDGER (purchases + payments + sales) ---- */
  async getPartyLedger(partyId) {
    const [purchases, sales] = await Promise.all([
      this.getPurchases({ party_id: partyId }),
      this.getSales({ party_id: partyId })
    ]);

    /* Fetch payments for every purchase and sale of this party */
    const purchasePayments = (await Promise.all(
      purchases.map(p => this.getPayments({ purchase_id: p.id }))
    )).flat().map(p => ({ ...p, _type: 'payment', _for: 'purchase', date: p.created_at?.slice(0,10) }));

    const salePayments = (await Promise.all(
      sales.map(s => this.getPayments({ sale_id: s.id }))
    )).flat().map(p => ({ ...p, _type: 'payment', _for: 'sale', date: p.created_at?.slice(0,10) }));

    return [
      ...purchases.map(r => ({ ...r, _type: 'purchase', date: r.created_at?.slice(0,10) })),
      ...sales.map(r => ({ ...r, _type: 'sale', date: r.created_at?.slice(0,10) })),
      ...purchasePayments,
      ...salePayments
    ].sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1);
  }
};
