const SITE_VERSION='1.0.2';
const jsonHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:jsonHeaders});}
function primaryDB(env){return env.CRM_DB.getByName('amdl-primary');}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/healthz'){
      try{
        const database=await primaryDB(env).health();
        return json({ok:Boolean(database),service:'am-digital-lab-public',version:SITE_VERSION,crm_database:Boolean(database)});
      }catch(err){
        console.error('CRM database health failed',err);
        return json({ok:false,service:'am-digital-lab-public',version:SITE_VERSION,crm_database:false},503);
      }
    }

    if(url.pathname==='/api/start-project'&&request.method==='POST'){
      try{
        const raw=await request.text();
        if(raw.length>16000)return json({error:'Request too large.'},413);
        let d={};try{d=JSON.parse(raw||'{}')}catch{return json({error:'Invalid request.'},400)}
        if(d.website)return json({ok:true},201);
        const name=String(d.name||'').trim().slice(0,120),email=String(d.email||'').trim().slice(0,180),phone=String(d.phone||'').trim().slice(0,80);
        if(!name||(!email&&!phone))return json({error:'Name and at least email or WhatsApp are required.'},400);
        const DB=primaryDB(env),tempCode=`WEB-${crypto.randomUUID()}`;
        const company=String(d.company||'').trim().slice(0,160),projectType=String(d.project_type||'Website').trim().slice(0,120),description=String(d.project_description||'').trim().slice(0,3000),budget=String(d.budget_range||'').trim().slice(0,80),target=String(d.target_launch||'').trim().slice(0,80);
        const notes=['Public website inquiry',company?`Company: ${company}`:'',target?`Target: ${target}`:''].filter(Boolean).join(' · ');
        const result=await DB.run(`INSERT INTO leads (code,name,company,phone,email,source,project_type,project_description,budget_range,target_launch,status,potential_value,assigned_to,last_contact,next_followup,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[tempCode,name,company,phone,email,'Public Website',projectType,description,budget,target,'NEW',0,'','','',notes]);
        const id=Number(result?.meta?.last_row_id||0);if(!id)throw new Error('Lead insert did not return an id');
        const code=`AMD-L-${new Date().getFullYear()}-${String(id).padStart(3,'0')}`;
        await DB.run('UPDATE leads SET code=? WHERE id=?',[code,id]);
        await DB.run('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)',[null,`Public website lead ${code}`,'lead',id]);
        return json({ok:true,id,code},201);
      }catch(err){
        console.error('Project inquiry database write failed',err);
        return json({error:'Project inquiry service is temporarily unavailable.'},502);
      }
    }

    if(url.pathname.startsWith('/api/'))return json({error:'Not found.'},404);
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','strict-origin-when-cross-origin');
    headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
