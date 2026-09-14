const SITE_VERSION='2.0.0';
const jsonHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:jsonHeaders});}
function primaryDB(env){return env.CRM_DB.getByName('amdl-primary');}

function discordWebhookUrl(env){
  const raw=String(env.DISCORD_WEBHOOK_URL||'').trim();
  if(!raw)return '';
  try{
    const url=new URL(raw);
    const hosts=new Set(['discord.com','ptb.discord.com','canary.discord.com']);
    if(url.protocol!=='https:'||!hosts.has(url.hostname.toLowerCase()))return '';
    if(!/^\/api(?:\/v[0-9]+)?\/webhooks\/[0-9]+\/[^/]+$/.test(url.pathname))return '';
    url.search='';
    url.hash='';
    return url.toString();
  }catch{return '';}
}
function discordConfigured(env){return Boolean(discordWebhookUrl(env));}
function cleanDiscordText(value,fallback='-'){return String(value||fallback).trim().slice(0,1000)||fallback;}
async function sendDiscordLeadNotification(env,lead){
  const webhook=discordWebhookUrl(env);
  if(!webhook)return {ok:false,skipped:true,reason:'not_configured'};
  const contact=cleanDiscordText(lead.phone||lead.email);
  const response=await fetch(webhook,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      username:'NADMO STUDIO Leads',
      allowed_mentions:{parse:[]},
      embeds:[{
        title:'New Project Lead',
        url:'https://am-digital-lab-crm.ardarawk.workers.dev',
        color:5088255,
        fields:[
          {name:'Lead',value:cleanDiscordText(lead.code),inline:true},
          {name:'Name',value:cleanDiscordText(lead.name),inline:true},
          {name:'Project',value:cleanDiscordText(lead.projectType),inline:false},
          {name:'Budget',value:cleanDiscordText(lead.budget,'Belum ditentukan'),inline:true},
          {name:'Contact',value:contact,inline:true},
          {name:'Company',value:cleanDiscordText(lead.company),inline:false}
        ],
        footer:{text:'NADMO STUDIO CRM · Open CRM for full details'},
        timestamp:new Date().toISOString()
      }]
    })
  });
  const body=await response.text();
  if(!response.ok)throw new Error(`Discord webhook ${response.status}: ${body.slice(0,260)}`);
  return {ok:true,mode:'discord_webhook'};
}

