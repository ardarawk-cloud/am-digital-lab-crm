const {db}=require('./db');
const {json}=require('./http');

module.exports=async function routesDashboard(req,res,url){
  if(req.method!=='GET'||url.pathname!=='/api/dashboard') return false;
  const month=new Date().toISOString().slice(0,7);
  const newLeads=db.prepare("SELECT COUNT(*) c FROM leads WHERE substr(created_at,1,7)=?").get(month).c;
  const activeProjects=db.prepare("SELECT COUNT(*) c FROM projects WHERE status NOT IN ('DELIVERED','CLOSED')").get().c;
  const revenue=db.prepare("SELECT COALESCE(SUM(amount),0) v FROM payments WHERE substr(COALESCE(NULLIF(payment_date,''),created_at),1,7)=?").get(month).v;
  const outstanding=db.prepare("SELECT COALESCE(SUM(amount-paid_amount),0) v FROM invoices WHERE status NOT IN ('PAID','CANCELLED')").get().v;
  const won=db.prepare("SELECT COUNT(*) c FROM leads WHERE status='WON' AND substr(created_at,1,7)=?").get(month).c;
  const conversion=newLeads?Math.round((won/newLeads)*100):0;
  const openTasks=db.prepare("SELECT COUNT(*) c FROM tasks WHERE status!='DONE'").get().c;
  const criticalQc=db.prepare("SELECT COUNT(*) c FROM qc_items WHERE severity='CRITICAL' AND status NOT IN ('PASS','LOCKED')").get().c;
  const pendingCr=db.prepare("SELECT COUNT(*) c FROM change_requests WHERE status NOT IN ('REJECTED','COMPLETED')").get().c;
  const pipeline=db.prepare("SELECT status,COUNT(*) count,COALESCE(SUM(potential_value),0) value FROM leads GROUP BY status").all();
  const projects=db.prepare(`SELECT p.*,c.name client_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status!='DONE') open_tasks,
    (SELECT COUNT(*) FROM project_scope s WHERE s.project_id=p.id) scope_items,
    (SELECT COUNT(*) FROM qc_items q WHERE q.project_id=p.id AND q.severity='CRITICAL' AND q.status NOT IN ('PASS','LOCKED')) critical_qc
    FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.status!='CLOSED' ORDER BY p.id DESC LIMIT 8`).all();
  const due=db.prepare(`SELECT i.*,c.name client_name,p.name project_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id
    WHERE i.status NOT IN ('PAID','CANCELLED') ORDER BY COALESCE(NULLIF(i.due_date,''),'9999-12-31') LIMIT 8`).all();
  return json(res,200,{kpis:{newLeads,activeProjects,revenue,outstanding,conversion,openTasks,criticalQc,pendingCr,mrr:0},pipeline,projects,due});
};
