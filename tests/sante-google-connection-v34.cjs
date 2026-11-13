const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../apps-script/Stock42SanteTest.gs'),'utf8').split('\nconst SANTE_SHARED_HTML = ')[1].trim().replace(/;$/,'')),code=html.split('<script>')[1].split('</script>')[0];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function page(options={}){
 const elements=new Map(),calls=[],removed=[];const el=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='workspace'||id==='retryConnection',textContent:'',value:'',replaceChildren(){}});return elements.get(id)};
 const context={console,Date,Intl,Promise,setInterval(){},setTimeout,clearTimeout,document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,hidden:false},localStorage:{removeItem(k){if(options.storageBlocked)throw Error('blocked');removed.push(k)},getItem(){throw Error('No key should be read')},setItem(){throw Error('No key should be saved')}},google:{script:{get run(){return {withSuccessHandler(cb){this.ok=cb;return this},withFailureHandler(cb){this.fail=cb;return this},santeLire(...args){calls.push(args);queueMicrotask(()=>{if(options.denied)this.fail(Error('Accès refusé : compte Google du propriétaire requis.'));else if(options.network)this.fail(Error('Réseau indisponible'));else this.ok({ok:true,lots:[],events:[],locations:[],revision:'test-revision'})})}}}}}};
 vm.createContext(context);vm.runInContext(code,context);vm.runInContext('render=()=>{};controls=()=>{};',context);return {el,calls,removed};
}
(async()=>{
 assert.ok(!html.includes('id="token"'));assert.ok(!html.includes('id="remember"'));
 let p=page();await tick();assert.equal(p.el('workspace').hidden,false);assert.equal(p.calls.length,1);assert.equal(p.calls[0].length,0);assert.deepEqual(p.removed,['stock42_sante_remember_v1']);assert.match(p.el('connectionState').textContent,/aucune clé/);
 p=page({storageBlocked:true});await tick();assert.equal(p.el('workspace').hidden,false);assert.equal(p.calls[0].length,0);
 p.el('logout').onclick();assert.equal(p.el('workspace').hidden,true);assert.match(p.el('status').textContent,/compte Google reste connecté/);p.el('connect').onclick();await tick();assert.equal(p.el('workspace').hidden,false);
 p=page({denied:true});await tick();assert.equal(p.el('workspace').hidden,true);assert.equal(p.el('login').hidden,false);assert.equal(p.el('retryConnection').hidden,false);
 const options={network:true};p=page(options);await tick();assert.equal(p.el('workspace').hidden,true);options.network=false;p.el('retryConnection').onclick();await tick();assert.equal(p.el('workspace').hidden,false);assert.ok(p.calls.every(args=>args.length===0));
 console.log('PASS: ouverture Google sans clé ni stockage local, stockage bloqué, masquage/réouverture, compte refusé, reprise réseau.');
})().catch(e=>{console.error(e);process.exit(1)});
