const {boot}=require('./sante-stock42-clone.cjs'),vm=require('vm'),assert=require('node:assert/strict'),rules=require('../sante-stock42/health-rules.js');
assert.equal(rules.date('02/2028'),'2028-02-29');assert.equal(rules.date('02/2027'),'2027-02-28');assert.equal(rules.date('31/02/2031'),'');assert.equal(rules.date('2031-13-01'),'');
assert.ok(rules.compare({lot:'L0002',ddm:'01/01/2030'},{lot:'L0001',ddm:'31/12/2030'})<0);
(async()=>{
 const b=boot(),run=s=>vm.runInContext(s,b.context),$=id=>b.document.getElementById(id),change=id=>$(id).dispatchEvent(new b.document.defaultView.Event('change'));
 let mutations=[];b.context.testSnapshot={ok:true,service:'Stock42SanteClone',version:2,lots:[],products:[],orders:[],movements:[],nextLot:'L0001',readAt:'2026-11-15T08:00:00Z'};
 b.context.fakeRequest=async(action,data)=>{if(action==='snapshot')return b.context.testSnapshot;mutations.push({action,data});const x={...data,lot:'L0001'};b.context.testSnapshot={...b.context.testSnapshot,lots:[x],nextLot:'L0002'};return {ok:true,service:'Stock42SanteClone',lot:'L0001'};};
 run('santeReadRequest=fakeRequest');await run('syncLotsFromSheet()');assert.equal($('quickSaveBtn').disabled,false);
 assert.deepEqual([...$('qCategory').options].map(x=>x.textContent).slice(1),rules.categories);
 $('qProduct').value='__new__';change('qProduct');$('qNewProduct').value='Gants nitrile';$('qKind').value='gloves';change('qKind');$('qSize').value='L';$('qMaterial').value='Nitrile';$('qPerBox').value='100';$('qQty').value='5';$('qExpiry').value='03/2031';change('qQty');
 assert.equal($('qUnit').value,'boîte');assert.equal($('qUnit').disabled,true);assert.match($('qTotal').textContent,/500 gants/);
 $('qQty').value='0.5';await run('saveQuickEntry()');assert.equal(mutations.length,0);assert.match($('quickStatus').textContent,/entier/);
 $('qQty').value='5';await run('saveQuickEntry()');assert.equal(mutations.length,1);assert.equal(mutations[0].action,'quickEntry');assert.equal(mutations[0].data.quantite,5);assert.equal(mutations[0].data.unite,'boîte');assert.equal(mutations[0].data.health.perBox,100);assert.match(mutations[0].data.produit,/taille L/);assert.match(run('displayQtyForLot(allLots()[0])'),/500 gants/);
 $('qCategory').value='Médicaments';change('qCategory');assert.equal($('qMedicine').classList.contains('hidden'),false);assert.equal($('qGloves').classList.contains('hidden'),true);
 run("setExitLocation('__unassigned__')");$('exitLotSelect').value='L0001';$('exitQty').value='0.5';await run('confirmStockExit()');assert.equal(mutations.length,1);
 b.context.testSnapshot={...b.context.testSnapshot,lots:[{...b.context.testSnapshot.lots[0],ddm:'2000-01-01'}]};await run('syncLotsFromSheet()');run("setExitLocation('__unassigned__')");assert.equal($('exitLotSelect').options.length,1);assert.match($('exitLocationInfo').textContent,/1 lot\(s\) périmé/);
 console.log('PASS: formulaires conditionnels, sortie en boîtes, total en gants, rejet fractions, exclusion périmés et dates calendaires.');
})().catch(e=>{console.error(e);process.exitCode=1;});
