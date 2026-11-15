const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'..'), html=fs.readFileSync(path.join(root,'sante-stock42/index.html'),'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
new vm.Script(code);
function boot(seed={}){
 const {document}=parseHTML(html);
 Object.defineProperty(document.defaultView.HTMLSelectElement.prototype,'value',{get(){const a=[...this.querySelectorAll('option')],o=a.find(x=>x.hasAttribute('selected'))||a[0];return o?.getAttribute('value')??o?.textContent??''},set(v){for(const o of this.querySelectorAll('option'))if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');else o.removeAttribute('selected')},configurable:true});
 const data=new Map(Object.entries(seed)),accesses=[],requests=[];
 const localStorage={getItem(k){accesses.push(k);return data.get(k)??null},setItem(k,v){accesses.push(k);data.set(k,String(v))},removeItem(k){accesses.push(k);data.delete(k)}};
 const context=vm.createContext({document,localStorage,sessionStorage:localStorage,window:{addEventListener(){},scrollTo(){}},navigator:{onLine:true},console,Date,Intl,URL,Blob,File,crypto:require('crypto').webcrypto,setTimeout(){return 1},clearTimeout(){},setInterval(){},clearInterval(){},alert(){throw Error('Unexpected alert')},confirm(){return true},fetch(...a){requests.push(a);throw Error('Unexpected network request')}});
 vm.runInContext(code,context);return {context,document,data,accesses,requests};
}
(async()=>{
 const food={stock42Catalog:JSON.stringify([{lot:'L0163',produit:'ALIMENTAIRE',quantite:10,unite:'kg'}]),stock42Orders:JSON.stringify([{id:'C0001',product:'ALIMENTAIRE'}]),stock42SyncUrl:'https://food.invalid/exec',stock42SyncKey:'fake-food-key',stock42CloudBackupEnabled:'1',stock42CloudBackupUrl:'https://food.invalid/backup',stock42CloudBackupKey:'fake-backup-key'};
 const b=boot(food);
 assert.equal(b.document.getElementById('dashLots').textContent,'0');
 assert.match(b.document.getElementById('dashSummary').textContent,/non chargé/);
 assert.equal(b.document.getElementById('syncUrl').value,'');
 assert.equal(b.document.getElementById('syncKey').value,'');
 assert.deepEqual([...b.document.querySelectorAll('#mainNav button')].map(x=>x.dataset.view),['home','entries','exits','stock','config']);
 for(const v of ['home','entries','exits','stock','config']){vm.runInContext("setAppView("+JSON.stringify(v)+",false)",b.context);assert.equal(b.document.body.dataset.appView,v)}
 for(const id of ['saveOrderBtn','quickSaveBtn','confirmReceiveBtn','exportJsonBtn','syncLotsBtn'])assert.ok(b.document.getElementById(id));
 assert.ok(b.accesses.every(k=>k.startsWith('stock42SanteClone')));
 for(const [k,v] of Object.entries(food))assert.equal(b.data.get(k),v);
 for(const expr of ["syncLotsFromSheet()","syncProductsFromSheet()","sendToSheet('receive',{})","sendCloudBackupWithReceipt({})"])await vm.runInContext(expr,b.context);
 assert.equal(b.requests.length,0);
 const payload=JSON.parse(vm.runInContext('JSON.stringify(completeExportData())',b.context));
 assert.equal(payload.format,'stock42SanteClone-complete');assert.equal(payload.syncUrl,'');
 assert.ok(!Object.keys(payload).some(k=>/key|token/i.test(k)));
 assert.throws(()=>vm.runInContext("validateExternalBackup({format:'stock42-complete',version:1})",b.context),/alimentaires/);
 const live=boot({...food,stock42SanteCloneLots:JSON.stringify([{lot:'L0057',produit:'Gants test',quantite:100,unite:'unité',emplacement:'42-R3-N2-A'}]),stock42SanteCloneOrders:JSON.stringify([{id:'C0001',product:'Gants test',status:'Commandée',qty:1,unit:'boîte'}])});
 assert.equal(live.document.getElementById('dashLots').textContent,'1');
 assert.equal(JSON.parse(live.data.get('stock42SanteCloneOrders'))[0].id,'C0001');
 assert.equal(JSON.parse(live.data.get('stock42SanteCloneLots'))[0].lot,'L0057');

 const snapshot={ok:true,service:'Stock42SanteClone',readOnly:true,lots:[],products:[],orders:[],movements:[],readAt:'2026-11-15T08:00:00Z',nextLot:'L0001'};
 b.context.testSnapshot=snapshot;
 vm.runInContext("santeReadRequest=async()=>testSnapshot",b.context);
 assert.equal(await vm.runInContext("syncLotsFromSheet()",b.context),true);
 assert.match(b.document.getElementById('syncMsg').textContent,/confirmée : 0 lot/);
 assert.equal(b.document.getElementById('dashLots').textContent,'0');
 assert.equal(b.document.getElementById('quickSaveBtn').disabled,true);
 for(const [k,v] of Object.entries(food))assert.equal(b.data.get(k),v);
 b.context.testSnapshot={...snapshot,lots:[{lot:'L0001',produit:'Gants fictifs',quantite:400,unite:'gant',emplacement:'42-R3-N2-A'}],movements:[{lot:'L0001',type:'Sortie consommation',quantite:100,serverRecorded:true}]};
 assert.equal(await vm.runInContext("syncLotsFromSheet()",b.context),true);
 assert.equal(vm.runInContext("currentQtyForLot(allLots()[0])",b.context),400);
 const preserved=b.data.get('stock42SanteCloneCatalog');
 b.context.testSnapshot={...snapshot,lots:[{lot:'wrong',quantite:100}]};
 assert.equal(await vm.runInContext("syncLotsFromSheet()",b.context),false);
 assert.equal(b.data.get('stock42SanteCloneCatalog'),preserved);

 const manifest=JSON.parse(fs.readFileSync(path.join(root,'sante-stock42/manifest.webmanifest'),'utf8'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./index.html');
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,'sante-stock42',icon.src)));
 const events={},deleted=[];
 vm.runInNewContext(fs.readFileSync(path.join(root,'sante-stock42/service-worker.js'),'utf8'),{self:{addEventListener(n,cb){events[n]=cb},clients:{claim(){return Promise.resolve()}}},caches:{keys:async()=>['stock42-v56','other-cache','stock42-sante-clone-old','stock42-sante-clone-v1'],delete:async k=>{deleted.push(k)}}});
 let activation;events.activate({waitUntil(p){activation=p}});await activation;
 assert.deepEqual(deleted,['stock42-sante-clone-old']);
 console.log('PASS: navigation identique, stockage alimentaire intact, connexions non actives, exports Santé séparés, lots locaux préservés, cache Santé isolé.');
})().catch(e=>{console.error(e);process.exitCode=1});

