/* One camera session, stopped on result, cancellation, navigation or page hide. */
(function(){
 let sequence=0,mode='',busy=false,reader=null,controls=null;
 const labels={product:'Scanner le code-barres du produit',quick:'Scanner l’emplacement du nouveau lot',exit:'Scanner l’emplacement de sortie',move:'Scanner le nouvel emplacement',stock:'Scanner un emplacement'};
 $('status').insertAdjacentHTML('afterend','<div class="field"><label for="healthScanManual">Ou saisir le code manuellement</label><input id="healthScanManual" autocomplete="off" autocapitalize="off" spellcheck="false"><button id="healthScanRead" class="btn secondary" type="button" style="margin-top:8px">Lire le code</button></div>');
 $('qBarcode').insertAdjacentHTML('afterend','<button id="healthBarcodeRead" class="btn secondary" type="button" style="margin-top:8px">Rappeler le produit par ce code</button>');
 function hint(text){$('status').textContent=text;}
 function stopTracks(){const video=$('productReader');if(video.srcObject?.getTracks)video.srcObject.getTracks().forEach(t=>t.stop());try{video.pause();}catch(e){}video.srcObject=null;}
 async function stop(){
  sequence++;busy=false;const old=controls;controls=null;productScannerControls=null;productScanner=null;
  try{await old?.stop();}catch(e){}stopTracks();reader=null;running=false;
  quickProductScanMode=false;quickScanMode=false;exitScanMode=false;moveScanMode=false;
  $('productReader').classList.add('hidden');$('reader').classList.add('hidden');
  $('startBtn').disabled=guestModeEnabled();$('stopBtn').disabled=true;document.body.classList.remove('scanner-active');
 }
 function configure(next){
  mode=next;document.body.classList.add('scanner-active');$('scannerTitle').textContent=labels[next];
  $('reader').classList.add('hidden');$('productReader').classList.remove('hidden');
  $('healthScanManual').value='';$('healthScanManual').inputMode=next==='product'?'numeric':'text';
  $('healthScanManual').placeholder=next==='product'?'EAN, UPC ou GTIN de la boîte':'Ex. 42-R2-N3-B ou 38-ETAGE-01';
  $('startBtn').textContent='Démarrer la caméra';$('stopBtn').disabled=false;
 }
 async function applyProduct(parsed){
  const barcode=parsed.barcode;
  // Fill only identification. Name/dosage/expiry/lot always remain reviewable.
  const local=productReferences().find(p=>HealthScanCodes.canonicalGtin(p.barcode||p.health?.barcode)===barcode);
  if(local){$('qProduct').value=local.name;toggleQuickNewProduct();}
  else{$('qProduct').value='__new__';toggleQuickNewProduct();$('qNewProduct').value='';}
  $('qQty').value='';$('qExpiry').value='';$('qMakerLot').value='';$('qDateType').value='Péremption';$('qExpiry').disabled=false;$('qTotal').textContent='';
  $('qBarcode').value=barcode;quickScannedBarcode=barcode;quickScannedBrand=local?.brand||'';
  $('qBarcodeInfo').textContent=(parsed.gs1?'GS1 / DataMatrix — ':'Code-barres — ')+barcode+(local?' • Produit connu : '+local.name:' • Nouveau produit : complétez sa fiche une première fois.');
  $('quickStatus').textContent=local?'✓ Produit rappelé. Vérifiez le contenu par boîte, la péremption et le lot fabricant avant de valider.':'✓ Code lu. Saisissez le nom et les caractéristiques du produit ; le code sera mémorisé avec le lot. Aucune recherche alimentaire.';
  setAppView('entries',false);showPane('quickPane');$('quickPane').scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function accept(raw,next=mode){
  if(busy)return false;
  const parsed=next==='product'?HealthScanCodes.product(raw):HealthScanCodes.location(raw);
  if(!parsed){hint(next==='product'?'Code produit non reconnu. Visez les barres ou le DataMatrix de la boîte, ou saisissez les chiffres imprimés.':'QR non reconnu : utilisez un emplacement officiel du 42 ou du 38.');return false;}
  busy=true;await stop();mode=next;
  if(navigator.vibrate)navigator.vibrate(60);
  if(next==='product')await applyProduct(parsed);
  else if(next==='quick'){$('qLocation').value=parsed;$('quickStatus').textContent='✓ Emplacement lu : '+parsed+'. Vérifiez puis créez le lot.';setAppView('entries',false);showPane('quickPane');$('quickPane').scrollIntoView({behavior:'smooth',block:'start'});}
  else if(next==='exit'){setExitLocation(parsed);$('exitStatus').textContent='✓ Emplacement lu : '+parsed+'. Choisissez la boîte à sortir.';setAppView('exits',false);$('exitCard').scrollIntoView({behavior:'smooth',block:'start'});}
  else if(next==='move'){$('moveDestinationSelect').value=parsed;$('moveStatus').textContent='✓ Destination lue : '+parsed+'. Confirmez le déplacement après vérification.';setAppView('stock',false);$('moveCard').scrollIntoView({behavior:'smooth',block:'start'});}
  else{setAppView('stock',false);showResult(parsed);}
  return true;
 }
 async function open(next){
  if(guestModeEnabled())return;
  await stop();configure(next);const session=sequence;
  $('scannerCard').scrollIntoView({behavior:'smooth',block:'start'});hint('Autorisez la caméra si Safari le demande, puis visez le code.');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('camera-unavailable');
   if(!window.ZXingBrowser?.BrowserMultiFormatReader)throw Error('decoder-unavailable');
   reader=new ZXingBrowser.BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:150,delayBetweenScanSuccess:500});
   const active=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('productReader'),(result,error,callbackControls)=>{
    if(session!==sequence||busy||!result)return;
    controls=callbackControls||controls;productScannerControls=controls;
    const text=typeof result.getText==='function'?result.getText():String(result.text||'');
    accept(text,next).catch(()=>hint('Lecture interrompue. Réessayez ou utilisez la saisie manuelle.'));
   });
   if(session!==sequence){await active.stop();return;}
   controls=active;productScannerControls=active;productScanner=reader;running=true;
   $('startBtn').disabled=true;hint(next==='product'?'Visez le code-barres ou le DataMatrix de la boîte. La lecture ne valide aucune entrée.':'Visez le QR de l’emplacement. La lecture ne déplace et ne sort aucun produit.');
  }catch(e){
   if(session!==sequence)return;
   await stop();configure(next);$('productReader').classList.add('hidden');
   const denied=['NotAllowedError','PermissionDeniedError'].includes(e?.name);
   hint(denied?'Accès caméra refusé. Autorisez la caméra pour ce site dans Safari, ou utilisez la saisie manuelle ci-dessous.':'Caméra indisponible. Réessayez ou utilisez la saisie manuelle ci-dessous.');
  }
 }
 stopScanner=stop;stopProductScanner=stop;
 startQuickProductScanner=()=>open('product');startQuickScanner=()=>open('quick');startExitScanner=()=>open('exit');
 startMoveScanner=()=>{if(!$('moveLotSelect').value){$('moveStatus').textContent='Choisissez d’abord un lot à déplacer.';return;}return open('move');};
 startScanner=()=>open(mode||'stock');
 // Preserve the global manual stock reader; replace the product path entirely.
 handleQuickProductBarcode=raw=>{const p=HealthScanCodes.product(raw);return p?applyProduct(p):Promise.resolve($('quickStatus').textContent='Code produit invalide. Vérifiez les chiffres de la boîte.');};
 $('quickProductScanBtn').onclick=startQuickProductScanner;$('quickScanBtn').onclick=startQuickScanner;$('exitScanBtn').onclick=startExitScanner;$('moveScanBtn').onclick=startMoveScanner;
 $('startBtn').onclick=()=>open(mode||'stock');$('stopBtn').onclick=async()=>{await stop();hint('Scanner arrêté.');};
 $('healthScanRead').onclick=()=>accept($('healthScanManual').value,mode||'stock');
 $('healthScanManual').addEventListener('keydown',e=>{if(e.key==='Enter')accept(e.target.value,mode||'stock');});
 $('healthBarcodeRead').onclick=()=>handleQuickProductBarcode($('qBarcode').value);
 for(const b of document.querySelectorAll('#mainNav button[data-view]')){const previous=b.onclick;b.onclick=async e=>{await stop();mode='stock';await previous(e);};}
 window.addEventListener('pagehide',()=>stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 const previousControls=applySanteReadOnlyControls;applySanteReadOnlyControls=function(){previousControls();for(const id of ['quickProductScanBtn','quickScanBtn','exitScanBtn','moveScanBtn'])$(id).disabled=guestModeEnabled();$('startBtn').disabled=running||guestModeEnabled();if(healthServerReady)$('healthStage').textContent='Santé • scanner produit et emplacement • sorties par boîte entière • priorité aux péremptions.';};
 applySanteReadOnlyControls();
})();
