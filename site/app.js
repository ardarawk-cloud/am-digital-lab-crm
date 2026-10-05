for(const href of ['/upgrade.css','/showcase.css']){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}

const logoHtml='<img src="/logo.svg" alt="NADMO STUDIO">';
document.querySelectorAll('.brand-mark,.mini-logo').forEach(el=>{el.innerHTML=logoHtml});

const navMenu=document.getElementById('navMenu');
const pricingValues=[['Landing Page','Rp2.500.000','starting'],['Business Website','Rp7.500.000','starting'],['Android Starter','Rp9.500.000','starting'],['Custom Web App','Rp15.000.000','starting'],['AI Chatbot','Rp5.000.000','starting'],['Maintenance','Rp750.000','/ month']];
document.querySelectorAll('.price-card').forEach(card=>{const row=pricingValues.find(([n])=>n===card.querySelector('h3')?.textContent.trim());if(row){const s=card.querySelector('strong');if(s)s.innerHTML=`${row[1]}<small> ${row[2]}</small>`}});
const budgetSelect=document.querySelector('select[name="budget_range"]');
if(budgetSelect){const labels={'Under Rp5M':'Under Rp5.000.000','Rp5M–10M':'Rp5.000.000–Rp10.000.000','Rp10M–20M':'Rp10.000.000–Rp20.000.000','Rp20M–50M':'Rp20.000.000–Rp50.000.000','Rp50M+':'Rp50.000.000+'};[...budgetSelect.options].forEach(o=>{if(labels[o.textContent])o.textContent=labels[o.textContent]})}

const projects=[
{type:'web',label:'ENTERPRISE PLATFORM',status:'ACTIVE',name:'ACC OS X',desc:'Enterprise operating system for production workflows, channels, AI-assisted operations, publishing and connected workspaces.',stack:['Cloudflare','AI Workflow','Dashboard'],shot:'acc-os-x'},
{type:'web',label:'BUSINESS SYSTEM',status:'LIVE',name:'NADMO STUDIO CRM',desc:'Cloud-native CRM covering leads, clients, projects, quotations, invoices, tasks, change requests and QC.',stack:['Workers','CRM','Operations'],shot:'amdl-crm'},
{type:'web',label:'HOSPITALITY WEB',status:'DEMO',name:'ZUZU Family House',desc:'Hospitality website and booking-system concept with availability, booking flow, admin dashboard, rates and operational controls.',stack:['Booking','Admin','Hospitality'],shot:'zuzu-family-house'},
{type:'apk',label:'MUSIC TECH',status:'ACTIVE',name:'AM STUDIO Music Distribution',desc:'Mobile product for structured music release and distribution operations.',stack:['Android','Workflow','Music'],shot:'am-studio-music'},
{type:'apk',label:'AI APPLICATION',status:'STABLE TEST',name:'ORACLY',desc:'AI-focused application developed inside the NADMO/ACC product ecosystem with automated Android build and testing.',stack:['AI','Android','Automation'],shot:'oracly',url:'https://oracly.nadmo.id/'},
{type:'apk',label:'AI TOOL',status:'STABLE',name:'AI Mashup',desc:'Experimental AI product combining multiple AI-assisted workflows into one mobile experience.',stack:['AI','Android','Experiment'],shot:'ai-mashup'},
{type:'web',label:'CLIENT WEBSITE',status:'LIVE',name:'Brush by Yuda Christ',desc:'Premium makeup artist and hair stylist website in Bali with portfolio presentation, service discovery and direct booking flow.',stack:['Website','Portfolio','Booking'],shot:'brush-by-yuda',url:'https://brushbyyuda.nadmo.id/'}
];

const workSection=document.createElement('section');
workSection.className='section portfolio-v2';
workSection.id='work';
workSection.innerHTML=`<div class="container">
  <div class="section-head">
    <div><span class="kicker">NADMO PORTFOLIO</span><h2>Selected work built by NADMO STUDIO.</h2></div>
    <p>Real client work, internal products and validated prototypes. Status labels distinguish live products from demos and active builds.</p>
  </div>
  <div class="portfolio-filter">
    <button class="active" data-filter="all">All Projects</button>
    <button data-filter="web">Web / Systems</button>
    <button data-filter="apk">Apps / Products</button>
  </div>
  <div class="showcase-grid">${projects.map(p=>`<article class="showcase-card" data-kind="${p.type}" style="--project-shot:url('/portfolio/${p.shot}.png?v=20261005-work')">
    <div class="showcase-preview"></div>
    <div class="showcase-info">
      <div class="showcase-top"><span class="showcase-type">${p.label}</span><span class="showcase-status">${p.status}</span></div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="showcase-stack">${p.stack.map(s=>`<span>${s}</span>`).join('')}</div>
      ${p.url?`<a class="showcase-live" href="${p.url}" target="_blank" rel="noopener noreferrer">View Live Website ↗</a>`:''}
    </div>
  </article>`).join('')}</div>
</div>`;
const ecosystemSection=document.getElementById('ecosystem');
ecosystemSection?.parentNode.insertBefore(workSection,ecosystemSection);

