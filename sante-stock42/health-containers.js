// Optional storage containers, separate from commercial packaging and shelf locations.
(function(){
 let ready=false,registry=[];
 const cacheKey='stock42SanteCloneContainers';
 registry=get(cacheKey,[]);
 const label=id=>registry.find(c=>c.id===id)?.name||id;
 const select=(id)=>'<div class="field"><label for="'+id+'">Contenant de rangement (facultatif)</label><select id="'+id+'"><option value="">Aucun contenant renseigné / rangement sur étagère</option></select></div>';
 $('quickSaveBtn').insertAdjacentHTML('beforebegin',select('qContainer'));
 $('confirmReceiveBtn').insertAdjacentHTML('beforebegin',select('rContainer'));
 $('moveCard').insertAdjacentHTML('afterend','<section class="card admin-only" data-app-view="stock" id="storageContainerCard"><div class="section-title">Contenant de rangement</div><div class="hint">Facultatif. Cette action concerne l’ensemble du lot et ne change ni sa quantité ni son emplacement. Pour un lot réparti dans plusieurs endroits, conserver les affectations actuelles en attendant la gestion de répartition.</div><div class="field"><label for="containerLot">Lot à ranger</label><select id="containerLot"><option value="">— Choisir un lot —</option></select></div><div id="containerCurrent" class="status"></div>'+select('lotContainer')+'<button class="btn primary" id="saveContainerBtn">Enregistrer le contenant du lot</button><div id="containerStatus" class="status"></div></section>');
 function refresh(){
  for(const id of ['qContainer','rContainer','lotContainer']){
   const el=$(id),current=el.value;
   el.innerHTML='<option value="">Aucun contenant renseigné / rangement sur étagère</option>'+registry.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
   if(registry.some(c=>c.id===current))el.value=current;
   el.disabled=!ready||guestModeEnabled();
  }
  const sel=$('containerLot'),current=sel.value;
  sel.innerHTML='<option value="">— Choisir un lot —</option>'+allLots().filter(x=>currentQtyForLot(x)>0).map(x=>'<option value="'+esc(x.lot)+'">'+esc(x.lot+' — '+x.produit)+'</option>').join('');
  if(lotById(current)&&currentQtyForLot(lotById(current))>0)sel.value=current;
  sel.disabled=!ready||guestModeEnabled();
  $('saveContainerBtn').disabled=!ready||!healthServerReady||guestModeEnabled()||!navigator.onLine;
  $('containerStatus').textContent=ready?'':'Synchronisez la passerelle Santé avec la gestion des contenants pour activer ce choix.';
  showCurrent();
 }
 function showCurrent(){const x=lotById($('containerLot').value);$('lotContainer').value=x?.containerId||'';$('containerCurrent').textContent=x?(x.containerId?label(x.containerId):'Aucun contenant renseigné')+' • Emplacement : '+(currentLocationForLot(x.lot)||x.emplacement||'À ranger'):'';}
 const read=santeReadRequest;santeReadRequest=async function(action,...args){const result=await read(action,...args);if(action==='snapshot'){
  ready=result.capabilities?.containers===true;registry=Array.isArray(result.containers)?result.containers:[];localStorage.setItem(cacheKey,JSON.stringify(registry));
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
 const quantity=displayQtyForLot;displayQtyForLot=function(x,override){return quantity(x,override)+(x?.containerId?' • Contenant : '+label(x.containerId):'');};
 const controls=applySanteReadOnlyControls;applySanteReadOnlyControls=function(){controls();refresh();};
 const receive=openReceive;openReceive=function(id){receive(id);$('rContainer').value='';};
 $('containerLot').addEventListener('change',showCurrent);
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
