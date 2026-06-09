// ══════════════════════════════════════════════════
// QUADRA PHARMA ERP — Cloudflare Worker API
// ══════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// Simple hash (same as frontend)
function hashPassword(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return String(h);
}

// ── Router ────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');
    const db   = env.DB;

    try {
      // ── AUTH ──────────────────────────────────
      if (path === '/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        const hash = hashPassword(password);
        const user = await db.prepare(
          'SELECT u.*, c.name as company_name FROM users u JOIN companies c ON c.id=u.company_id WHERE u.username=? AND u.password_hash=? AND u.active=1'
        ).bind(username, hash).first();
        if (!user) return err('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
        await db.prepare('UPDATE users SET last_login=unixepoch() WHERE id=?').bind(user.id).run();
        return json({ ok: true, user: { id: user.id, username: user.username, name: user.name, role: user.role, company_id: user.company_id, company_name: user.company_name } });
      }

      // ── COMPANIES ─────────────────────────────
      if (path === '/companies' && request.method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM companies ORDER BY created_at').all();
        return json(results);
      }
      if (path === '/companies' && request.method === 'POST') {
        const b = await request.json();
        const id = 'co_' + Date.now();
        await db.prepare('INSERT INTO companies (id,name,name_en,type,color,legal_form,tax_id,address,phone,email) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, b.name, b.name_en||'', b.type||'', b.color||'0284c7', b.legal_form||'', b.tax_id||'', b.address||'', b.phone||'', b.email||'').run();
        // Create default admin for new company
        const uid = 'usr_' + Date.now();
        await db.prepare('INSERT INTO users (id,company_id,username,password_hash,name,role) VALUES (?,?,?,?,?,?)')
          .bind(uid, id, 'admin_'+id.slice(-6), hashPassword('admin123'), 'مدير النظام', 'admin').run();
        return json({ ok: true, id });
      }
      if (path.match(/^\/companies\/[^/]+$/) && request.method === 'PUT') {
        const id = path.split('/')[2];
        const b  = await request.json();
        await db.prepare('UPDATE companies SET name=?,type=?,color=?,legal_form=?,tax_id=?,address=?,phone=?,email=?,updated_at=unixepoch() WHERE id=?')
          .bind(b.name, b.type||'', b.color||'0284c7', b.legal_form||'', b.tax_id||'', b.address||'', b.phone||'', b.email||'', id).run();
        return json({ ok: true });
      }
      if (path.match(/^\/companies\/[^/]+$/) && request.method === 'DELETE') {
        const id = path.split('/')[2];
        await db.prepare('DELETE FROM companies WHERE id=?').bind(id).run();
        return json({ ok: true });
      }

      // ── GENERIC CRUD ──────────────────────────
      // Tables: users, products, registrations, materials, inventory,
      //         production_orders, expenses, deliveries, journal_entries, payroll, quality_checks, bom
      const TABLE_MAP = {
        'users': 'users', 'products': 'products', 'registrations': 'registrations',
        'materials': 'materials', 'inventory': 'inventory', 'orders': 'production_orders',
        'expenses': 'expenses', 'deliveries': 'deliveries', 'journal': 'journal_entries',
        'payroll': 'payroll', 'quality': 'quality_checks', 'bom': 'bom',
      };

      const m = path.match(/^\/co\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
      if (m) {
        const coId  = m[1];
        const table = TABLE_MAP[m[2]];
        const recId = m[3];
        if (!table) return err('Unknown table');

        if (!recId && request.method === 'GET') {
          const { results } = await db.prepare(`SELECT * FROM ${table} WHERE company_id=? ORDER BY created_at DESC`).bind(coId).all();
          return json(results);
        }

        if (!recId && request.method === 'POST') {
          const b   = await request.json();
          const id  = b.id || (m[2] + '_' + Date.now());
          const cols = Object.keys(b).filter(k => k !== 'id');
          const vals = cols.map(k => b[k]);
          const sql  = `INSERT OR REPLACE INTO ${table} (id, company_id, ${cols.join(',')}) VALUES (?, ?, ${cols.map(()=>'?').join(',')})`;
          await db.prepare(sql).bind(id, coId, ...vals).run();
          return json({ ok: true, id });
        }

        if (recId && request.method === 'PUT') {
          const b    = await request.json();
          const cols = Object.keys(b);
          const vals = cols.map(k => b[k]);
          const sql  = `UPDATE ${table} SET ${cols.map(c=>c+'=?').join(',')} WHERE id=? AND company_id=?`;
          await db.prepare(sql).bind(...vals, recId, coId).run();
          return json({ ok: true });
        }

        if (recId && request.method === 'DELETE') {
          await db.prepare(`DELETE FROM ${table} WHERE id=? AND company_id=?`).bind(recId, coId).run();
          return json({ ok: true });
        }
      }

      // ── USERS ─────────────────────────────────
      if (path.match(/^\/co\/[^/]+\/users$/) && request.method === 'POST') {
        const coId = path.split('/')[2];
        const b    = await request.json();
        const id   = 'usr_' + Date.now();
        const hash = hashPassword(b.password || 'admin123');
        await db.prepare('INSERT INTO users (id,company_id,username,password_hash,name,role,active) VALUES (?,?,?,?,?,?,?)')
          .bind(id, coId, b.username, hash, b.name, b.role||'viewer', b.active!==false?1:0).run();
        return json({ ok: true, id });
      }

      // ── STATS ─────────────────────────────────
      if (path === '/stats' && request.method === 'GET') {
        const companies = await db.prepare('SELECT COUNT(*) as n FROM companies').first();
        const products  = await db.prepare('SELECT COUNT(*) as n FROM products').first();
        const regs      = await db.prepare('SELECT COUNT(*) as n FROM registrations').first();
        const orders    = await db.prepare('SELECT COUNT(*) as n FROM production_orders').first();
        return json({ companies: companies.n, products: products.n, registrations: regs.n, orders: orders.n });
      }

      return err('Not found', 404);

    } catch (e) {
      return err('Server error: ' + e.message, 500);
    }
  }
};