document.querySelectorAll('.portfolio-filter button').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.portfolio-filter button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const f=btn.dataset.filter;
  document.querySelectorAll('.showcase-card').forEach(card=>{card.hidden=f!=='all'&&card.dataset.kind!==f});
  track('portfolio_filter',f);
}));

const projectTypeSelect=document.querySelector('select[name="project_type"]');
document.querySelectorAll('[data-project-type]').forEach(link=>link.addEventListener('click',()=>{
  const value=link.dataset.projectType||'';
  if(projectTypeSelect&&value){
    const option=[...projectTypeSelect.options].find(o=>o.textContent.trim()===value);
    if(option)projectTypeSelect.value=option.value;
  }
}));

function initBusinessSlider(){
  const slider=document.getElementById('businessSlider');
  if(!slider)return;
  const trackEl=slider.querySelector('.business-slider-track');
  const slides=[...slider.querySelectorAll('.business-slide')];
  const dotsWrap=slider.querySelector('.business-slider-dots');
  const prev=slider.querySelector('.business-slider-btn.prev');
  const next=slider.querySelector('.business-slider-btn.next');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!trackEl||slides.length<2)return;

  let index=0;
  let timer=null;
  let touchStartX=null;
  const interval=4800;

  slides.forEach((slide,i)=>{
    const dot=document.createElement('button');
    dot.type='button';
    dot.className='business-slider-dot'+(i===0?' is-active':'');
    dot.setAttribute('aria-label','Show '+(slide.dataset.brand||('business '+(i+1))));
    dot.addEventListener('click',()=>go(i,true));
    dotsWrap?.appendChild(dot);
  });
  const dots=[...slider.querySelectorAll('.business-slider-dot')];

  function restartProgress(){
    slider.classList.remove('is-playing');
    void slider.offsetWidth;
    if(!reduced)slider.classList.add('is-playing');
  }

  function render(){
    trackEl.style.transform='translateX('+(-index*100)+'%)';
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===index));
    dots.forEach((d,i)=>d.classList.toggle('is-active',i===index));
    restartProgress();
  }

  function stop(){
    if(timer){clearInterval(timer);timer=null}
    slider.classList.remove('is-playing');
  }

  function start(){
    stop();
    if(reduced)return;
    restartProgress();
    timer=setInterval(()=>go(index+1,false),interval);
  }

  function go(nextIndex,userAction){
    index=(nextIndex+slides.length)%slides.length;
    render();
    if(userAction)start();
    track('featured_business_slide',slides[index]?.dataset.brand||'featured-business');
  }

  prev?.addEventListener('click',()=>go(index-1,true));
  next?.addEventListener('click',()=>go(index+1,true));
  slider.addEventListener('mouseenter',stop);
  slider.addEventListener('mouseleave',start);
  slider.addEventListener('focusin',stop);
  slider.addEventListener('focusout',e=>{if(!slider.contains(e.relatedTarget))start()});
  slider.addEventListener('touchstart',e=>{touchStartX=e.touches?.[0]?.clientX??null},{passive:true});
  slider.addEventListener('touchend',e=>{
    if(touchStartX===null)return;
    const endX=e.changedTouches?.[0]?.clientX??touchStartX;
    const delta=endX-touchStartX;
    touchStartX=null;
    if(Math.abs(delta)>45)go(index+(delta<0?1:-1),true);
  },{passive:true});
  slider.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){e.preventDefault();go(index-1,true)}
    if(e.key==='ArrowRight'){e.preventDefault();go(index+1,true)}
  });

  render();
  start();
}

initBusinessSlider();

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

const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('in-view')})},{threshold:.08});document.querySelectorAll('.service-card,.solution-grid article,.price-card,.process-grid div,.trust-card,.business-slide').forEach(el=>observer.observe(el));
