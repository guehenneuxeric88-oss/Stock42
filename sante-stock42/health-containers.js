// Optional storage containers, separate from commercial packaging and shelf locations.
(function(){
 let ready=false,splitReady=false,registry=[];
 const cacheKey='stock42SanteCloneContainers';
 registry=get(cacheKey,[]);
 const label=id=>registry.find(c=>c.id===id)?.name||id;
 const select=(id)=>'<div class="field"><label for="'+id+'">Contenant de rangement (facultatif)</label><select id="'+id+'"><option value="">Aucun contenant renseigné / rangement sur étagère</option></select></div>';
 $('quickSaveBtn').insertAdjacentHTML('beforebegin',select('qContainer'));
 $('confirmReceiveBtn').insertAdjacentHTML('beforebegin',select('rContainer'));
 $('moveCard').insertAdjacentHTML('afterend','<section class="card admin-only" data-app-view="stock" id="storageContainerCard"><div class="section-title">Contenant de rangement</div><div class="hint">Facultatif. Cette action concerne l’ensemble du lot et ne change ni sa quantité ni son emplacement. Pour déplacer une partie du stock au 42 ou au 38, utilisez Répartir un lot ci-dessous.</div><div class="field"><label for="containerLot">Lot à ranger</label><select id="containerLot"><option value="">— Choisir un lot —</option></select></div><div id="containerCurrent" class="status"></div>'+select('lotContainer')+'<button class="btn primary" id="saveContainerBtn">Enregistrer le contenant du lot</button><div id="containerStatus" class="status"></div></section>');
 const siteOf=loc=>/^(38|42)-/.exec(String(loc||''))?.[1]||'';
 const lotSite=x=>siteOf(currentLocationForLot(x.lot)||x.emplacement)||registry.find(c=>c.id===x.containerId)?.site||String(x.zone||'').replace('Site ','');
 $('storageContainerCard').insertAdjacentHTML('afterend','<section class="card admin-only" data-app-view="stock" id="splitCard"><div class="section-title">Répartir un lot entre deux rangements</div><div class="hint">Transférez une quantité vers le 42 ou le 38. Le total reste identique ; le lot fabricant, la péremption et la fiche produit sont conservés. Une nouvelle référence interne permet de suivre chaque portion séparément.</div><div class="field"><label for="splitLot">Lot source à répartir</label><select id="splitLot"></select></div><div id="splitSourceInfo" class="status"></div><div class="two"><div class="field"><label for="splitQty">Quantité à transférer</label><input id="splitQty" type="number" min="1" step="1"></div><div class="field"><label for="splitSite">Site destinataire</label><select id="splitSite"><option value="">— Choisir le site —</option><option value="42">Site 42</option><option value="38">Site 38</option></select></div></div><div class="field"><label for="splitLocation">Emplacement destinataire</label><select id="splitLocation"></select></div><div class="field"><label for="splitContainer">Boîte destinataire (facultatif)</label><select id="splitContainer"></select></div><button class="btn primary" id="splitSaveBtn">Confirmer la répartition</button><div id="splitStatus" class="status"></div></section>');
 const lotOptions=()=>allLots().filter(x=>currentQtyForLot(x)>0).map(x=>'<option value="'+esc(x.lot)+'">'+esc(x.lot+' — '+x.produit+' — '+currentQtyForLot(x)+' '+x.unite+' — '+(lotSite(x)?'Site '+lotSite(x):'Site à préciser'))+'</option>').join('');
 function refreshDestination(){
  const site=$('splitSite').value,loc=$('splitLocation'),box=$('splitContainer'),previousLoc=loc.value,previousBox=box.value;
  loc.innerHTML='<option value="">— Emplacement à préciser —</option>'+Array.from($('qLocation').options).filter(o=>site&&siteOf(o.value)===site).map(o=>'<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>').join('');
  if(Array.from(loc.options).some(o=>o.value===previousLoc))loc.value=previousLoc;
  box.innerHTML='<option value="">Aucun contenant / étagère</option>'+registry.filter(c=>site&&String(c.site||siteOf(c.id))===site).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  if(Array.from(box.options).some(o=>o.value===previousBox))box.value=previousBox;
 }
 function splitInfo(){const x=lotById($('splitLot').value);$('splitSourceInfo').textContent=x?currentQtyForLot(x)+' '+x.unite+' disponibles • '+(currentLocationForLot(x.lot)||x.emplacement||'Emplacement à préciser')+' • '+(x.containerId?label(x.containerId):'Sans contenant')+' • Péremption : '+(x.ddm||'Sans date'):'';if(x){$('splitQty').max=currentQtyForLot(x);$('splitQty').step=HealthRules.counts.includes(x.unite)?'1':'any';}}
 function refresh(){
  for(const id of ['qContainer','rContainer','lotContainer']){
   const el=$(id),current=el.value;
   el.innerHTML='<option value="">Aucun contenant renseigné / rangement sur étagère</option>'+registry.filter(c=>{const x=id==='lotContainer'?lotById($('containerLot').value):null;const site=x?lotSite(x):id==='qContainer'?siteOf($('qLocation').value):siteOf(activeLocation&&$('rAssignActive').checked?activeLocation:'');return !site||!c.site||String(c.site)===site;}).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
   if(registry.some(c=>c.id===current))el.value=current;
   el.disabled=!ready||guestModeEnabled();
  }
  const sel=$('containerLot'),current=sel.value;
  sel.innerHTML='<option value="">— Choisir un lot —</option>'+lotOptions();
  if(lotById(current)&&currentQtyForLot(lotById(current))>0)sel.value=current;
  sel.disabled=!ready||guestModeEnabled();
  $('saveContainerBtn').disabled=!ready||!healthServerReady||guestModeEnabled()||!navigator.onLine;
  $('containerStatus').textContent=ready?'':'Synchronisez la passerelle Santé avec la gestion des contenants pour activer ce choix.';
  const split=$('splitLot'),chosen=split.value;split.innerHTML='<option value="">— Choisir un lot —</option>'+lotOptions();if(lotById(chosen))split.value=chosen;
  for(const id of ['splitLot','splitQty','splitSite','splitLocation','splitContainer','splitSaveBtn'])$(id).disabled=!splitReady||!healthServerReady||guestModeEnabled()||!navigator.onLine;
  refreshDestination();splitInfo();showCurrent();
 }
 function showCurrent(){const x=lotById($('containerLot').value);$('lotContainer').value=x?.containerId||'';$('containerCurrent').textContent=x?(x.containerId?label(x.containerId):'Aucun contenant renseigné')+' • Emplacement : '+(currentLocationForLot(x.lot)||x.emplacement||'À ranger'):'';}
 const read=santeReadRequest;santeReadRequest=async function(action,...args){const result=await read(action,...args);if(action==='snapshot'){
  ready=result.capabilities?.containers===true;splitReady=result.capabilities?.split===true;registry=Array.isArray(result.containers)?result.containers:[];localStorage.setItem(cacheKey,JSON.stringify(registry));
 }return result;};
 const sync=syncLotsFromSheet;syncLotsFromSheet=async function(){const ok=await sync();if(ok)refresh();return ok;};
 const send=sendToSheet;sendToSheet=async function(action,data){
  if(action==='quickEntry'||action==='receive'){
   const value=$(action==='quickEntry'?'qContainer':'rContainer').value;
   if(value&&!ready)return {ok:false,error:'Actualisez la passerelle Santé pour enregistrer un contenant.'};
   if(ready)data={...data,containerId:value};
  }
  const result=await send(action,data);
  if(result.ok&&(action==='quickEntry'||action==='receive'))$(action==='quickEntry'?'qContainer':'rContainer').value='';
  return result;
 };
 const quantity=displayQtyForLot;displayQtyForLot=function(x,override){return quantity(x,override)+(x?.splitFrom?' • Portion du lot '+(x.rootLot||x.splitFrom):'')+(x?.containerId?' • Contenant : '+label(x.containerId):'');};
 const controls=applySanteReadOnlyControls;applySanteReadOnlyControls=function(){controls();refresh();};
 const receive=openReceive;openReceive=function(id){receive(id);$('rContainer').value='';};
 $('containerLot').addEventListener('change',refresh);
 $('qLocation').addEventListener('change',refresh);$('rAssignActive').addEventListener('change',refresh);
 $('splitSite').addEventListener('change',refreshDestination);$('splitLot').addEventListener('change',splitInfo);
 $('splitSaveBtn').onclick=async()=>{
  const status=$('splitStatus'),button=$('splitSaveBtn');try{
   if(!splitReady||!healthServerReady||guestModeEnabled()||!navigator.onLine)throw Error('Synchronisez le fichier Santé en ligne avant de répartir.');
   const x=lotById($('splitLot').value),qty=HealthRules.number($('splitQty').value),site=$('splitSite').value,location=$('splitLocation').value,containerId=$('splitContainer').value;
   if(!x)throw Error('Choisissez le lot source.');
   if(!site)throw Error('Choisissez le site destinataire.');
   if(!(qty>0)||qty>currentQtyForLot(x)||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Quantité invalide : choisissez une quantité disponible, en boîtes entières.');
   if(!confirm('Transférer '+qty+' '+x.unite+' de '+x.produit+' — '+x.lot+' vers le site '+site+' / '+(location||'emplacement à préciser')+' / '+(containerId?label(containerId):'sans contenant')+' ? Il restera '+(currentQtyForLot(x)-qty)+' '+x.unite+' dans la portion source. Le stock total ne change pas.'))return;
   button.disabled=true;const r=await sendToSheet('split',{lot:x.lot,quantite:qty,site,location,containerId,expectedQuantity:currentQtyForLot(x),expectedLocation:x.emplacement||'',expectedContainerId:x.containerId||''});
   if(!r.ok)throw Error(r.error||'Répartition non confirmée.');
   const synced=await syncLotsFromSheet();$('splitQty').value='';status.textContent='✓ Répartition enregistrée — nouvelle référence '+r.lot+'. Stock total conservé.'+(synced?'':' Actualisez pour vérifier le stock.');
  }catch(e){status.textContent=e.message;}finally{button.disabled=!splitReady||!healthServerReady||guestModeEnabled()||!navigator.onLine;}
 };
 $('saveContainerBtn').onclick=async()=>{
  const status=$('containerStatus'),button=$('saveContainerBtn'),x=lotById($('containerLot').value),containerId=$('lotContainer').value;
  try{
   if(!ready||!healthServerReady||!navigator.onLine||guestModeEnabled())throw Error('Synchronisez le fichier Santé en ligne pour modifier le rangement.');
   if(!x)throw Error('Choisissez un lot.');
   if(!confirm('Ranger l’ensemble de '+x.lot+' — '+x.produit+' : '+(containerId?label(containerId):'aucun contenant renseigné')+' ? L’emplacement reste inchangé.'))return;
   button.disabled=true;const result=await send('container',{lot:x.lot,containerId,expectedContainerId:x.containerId||''});
   if(!result.ok)throw Error(result.error||'Enregistrement non confirmé.');
   const ok=await syncLotsFromSheet();status.textContent=ok?'✓ Rangement enregistré, quantité et emplacement conservés.':'✓ Rangement enregistré. Actualisez pour vérifier l’affichage.';
  }catch(e){status.textContent=e.message;}finally{button.disabled=!ready||!healthServerReady||guestModeEnabled()||!navigator.onLine;}
 };
 refresh();
})();
