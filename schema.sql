-- ══════════════════════════════════════════════════
-- QUADRA PHARMA ERP — Cloudflare D1 Schema
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  type TEXT,
  color TEXT DEFAULT '0284c7',
  legal_form TEXT,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER DEFAULT 1,
  last_login INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(username)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  scientific_name TEXT,
  form TEXT,
  strength TEXT,
  category TEXT,
  package_size TEXT,
  shelf_life INTEGER,
  storage_condition TEXT,
  barcode TEXT,
  product_code TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  agency TEXT NOT NULL,
  lic_type TEXT,
  reg_no TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  sci_name TEXT,
  form TEXT,
  strength TEXT,
  reg_date TEXT,
  expiry_date TEXT,
  manufacturer TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  qty REAL DEFAULT 0,
  unit TEXT,
  reorder_level REAL DEFAULT 0,
  supplier TEXT,
  spec TEXT,
  cas_number TEXT,
  pharmacopoeial_ref TEXT,
  storage_condition TEXT,
  shelf_life_months INTEGER,
  unit_cost REAL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT,
  batch TEXT,
  qty REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  mfg_date TEXT,
  exp_date TEXT,
  status TEXT DEFAULT 'available',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  product TEXT,
  qty REAL,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'planned',
  total_cost REAL DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT,
  description TEXT,
  dept TEXT,
  amount REAL DEFAULT 0,
  type TEXT,
  category TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  order_no TEXT,
  client TEXT,
  date TEXT,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT,
  description TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  account TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT,
  title TEXT,
  basic REAL DEFAULT 0,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT,
  product TEXT,
  test_type TEXT,
  result TEXT,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bom (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product TEXT,
  material TEXT,
  qty REAL DEFAULT 0,
  unit TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_registrations_company ON registrations(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_company ON materials(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);

-- Default admin company + user (password: admin123)
INSERT OR IGNORE INTO companies (id, name, type, color) VALUES 
  ('co_default', 'Quadra Pharm', 'شركة دوائية', '0284c7');

INSERT OR IGNORE INTO users (id, company_id, username, password_hash, name, role) VALUES 
  ('usr_admin', 'co_default', 'admin', '-1605743527', 'مدير النظام', 'admin');
