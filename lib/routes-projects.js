const {db,nextCode,log,activeProjectAllowed,scopeReady,hasBlockingQc}=require('./db');
const {json,body,match}=require('./http');

module.exports=async function routesProjects(req,res,url,user){
  if(req.method==='GET'&&url.pathname==='/api/projects'){
    const items=db.prepare(`SELECT p.*,c.name client_name,c.company client_company,COALESCE((SELECT SUM(pay.amount) FROM payments pay JOIN invoices i ON i.id=pay.invoice_id WHERE i.project_id=p.id),0) paid,(SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status!='DONE') open_tasks,(SELECT COUNT(*) FROM project_scope s WHERE s.project_id=p.id) scope_items,(SELECT COUNT(*) FROM qc_items q WHERE q.project_id=p.id AND q.severity='CRITICAL' AND q.status NOT IN ('PASS','LOCKED')) critical_qc FROM projects p JOIN clients c ON c.id=p.client_id ORDER BY p.id DESC`).all();
    return json(res,200,{items});
  }
  if(req.method==='POST'&&url.pathname==='/api/projects'){
    const d=await body(req),code=nextCode('projects','AMD');if(!d.client_id||!d.name)return json(res,400,{error:'Client dan nama project wajib diisi.'});
    const r=db.prepare('INSERT INTO projects (code,client_id,name,project_type,value,status,health,progress,deadline,pm,scope_summary,scope_approved) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)').run(code,Number(d.client_id),d.name,d.project_type||'Website',Number(d.value||0),'QUEUED',d.health||'GREEN',Number(d.progress||0),d.deadline||'',d.pm||'',d.scope_summary||'');
    log(user,`Created project ${code}`,'project',r.lastInsertRowid);return json(res,201,{ok:true,id:r.lastInsertRowid,code});
  }
  let m=match(url.pathname,'/api/projects/:id');
  if(req.method==='PATCH'&&m){
    const d=await body(req),id=Number(m.id),p=db.prepare('SELECT * FROM projects WHERE id=?').get(id);if(!p)return json(res,404,{error:'Project tidak ditemukan.'});
    if(d.status&&d.status!=='QUEUED'&&!activeProjectAllowed(id))return json(res,409,{error:'Project belum bisa diaktifkan: pembayaran DP belum tercatat.'});
    const guarded=['DEVELOPMENT','INTERNAL QC','CLIENT UAT','REVISION','FINAL APPROVAL','PAYMENT PENDING','DEPLOYMENT','DELIVERED','WARRANTY','MAINTENANCE','CLOSED'];
    if(d.status&&guarded.includes(d.status)&&!scopeReady(id))return json(res,409,{error:'Development belum bisa lanjut: scope belum memiliki item dan belum di-approve.'});
    if(d.status&&['DEPLOYMENT','DELIVERED'].includes(d.status)&&hasBlockingQc(id))return json(res,409,{error:'Production blocked: masih ada CRITICAL QC yang belum PASS/LOCKED.'});
    const fields=['name','project_type','value','status','health','progress','deadline','pm','scope_summary'],parts=[],vals=[];
    for(const f of fields)if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(['value','progress'].includes(f)?Number(d[f]||0):d[f])}
    if(parts.length){vals.push(id);db.prepare(`UPDATE projects SET ${parts.join(',')} WHERE id=?`).run(...vals)}log(user,`Updated project #${id}`,'project',id);return json(res,200,{ok:true});
  }
  m=match(url.pathname,'/api/projects/:id/scope-approval');
  if(req.method==='PATCH'&&m){const id=Number(m.id),d=await body(req),n=Number(db.prepare('SELECT COUNT(*) c FROM project_scope WHERE project_id=? AND included_contract=1').get(id).c);if(d.approved&&!n)return json(res,409,{error:'Tambahkan minimal satu scope item sebelum approval.'});db.prepare('UPDATE projects SET scope_approved=? WHERE id=?').run(d.approved?1:0,id);log(user,`${d.approved?'Approved':'Unlocked'} project scope #${id}`,'project',id);return json(res,200,{ok:true,scope_approved:d.approved?1:0})}
  m=match(url.pathname,'/api/projects/:id/scope');
  if(req.method==='GET'&&m){const project=db.prepare('SELECT * FROM projects WHERE id=?').get(Number(m.id));if(!project)return json(res,404,{error:'Project tidak ditemukan.'});return json(res,200,{project,items:db.prepare('SELECT * FROM project_scope WHERE project_id=? ORDER BY id').all(Number(m.id))})}
  if(req.method==='POST'&&m){const id=Number(m.id),d=await body(req),p=db.prepare('SELECT * FROM projects WHERE id=?').get(id);if(!p)return json(res,404,{error:'Project tidak ditemukan.'});if(Number(p.scope_approved)===1)return json(res,409,{error:'Scope sudah approved. Unlock scope sebelum menambah item.'});if(!d.title)return json(res,400,{error:'Nama scope wajib diisi.'});const r=db.prepare('INSERT INTO project_scope (project_id,module,title,description,priority,status,included_contract) VALUES (?,?,?,?,?,?,?)').run(id,d.module||'Core',d.title,d.description||'',d.priority||'MUST HAVE',d.status||'PLANNED',d.included_contract===false?0:1);log(user,`Added scope item to ${p.code}`,'scope',r.lastInsertRowid);return json(res,201,{ok:true,id:r.lastInsertRowid})}
  m=match(url.pathname,'/api/scope/:id');
  if(req.method==='PATCH'&&m){const id=Number(m.id),d=await body(req),s=db.prepare('SELECT s.*,p.scope_approved FROM project_scope s JOIN projects p ON p.id=s.project_id WHERE s.id=?').get(id);if(!s)return json(res,404,{error:'Scope item tidak ditemukan.'});if(Number(s.scope_approved)===1&&Object.keys(d).some(k=>['title','description','module','priority','included_contract'].includes(k)))return json(res,409,{error:'Scope sudah approved. Unlock dulu untuk mengubah requirement.'});const fields=['module','title','description','priority','status','included_contract'],parts=[],vals=[];for(const f of fields)if(Object.hasOwn(d,f)){parts.push(`${f}=?`);vals.push(f==='included_contract'?(d[f]?1:0):d[f])}if(parts.length){vals.push(id);db.prepare(`UPDATE project_scope SET ${parts.join(',')} WHERE id=?`).run(...vals)}log(user,`Updated scope item #${id}`,'scope',id);return json(res,200,{ok:true})}
  return false;
};
