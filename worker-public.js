const SITE_VERSION='1.0.0';
const jsonHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:jsonHeaders});}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/healthz')return json({ok:true,service:'am-digital-lab-public',version:SITE_VERSION,crm:Boolean(env.CRM_LEAD_ENDPOINT)});

    if(url.pathname==='/api/start-project'&&request.method==='POST'){
      try{
        const body=await request.text();
        if(body.length>16000)return json({error:'Request too large.'},413);
        const upstream=await fetch(env.CRM_LEAD_ENDPOINT,{
          method:'POST',
          headers:{'content-type':'application/json','Origin':'https://am-digital-lab.ardarawk.workers.dev','X-AMDL-Source':'public-site'},
          body
        });
        const text=await upstream.text();
        return new Response(text,{status:upstream.status,headers:jsonHeaders});
      }catch(err){
        console.error('Project inquiry proxy failed',err);
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
