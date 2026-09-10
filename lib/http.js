const crypto = require('crypto');
const {db}=require('./db');

function json(res,status,data){const out=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(out)});res.end(out)}
async function body(req){return await new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2_000_000)req.destroy()});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function cookies(req){const raw=req.headers.cookie||'';return Object.fromEntries(raw.split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return[v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))}
function user(req){const token=cookies(req).amdl_session;if(!token)return null;const row=db.prepare(`SELECT users.id,users.name,users.email,users.role,sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?`).get(token);return !row||new Date(row.expires_at)<new Date()?null:row}
function auth(req,res){const u=user(req);if(!u){json(res,401,{error:'Unauthorized'});return null}return u}
function match(path,pattern){const a=path.split('/').filter(Boolean),b=pattern.split('/').filter(Boolean);if(a.length!==b.length)return null;const p={};for(let i=0;i<b.length;i++){if(b[i].startsWith(':'))p[b[i].slice(1)]=a[i];else if(a[i]!==b[i])return null}return p}
function token(){return crypto.randomBytes(32).toString('hex')}
module.exports={json,body,cookies,user,auth,match,token};
