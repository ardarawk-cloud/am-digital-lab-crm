const products=[...document.querySelectorAll('.checkout-product')];
const selectedService=document.getElementById('selectedService');
const selectedPrice=document.getElementById('selectedPrice');
const summaryService=document.getElementById('summaryService');
const summaryName=document.getElementById('summaryName');
const summaryPrice=document.getElementById('summaryPrice');

function selectProduct(service,price,source){
  products.forEach(p=>p.classList.toggle('selected',p===source||p.dataset.service===service));
  selectedService.value=service||'';
  selectedPrice.value=price||'';
  summaryService.textContent=service||'Choose a service';
  summaryName.textContent=service||'—';
  summaryPrice.textContent=price||'—';
  if(service) document.getElementById('order')?.scrollIntoView({behavior:'smooth',block:'start'});
}

products.forEach(p=>p.addEventListener('click',()=>selectProduct(p.dataset.service,p.dataset.price,p)));

const params=new URLSearchParams(location.search);
const requested=params.get('service');
if(requested){
  const hit=products.find(p=>p.dataset.service.toLowerCase()===requested.toLowerCase());
  if(hit) selectProduct(hit.dataset.service,hit.dataset.price,hit);
}

const form=document.getElementById('checkoutForm');
const statusEl=document.getElementById('checkoutStatus');
const submitBtn=document.getElementById('checkoutSubmit');

form?.addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(form);
  const service=String(fd.get('selected_service')||'').trim();
  const price=String(fd.get('selected_price')||'').trim();
  const name=String(fd.get('name')||'').trim();
  const phone=String(fd.get('phone')||'').trim();
  if(!service){statusEl.textContent='Please choose a service first.';statusEl.className='error';return}
  if(!name||!phone){statusEl.textContent='Name and WhatsApp are required.';statusEl.className='error';return}

  const notes=String(fd.get('notes')||'').trim();
  const desc=['Checkout / order request','Service: '+service,'Listed price: '+price,notes?'Notes: '+notes:''].filter(Boolean).join('\n');
  const data={
    name:name,
    company:String(fd.get('company')||'').trim(),
    email:String(fd.get('email')||'').trim(),
    phone:phone,
    project_type:service,
    budget_range:price,
    target_launch:'',
    project_description:desc
  };

  submitBtn.disabled=true;
  submitBtn.textContent='Submitting...';
  statusEl.textContent='Sending order request to NADMO STUDIO...';
  statusEl.className='';
  try{
    const res=await fetch('/api/start-project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
    const body=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.error||'Unable to submit order request.');
    statusEl.textContent='Order request received · '+(body.code||'NADMO')+'. We will review the scope and contact you with confirmation.';
    statusEl.className='success';
    form.reset();
    selectedService.value=service;
    selectedPrice.value=price;
  }catch(err){
    statusEl.textContent=err.message||'Something went wrong. Please try again.';
    statusEl.className='error';
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent='Submit Order Request';
  }
});