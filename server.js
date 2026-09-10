const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'amdl-crm.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OWNER',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  source TEXT DEFAULT 'Website',
  project_type TEXT DEFAULT 'Website',
  project_description TEXT DEFAULT '',
  budget_range TEXT DEFAULT '',
  target_launch TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NEW',
  potential_value INTEGER NOT NULL DEFAULT 0,
  assigned_to TEXT DEFAULT '',
  last_contact TEXT DEFAULT '',
  next_followup TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  source_lead_id INTEGER,
  notes TEXT DEFAULT '',
  FOREIGN KEY(source_lead_id) REFERENCES leads(id)
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  project_type TEXT DEFAULT 'Website',
  value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  health TEXT NOT NULL DEFAULT 'GREEN',
  progress INTEGER NOT NULL DEFAULT 0,
  deadline TEXT DEFAULT '',
  pm TEXT DEFAULT '',
  scope_summary TEXT DEFAULT '',
  FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_id INTEGER NOT NULL,
  project_id INTEGER,
  type TEXT NOT NULL DEFAULT 'DP',
  amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  issue_date TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT DEFAULT '',
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  invoice_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  payment_date TEXT DEFAULT '',
  method TEXT DEFAULT 'Bank Transfer',
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  action TEXT NOT NULL,
  object_type TEXT DEFAULT '',
  object_id INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return attempt.length === expected.length && crypto.timingSafeEqual(attempt, expected);
}
function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (!count) {
    const password = process.env.AMDL_ADMIN_PASSWORD || 'change-me-123';
    db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
      .run('AM DIGITAL LAB Owner', 'admin@amdigital.local', hashPassword(password), 'OWNER');
  }
}
seedAdmin();

