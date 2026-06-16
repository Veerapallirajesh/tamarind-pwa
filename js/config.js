/* ============================================================
   config.js — App constants
   ============================================================ */
const SUPABASE_URL = 'https://jnmqjncqwuwfozouynng.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ouGlT_4McuuX-iGoqDqLig_3p-9DH_m';

// Raw material for purchase
const RAW_MATERIALS = ['Tamarind Seeds', 'Other'];

// Finished products for sales
const PRODUCTS = ['Tamarind Dhal', 'Tamarind Husk', 'PVC', 'Waste Tamarind'];

// Expense categories
const EXPENSE_CATEGORIES = ['Food', 'Petrol', 'Office', 'Travel', 'Machinery', 'Labour'];

// Labour sub-categories (shown when Labour is selected)
const LABOUR_SUBCATEGORIES = ['Permanent Labour', 'Contract Labour'];

// Purchase tax %
const PURCHASE_TAX_PCT = 5;

// PIN storage keys
const PIN_KEY         = 'tmr_pin';
const PIN_ENABLED_KEY = 'tmr_pin_enabled';
const SESSION_KEY     = 'tmr_session';
