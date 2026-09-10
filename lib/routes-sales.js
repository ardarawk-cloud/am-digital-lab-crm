const {db,nextCode,log}=require('./db');
const {json,body,match}=require('./http');

module.exports=async function routesSales(req,res,url,user){
  if(req.method==='GET'&&url.pathname==='/api/leads')return json(res,200,{items:db.prepare('SELECT * FROM leads ORDER BY id DESC').all()});
  if(req.method==='POST'&&url.pathname==='/api/leads'){
    const d=await body(req),code=nextCode('leads','AMD-L');if(!d.name)return json(res,400,{error:'Nama lead wajib diisi.'});
    const r=db.prepare(`INSERT INTO leads (code,name,company,phone,email,source,project_type,project_description,budget_range,target_launch,status,potential_value,assigned_to,last_contact,next_followup,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(code,d.name,d.company||'',d.phone||'',d.email||'',d.source||'Website',d.project_type||'Website',d.project_description||'',d.budget_range||'',d.target_launch||'',d.status||'NEW',Number(d.potential_value||0),d.assigned_to||'',d.last_contact||'',d.next_followup||'',d.notes||'');
    log(user,`Created lead ${code}`,'lead',r.lastInsertRowid);return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  let m=match(url.pathname,'/api/leads/:id');
  if(req.method==='PATCH'&&m){
    const d=await body(req),id=Number(m.id),fields=['name','company','phone','email','source','project_type','project_description','budget_range','target_launch','status','potential_value','assigned_to','last_contact','next_followup','notes'],parts=[],vals=[];
    for(const f of fields)if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(f==='potential_value'?Number(d[f]||0):d[f])}
    if(parts.length){vals.push(id);db.prepare(`UPDATE leads SET ${parts.join(',')} WHERE id=?`).run(...vals)}
    log(user,`Updated lead #${id}`,'lead',id);return json(res,200,{ok:true});
  }
  m=match(url.pathname,'/api/leads/:id/convert');
  if(req.method==='POST'&&m){
    const lead=db.prepare('SELECT * FROM leads WHERE id=?').get(Number(m.id));if(!lead)return json(res,404,{error:'Lead tidak ditemukan.'});
    if(lead.status!=='WON')return json(res,409,{error:'Lead harus berstatus WON sebelum dikonversi.'});
    if(db.prepare('SELECT id FROM clients WHERE source_lead_id=?').get(lead.id))return json(res,409,{error:'Lead ini sudah pernah dikonversi.'});
    const cc=nextCode('clients','AMD-C');const cr=db.prepare('INSERT INTO clients (code,name,company,phone,email,source_lead_id,notes) VALUES (?,?,?,?,?,?,?)').run(cc,lead.name,lead.company,lead.phone,lead.email,lead.id,lead.notes);
    const pc=nextCode('projects','AMD');const pr=db.prepare('INSERT INTO projects (code,client_id,name,project_type,value,status,health,progress,deadline,pm,scope_summary,scope_approved) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)').run(pc,cr.lastInsertRowid,`${lead.company||lead.name} — ${lead.project_type}`,lead.project_type,lead.potential_value,'QUEUED','GREEN',0,lead.target_launch,lead.assigned_to,lead.project_description);
    log(user,`Converted ${lead.code} to ${cc} / ${pc}`,'project',pr.lastInsertRowid);return json(res,201,{ok:true,client_id:cr.lastInsertRowid,project_id:pr.lastInsertRowid});
  }

  if(req.method==='GET'&&url.pathname==='/api/clients'){
    const items=db.prepare(`SELECT c.*,COUNT(DISTINCT p.id) active_projects,COALESCE(SUM(DISTINCT p.value),0) lifetime_value FROM clients c LEFT JOIN projects p ON p.client_id=c.id GROUP BY c.id ORDER BY c.id DESC`).all();return json(res,200,{items});
  }
  if(req.method==='POST'&&url.pathname==='/api/clients'){
    const d=await body(req),code=nextCode('clients','AMD-C');if(!d.name)return json(res,400,{error:'Nama client wajib diisi.'});
    const r=db.prepare('INSERT INTO clients (code,name,company,phone,email,notes) VALUES (?,?,?,?,?,?)').run(code,d.name,d.company||'',d.phone||'',d.email||'',d.notes||'');log(user,`Created client ${code}`,'client',r.lastInsertRowid);return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  return false;
};
