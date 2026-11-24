const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const cache=new Map(),order=[];
const cacheApi={get:k=>cache.get(k)||null,getAll:keys=>Object.fromEntries(keys.filter(k=>cache.has(k)).map(k=>[k,cache.get(k)])),put(k,v,ttl){assert.equal(ttl,120);assert.ok(Buffer.byteLength(v,'utf8')<=100000);cache.set(k,v);order.push(k);},putAll(values,ttl){for(const [k,v] of Object.entries(values))this.put(k,v,ttl);}};
const ctx=vm.createContext({console,Utilities:{newBlob(value){const b=Buffer.isBuffer(value)?value:Buffer.from(value);return {getBytes:()=>b,getDataAsString:()=>b.toString('utf8')};},base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s,'base64')},CacheService:{getScriptCache:()=>cacheApi},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput(text){return {text,setMimeType(){return this;}};}}});
vm.runInContext(fs.readFileSync(__dirname+'/../apps-script/Stock42SanteClone.gs','utf8'),ctx);
const plain=v=>JSON.parse(JSON.stringify(v));
function roundTrip(data,id){ctx.input=data;ctx.id=id;const ack=JSON.parse(vm.runInContext('scReceipt_(id,input)',ctx).text);assert.equal(ack.ok,true);const callback='stock42SanteCloneRead_'+id;ctx.event={parameter:{action:'receipt',requestId:id,callback}};const js=vm.runInContext('doGet(event)',ctx).text;assert.ok(js.startsWith(callback+'('));const result=JSON.parse(js.slice(callback.length+1,-2));assert.deepEqual(result,data);return result;}
const small={ok:true,lot:'L0050',duplicate:true};roundTrip(small,'a'.repeat(32));assert.deepEqual(JSON.parse(cache.get('sc_receipt_'+'a'.repeat(32))),small);
const large={ok:true,version:3,lots:Array.from({length:500},(_,i)=>({lot:'L'+String(i+1).padStart(4,'0'),produit:'Pansement stérile éèà — 🩹'.repeat(8),quantite:3,allocations:[{id:'L'+String(i+1).padStart(4,'0'),quantite:2,containerId:'42-SANTE-05'},{id:'P'+String(i).padStart(32,'0'),quantite:1,containerId:'38-SANTE-05'}]})),movements:[]};
assert.ok(JSON.stringify(large).length>80000);roundTrip(large,'b'.repeat(32));
const key='sc_receipt_'+'b'.repeat(32),manifest=JSON.parse(cache.get(key));assert.ok(manifest.receiptChunks>1);assert.equal(order.at(-1),key);
const missing=cache.get(key+'_1');cache.delete(key+'_1');assert.deepEqual(plain(vm.runInContext('scReadReceipt_("'+ 'b'.repeat(32)+'")',ctx)),{ok:false,pending:true});cache.set(key+'_1',missing.slice(0,-1));assert.deepEqual(plain(vm.runInContext('scReadReceipt_("'+ 'b'.repeat(32)+'")',ctx)),{ok:false,pending:true});
assert.deepEqual(plain(vm.runInContext('scReadReceipt_("'+ 'c'.repeat(32)+'")',ctx)),{ok:false,pending:true});
assert.equal(JSON.parse(vm.runInContext('doGet({parameter:{action:"receipt",requestId:"bad",callback:"alert"}})',ctx).text).error,'invalid_request');
console.log('PASS: large snapshots round-trip with Unicode and allocations intact; cache byte limits, legacy receipts, manifest ordering, missing/truncated chunks and invalid requests.');
