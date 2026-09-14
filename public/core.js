const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { user:null, page:'dashboard', clients:[], projects:[], leads:[], invoices:[], selectedProject:null, taskProject:'' };
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0));
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const today = () => new Date().toISOString().slice(0,10);
let leadBadgeTimer=null;

async function api(url,opt={}) {
  const r = await fetch(url,{headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Request failed');
  return d;
}

async function refreshLeadBadge(){
  if(!state.user)return;
  try{
    const d=await api('/api/dashboard');
    const count=Math.max(0,Number(d?.kpis?.newLeads||0));
    const btn=$('#nav [data-page="leads"]');
    if(!btn)return;
    let chip=btn.querySelector('.nav-count');
    if(!chip){chip=document.createElement('span');chip.className='nav-count';btn.appendChild(chip)}
    chip.textContent=count>99?'99+':String(count);
    chip.hidden=count===0;
    btn.classList.toggle('has-unread',count>0);
  }catch{}
}
function startLeadBadgePolling(){
  clearInterval(leadBadgeTimer);
  refreshLeadBadge();
  leadBadgeTimer=setInterval(refreshLeadBadge,60000);
}

async function init(){try{const r=await api('/api/me');state.user=r.user;showApp()}catch{showLogin()}}
function showLogin(){$('#login').classList.remove('hidden');$('#app').classList.add('hidden')}
function showApp(){$('#login').classList.add('hidden');$('#app').classList.remove('hidden');$('#userName').textContent=`${state.user.name} · ${state.user.role}`;navigate('dashboard');startLeadBadgePolling()}

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault(); $('#loginError').textContent='';
  try{const r=await api('/api/login',{method:'POST',body:JSON.stringify({email:$('#loginEmail').value,password:$('#loginPassword').value})});state.user=r.user;showApp()}
  catch(err){$('#loginError').textContent=err.message}
});
$('#logoutBtn').onclick=async()=>{clearInterval(leadBadgeTimer);await api('/api/logout',{method:'POST'});state.user=null;showLogin()};
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)navigate(b.dataset.page)});

const pageMeta={
  dashboard:['Dashboard','Kontrol operasional NADMO STUDIO.'],
  leads:['Sales / Leads','Kelola pipeline dan calon client.'],
  clients:['Clients','Database client dan nilai relationship.'],
  projects:['Projects','Scope, status, progress, dan project health.'],
  quotations:['Quotations','Susun dan pantau penawaran project.'],
  tasks:['Tasks','Kanban delivery lintas project.'],
  changes:['Change Requests','Kontrol perubahan di luar approved scope.'],
  qc:['QC / Bugs','Quality gate sebelum production.'],
  finance:['Finance','Invoice, pembayaran, dan outstanding.']
};
const quickLabels={leads:'+ New Lead',clients:'+ New Client',projects:'+ New Project',quotations:'+ New Quotation',tasks:'+ New Task',changes:'+ New CR',qc:'+ New QC',finance:'+ New Invoice',dashboard:'+ New Lead'};

async function navigate(page){
  state.page=page;
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const meta=pageMeta[page]; $('#pageTitle').textContent=meta[0]; $('#pageSub').textContent=meta[1];
  $('#quickAdd').textContent=quickLabels[page]||'+ New';
  $('#quickAdd').onclick=()=>({leads:openLeadModal,clients:openClientModal,projects:openProjectModal,quotations:openQuotationModal,tasks:openTaskModal,changes:openChangeModal,qc:openQcModal,finance:openInvoiceModal,dashboard:openLeadModal}[page]||openLeadModal)();
  await render();
  refreshLeadBadge();
}
async function render(){
  try{
    if(state.page==='dashboard')return renderDashboard();
    if(state.page==='leads')return renderLeads();
    if(state.page==='clients')return renderClients();
    if(state.page==='projects')return renderProjects();
    if(state.page==='quotations')return renderQuotations();
    if(state.page==='tasks')return renderTasks();
    if(state.page==='changes')return renderChanges();
    if(state.page==='qc')return renderQc();
    if(state.page==='finance')return renderFinance();
  }catch(e){$('#content').innerHTML=`<div class="card danger">${esc(e.message)}</div>`}
}

function badge(s){
  const x=String(s||''); let c='';
  if(['WON','PAID','GREEN','DELIVERED','CLOSED','DONE','PASS','LOCKED','APPROVED','COMPLETED'].includes(x))c='good';
  if(['NEGOTIATION','YELLOW','PARTIAL','PAYMENT PENDING','REVIEW','PARTIAL','HIGH','QUOTED'].includes(x))c='warn';
  if(['LOST','RED','OVERDUE','FAIL','CRITICAL','BLOCKED','REJECTED'].includes(x))c='bad';
  if(['DEVELOPMENT','INTERNAL QC','CLIENT UAT','VIEWED'].includes(x))c='purple';
  return `<span class="badge ${c}">${esc(x)}</span>`;
}

async function ensureProjects(){if(!state.projects.length)state.projects=(await api('/api/projects')).items;return state.projects}
async function ensureClients(){if(!state.clients.length)state.clients=(await api('/api/clients')).items;return state.clients}

