// Santé adaptations; navigation and storage namespace remain those of the V55 copy.
(function(){
 const units=HealthRules.units.map(v=>'<option>'+esc(v)+'</option>').join('');
 for(const id of ['oCategory','qCategory'])$(id).innerHTML='<option value="">— Choisir une catégorie —</option>'+HealthRules.categories.map(v=>'<option>'+esc(v)+'</option>').join('');
 for(const id of ['oUnit','qUnit','rUnit'])$(id).innerHTML='<option value="">— Choisir —</option>'+units;
 for(const id of ['qDateType','rDateType'])$(id).innerHTML='<option>Péremption</option><option>Sans date</option>';
 const fields=prefix=>'<div class="two"><div class="field"><label for="'+prefix+'Kind">Type de produit</label><select id="'+prefix+'Kind"><option value="other">Produit de santé</option><option value="gloves">Gants</option></select></div><div class="field"><label for="'+prefix+'Barcode">Code-barres (facultatif)</label><input id="'+prefix+'Barcode" inputmode="numeric"></div></div>'+
 '<div id="'+prefix+'Medicine" class="two hidden"><div class="field"><label for="'+prefix+'Dosage">Dosage indiqué sur la boîte</label><input id="'+prefix+'Dosage" placeholder="Ex. 500 mg"></div><div class="field"><label for="'+prefix+'Form">Forme</label><select id="'+prefix+'Form"><option value="">— Choisir —</option><option>Comprimé</option><option>Gélule</option><option>Solution buvable</option><option>Collyre</option><option>Crème / pommade</option><option>Solution injectable</option><option>Autre</option></select></div></div>'+
 '<div id="'+prefix+'Gloves" class="two hidden"><div class="field"><label for="'+prefix+'Size">Taille des gants</label><select id="'+prefix+'Size"><option value="">— Choisir —</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select></div><div class="field"><label for="'+prefix+'Material">Matière</label><select id="'+prefix+'Material"><option value="">— Choisir —</option><option>Nitrile</option><option>Latex</option><option>Vinyle</option><option>Autre</option></select></div></div>'+
 '<div id="'+prefix+'Box" class="two hidden"><div class="field"><label for="'+prefix+'PerBox">Nombre d’unités par boîte</label><input id="'+prefix+'PerBox" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex. 100"></div><div class="field"><label for="'+prefix+'ContentUnit">Contenu de la boîte</label><select id="'+prefix+'ContentUnit"><option>gants</option><option>comprimés</option><option>gélules</option><option>ampoules</option><option>compresses</option><option>sachets</option><option>unités</option></select></div></div><div id="'+prefix+'Total" class="hint"></div>';
 $('qProduct').closest('.two').insertAdjacentHTML('afterend',fields('q'));
 $('rProduct').closest('.field').insertAdjacentHTML('afterend',fields('r'));
 $('qPack').closest('.two').insertAdjacentHTML('beforebegin','<div class="field"><label for="qMakerLot">Lot fabricant (facultatif)</label><input id="qMakerLot"></div>');
 function updateFields(prefix){
  const category=prefix==='q'?$('qCategory').value:orders().find(o=>o.id===receiveOrderId)?.category;
  const isMedicine=category==='Médicaments';
  if(isMedicine){$(prefix+'Kind').value='other';if(!$(prefix+'Unit').value)$(prefix+'Unit').value='boîte';if($(prefix+'ContentUnit').value==='gants')$(prefix+'ContentUnit').value='unités';}
  const gloves=$(prefix+'Kind').value==='gloves';
  $(prefix+'Kind').disabled=isMedicine;
  $(prefix+'Medicine').classList.toggle('hidden',!isMedicine);
  $(prefix+'Gloves').classList.toggle('hidden',!gloves);
  if(gloves){$(prefix+'Unit').value='boîte';$(prefix+'ContentUnit').value='gants';if(prefix==='q'&&category!=='Protection / EPI')$('qCategory').value='Protection / EPI';}
  $(prefix+'Unit').disabled=gloves;$(prefix+'ContentUnit').disabled=gloves;
  const box=$(prefix+'Unit').value==='boîte';$(prefix+'Box').classList.toggle('hidden',!box);
  $(prefix+'Pack').closest('.field').classList.toggle('hidden',box);
  $(prefix+'Qty').step=HealthRules.counts.includes($(prefix+'Unit').value)?'1':'any';
  const qty=HealthRules.number($(prefix+'Qty').value),count=HealthRules.number($(prefix+'PerBox').value);
  $(prefix+'Total').textContent=box&&qty>0&&count>0?qty+' boîte(s) de '+count+' '+$(prefix+'ContentUnit').value+' = '+(qty*count)+' '+$(prefix+'ContentUnit').value+'. Sorties par boîte entière.':'';
  const noDate=$(prefix+'DateType').value==='Sans date';$(prefix+'Expiry').disabled=noDate;if(noDate)$(prefix+'Expiry').value='';
 }
 const readDetails=p=>({name:p==='q'?($('qProduct').value==='__new__'?$('qNewProduct').value:$('qProduct').value):$('rProduct').value,kind:$(p+'Kind').value,dosage:$(p+'Dosage').value,form:$(p+'Form').value,size:$(p+'Size').value,material:$(p+'Material').value,perBox:$(p+'PerBox').value,contentUnit:$(p+'ContentUnit').value,barcode:$(p+'Barcode').value});
 function fillDetails(p,h){h=h||{};for(const [key,id] of Object.entries({kind:'Kind',dosage:'Dosage',form:'Form',size:'Size',material:'Material',perBox:'PerBox',contentUnit:'ContentUnit',barcode:'Barcode'}))$(p+id).value=h[key]||({kind:'other',contentUnit:'unités'}[key]||'');updateFields(p);}
 for(const p of ['q','r'])for(const suffix of ['Kind','Unit','Qty','PerBox','ContentUnit','DateType'])$(p+suffix).addEventListener('change',()=>updateFields(p));
 $('qCategory').addEventListener('change',()=>updateFields('q'));
 const oldToggle=toggleQuickNewProduct;toggleQuickNewProduct=function(){oldToggle();if(!$('qKind'))return;const ref=productReferences().find(p=>p.name===$('qProduct').value);fillDetails('q',ref?.health);};
 const oldOpen=openReceive;openReceive=function(id){oldOpen(id);const o=orders().find(o=>o.id===id),ref=productReferences().find(p=>p.name===o?.product);fillDetails('r',ref?.health);$('rDateType').value='Péremption';updateFields('r');};
 const oldReferences=productReferences;productReferences=function(){return oldReferences().map(r=>({...r,health:get(LS.products,[]).find(x=>x.name===r.name)?.health||allLots().find(l=>l.produit===r.name)?.health||{}}));};
 // Start from an empty inventory: the user fixes the reference after initial entry,
 // rather than freezing only the first product that happens to be received.
 initializeReorderBaseline=function(){};
 const oldReorder=renderReorder;renderReorder=function(){oldReorder();if(!get(LS.reorder,null)?.items)$('reorderBaselineStatus').textContent='À définir après la saisie initiale des produits Santé, avec le bouton ci-dessous.';};
 parseFrenchDate=function(v){const d=HealthRules.date(v);if(!d)return null;const [y,m,day]=d.split('-').map(Number);return new Date(y,m-1,day);};
 const oldExpiry=expiryState;expiryState=function(x){return x.typeDate==='Sans date'?{bucket:'none',days:null}:oldExpiry(x);};
 displayQtyForLot=function(x,override){const qty=override===undefined?currentQtyForLot(x):Number(override),h=x?.health||{},base=qty.toLocaleString('fr-FR',{maximumFractionDigits:3})+' '+(x?.unite||'');return x?.unite==='boîte'&&h.perBox?base+' de '+h.perBox+' '+(h.contentUnit||'unités')+' ('+(qty*h.perBox).toLocaleString('fr-FR')+' '+(h.contentUnit||'unités')+')':base+(x?.conditionnement?' • '+x.conditionnement:'');};
 function localDay(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 function entry(p){const category=p==='q'?$('qCategory').value:orders().find(o=>o.id===receiveOrderId)?.category;const h=readDetails(p);return HealthRules.validateEntry({produit:h.name,categorie:category,quantite:$(p+'Qty').value,unite:$(p+'Unit').value,ddm:$(p+'Expiry').value,typeDate:$(p+'DateType').value,conditionnement:$(p+'Pack').value,health:h,lotFabricant:$(p+'MakerLot').value,fournisseur:p==='q'?$('qSupplier').value:'',location:p==='q'?$('qLocation').value:(activeLocation&&$('rAssignActive').checked?activeLocation:''),notes:p==='r'?$('rNotes').value:''});}
 function writeGuard(){if(guestModeEnabled())throw Error('Mode invité : consultation uniquement.');if(!healthServerReady||!navigator.onLine)throw Error('Synchronisez le fichier Santé en ligne avant de modifier le stock.');}
 async function perform(button,status,action,data){
  writeGuard();const label=button.textContent;button.disabled=true;button.textContent='Enregistrement…';status.textContent='Validation par le serveur Santé…';
  try{const r=await sendToSheet(action,data);if(!r.ok)throw Error(r.error||'Enregistrement non confirmé.');const synced=await syncLotsFromSheet();status.textContent='✓ Enregistré dans Google Sheets'+(r.lot?' — '+r.lot:'')+(r.orderId?' — '+r.orderId:'')+(synced?'.':'. Rechargez le stock pour actualiser l’affichage.');return r;}finally{button.textContent=label;button.disabled=!healthServerReady;}
 }
 saveQuickEntry=async function(){const status=$('quickStatus');try{const data=entry('q');await perform($('quickSaveBtn'),status,'quickEntry',data);for(const id of ['qNewProduct','qQty','qExpiry','qMakerLot'])$(id).value='';$('qProduct').value='';fillDetails('q',{});updateStats();}catch(e){status.textContent=e.message;}};
 saveOrder=async function(){const status=$('orderStatus');try{const product=$('oProduct').value==='__new__'?$('oNewProduct').value:$('oProduct').value;await perform($('saveOrderBtn'),status,'order',{product,category:$('oCategory').value,qty:$('oQty').value,unit:$('oUnit').value,price:$('oPrice').value||null,supplier:$('oSupplier').value,reference:$('oReference').value,expected:$('oExpected').value,notes:$('oNotes').value});$('oQty').value='';updateStats();}catch(e){status.textContent=e.message;}};
 confirmReceive=async function(){const status=$('receiveStatus');try{await perform($('confirmReceiveBtn'),status,'receive',{...entry('r'),orderId:receiveOrderId});receiveOrderId=null;updateStats();}catch(e){status.textContent=e.message;}};
 assignLotTo=async function(lot,location){const status=$('assignStatus');try{await perform($('assignLotBtn'),status,'assign',{lot:normalizeLot(lot),location});if(activeLocation)renderLocationStock();}catch(e){status.textContent=e.message;}};
 populateExitControls=function(){
  const sel=$('exitLotSelect'),current=sel.value,day=localDay();
  const candidates=allLots().filter(x=>currentQtyForLot(x)>0&&(exitLocation==='__unassigned__'?!(currentLocationForLot(x.lot)||x.emplacement):(currentLocationForLot(x.lot)||x.emplacement)===exitLocation));
  const rows=candidates.filter(x=>HealthRules.allowed(x,day)).sort(HealthRules.compare);
  sel.innerHTML='<option value="">— Choisir un lot (péremption la plus proche) —</option>'+rows.map(x=>'<option value="'+esc(x.lot)+'">'+esc(x.produit)+' — '+esc(x.lot)+' — '+esc(x.typeDate==='Sans date'?'Sans date':x.ddm)+' — '+esc(displayQtyForLot(x))+'</option>').join('');
  if(rows.some(x=>x.lot===current))sel.value=current;
  $('exitLocationInfo').textContent=exitLocation?rows.length+' lot(s) disponible(s). '+(candidates.length-rows.length)+' lot(s) périmé(s) ou sans date valide exclu(s).':'Choisissez un emplacement.';
  showExitLotInfo();
 };
 const oldLocations=populateExitLocations;populateExitLocations=function(){oldLocations();$('exitLocationSelect').insertAdjacentHTML('beforeend','<option value="__unassigned__">À ranger / sans emplacement</option>');if(exitLocation==='__unassigned__')$('exitLocationSelect').value=exitLocation;};
 setExitLocation=function(loc){exitLocation=loc==='__unassigned__'||VALID.test(loc||'')?loc:'';$('exitLocationSelect').value=exitLocation;populateExitControls();};
 confirmStockExit=async function(){
  const status=$('exitStatus'),x=lotById($('exitLotSelect').value);try{
   if(!x)throw Error('Choisissez un lot.');const qty=HealthRules.number($('exitQty').value);
   if(!(qty>0)||qty>currentQtyForLot(x)||(HealthRules.counts.includes(x.unite)&&!Number.isSafeInteger(qty)))throw Error('Saisissez un nombre entier de boîtes ou de contenants, inférieur ou égal au stock disponible.');
   const first=allLots().filter(l=>l.produit===x.produit&&l.unite===x.unite&&currentQtyForLot(l)>0&&HealthRules.allowed(l,localDay())).sort(HealthRules.compare)[0];
   let override=false;if(first&&first.lot!==x.lot){override=confirm('Le lot '+first.lot+' périme avant celui-ci ('+first.ddm+'). Confirmez-vous la sortie de '+x.lot+' à la place ?');if(!override)return;}
   if(!confirm('Sortir '+qty+' '+x.unite+' de '+x.produit+' — '+x.lot+' ?'))return;
   await perform($('exitConfirmBtn'),status,'movement',{lot:x.lot,quantite:qty,unite:x.unite,commentaire:$('exitReason').value+($('exitComment').value?' — '+$('exitComment').value:''),fefoOverride:override});$('exitQty').value='';populateExitControls();
  }catch(e){status.textContent=e.message;}
 };
 const originalShow=showExitLotInfo;showExitLotInfo=function(){originalShow();const x=lotById($('exitLotSelect').value);$('exitQty').inputMode='numeric';if(x)$('exitQty').placeholder=x.unite==='boîte'?'Nombre de boîtes entières, ex. 1':'Nombre de contenants, ex. 1';};
 showFifoView=function(){const name=$('fifoProductSelect').value,el=$('fifoResult');if(!name){el.textContent='Choisissez un produit.';return;}const rows=allLots().filter(x=>x.produit===name&&currentQtyForLot(x)>0).sort(HealthRules.compare),usable=rows.filter(x=>HealthRules.allowed(x,localDay()));el.innerHTML='<div class="notice">Priorité à la péremption la plus proche. Les lots périmés restent visibles et ne peuvent pas être sortis pour utilisation.</div>'+rows.map(x=>'<div class="list-item"><div class="item-title">'+esc(x.lot)+' — '+esc(x.produit)+'</div><div>'+esc(displayQtyForLot(x))+'</div><div>'+esc(x.typeDate==='Sans date'?'Sans date':x.ddm)+' • <b>'+(!HealthRules.allowed(x,localDay())?'BLOQUÉ : PÉREMPTION':usable[0]?.lot===x.lot?'À UTILISER EN PREMIER':'Disponible')+'</b></div><div>'+esc(currentLocationForLot(x.lot)||x.emplacement||'À ranger')+'</div></div>').join('');};
 showExpiryAlerts=function(){const rows=allLots().filter(x=>currentQtyForLot(x)>0&&x.typeDate!=='Sans date').map(x=>({x,st:expiryState(x)})).filter(r=>r.st.bucket!=='ok').sort((a,b)=>HealthRules.compare(a.x,b.x));$('expiryResult').innerHTML=rows.length?rows.map(({x,st})=>'<div class="notice"><b>'+esc(x.produit)+' — '+esc(x.lot)+'</b><br>'+esc(displayQtyForLot(x))+' • '+esc(x.ddm||'Péremption à compléter')+' • <b>'+esc(expiryLabel(st))+'</b><br>'+esc(currentLocationForLot(x.lot)||x.emplacement||'À ranger')+'</div>').join(''):'<div class="notice">Aucune alerte de péremption sur les lots disponibles.</div>';};
 function lotCard(x){return '<div class="list-item"><b>'+esc(x.produit)+' — '+esc(x.lot)+'</b><div>'+esc(displayQtyForLot(x))+'</div><div>'+esc(x.typeDate==='Sans date'?'Sans date':x.ddm||'Péremption manquante')+(!HealthRules.allowed(x,localDay())?' • <b>SORTIE BLOQUÉE</b>':'')+'</div></div>';}
 renderLocationStock=function(){if(!activeLocation)return;const rows=allLots().filter(x=>currentQtyForLot(x)>0&&(currentLocationForLot(x.lot)||x.emplacement)===activeLocation).sort(HealthRules.compare);$('locationStock').innerHTML=rows.map(lotCard).join('')||'<div class="empty">Aucun lot disponible à cet emplacement.</div>';};
 showLocationView=function(){const loc=$('locationViewSelect').value,rows=allLots().filter(x=>(currentLocationForLot(x.lot)||x.emplacement)===loc&&($('showEmptyLocationLots').checked||currentQtyForLot(x)>0)).sort(HealthRules.compare);$('locationViewResult').innerHTML=rows.map(lotCard).join('')||'<div class="empty">Aucun lot disponible à cet emplacement.</div>';};
 $('showExpiryBtn').onclick=showExpiryAlerts;$('locationViewBtn').onclick=showLocationView;$('locationViewSelect').addEventListener('change',()=>showLocationView());$('showEmptyLocationLots').addEventListener('change',()=>showLocationView());
 const previousApply=applySanteReadOnlyControls;applySanteReadOnlyControls=function(){
  previousApply();for(const id of ['startBtn','quickProductScanBtn','quickScanBtn','exitScanBtn','moveScanBtn','inventoryConfirmBtn','importStockBtn','clearCatalogBtn','restoreBackupBtn','previewRestoreBtn','cloudUrl','cloudKey','saveCloudUrlBtn','testCloudBackupBtn','toggleCloudBackupBtn'])if($(id))$(id).disabled=true;
  $('resetReorderBaselineBtn').disabled=!healthServerReady||guestModeEnabled()||!allLots().some(x=>currentQtyForLot(x)>0);
  for(const id of ['quickSaveBtn','saveOrderBtn','confirmReceiveBtn','exitConfirmBtn','assignLotBtn','moveLotBtn'])if($(id))$(id).disabled=!healthServerReady||guestModeEnabled();
  document.querySelectorAll('[data-reorder]').forEach(b=>b.disabled=true);
  const banner=$('healthStage');if(banner)banner.textContent=healthServerReady?'Santé • sorties par boîte entière • priorité aux péremptions. Scanner et sauvegarde Drive à configurer ensuite.':'Synchronisez la connexion Santé pour activer les entrées et sorties. Aucun changement de clé nécessaire.';
 };
 // All old write handlers are replaced: no optimistic local stock mutations.
 $('quickSaveBtn').onclick=saveQuickEntry;$('saveOrderBtn').onclick=saveOrder;$('confirmReceiveBtn').onclick=confirmReceive;$('exitConfirmBtn').onclick=confirmStockExit;
 $('qProduct').addEventListener('change',()=>toggleQuickNewProduct());
 $('exitLotSelect').addEventListener('change',()=>showExitLotInfo());
 $('fifoSearchBtn').onclick=showFifoView;$('fifoProductSelect').addEventListener('change',()=>showFifoView());
 $('qQty').addEventListener('input',()=>updateFields('q'));$('qPerBox').addEventListener('input',()=>updateFields('q'));
 for(const p of ['q','r'])updateFields(p);
 populateOrderProducts();populateQuickProducts();populateExitLocations();populateExitControls();applySanteReadOnlyControls();
 showPane('quickPane');
})();
