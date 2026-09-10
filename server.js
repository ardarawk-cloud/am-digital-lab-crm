const http=require('http');
const fs=require('fs');
const path=require('path');
const {db,verifyPassword}=require('./lib/db');
const {json,body,cookies,user:currentUser,token}=require('./lib/http');
const dashboard=require('./lib/routes-dashboard');
const sales=require('./lib/routes-sales');
const projects=require('./lib/routes-projects');
const commercial=require('./lib/routes-commercial');
const operations=require('./lib/routes-operations');

const PORT=Number(process.env.PORT||8787);
const PUBLIC=path.join(__dirname,'public');
const VERSION='0.2.1';
const isProduction=process.env.NODE_ENV==='production';

function secureCookie(req){
  const proto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
  return isProduction||proto==='https'?'; Secure':'';
}

async function api(req,res,url){
  if(req.method==='POST'&&url.pathname==='/api/login'){
    const d=await body(req);const user=db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(d.email||'');
    if(!user||!verifyPassword(d.password||'',user.password_hash))return json(res,401,{error:'Email atau password salah.'});
    const sessionToken=token();const expires=new Date(Date.now()+7*24*3600*1000).toISOString();
    db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(sessionToken,user.id,expires);
    res.writeHead(200,{'Set-Cookie':`amdl_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7*24*3600}${secureCookie(req)}`,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});
    return res.end(JSON.stringify({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role},version:VERSION}));
  }
  if(req.method==='POST'&&url.pathname==='/api/logout'){
    const sessionToken=cookies(req).amdl_session;if(sessionToken)db.prepare('DELETE FROM sessions WHERE token=?').run(sessionToken);
    res.writeHead(200,{'Set-Cookie':`amdl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookie(req)}`,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true}));
  }
  const user=currentUser(req);
  if(!user)return json(res,401,{error:'Unauthorized'});
  if(req.method==='GET'&&url.pathname==='/api/me')return json(res,200,{user,version:VERSION});
  for(const handler of [dashboard,sales,projects,commercial,operations]){
    const result=await handler(req,res,url,user);if(result!==false)return;
  }
  return json(res,404,{error:'API route not found'});
}

function serveStatic(res,url){
  let rel=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');
  const file=path.normalize(path.join(PUBLIC,rel));if(!file.startsWith(PUBLIC)){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}
    const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='GET'&&url.pathname==='/healthz')return json(res,200,{ok:true,service:'am-digital-lab-crm',version:VERSION});
  if(url.pathname.startsWith('/api/'))return await api(req,res,url);
  return serveStatic(res,url);
}catch(err){console.error(err);if(!res.headersSent)return json(res,500,{error:'Internal server error'});res.end();}});
server.listen(PORT,'0.0.0.0',()=>console.log(`AM DIGITAL LAB CRM v${VERSION} running on port ${PORT}`));
