const upgradeCss=document.createElement('link');
upgradeCss.rel='stylesheet';
upgradeCss.href='/upgrade.css';
document.head.appendChild(upgradeCss);

const logoHtml='<img src="/logo.svg" alt="AM DIGITAL LAB">';
document.querySelectorAll('.brand-mark').forEach(el=>{el.innerHTML=logoHtml;});
document.querySelectorAll('.mini-logo').forEach(el=>{el.innerHTML=logoHtml;});

const navMenu=document.getElementById('navMenu');
const pricingNav=navMenu?.querySelector('a[href="#pricing"]');
if(navMenu&&pricingNav&&!navMenu.querySelector('a[href="#work"]')){
  const workLink=document.createElement('a');
  workLink.href='#work';
  workLink.textContent='Work';
  navMenu.insertBefore(workLink,pricingNav);
}

const pricingValues=[
  ['Landing Page','Rp2.500.000','starting'],
  ['Business Website','Rp7.500.000','starting'],
  ['Android Starter','Rp9.500.000','starting'],
  ['Custom Web App','Rp15.000.000','starting'],
  ['AI Chatbot','Rp5.000.000','starting'],
  ['Maintenance','Rp750.000','/ month']
];
document.querySelectorAll('.price-card').forEach(card=>{
  const title=card.querySelector('h3')?.textContent.trim();
  const row=pricingValues.find(([name])=>name===title);
  if(row){
    const strong=card.querySelector('strong');
    if(strong)strong.innerHTML=`${row[1]}<small> ${row[2]}</small>`;
  }
});

const budgetSelect=document.querySelector('select[name="budget_range"]');
if(budgetSelect){
  const labels={
    'Under Rp5M':'Under Rp5.000.000',
    'Rp5M–10M':'Rp5.000.000–Rp10.000.000',
    'Rp10M–20M':'Rp10.000.000–Rp20.000.000',
    'Rp20M–50M':'Rp20.000.000–Rp50.000.000',
    'Rp50M+':'Rp50.000.000+'
  };
  [...budgetSelect.options].forEach(option=>{if(labels[option.textContent])option.textContent=labels[option.textContent];});
}

const workSection=document.createElement('section');
workSection.className='section work-section';
workSection.id='work';
workSection.innerHTML=`
  <div class="container">
    <div class="section-head">
      <div><span class="kicker">SELECTED BUILDS</span><h2>Products and systems already built in our ecosystem.</h2></div>
      <p class="work-intro">A selection of internal products, active builds and real business systems across web, mobile, AI, cloud and connected experiences.</p>
    </div>
    <div class="work-grid">
      <article class="work-card"><div class="work-top"><span class="work-type">ENTERPRISE PLATFORM</span><span class="work-state">ACTIVE</span></div><h3>ACC OS X</h3><p>Enterprise operating system for managing channels, production workflows, AI-assisted operations, publishing and connected workspaces.</p><div class="work-stack"><span>Cloudflare</span><span>AI Workflow</span><span>Dashboard</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">BUSINESS SYSTEM</span><span class="work-state">LIVE</span></div><h3>AM DIGITAL LAB CRM</h3><p>Cloud-native CRM for leads, clients, projects, quotations, invoices, tasks, change requests, QC and project operations.</p><div class="work-stack"><span>Cloudflare Workers</span><span>SQLite</span><span>CRM</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">HOSPITALITY WEB</span><span class="work-state">DEMO</span></div><h3>ZUZU Family House</h3><p>Premium hospitality website with availability flow, booking experience, admin dashboard, finance view, rates and marketing controls.</p><div class="work-stack"><span>Booking</span><span>Admin</span><span>Analytics</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">ANDROID / CONNECTIVITY</span><span class="work-state">ALPHA</span></div><h3>OFFGRID</h3><p>Offline-first mesh communication application designed around local device-to-device connectivity and resilient communication flows.</p><div class="work-stack"><span>Android</span><span>Mesh</span><span>Offline-first</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">MOBILE + GAME INTEGRATION</span><span class="work-state">PILOT</span></div><h3>BBYA Music Manager</h3><p>Playlist and library management workflow that connects mobile music operations with synchronized Roblox audio experiences.</p><div class="work-stack"><span>Android</span><span>Roblox</span><span>Sync</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">MUSIC TECH</span><span class="work-state">ACTIVE</span></div><h3>AM STUDIO Music Distribution</h3><p>Music operations product for structured release and distribution workflows, built as a dedicated mobile system.</p><div class="work-stack"><span>Android</span><span>Workflow</span><span>Music</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">SOCIAL PLATFORM</span><span class="work-state">ACTIVE BUILD</span></div><h3>KIN</h3><p>Modern social platform concept centered on visual posting, profiles, personal spaces, people discovery, privacy circles and chat.</p><div class="work-stack"><span>Social</span><span>Mobile</span><span>Product Design</span></div></article>
      <article class="work-card"><div class="work-top"><span class="work-type">AI APPLICATION</span><span class="work-state">STABLE TEST</span></div><h3>ORACLY</h3><p>AI-focused application built through the AM/ACC product ecosystem, with automated Android build and testing workflow.</p><div class="work-stack"><span>AI</span><span>Android</span><span>Automation</span></div></article>
    </div>
    <p class="portfolio-note">Selected builds shown here include internal products, R&amp;D systems and active product development—not only commissioned client work.</p>
  </div>`;
const pricingSection=document.getElementById('pricing');
pricingSection?.parentNode.insertBefore(workSection,pricingSection);

const menuBtn=document.getElementById('menuBtn');
menuBtn?.addEventListener('click',()=>navMenu.classList.toggle('open'));
navMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>navMenu.classList.remove('open')));

const form=document.getElementById('projectForm');
const statusEl=document.getElementById('formStatus');
const submitBtn=document.getElementById('submitBtn');

form?.addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(form);
  const data=Object.fromEntries(fd.entries());
  if(!data.name||(!data.email&&!data.phone)){
    statusEl.textContent='Please enter your name and at least an email or WhatsApp number.';
    statusEl.className='error';
    return;
  }
  submitBtn.disabled=true;
  submitBtn.textContent='Sending...';
  statusEl.textContent='Sending your project inquiry to AM DIGITAL LAB...';
  statusEl.className='';
  try{
    const res=await fetch('/api/start-project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
    const body=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(body.error||'Unable to send inquiry.');
    form.reset();
    statusEl.textContent=`Inquiry received · ${body.code||'AMDL'}. We can now review it from our internal project pipeline.`;
    statusEl.className='success';
  }catch(err){
    statusEl.textContent=err.message||'Something went wrong. Please try again.';
    statusEl.className='error';
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent='Send Project Inquiry';
  }
});

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('in-view')});
},{threshold:.08});
document.querySelectorAll('.service-card,.solution-grid article,.price-card,.process-grid div,.work-card').forEach(el=>observer.observe(el));
