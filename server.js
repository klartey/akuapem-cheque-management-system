const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const storePath = path.join(root, 'data', 'records.json');
const roles = {
  'System Admin': { global: true, approvals: true },
  'Head-Office Users': { global: true, approvals: true },
  'Branch Manager': { global: false, approvals: true },
  'Branch Operations': { global: false, approvals: false },
  'Customer Service': { global: false, approvals: false }
};
const seed = {
  requests: [['CBR-2026-0841','AC-00129482','Ama Ofori','Nsawam Branch','50 leaves','Pending Authorization','24 Jul, 09:42'],['CBR-2026-0838','AC-00773819','Kwaku Mensah','Koforidua Branch','100 leaves','Authorized','23 Jul, 15:15'],['CBR-2026-0836','AC-00359510','Akosua Frimpong','Aburi Branch','50 leaves','Issued','23 Jul, 11:30'],['CBR-2026-0833','AC-00902811','Bright Logistics Ltd','Madina Branch','100 leaves','Rejected','22 Jul, 16:21']],
  inventory: [['INV-NS-001','Nsawam Branch','ACB Standard','000120001 – 000120500','500','428','Active'],['INV-KF-002','Koforidua Branch','ACB Corporate','000125001 – 000125300','300','112','Active'],['INV-AB-001','Aburi Branch','ACB Standard','000130001 – 000130200','200','0','Archived'],['INV-MD-003','Madina Branch','ACB Standard','000150001 – 000150600','600','390','Active']],
  issuance: [['ISS-02631','CBR-2026-0836','Akosua Frimpong','Aburi Branch','000130042 – 000130091','Issued','23 Jul, 14:10'],['ISS-02629','CBR-2026-0828','Yaw Boateng','Nsawam Branch','000120118 – 000120167','Collected','22 Jul, 10:05'],['ISS-02628','CBR-2026-0826','Abena Nyarko','Koforidua Branch','000125044 – 000125093','Awaiting Collection','21 Jul, 16:22']],
  verifications: [['VFY-19044','000120151','AC-00129482','Ama Ofori','Nsawam Branch','₵8,450.00','Active'],['VFY-19041','000125069','AC-00773819','Kwaku Mensah','Koforidua Branch','₵15,200.00','Stopped'],['VFY-19036','000150288','AC-00902811','Bright Logistics Ltd','Madina Branch','₵4,765.00','Returned']],
  stops: [['STP-0104','000125069','Kwaku Mensah','Koforidua Branch','Lost cheque','Stopped','24 Jul, 08:55'],['CAN-0089','000120094','Nana Addo','Nsawam Branch','Customer request','Pending Authorization','23 Jul, 14:40']],
  returns: [['RET-0058','000150288','Bright Logistics Ltd','Madina Branch','Insufficient funds','₵4,765.00','Returned'],['RET-0057','000130099','Gifty Asante','Aburi Branch','Signature differs','₵2,100.00','Returned']],
  approvals: [['APR-0445','Cheque book request','CBR-2026-0841','Ama Ofori','Nsawam Branch','Customer Service','24 Jul, 09:42'],['APR-0444','Cheque cancellation','CAN-0089','Nana Addo','Nsawam Branch','Branch Operations','23 Jul, 14:40'],['APR-0441','Range registration','INV-MD-003','Madina Branch','Madina Branch','Branch Operations','23 Jul, 09:10']],
  audit: [['24 Jul, 09:42','Cheque book request created','CBR-2026-0841','Esi Nkrumah','Customer Service','Nsawam Branch','Initial request submitted'],['24 Jul, 08:55','Stop cheque authorised','STP-0104','Kojo Asare','Branch Manager','Koforidua Branch','Lost cheque confirmed'],['23 Jul, 15:15','Cheque book request authorised','CBR-2026-0838','Adwoa Owusu','Branch Manager','Koforidua Branch','Approved for issuance'],['23 Jul, 14:10','Cheque book issued','ISS-02631','Yaw Sarpong','Branch Operations','Aburi Branch','Identity verified']]
};
function load(){fs.mkdirSync(path.dirname(storePath),{recursive:true});if(!fs.existsSync(storePath))fs.writeFileSync(storePath,JSON.stringify(seed,null,2));return JSON.parse(fs.readFileSync(storePath,'utf8'))}
function save(data){fs.writeFileSync(storePath,JSON.stringify(data,null,2))}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
function collect(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch{reject()}})})}
function now(){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date())}
function allowed(role,branch,itemBranch){return roles[role]?.global||branch===itemBranch}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,{data:load()});
  if(req.method==='POST'&&url.pathname==='/api/transactions'){try{const body=await collect(req);const data=load();const module=body.module;const types={request:['requests','Cheque book request'],inventory:['inventory','Range registration'],issuance:['issuance','Cheque book issuance'],stop:['stops','Stop-cheque instruction'],returns:['returns','Returned cheque record']};if(!types[module]||!roles[body.role])return send(res,400,{error:'Invalid transaction'});const [bucket,label]=types[module];const ref=`${module.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}`;const entry=[ref,'AC-00129482','Demo customer',body.branch,'Captured in application','Pending Authorization',now()];data[bucket].unshift(entry);data.approvals.unshift([`APR-${Date.now().toString().slice(-5)}`,label,ref,'Demo customer',body.branch,body.role,now()]);data.audit.unshift([now(),`${label} submitted`,ref,body.role,body.role,body.branch,'Submitted for maker-checker approval']);save(data);return send(res,201,{data})}catch{return send(res,400,{error:'Invalid request'})}}
  if(req.method==='POST'&&url.pathname==='/api/authorizations/approve'){try{const body=await collect(req);if(!roles[body.role]?.approvals)return send(res,403,{error:'Approval permission required'});const data=load();const item=data.approvals[0];if(!item)return send(res,404,{error:'Nothing awaiting approval'});if(!allowed(body.role,body.branch,item[4]))return send(res,403,{error:'Outside branch scope'});data.approvals.shift();data.audit.unshift([now(),'Transaction authorised',item[2],body.role,body.role,item[4],'Authorised through maker-checker workflow']);save(data);return send(res,200,{data})}catch{return send(res,400,{error:'Invalid request'})}}
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);const safe=path.normalize(path.join(root,file));if(!safe.startsWith(root)||!fs.existsSync(safe)||fs.statSync(safe).isDirectory()){res.writeHead(404);return res.end('Not found')}const type={'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(safe)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});fs.createReadStream(safe).pipe(res)});
const port=process.env.PORT||3000;server.listen(port,()=>console.log(`Cheque Management System running on http://localhost:${port}`));
