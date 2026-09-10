const menuBtn=document.getElementById('menuBtn');
const navMenu=document.getElementById('navMenu');
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
document.querySelectorAll('.service-card,.solution-grid article,.price-card,.process-grid div').forEach(el=>observer.observe(el));
