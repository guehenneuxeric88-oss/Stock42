const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../apps-script/Stock42SanteTest.gs'),'utf8').split('\nconst SANTE_SHARED_HTML = ')[1].trim().replace(/;$/,''));\nconst code=html.split('<script>')[1].split('</script>')[0],KEY='stock42_sante_remember_v1',secret='test-secret-only-not-a-production-key';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function page(storage=new Map(),options={}){
 const elements=new Map(),calls=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:id==='remember',hidden:id==='workspace'||id==='retryConnection',textContent:'',className:'',replaceChildren(){}});return elements.get(id);};
 const document={getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,hidden:false};
 const context={console,document,Date,Intl,Promise,setInterval(){},setTimeout,clearTimeout,localStorage:{getItem(k){if(options.blocked)throw Error('blocked');return storage.get(k)||null},setItem(k,v){if(options.blocked)throw Error('blocked');storage.set(k,v)},removeItem(k){if(options.blocked)throw Error('blocked');storage.delete(k)}},google:{script:{get run(){return {withSuccessHandler(cb){this.ok=cb;return this},withFailureHandler(cb){this.fail=cb;return this},santeLire(token){calls.push(token);queueMicrotask(()=>{if(options.network)this.fail(Error('Réseau indisponible'));else if(token!==secret)this.fail(Error('Clé Santé incorrecte.'));else this.ok({ok:true,lots:[],events:[],locations:[],revision:'test-revision'})});}}}}}};
 vm.createContext(context);vm.runInContext(code,context);vm.runInContext('render=()=>{};controls=()=>{};',context);
 return {el,calls,context,storage,options};
}
(async()=>{
 let p=page();p.el('token').value=secret;p.el('connect').onclick();await tick();assert.equal(p.el('token').value,'');assert.equal(p.el('workspace').hidden,false);assert.equal(JSON.parse(p.storage.get(KEY)).token,secret);assert.match(p.el('connectionState').textContent,/mémorisée/);
 const stored=p.storage;p=page(stored);await tick();assert.equal(p.calls.length,1);assert.equal(p.calls[0],secret);assert.equal(p.el('workspace').hidden,false);assert.equal(p.el('login').hidden,true);assert.equal(p.el('token').value,'');
 p.el('logout').onclick();assert.equal(stored.has(KEY),false);assert.equal(p.el('workspace').hidden,true);p=page(stored);await tick();assert.equal(p.calls.length,0);
 p=page();p.el('remember').checked=false;p.el('token').value=secret;p.el('connect').onclick();await tick();assert.equal(p.storage.has(KEY),false);assert.equal(p.el('workspace').hidden,false);
 p=page();p.el('token').value='wrong-test-key-not-to-remember';p.el('connect').onclick();await tick();assert.equal(p.storage.has(KEY),false);assert.equal(p.el('workspace').hidden,true);
 p=page(new Map([[KEY,JSON.stringify({token:'old-invalid-key-for-tests',savedAt:Date.now()})]]));await tick();assert.equal(p.storage.has(KEY),false);assert.equal(p.el('login').hidden,false);assert.match(p.el('status').textContent,/plus valide/);
 p=page(new Map([[KEY,JSON.stringify({token:secret,savedAt:Date.now()-181*24*3600*1000})]]));await tick();assert.equal(p.calls.length,0);assert.equal(p.storage.has(KEY),false);
 p=page(new Map([[KEY,'invalid-json']]));await tick();assert.equal(p.storage.has(KEY),false);
 p=page(new Map(),{blocked:true});p.el('token').value=secret;p.el('connect').onclick();await tick();assert.equal(p.el('workspace').hidden,false);assert.match(p.el('connectionState').textContent,/ne permet pas/);
 const options={network:true};p=page(new Map([[KEY,JSON.stringify({token:secret,savedAt:Date.now()})]]),options);await tick();assert.equal(p.storage.has(KEY),true);assert.equal(p.el('retryConnection').hidden,false);options.network=false;p.el('retryConnection').onclick();await tick();assert.equal(p.el('workspace').hidden,false);assert.equal(p.el('retryConnection').hidden,true);
 console.log('PASS: connexion mémorisée après validation, réouverture automatique, déconnexion et effacement, refus de mémorisation, clé invalide/expirée, stockage bloqué et reprise réseau sans ressaisie.');
})().catch(e=>{console.error(e);process.exit(1)});