function today() { return new Date().toISOString().slice(0,10); }
function nextCode(table, prefix) {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT COUNT(*) c FROM ${table}`).get();
  return `${prefix}-${year}-${String(Number(row.c)+1).padStart(3,'0')}`;
}
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').filter(Boolean).map(v => {
    const i = v.indexOf('='); return [v.slice(0,i).trim(), decodeURIComponent(v.slice(i+1))];
  }));
}
function currentUser(req) {
  const token = parseCookies(req).amdl_session;
  if (!token) return null;
  const row = db.prepare(`SELECT users.id,users.name,users.email,users.role,sessions.expires_at
    FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?`).get(token);
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return row;
}
function requireAuth(req,res) {
  const user = currentUser(req);
  if (!user) { json(res,401,{error:'Unauthorized'}); return null; }
  return user;
}
function log(user, action, objectType='', objectId=null) {
  db.prepare('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)')
    .run(user?.id || null, action, objectType, objectId);
}
async function body(req) {
  return await new Promise((resolve,reject)=>{
    let chunks='';
    req.on('data',c=>{ chunks += c; if (chunks.length > 1_000_000) req.destroy(); });
    req.on('end',()=>{ try { resolve(chunks ? JSON.parse(chunks) : {}); } catch(e){ reject(e); } });
    req.on('error',reject);
  });
}
function routeMatch(urlPath, pattern) {
  const a=urlPath.split('/').filter(Boolean), b=pattern.split('/').filter(Boolean);
  if (a.length!==b.length) return null;
  const params={};
  for(let i=0;i<b.length;i++){
    if(b[i].startsWith(':')) params[b[i].slice(1)] = a[i]; else if(a[i]!==b[i]) return null;
  }
  return params;
}
function activeProjectAllowed(projectId) {
  const row = db.prepare(`SELECT COALESCE(SUM(p.amount),0) paid FROM payments p
    JOIN invoices i ON i.id=p.invoice_id WHERE i.project_id=? AND i.type='DP'`).get(projectId);
  return Number(row.paid) > 0;
}

async function api(req,res,url) {
  if (req.method==='POST' && url.pathname==='/api/login') {
    const d=await body(req);
    const user=db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(d.email||'');
    if(!user || !verifyPassword(d.password||'', user.password_hash)) return json(res,401,{error:'Email atau password salah.'});
    const token=crypto.randomBytes(32).toString('hex');
    const expires=new Date(Date.now()+7*24*3600*1000).toISOString();
    db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(token,user.id,expires);
    res.writeHead(200, {'Set-Cookie':`amdl_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7*24*3600}`,'Content-Type':'application/json'});
    return res.end(JSON.stringify({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role}}));
  }
  if (req.method==='POST' && url.pathname==='/api/logout') {
    const token=parseCookies(req).amdl_session;
    if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    res.writeHead(200, {'Set-Cookie':'amdl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0','Content-Type':'application/json'});
    return res.end(JSON.stringify({ok:true}));
  }
  const user=requireAuth(req,res); if(!user) return;
  if (req.method==='GET' && url.pathname==='/api/me') return json(res,200,{user});

  if (req.method==='GET' && url.pathname==='/api/dashboard') {
    const month = new Date().toISOString().slice(0,7);
    const newLeads = db.prepare("SELECT COUNT(*) c FROM leads WHERE substr(created_at,1,7)=?").get(month).c;
    const activeProjects = db.prepare("SELECT COUNT(*) c FROM projects WHERE status NOT IN ('DELIVERED','CLOSED')").get().c;
    const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) v FROM payments WHERE substr(COALESCE(NULLIF(payment_date,''),created_at),1,7)=?").get(month).v;
    const outstanding = db.prepare("SELECT COALESCE(SUM(amount-paid_amount),0) v FROM invoices WHERE status NOT IN ('PAID','CANCELLED')").get().v;
    const won = db.prepare("SELECT COUNT(*) c FROM leads WHERE status='WON' AND substr(created_at,1,7)=?").get(month).c;
    const conversion = newLeads ? Math.round((won/newLeads)*100) : 0;
    const pipeline = db.prepare("SELECT status,COUNT(*) count,COALESCE(SUM(potential_value),0) value FROM leads GROUP BY status").all();
    const projects = db.prepare(`SELECT p.*, c.name client_name FROM projects p JOIN clients c ON c.id=p.client_id
      WHERE p.status NOT IN ('CLOSED') ORDER BY p.created_at DESC LIMIT 8`).all();
    const due = db.prepare(`SELECT i.*,c.name client_name,p.name project_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id
      WHERE i.status NOT IN ('PAID','CANCELLED') ORDER BY COALESCE(NULLIF(i.due_date,''),'9999-12-31') LIMIT 8`).all();
    const activities = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8').all();
    return json(res,200,{kpis:{newLeads,activeProjects,revenue,outstanding,conversion,mrr:0},pipeline,projects,due,activities});
  }

  if (req.method==='GET' && url.pathname==='/api/leads') {
    return json(res,200,{items:db.prepare('SELECT * FROM leads ORDER BY id DESC').all()});
  }
  if (req.method==='POST' && url.pathname==='/api/leads') {
    const d=await body(req), code=nextCode('leads','AMD-L');
    const r=db.prepare(`INSERT INTO leads (code,name,company,phone,email,source,project_type,project_description,budget_range,target_launch,status,potential_value,assigned_to,last_contact,next_followup,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(code,d.name||'',d.company||'',d.phone||'',d.email||'',d.source||'Website',d.project_type||'Website',d.project_description||'',d.budget_range||'',d.target_launch||'',d.status||'NEW',Number(d.potential_value||0),d.assigned_to||'',d.last_contact||'',d.next_followup||'',d.notes||'');
    log(user,`Created lead ${code}`,'lead',r.lastInsertRowid); return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  let m=routeMatch(url.pathname,'/api/leads/:id');
  if (req.method==='PATCH' && m) {
    const d=await body(req), id=Number(m.id);
    const fields=['name','company','phone','email','source','project_type','project_description','budget_range','target_launch','status','potential_value','assigned_to','last_contact','next_followup','notes'];
    const parts=[],vals=[]; for(const f of fields){ if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(f==='potential_value'?Number(d[f]||0):d[f]);}}
    if(parts.length){ vals.push(id); db.prepare(`UPDATE leads SET ${parts.join(',')} WHERE id=?`).run(...vals); }
    log(user,`Updated lead #${id}`,'lead',id); return json(res,200,{ok:true});
  }
  m=routeMatch(url.pathname,'/api/leads/:id/convert');
  if (req.method==='POST' && m) {
    const lead=db.prepare('SELECT * FROM leads WHERE id=?').get(Number(m.id)); if(!lead) return json(res,404,{error:'Lead tidak ditemukan.'});
    const clientCode=nextCode('clients','AMD-C');
    const cr=db.prepare('INSERT INTO clients (code,name,company,phone,email,source_lead_id,notes) VALUES (?,?,?,?,?,?,?)')
      .run(clientCode,lead.name,lead.company,lead.phone,lead.email,lead.id,lead.notes);
    const projectCode=nextCode('projects','AMD');
    const pr=db.prepare('INSERT INTO projects (code,client_id,name,project_type,value,status,health,progress,deadline,pm,scope_summary) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(projectCode,cr.lastInsertRowid,`${lead.company||lead.name} — ${lead.project_type}`,lead.project_type,lead.potential_value,'QUEUED','GREEN',0,lead.target_launch,lead.assigned_to,lead.project_description);
    db.prepare("UPDATE leads SET status='WON' WHERE id=?").run(lead.id);
    log(user,`Converted ${lead.code} to ${clientCode} / ${projectCode}`,'project',pr.lastInsertRowid);
    return json(res,201,{ok:true,client_id:cr.lastInsertRowid,project_id:pr.lastInsertRowid});
  }

  if (req.method==='GET' && url.pathname==='/api/clients') {
    const items=db.prepare(`SELECT c.*,COUNT(DISTINCT p.id) active_projects,COALESCE(SUM(DISTINCT p.value),0) lifetime_value
      FROM clients c LEFT JOIN projects p ON p.client_id=c.id GROUP BY c.id ORDER BY c.id DESC`).all();
    return json(res,200,{items});
  }
  if (req.method==='POST' && url.pathname==='/api/clients') {
    const d=await body(req), code=nextCode('clients','AMD-C');
    const r=db.prepare('INSERT INTO clients (code,name,company,phone,email,notes) VALUES (?,?,?,?,?,?)').run(code,d.name||'',d.company||'',d.phone||'',d.email||'',d.notes||'');
    log(user,`Created client ${code}`,'client',r.lastInsertRowid); return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }

  if (req.method==='GET' && url.pathname==='/api/projects') {
    const items=db.prepare(`SELECT p.*,c.name client_name,c.company client_company,
      COALESCE((SELECT SUM(pay.amount) FROM payments pay JOIN invoices i ON i.id=pay.invoice_id WHERE i.project_id=p.id),0) paid
      FROM projects p JOIN clients c ON c.id=p.client_id ORDER BY p.id DESC`).all();
    return json(res,200,{items});
  }
  if (req.method==='POST' && url.pathname==='/api/projects') {
    const d=await body(req), code=nextCode('projects','AMD');
    const r=db.prepare('INSERT INTO projects (code,client_id,name,project_type,value,status,health,progress,deadline,pm,scope_summary) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(code,Number(d.client_id),d.name||'',d.project_type||'Website',Number(d.value||0),'QUEUED',d.health||'GREEN',Number(d.progress||0),d.deadline||'',d.pm||'',d.scope_summary||'');
    log(user,`Created project ${code}`,'project',r.lastInsertRowid); return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  m=routeMatch(url.pathname,'/api/projects/:id');
  if (req.method==='PATCH' && m) {
    const d=await body(req), id=Number(m.id);
    if(d.status && !['QUEUED'].includes(d.status) && !activeProjectAllowed(id)) return json(res,409,{error:'Project belum bisa diaktifkan: pembayaran DP belum tercatat.'});
    const fields=['name','project_type','value','status','health','progress','deadline','pm','scope_summary']; const parts=[],vals=[];
    for(const f of fields){ if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(['value','progress'].includes(f)?Number(d[f]||0):d[f]);}}
    if(parts.length){ vals.push(id); db.prepare(`UPDATE projects SET ${parts.join(',')} WHERE id=?`).run(...vals); }
    log(user,`Updated project #${id}`,'project',id); return json(res,200,{ok:true});
  }

  if (req.method==='GET' && url.pathname==='/api/invoices') {
    const items=db.prepare(`SELECT i.*,c.name client_name,p.name project_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id ORDER BY i.id DESC`).all();
    return json(res,200,{items});
  }
  if (req.method==='POST' && url.pathname==='/api/invoices') {
    const d=await body(req), code=nextCode('invoices','AMD-INV');
    const r=db.prepare('INSERT INTO invoices (code,client_id,project_id,type,amount,issue_date,due_date,status,notes) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(code,Number(d.client_id),d.project_id?Number(d.project_id):null,d.type||'DP',Number(d.amount||0),d.issue_date||today(),d.due_date||'',d.status||'SENT',d.notes||'');
    log(user,`Created invoice ${code}`,'invoice',r.lastInsertRowid); return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  m=routeMatch(url.pathname,'/api/invoices/:id/payments');
  if (req.method==='POST' && m) {
    const d=await body(req), invoiceId=Number(m.id), inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(invoiceId); if(!inv) return json(res,404,{error:'Invoice tidak ditemukan.'});
    const amount=Math.max(0,Number(d.amount||0)); if(!amount) return json(res,400,{error:'Nominal pembayaran harus lebih dari 0.'});
    db.prepare('INSERT INTO payments (invoice_id,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?)')
      .run(invoiceId,amount,d.payment_date||today(),d.method||'Bank Transfer',d.reference||'',d.notes||'');
    const paid=Number(db.prepare('SELECT COALESCE(SUM(amount),0) v FROM payments WHERE invoice_id=?').get(invoiceId).v);
    const status=paid>=inv.amount?'PAID':paid>0?'PARTIAL':inv.status;
    db.prepare('UPDATE invoices SET paid_amount=?,status=? WHERE id=?').run(paid,status,invoiceId);
    log(user,`Recorded payment for ${inv.code}`,'invoice',invoiceId); return json(res,201,{ok:true,paid_amount:paid,status});
  }

  return json(res,404,{error:'API route not found'});
}

function serveStatic(req,res,url) {
  let rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//,'');
  const file=path.normalize(path.join(PUBLIC,rel));
  if(!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404); return res.end('Not found'); }
    const ext=path.extname(file); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
    res.writeHead(200, {'Content-Type':types[ext]||'application/octet-stream'}); res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/')) return await api(req,res,url);
    return serveStatic(req,res,url);
  } catch(e) {
    console.error(e); return json(res,500,{error:'Internal server error'});
  }
});
server.listen(PORT,()=>console.log(`AM DIGITAL LAB CRM running on http://localhost:${PORT}`));
