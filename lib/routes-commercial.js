const {db,nextCode,log,today}=require('./db');
const {json,body,match}=require('./http');

module.exports=async function routesCommercial(req,res,url,user){
  if(req.method==='GET'&&url.pathname==='/api/quotations'){
    const items=db.prepare(`SELECT q.*,c.name client_name,p.name project_name,(SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id=q.id) item_count FROM quotations q JOIN clients c ON c.id=q.client_id LEFT JOIN projects p ON p.id=q.project_id ORDER BY q.id DESC`).all();
    return json(res,200,{items});
  }
  if(req.method==='POST'&&url.pathname==='/api/quotations'){
    const d=await body(req),code=nextCode('quotations','AMD-Q'),items=Array.isArray(d.items)?d.items.filter(x=>x&&x.description):[];
    if(!d.client_id)return json(res,400,{error:'Client wajib dipilih.'});if(!items.length)return json(res,400,{error:'Quotation harus memiliki minimal satu item.'});
    const subtotal=items.reduce((a,x)=>a+Number(x.qty||1)*Number(x.unit_price||0),0);let id;
    db.exec('BEGIN');try{const r=db.prepare('INSERT INTO quotations (code,client_id,project_id,issue_date,expiry_date,status,subtotal,notes) VALUES (?,?,?,?,?,?,?,?)').run(code,Number(d.client_id),d.project_id?Number(d.project_id):null,d.issue_date||today(),d.expiry_date||'',d.status||'DRAFT',subtotal,d.notes||'');id=Number(r.lastInsertRowid);const ins=db.prepare('INSERT INTO quotation_items (quotation_id,description,qty,unit_price,amount) VALUES (?,?,?,?,?)');for(const x of items){const q=Number(x.qty||1),u=Number(x.unit_price||0);ins.run(id,x.description,q,u,q*u)}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
    log(user,`Created quotation ${code}`,'quotation',id);return json(res,201,{ok:true,id,code,subtotal});
  }
  let m=match(url.pathname,'/api/quotations/:id');
  if(req.method==='GET'&&m){const q=db.prepare(`SELECT q.*,c.name client_name,c.company,p.name project_name FROM quotations q JOIN clients c ON c.id=q.client_id LEFT JOIN projects p ON p.id=q.project_id WHERE q.id=?`).get(Number(m.id));if(!q)return json(res,404,{error:'Quotation tidak ditemukan.'});q.items=db.prepare('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY id').all(Number(m.id));return json(res,200,q)}
  if(req.method==='PATCH'&&m){const d=await body(req),id=Number(m.id),allowed=['DRAFT','SENT','VIEWED','NEGOTIATION','APPROVED','REJECTED','EXPIRED'];if(d.status&&!allowed.includes(d.status))return json(res,400,{error:'Status quotation tidak valid.'});const fields=['status','expiry_date','notes'],parts=[],vals=[];for(const f of fields)if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(d[f])}if(parts.length){vals.push(id);db.prepare(`UPDATE quotations SET ${parts.join(',')} WHERE id=?`).run(...vals)}log(user,`Updated quotation #${id}`,'quotation',id);return json(res,200,{ok:true})}

  if(req.method==='GET'&&url.pathname==='/api/invoices')return json(res,200,{items:db.prepare(`SELECT i.*,c.name client_name,p.name project_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id ORDER BY i.id DESC`).all()});
  if(req.method==='POST'&&url.pathname==='/api/invoices'){
    const d=await body(req),code=nextCode('invoices','AMD-INV');if(!d.client_id||Number(d.amount||0)<=0)return json(res,400,{error:'Client dan nominal invoice wajib diisi.'});
    const r=db.prepare('INSERT INTO invoices (code,client_id,project_id,type,amount,issue_date,due_date,status,notes) VALUES (?,?,?,?,?,?,?,?,?)').run(code,Number(d.client_id),d.project_id?Number(d.project_id):null,d.type||'DP',Number(d.amount),d.issue_date||today(),d.due_date||'',d.status||'SENT',d.notes||'');log(user,`Created invoice ${code}`,'invoice',r.lastInsertRowid);return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  m=match(url.pathname,'/api/invoices/:id/payments');
  if(req.method==='POST'&&m){const d=await body(req),id=Number(m.id),inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(id);if(!inv)return json(res,404,{error:'Invoice tidak ditemukan.'});const amount=Math.max(0,Number(d.amount||0));if(!amount)return json(res,400,{error:'Nominal pembayaran harus lebih dari 0.'});const outstanding=Math.max(0,Number(inv.amount)-Number(inv.paid_amount));if(amount>outstanding)return json(res,409,{error:`Pembayaran melebihi outstanding (${outstanding}).`});db.prepare('INSERT INTO payments (invoice_id,amount,payment_date,method,reference,notes) VALUES (?,?,?,?,?,?)').run(id,amount,d.payment_date||today(),d.method||'Bank Transfer',d.reference||'',d.notes||'');const paid=Number(db.prepare('SELECT COALESCE(SUM(amount),0) v FROM payments WHERE invoice_id=?').get(id).v),status=paid>=inv.amount?'PAID':paid>0?'PARTIAL':inv.status;db.prepare('UPDATE invoices SET paid_amount=?,status=? WHERE id=?').run(paid,status,id);log(user,`Recorded payment for ${inv.code}`,'invoice',id);return json(res,201,{ok:true,paid_amount:paid,status})}
  return false;
};
