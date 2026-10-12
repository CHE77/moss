/** Read-only verification of the CFN 0.6.0 lab records; never creates events. */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { decode } = createRequire(import.meta.url)('@msgpack/msgpack');

const marker = 'commonground-cfn-2026-10-12';
const origin = 'applet://uhc$e$kv$ww$dvlng_uk$a$p4e$u$gb$jpnaen$t$c$x$zn3o$3n$_iv$s$p$kv$s$8a$3ag$r5/';
const query = `query {
  agents(last:1000){edges{node{id name}}}
  economicResources(last:1000){edges{node{
    id name note trackingIdentifier primaryAccountable{id name} conformsTo{id name} stage{id name}
    accountingQuantity{hasNumericalValue} onhandQuantity{hasNumericalValue}
  }}}
  economicEvents(last:1000){edges{node{
    id note action{id} provider{id} receiver{id} resourceQuantity{hasNumericalValue}
    resourceInventoriedAs{id} toResourceInventoriedAs{id}
    inputOf{id} outputOf{id} fulfills{id}
  }}}
  plans(last:1000){edges{node{
    id name note processes{id name committedInputs{id action{id} resourceQuantity{hasNumericalValue} fulfilledBy{id}}
      committedOutputs{id action{id} resourceQuantity{hasNumericalValue} fulfilledBy{id}}}
  }}}
}`;
const b64 = bytes => 'u' + Buffer.from(bytes instanceof Uint8Array ? bytes : Object.values(bytes)).toString('base64url');
const canonical = value => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])]));
  return value;
}
async function peer(port) {
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`, {signal:AbortSignal.timeout(5000)}).then(r => r.json());
  const target = targets.find(t => t.type === 'iframe' && t.url.startsWith(origin));
  if (!target) throw Error(`Open CFN in CommonGround Lab on CDP ${port}`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {
    const timer=setTimeout(() => { ws.close(); reject(Error('CDP connection timeout')); },5000);
    ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=()=>{clearTimeout(timer);reject(Error('CDP connection failed'))};
  });
  try {
    const response = await new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(Error(`Read timed out on ${port}`)),20000);
      ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id!==1)return;clearTimeout(timer);m.error?reject(Error(m.error.message)):resolve(m.result)};
      ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{awaitPromise:true,returnByValue:true,expression:`(async()=>{
        const f=await import('/_app/immutable/chunks/fetch.e065dd31.js');
        let apollo,client;f.aq.subscribe(v=>apollo=v)();f.ar.subscribe(v=>client=v)();
        if(!apollo||!client)throw Error('CFN is still initializing');
        const data=(await apollo.query({query:f.as(${JSON.stringify(query)}),fetchPolicy:'no-cache'})).data;
        const nodes=k=>data[k].edges.map(e=>e.node);
        const resources=nodes('economicResources').filter(r=>(r.note||'').includes(${JSON.stringify(marker)}));
        const raw=[];for(const r of resources){const record=await client.callZome({cap_secret:null,role_name:'hrea',zome_name:'hrea',fn_name:'get_latest_rea_economic_resource',payload:r.id});
          raw.push({requestedId:r.id,entry:Array.from(record.entry.Present.entry),revision:f.e(record.signed_action.hashed.hash)})}
        const actors=nodes('agents').filter(r=>r.name.startsWith('CG CFN '));
        for(const r of actors){const record=await client.callZome({cap_secret:null,role_name:'hrea',zome_name:'hrea',fn_name:'get_latest_rea_agent',payload:r.id});r.author=f.e(record.signed_action.hashed.content.author)}
        const info=await client.appInfo();
        return JSON.stringify({port:${port},observedAt:new Date().toISOString(),agent:f.e(info.agent_pub_key),
          dnas:Object.fromEntries(Object.entries(info.cell_info).map(([role,cells])=>[role,cells.filter(c=>c.type==='provisioned').map(c=>f.e(c.value.cell_id[0]))])),
          actors,resources,raw,events:nodes('economicEvents').filter(r=>(r.note||'').includes(${JSON.stringify(marker)})),plans:nodes('plans').filter(r=>(r.note||'').includes(${JSON.stringify(marker)}))})
      })()`}}));
    });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    const result=JSON.parse(response.result.value);
    result.resources=result.resources.map(r=>{
      const raw=result.raw.find(x=>x.requestedId===r.id);const entry=decode(Uint8Array.from(raw.entry));
      return {...r,raw:{revision:raw.revision,storedId:entry.id?b64(entry.id):null,
        accounting:entry.accounting_quantity?.has_numerical_value,onhand:entry.onhand_quantity?.has_numerical_value,
        primaryAccountable:entry.primary_accountable?b64(entry.primary_accountable):null,stage:entry.stage?b64(entry.stage):null}};
    });
    delete result.raw;return result;
  } finally { ws.close(); }
}
async function main() {
  const args=process.argv.slice(2);let output;
  if(args.length){if(args.length!==2||args[0]!=='--output')throw Error('Usage: node cfn-verify.mjs [--output file.json]');output=args[1]}
  const peers=await Promise.all([peer(9222),peer(9223)]);const checks=[];
  function check(id,pass,expected,actual){checks.push({id,status:pass?'PASS':'FAIL',expected,actual})}
  const [a,b]=peers;
  check('independent-signers',a.agent!==b.agent,true,a.agent!==b.agent);
  check('same-dnas',canonical(a.dnas)===canonical(b.dnas),a.dnas,b.dnas);
  check('actors-created-by-their-peers',a.actors.length===2&&a.actors.every(x=>x.author===(x.name.includes('Farm')?a.agent:b.agent)),true,a.actors);
  const state=p=>({actors:p.actors,resources:p.resources,events:p.events,plans:p.plans});
  check('peer-convergence',canonical(state(a))===canonical(state(b)),true,canonical(state(a))===canonical(state(b)));
  const mainEvents=a.events.filter(e=>e.note.includes('; UI '));
  check('main-event-count',mainEvents.length===5,5,mainEvents.length);
  const consumption=mainEvents.filter(e=>e.action.id==='consume');
  check('consumption-bound-to-lots',consumption.length===2&&consumption.every(e=>e.resourceInventoriedAs?.id),2,consumption.filter(e=>e.resourceInventoriedAs?.id).length);
  const plan=a.plans.find(p=>p.name==='CG CFN Two-stage API plan 2026-10-12');
  const commitments=(plan?.processes||[]).flatMap(p=>[...p.committedInputs,...p.committedOutputs]);
  const linked=commitments.filter(c=>c.fulfilledBy.length===1&&mainEvents.some(e=>e.id===c.fulfilledBy[0].id&&e.fulfills.some(f=>f.id===c.id)&&e.action.id===c.action.id&&e.resourceQuantity.hasNumericalValue===c.resourceQuantity.hasNumericalValue));
  check('event-commitment-links',commitments.length===4&&linked.length===4,4,linked.length);
  const produced=['Prepared fiber','Yarn'].map(material=>a.resources.find(r=>r.name===`CG CFN ${material} 2026-10-12`));
  const stages=produced.map(r=>r?.stage?.name||null);const expectedStages=['CG CFN Prepare 2026-10-12','CG CFN Spin 2026-10-12'];
  check('produced-resource-stages',canonical(stages)===canonical(expectedStages),expectedStages,stages);
  const stock=(material,actor)=>a.resources.filter(r=>!r.trackingIdentifier?.includes('-probe')&&r.conformsTo?.name===`CG CFN ${material} 2026-10-12`&&r.primaryAccountable?.name===`CG CFN ${actor} 2026-10-12`).reduce((sum,r)=>[sum[0]+r.raw.accounting,sum[1]+r.raw.onhand],[0,0]);
  for(const [material,actor,expected]of [['Raw fiber','Farm',20],['Prepared fiber','Farm',0],['Yarn','Farm',0],['Yarn','Workshop',4]]){
    const actual=stock(material,actor);check(`main-stock-${material}-${actor}`,actual.every(q=>q===expected),[expected,expected],actual);
  }
  const probe=suffix=>a.resources.find(r=>r.trackingIdentifier===marker+suffix);
  const source=probe('-probe'),destination=probe('-probe-destination');
  const transfer=a.events.find(e=>e.note.includes('; API probe transfer'));
  check('probe-transfer-has-lot-ids',!!transfer?.resourceInventoriedAs?.id&&!!transfer?.toResourceInventoriedAs?.id,true,!!transfer?.resourceInventoriedAs?.id&&!!transfer?.toResourceInventoriedAs?.id);
  for(const [label,r,expected]of [['source',source,5],['destination',destination,3]]){
    const actual=[r?.raw.accounting,r?.raw.onhand];check('probe-transfer-stock-'+label,actual.every(q=>q===expected),[expected,expected],actual);
  }
  const result={schemaVersion:1,marker,mode:'read-only',bundleSha256:'1647ac52aafa046c9ee11b0c4db2552254a0f4f0f516c4f00720df5e90678c0c',peers,checks};
  if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  const brief=v=>v&&typeof v==='object'&&!Array.isArray(v)||Array.isArray(v)&&v.some(x=>x!==null&&typeof x==='object')?'structured records':JSON.stringify(v);
  for(const c of checks)console.log(`${c.status} ${c.id}: expected=${brief(c.expected)}, actual=${brief(c.actual)}`);
  process.exitCode=checks.every(c=>c.status==='PASS')?0:1;
}
main().catch(e=>{console.error(e.message);process.exitCode=2});
