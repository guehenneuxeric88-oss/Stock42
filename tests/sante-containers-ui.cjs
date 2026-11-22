const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../sante-stock42/index.html','utf8');
const dom=new JSDOM(html,{url:'https://stock42.example/sante-stock42/'}),document=dom.window.document;
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},events=new Map();
const context=vm.createContext({document,window:{addEventListener(n,f){events.set(n,f)},scrollTo(){}},navigator:{onLine:true},localStorage:storage,sessionStorage:storage,console,Date,Intl,URL,Blob,File,crypto:require('crypto').webcrypto,setTimeout(){return 1},clearTimeout(){},setInterval(){},clearInterval(){},confirm:()=>true,alert:()=>{},fetch(){throw Error('No live network')}});
const run=s=>vm.runInContext(s,context),$=id=>document.getElementById(id),change=id=>$(id).dispatchEvent(new dom.window.Event('change'));
const boxes=['42','38'].flatMap(site=>Array.from({length:8},(_,i)=>({id:site+'-SANTE-'+String(i+1).padStart(2,'0'),name:site+' — Boîte '+(i+1),site})));
const make=(lot,other,name,count)=>({lot,produit:name,categorie:'Médicaments',quantite:4,unite:'boîte',health:{perBox:count,contentUnit:'comprimés'},ddm:'2029-05-01',typeDate:'Péremption',lotFabricant:'FAB1',emplacement:'',containerId:'',legacyAliases:[other],allocations:[{id:lot,quantite:2,site:'42',emplacement:'42-R3-N3-A',containerId:'42-SANTE-01'},{id:other,quantite:2,site:'38',emplacement:'38-ETAGE-12',containerId:'38-SANTE-01'}]});
const snapshot={ok:true,version:3,capabilities:{containers:true,allocations:true},containers:boxes,lots:[make('L0011','L0012','Ibuprofène 400 mg',12),make('L0013','L0014','Doliprane 500 mg',16)],products:[],orders:[],movements:[],nextLot:'L0015',readAt:'2026-11-22'};
const calls=[];let sequence=0;
context.request=async(action,input)=>{if(action==='snapshot'){assert.equal(input.allocationModel,3);return JSON.parse(JSON.stringify(snapshot));}calls.push({action,input});const root=snapshot.lots.find(l=>l.lot===input.lot),p=root?.allocations.find(a=>a.id===input.allocationId);
 if(['movement','container','assign','inventory','redistribute'].includes(action)&&root){assert.ok(p,'a precise storage allocation is required');assert.equal(input.expectedQuantity,p.quantite);assert.equal(input.expectedLocation,p.emplacement);assert.equal(input.expectedContainerId,p.containerId);}
 if(action==='movement'){p.quantite-=input.quantite;root.quantite-=input.quantite;}
 if(action==='container')p.containerId=input.containerId;
 if(action==='assign')p.emplacement=input.location;
 if(action==='redistribute'){p.quantite-=input.quantite;let t=root.allocations.find(a=>a.id!==p.id&&a.site===input.site&&a.emplacement===input.location&&a.containerId===input.containerId);if(t)t.quantite+=input.quantite;else root.allocations.push({id:'P'+String(++sequence).padStart(32,'0'),quantite:input.quantite,site:input.site,emplacement:input.location,containerId:input.containerId});}
 return {ok:true,lot:root?.lot||'L0015'};};
