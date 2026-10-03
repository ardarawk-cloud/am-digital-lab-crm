for(const href of ['/upgrade.css']){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}

const logoHtml='<img src="/logo.svg" alt="NADMO STUDIO">';
document.querySelectorAll('.brand-mark,.mini-logo').forEach(el=>{el.innerHTML=logoHtml});

const navMenu=document.getElementById('navMenu');
const pricingValues=[['Landing Page','Rp2.500.000','starting'],['Business Website','Rp7.500.000','starting'],['Android Starter','Rp9.500.000','starting'],['Custom Web App','Rp15.000.000','starting'],['AI Chatbot','Rp5.000.000','starting'],['Maintenance','Rp750.000','/ month']];
document.querySelectorAll('.price-card').forEach(card=>{const row=pricingValues.find(([n])=>n===card.querySelector('h3')?.textContent.trim());if(row){const s=card.querySelector('strong');if(s)s.innerHTML=`${row[1]}<small> ${row[2]}</small>`}});
const budgetSelect=document.querySelector('select[name="budget_range"]');
if(budgetSelect){const labels={'Under Rp5M':'Under Rp5.000.000','Rp5M–10M':'Rp5.000.000–Rp10.000.000','Rp10M–20M':'Rp10.000.000–Rp20.000.000','Rp20M–50M':'Rp20.000.000–Rp50.000.000','Rp50M+':'Rp50.000.000+'};[...budgetSelect.options].forEach(o=>{if(labels[o.textContent])o.textContent=labels[o.textContent]})}

const projectTypeSelect=document.querySelector('select[name="project_type"]');
document.querySelectorAll('[data-project-type]').forEach(link=>link.addEventListener('click',()=>{
  const value=link.dataset.projectType||'';
  if(projectTypeSelect&&value){
    const option=[...projectTypeSelect.options].find(o=>o.textContent.trim()===value);
    if(option)projectTypeSelect.value=option.value;
  }
}));

const trust=document.createElement('section');trust.className='section trust-v2';trust.innerHTML=`<div class="container"><div class="section-head"><div><span class="kicker">WORKING STANDARD</span><h2>Built with business rules, not random revisions.</h2></div><p>Every project moves through a clear scope, milestone, QC and deployment flow.</p></div><div class="trust-cards"><div class="trust-card"><b>Scope before build</b><p>Requirements and priorities are locked before development starts.</p></div><div class="trust-card"><b>Milestone payment</b><p>Standard structure: 50% DP, 30% development milestone, 20% before handover.</p></div><div class="trust-card"><b>QC before production</b><p>Critical issues block deployment until they are resolved and verified.</p></div><div class="trust-card"><b>30-day bug warranty</b><p>Post-launch bug-fix warranty applies to the approved delivered scope.</p></div></div></div>`;document.getElementById('about')?.parentNode.insertBefore(trust,document.getElementById('about'));

const faq=document.createElement('section');faq.className='section';faq.id='faq';faq.innerHTML=`<div class="container faq-grid"><div><span class="kicker">FAQ</span><h2>Before we start.</h2><p class="work-intro">Common questions before a project enters discovery and quotation.</p></div><div class="faq-list"><details><summary>Can you continue or repair an existing website/app?</summary><p>Yes. Existing products can be audited, repaired, modernized or extended after the current source and scope are reviewed.</p></details><details><summary>Can a project start small first?</summary><p>Yes. We can define an MVP or Phase 1 first, then add automation, AI, analytics or scaling features later.</p></details><details><summary>Are hosting, domain and third-party fees included?</summary><p>Only when stated in the quotation. Provider costs, API usage, payment gateway and similar third-party fees are normally quoted separately.</p></details><details><summary>What happens if features change after scope approval?</summary><p>New features become a documented Change Request with separate impact on price and timeline.</p></details><details><summary>Do you provide maintenance after launch?</summary><p>Yes. Monthly maintenance, hosting management, monitoring and feature upgrades can continue after handover.</p></details></div></div>`;document.getElementById('start')?.parentNode.insertBefore(faq,document.getElementById('start'));

const floating=document.createElement('button');floating.className='floating-contact';floating.textContent='Start a Project';floating.addEventListener('click',()=>{document.getElementById('start')?.scrollIntoView({behavior:'smooth'});track('cta_click','floating')});document.body.appendChild(floating);

const menuBtn=document.getElementById('menuBtn');menuBtn?.addEventListener('click',()=>navMenu.classList.toggle('open'));navMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navMenu.classList.remove('open');if(a.getAttribute('href')==='#start')track('cta_click','nav')}));

aSyncMeta();
function aSyncMeta(){const canonical='https://am-digital-lab.ardarawk.workers.dev/';if(!document.querySelector('link[rel="canonical"]')){const l=document.createElement('link');l.rel='canonical';l.href=canonical;document.head.appendChild(l)}const metas=[['property','og:title','NADMO STUDIO — Website, Apps, Business Systems & AI'],['property','og:description','We build digital products for modern businesses.'],['property','og:type','website'],['property','og:url',canonical],['name','twitter:card','summary'],['name','robots','index,follow,max-image-preview:large']];for(const [attr,key,val] of metas){if(!document.querySelector(`meta[${attr}="${key}"]`)){const m=document.createElement('meta');m.setAttribute(attr,key);m.content=val;document.head.appendChild(m)}}const icon=document.createElement('link');icon.rel='icon';icon.href='/logo.svg';icon.type='image/svg+xml';document.head.appendChild(icon)}

async function track(event,label=''){try{navigator.sendBeacon?.('/api/event',new Blob([JSON.stringify({event,label,path:location.pathname})],{type:'application/json'}))||fetch('/api/event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,label,path:location.pathname}),keepalive:true})}catch{}}

document.querySelectorAll('a.btn,a.nav-cta').forEach(a=>a.addEventListener('click',()=>track('cta_click',a.textContent.trim())));

const form=document.getElementById('projectForm'),statusEl=document.getElementById('formStatus'),submitBtn=document.getElementById('submitBtn');
form?.addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());if(!data.name||(!data.email&&!data.phone)){statusEl.textContent='Please enter your name and at least an email or WhatsApp number.';statusEl.className='error';return}submitBtn.disabled=true;submitBtn.textContent='Sending...';statusEl.textContent='Sending your project inquiry to NADMO STUDIO...';statusEl.className='';try{const res=await fetch('/api/start-project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.error||'Unable to send inquiry.');form.reset();statusEl.textContent=`Inquiry received · ${body.code||'AMDL'}. We can now review it from our internal project pipeline.`;statusEl.className='success';track('lead_submit',body.code||'success')}catch(err){statusEl.textContent=err.message||'Something went wrong. Please try again.';statusEl.className='error'}finally{submitBtn.disabled=false;submitBtn.textContent='Send Project Inquiry'}});

const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('in-view')})},{threshold:.08});document.querySelectorAll('.service-card,.solution-grid article,.price-card,.process-grid div,.trust-card,.ecosystem-card').forEach(el=>observer.observe(el));
