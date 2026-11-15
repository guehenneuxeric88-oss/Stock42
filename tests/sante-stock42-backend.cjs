const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../apps-script/Stock42SanteClone.gs','utf8');
let rows={},writes=0,cache=new Map(),opened=[];
const token='test-only-key-'.padEnd(64,'x');
const ss={getSheetByName(name){return {getLastRow(){return name==='Réception & lots'||name==='Mouvements'?4+(rows[name]||[]).length:1+(rows[name]||[]).length},getRange(r,c,n,w){return {getDisplayValue(){if(name==='Configuration'&&(r===2||r==='B2'))return token;if(name==='Configuration'&&(r===3||r==='B3'))return '1pac-pS7IW66NgaewGJpGz--1CypMeE2pS1C23qtSMhs';return ''},getDisplayValues(){return rows[name]||[]},setValues(){writes++;throw Error('Unexpected write')}}}}}};
const ctx=vm.createContext({LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}};}},SpreadsheetApp:{openById(id){opened.push(id);return ss}},CacheService:{getScriptCache(){return {get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)}}},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput(s){return {text:s,setMimeType(){return this}}}},console,Date,Set,JSON});
vm.runInContext(code,ctx);
const run=expr=>vm.runInContext(expr,ctx);
const json=v=>JSON.parse(v.text);
assert.deepEqual(json(run("doGet({parameter:{action:'lots'}})")),{ok:true,service:'Stock42SanteClone',readOnly:false,version:2,authentication:'api-key'});
run('setupSanteClone()');
const post=(requestId,key,action)=>json(run('doPost('+JSON.stringify({postData:{contents:JSON.stringify({requestId,token:key,action})}})+')'));
post('a'.repeat(32),'incorrect','snapshot');assert.equal(JSON.parse(cache.get('sc_receipt_'+'a'.repeat(32))).error,'unauthorized');
post('b'.repeat(32),token,'snapshot');let snapshot=JSON.parse(cache.get('sc_receipt_'+'b'.repeat(32)));
assert.equal(snapshot.lots.length,0);assert.equal(snapshot.products.length,0);assert.equal(snapshot.nextLot,'L0001');
rows={'Réception & lots':[['L0001','15/11/2026','Gants fictifs','Protection / EPI','500','gant','31/03/2031','Péremption','','','Site 42','42-R3-N2-A','Rangé','Boîte de 100','test','Non','','']],Mouvements:[['15/11/2026','L0001','Gants fictifs','Sortie consommation','100','gant','','','','','test','15/11/2026','-100']]};
post('c'.repeat(32),token,'snapshot');snapshot=JSON.parse(cache.get('sc_receipt_'+'c'.repeat(32)));
assert.equal(snapshot.lots[0].quantite,400);assert.equal(snapshot.lots[0].quantiteRecue,500);assert.equal(snapshot.movements[0].serverRecorded,true);

assert.equal(writes,0);assert.ok(opened.every(id=>id==='1pac-pS7IW66NgaewGJpGz--1CypMeE2pS1C23qtSMhs'));
assert.equal(json(run("doGet({parameter:{action:'receipt',requestId:'bad',callback:'alert'}})")).error,'invalid_request');
assert.ok(!code.includes(token));console.log('PASS: fichier vierge, clé requise, statut public sans stock, mouvements comptés une fois, aucune écriture.');

