/* ============================================================
   db.js — Supabase data access layer
   ============================================================ */

// Dynamically load Supabase SDK from CDN on first DB call
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
  async signOut() {
    const sb = await getClient();
    await sb.auth.signOut();
  },
  async getSession() {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  async userId() {
    const s = await this.getSession();
    return s?.user?.id;
  },

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
    const uid = await this.userId();
    party.user_id = uid;
    if (party.id) {
      const { data, error } = await sb.from('parties').update(party).eq('id', party.id).select().single();
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
    let q = sb.from('purchases').select('*, parties(name)').eq('deleted', false).order('created_at', { ascending: false });
    if (filters.party_id) q = q.eq('party_id', filters.party_id);
    if (filters.from)     q = q.gte('created_at', filters.from);
    if (filters.to)       q = q.lte('created_at', filters.to + 'T23:59:59');
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async savePurchase(rec) {
    const sb = await getClient();
    rec.user_id = await this.userId();
    rec.pending = (rec.total || 0) - (rec.paid_amount || 0);
    if (rec.id) {
      const { data, error } = await sb.from('purchases').update(rec).eq('id', rec.id).select().single();
      if (error) throw error; return data;
    } else {
      const { data, error } = await sb.from('purchases').insert(rec).select().single();
      if (error) throw error; return data;
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
    let q = sb.from('sales').select('*, parties(name)').eq('deleted', false).order('created_at', { ascending: false });
    if (filters.party_id) q = q.eq('party_id', filters.party_id);
    if (filters.from)     q = q.gte('created_at', filters.from);
    if (filters.to)       q = q.lte('created_at', filters.to + 'T23:59:59');
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveSale(rec) {
    const sb = await getClient();
    rec.user_id = await this.userId();
    rec.pending = (rec.total || 0) - (rec.received_amount || 0);
    if (rec.id) {
      const { data, error } = await sb.from('sales').update(rec).eq('id', rec.id).select().single();
      if (error) throw error; return data;
    } else {
      const { data, error } = await sb.from('sales').insert(rec).select().single();
      if (error) throw error; return data;
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
    if (filters.from) q = q.gte('date', filters.from);
    if (filters.to)   q = q.lte('date', filters.to);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async saveExpense(rec) {
    const sb = await getClient();
    rec.user_id = await this.userId();
    if (rec.id) {
      const { data, error } = await sb.from('expenses').update(rec).eq('id', rec.id).select().single();
      if (error) throw error; return data;
    } else {
      const { data, error } = await sb.from('expenses').insert(rec).select().single();
      if (error) throw error; return data;
    }
  },
  async deleteExpense(id) {
    const sb = await getClient();
    const { error } = await sb.from('expenses').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  },

  /* ---- DASHBOARD SUMMARY ---- */
  async getDashboard() {
    const today = Utils.today();
    const monthStart = Utils.monthStart();
    const [purchases, sales, expenses] = await Promise.all([
      this.getPurchases(), this.getSales(), this.getExpenses()
    ]);
    const totalPayable    = purchases.reduce((s, r) => s + (r.pending || 0), 0);
    const totalReceivable = sales.reduce((s, r) => s + (r.pending || 0), 0);
    const totalExpenses   = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const todaySales      = sales.filter(r => r.created_at?.slice(0,10) === today).reduce((s,r)=>s+(r.total||0),0);
    const monthSales      = sales.filter(r => r.created_at?.slice(0,10) >= monthStart).reduce((s,r)=>s+(r.total||0),0);
    const todayPurchases  = purchases.filter(r => r.created_at?.slice(0,10) === today).reduce((s,r)=>s+(r.total||0),0);
    const monthPurchases  = purchases.filter(r => r.created_at?.slice(0,10) >= monthStart).reduce((s,r)=>s+(r.total||0),0);
    const overduePurchases = purchases.filter(r => Utils.isOverdue(r.due_date, r.pending));
    const overdueSales     = sales.filter(r => Utils.isOverdue(r.due_date, r.pending));
    return {
      totalPayable, totalReceivable, totalExpenses,
      todaySales, monthSales, todayPurchases, monthPurchases,
      overduePurchases, overdueSales
    };
  },

  /* ---- PARTY LEDGER ---- */
  async getPartyLedger(partyId) {
    const [purchases, sales] = await Promise.all([
      this.getPurchases({ party_id: partyId }),
      this.getSales({ party_id: partyId })
    ]);
    const txns = [
      ...purchases.map(r => ({ ...r, _type: 'purchase', date: r.created_at?.slice(0,10) })),
      ...sales.map(r => ({ ...r, _type: 'sale', date: r.created_at?.slice(0,10) }))
    ].sort((a, b) => a.date > b.date ? 1 : -1);
    return txns;
  }
};