function whatsappAccessToken(env){return String(env.WHATSAPP_ACCESS_TOKEN||env.WHATSAPP_TOKEN||'').trim();}
function whatsappConfigured(env){
  return Boolean(whatsappAccessToken(env)&&env.WHATSAPP_PHONE_NUMBER_ID&&env.WHATSAPP_NOTIFY_TO);
}
function whatsappConfig(env){
  const version=String(env.WHATSAPP_API_VERSION||'v23.0').replace(/[^a-zA-Z0-9.]/g,'');
  const phoneId=String(env.WHATSAPP_PHONE_NUMBER_ID||'').replace(/[^0-9]/g,'');
  const to=String(env.WHATSAPP_NOTIFY_TO||'').replace(/[^0-9]/g,'');
  const token=whatsappAccessToken(env);
  return {version,phoneId,to,token};
}
async function postWhatsApp(env,payload){
  const {version,phoneId,token}=whatsappConfig(env);
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:'POST',
    headers:{'authorization':`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify(payload)
  });
  const body=await response.text();
  return {ok:response.ok,status:response.status,body};
}
async function sendWhatsAppLeadNotification(env,lead){
  if(!whatsappConfigured(env))return {ok:false,skipped:true,reason:'not_configured'};
  const {version,phoneId,to}=whatsappConfig(env);
  if(!version||!phoneId||!to)return {ok:false,skipped:true,reason:'invalid_config'};

  const contact=String(lead.phone||lead.email||'-').trim()||'-';
  const text=[
    'NADMO STUDIO — NEW LEAD',
    `Lead: ${lead.code||'-'}`,
    `Nama: ${lead.name||'-'}`,
    `Project: ${lead.projectType||'-'}`,
    `Budget: ${lead.budget||'Belum ditentukan'}`,
    `Kontak: ${contact}`,
    '',
    'Cek CRM untuk detail lengkap.'
  ].join('\n').slice(0,4000);

  const textResult=await postWhatsApp(env,{
    messaging_product:'whatsapp',
    recipient_type:'individual',
    to,
    type:'text',
    text:{preview_url:false,body:text}
  });
  if(textResult.ok)return {ok:true,mode:'text'};

  const templateName=String(env.WHATSAPP_TEMPLATE_NAME||'hello_world').trim();
  const templateLang=String(env.WHATSAPP_TEMPLATE_LANG||'en_US').trim();
  const template={name:templateName,language:{code:templateLang}};
  if(env.WHATSAPP_TEMPLATE_NAME){
    template.components=[{type:'body',parameters:[
      {type:'text',text:String(lead.code||'-').slice(0,120)},
      {type:'text',text:String(lead.name||'-').slice(0,120)},
      {type:'text',text:String(lead.projectType||'-').slice(0,120)},
      {type:'text',text:String(lead.budget||'Belum ditentukan').slice(0,120)},
      {type:'text',text:contact.slice(0,180)}
    ]}];
  }
  const templateResult=await postWhatsApp(env,{
    messaging_product:'whatsapp',
    to,
    type:'template',
    template
  });
  if(templateResult.ok)return {ok:true,mode:env.WHATSAPP_TEMPLATE_NAME?'custom_template':'hello_world_fallback'};

  throw new Error(`WhatsApp text ${textResult.status}: ${textResult.body.slice(0,260)} | template ${templateResult.status}: ${templateResult.body.slice(0,260)}`);
}

async function sendLeadNotification(env,lead){
  let discordError=null;
  if(discordConfigured(env)){
    try{return await sendDiscordLeadNotification(env,lead);}
    catch(err){discordError=err;console.error('Discord lead notification failed',err);}
  }
  if(whatsappConfigured(env)){
    try{
      const result=await sendWhatsAppLeadNotification(env,lead);
      if(result.ok)return {ok:true,mode:`whatsapp_${result.mode}`,fallbackFrom:discordError?'discord':null};
      return result;
    }catch(err){
      if(discordError)throw new Error(`Discord: ${discordError.message} | WhatsApp: ${err.message}`);
      throw err;
    }
  }
  if(discordError)throw discordError;
  return {ok:false,skipped:true,reason:'not_configured'};
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/healthz'){
      try{const database=await primaryDB(env).health();return json({ok:Boolean(database),service:'am-digital-lab-public',version:SITE_VERSION,crm_database:Boolean(database),discord_notification_configured:discordConfigured(env),whatsapp_notification_configured:whatsappConfigured(env),notification_primary:discordConfigured(env)?'discord':whatsappConfigured(env)?'whatsapp':'none'});}catch(err){console.error('CRM database health failed',err);return json({ok:false,service:'am-digital-lab-public',version:SITE_VERSION,crm_database:false,discord_notification_configured:discordConfigured(env),whatsapp_notification_configured:whatsappConfigured(env),notification_primary:discordConfigured(env)?'discord':whatsappConfigured(env)?'whatsapp':'none'},503);}
    }

    if(url.pathname==='/api/event'&&request.method==='POST'){
      try{
        const raw=await request.text();if(raw.length>2000)return json({error:'Request too large.'},413);
        let d={};try{d=JSON.parse(raw||'{}')}catch{return json({error:'Invalid request.'},400)}
        const allowed=new Set(['cta_click','portfolio_filter','lead_submit']);const event=String(d.event||'').slice(0,60);if(!allowed.has(event))return json({error:'Invalid event.'},400);
        const label=String(d.label||'').slice(0,120),path=String(d.path||'/').slice(0,240),DB=primaryDB(env);
        await DB.exec('CREATE TABLE IF NOT EXISTS public_events (id INTEGER PRIMARY KEY AUTOINCREMENT,event TEXT NOT NULL,label TEXT DEFAULT "",path TEXT DEFAULT "/",created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
        await DB.run('INSERT INTO public_events (event,label,path) VALUES (?,?,?)',[event,label,path]);
        return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
      }catch(err){console.error('Public event write failed',err);return new Response(null,{status:204});}
    }

    if(url.pathname==='/api/start-project'&&request.method==='POST'){
      try{
        const raw=await request.text();if(raw.length>16000)return json({error:'Request too large.'},413);
        let d={};try{d=JSON.parse(raw||'{}')}catch{return json({error:'Invalid request.'},400)}
        if(d.website)return json({ok:true},201);
        const name=String(d.name||'').trim().slice(0,120),email=String(d.email||'').trim().slice(0,180),phone=String(d.phone||'').trim().slice(0,80);
        if(!name||(!email&&!phone))return json({error:'Name and at least email or WhatsApp are required.'},400);
        const DB=primaryDB(env),tempCode=`WEB-${crypto.randomUUID()}`;
        const company=String(d.company||'').trim().slice(0,160),projectType=String(d.project_type||'Website').trim().slice(0,120),description=String(d.project_description||'').trim().slice(0,3000),budget=String(d.budget_range||'').trim().slice(0,80),target=String(d.target_launch||'').trim().slice(0,80);
        const notes=['Public website inquiry',company?`Company: ${company}`:'',target?`Target: ${target}`:''].filter(Boolean).join(' · ');
        const result=await DB.run(`INSERT INTO leads (code,name,company,phone,email,source,project_type,project_description,budget_range,target_launch,status,potential_value,assigned_to,last_contact,next_followup,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[tempCode,name,company,phone,email,'Public Website',projectType,description,budget,target,'NEW',0,'','','',notes]);
        const id=Number(result?.meta?.last_row_id||0);if(!id)throw new Error('Lead insert did not return an id');
        const code=`NAD-L-${new Date().getFullYear()}-${String(id).padStart(3,'0')}`;
        await DB.run('UPDATE leads SET code=? WHERE id=?',[code,id]);
        await DB.run('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)',[null,`Public website lead ${code}`,'lead',id]);
        const notification=sendLeadNotification(env,{code,name,company,projectType,budget,target,phone,email}).then(async result=>{
          if(result.ok)await DB.run('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)',[null,`Lead notification sent (${result.mode}) for ${code}`,'lead',id]);
          else if(result.skipped)await DB.run('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)',[null,`Lead notification skipped (${result.reason}) for ${code}`,'lead',id]);
        }).catch(async err=>{
          console.error('Lead notification failed',err);
          try{await DB.run('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)',[null,`Lead notification failed for ${code}`,'lead',id]);}catch{}
        });
        if(ctx?.waitUntil)ctx.waitUntil(notification);else await notification;
        return json({ok:true,id,code},201);
      }catch(err){console.error('Project inquiry database write failed',err);return json({error:'Project inquiry service is temporarily unavailable.'},502);}
    }

    if(url.pathname.startsWith('/api/'))return json({error:'Not found.'},404);
    const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');headers.set('X-Frame-Options','DENY');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