for(const p of ['health-rules.js','health-scan-codes.js'])run(fs.readFileSync(__dirname+'/../sante-stock42/'+p,'utf8'));
run([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'));
run(fs.readFileSync(__dirname+'/../sante-stock42/health-ui.js','utf8'));
run('santeReadRequest=request');run(fs.readFileSync(__dirname+'/../sante-stock42/health-containers.js','utf8'));
(async()=>{
 assert.equal($('splitSaveBtn').disabled,true);storage.setItem(run('LS.syncUrl'),'https://gateway.example/exec');await events.get('DOMContentLoaded')();
 assert.equal($('splitSaveBtn').disabled,false);assert.equal(run('allLots().length'),2);assert.equal(run('nextLot()'),'L0015');
 $('searchLot').value='L0011';run('searchLot()');const text=$('lotSearchResult').textContent;assert.match(text,/Total du lot.*4 boîte/);assert.match(text,/Site 42/);assert.match(text,/Site 38/);assert.ok(!text.includes('L0012'));
 $('searchLot').value='L0012';run('searchLot()');assert.match($('lotSearchResult').textContent,/L0011/);assert.ok(!$('lotSearchResult').textContent.includes('L0012'));
 $('locationViewSelect').value='38-ETAGE-12';run('showLocationView()');assert.equal($('locationViewResult').querySelectorAll('.list-item').length,2);assert.match($('locationViewResult').textContent,/2 boîte/);
 $('inventoryLocationSelect').value='38-ETAGE-12';run('loadInventoryLocation()');for(const el of document.querySelectorAll('.inventoryCheck'))el.checked=false;await run('confirmQuickInventory()');assert.equal(calls.filter(c=>c.action==='inventory').length,2);assert.ok(calls.filter(c=>c.action==='inventory').every(c=>c.input.present===false));assert.equal(snapshot.lots[0].quantite,4);
 run("setExitLocation('38-ETAGE-12')");$('exitLotSelect').value='L0012';change('exitLotSelect');assert.match($('exitLotInfo').textContent,/L0011/);assert.ok(!$('exitLotSelect').textContent.includes('L0012'));$('exitQty').value='1';await run('confirmStockExit()');assert.equal(calls.at(-1).action,'movement');assert.equal(calls.at(-1).input.lot,'L0011');assert.equal(calls.at(-1).input.allocationId,'L0012');assert.equal(snapshot.lots[0].quantite,3);assert.equal(snapshot.lots[0].allocations[0].quantite,2);
 $('moveLotSelect').value='L0012';$('moveDestinationSelect').value='38-ETAGE-11';await run('moveSelectedLot()');assert.equal(snapshot.lots[0].allocations[1].emplacement,'38-ETAGE-11');assert.equal(snapshot.lots[0].allocations[0].emplacement,'42-R3-N3-A');
 $('containerLot').value='L0012';change('containerLot');$('lotContainer').value='38-SANTE-02';await $('saveContainerBtn').onclick();assert.equal(snapshot.lots[0].allocations[1].containerId,'38-SANTE-02');assert.equal(snapshot.lots[0].quantite,3);
 $('splitLot').value='L0011';change('splitLot');$('splitSite').value='38';change('splitSite');assert.equal($('splitContainer').options.length,9);$('splitLocation').value='38-ETAGE-12';$('splitContainer').value='38-SANTE-01';$('splitQty').value='1';await $('splitSaveBtn').onclick();assert.equal(calls.at(-1).action,'redistribute');assert.equal(calls.at(-1).input.lot,'L0011');assert.equal(snapshot.lots[0].quantite,3);assert.equal(snapshot.lots.length,2);assert.equal(run('nextLot()'),'L0015');assert.match($('splitStatus').textContent,/Lot L0011 conservé/);
 const newPosition=snapshot.lots[0].allocations.at(-1);$('splitLot').value=newPosition.id;change('splitLot');$('splitSite').value='42';change('splitSite');$('splitLocation').value='42-R3-N3-A';$('splitContainer').value='42-SANTE-01';$('splitQty').value='1';await $('splitSaveBtn').onclick();assert.equal(snapshot.lots[0].allocations[0].quantite,2);assert.equal(snapshot.lots[0].allocations.at(-1).quantite,0);assert.equal(snapshot.lots[0].quantite,3);
 const count=calls.length;$('splitQty').value='99';await $('splitSaveBtn').onclick();assert.equal(calls.length,count);
 $('qLocation').value='38-ETAGE-12';change('qLocation');assert.equal($('qContainer').options.length,9);assert.ok(Array.from($('qContainer').options).slice(1).every(o=>o.value.startsWith('38-')));
 storage.setItem('stock42SanteCloneGuestMode','1');run('applySanteReadOnlyControls()');assert.equal($('splitSaveBtn').disabled,true);await $('splitSaveBtn').onclick();assert.equal(calls.length,count);
 storage.removeItem('stock42SanteCloneGuestMode');snapshot.version=2;snapshot.capabilities={};await run('syncLotsFromSheet()');assert.equal($('splitSaveBtn').disabled,true);
 console.log('PASS: canonical search and legacy aliases, per-position views and inventory, targeted exits and moves, box selection, redistribution without new lot, merged storage, numbering, guest and legacy-gateway protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
