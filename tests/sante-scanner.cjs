const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{boot}=require('./sante-stock42-clone.cjs'),codes=require('../sante-stock42/health-scan-codes.js');
const fixtures=require('./fixtures/health-scan-symbols.json');
// Exercise the real bundled decoder on generated symbol pixels, not on mocked text.
global.window={};const decoder=require('../sante-stock42/vendor/zxing-browser-0.2.1.min.js');
for(const f of fixtures){const w=(f.rows[0].length+2*f.quiet)*f.scale,h=(f.rows.length+2*f.quiet)*f.scale,buf=new Uint8ClampedArray(w*h*4).fill(255);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(f.rows[Math.floor(y/f.scale)-f.quiet]?.[Math.floor(x/f.scale)-f.quiet]==='1'){const i=(y*w+x)*4;buf[i]=buf[i+1]=buf[i+2]=0;}const result=new decoder.BrowserMultiFormatReader().decodeFromCanvas({width:w,height:h,getContext(){return {getImageData(){return {data:buf};}};}});assert.equal(result.getText(),f.text,f.kind);}
const gtin='03400930000120';assert.equal(codes.product('3400930000120').barcode,gtin);assert.equal(codes.product(fixtures[1].text).barcode,gtin);assert.equal(codes.product(']d2'+fixtures[1].text).barcode,gtin);assert.equal(codes.product('(01)'+gtin+'(17)310331(10)EXAMPLE').barcode,gtin);
for(const v of ['3400930000129','https://evil.test/3400930000120','42-R3-N2-A','01000000000000BAD'])assert.equal(codes.product(v),null);
assert.equal(codes.location(' 38-etage-01 '),'38-ETAGE-01');assert.equal(codes.location('42-R9-N2-A'),'');
const tick=()=>new Promise(setImmediate);
(async()=>{
 const health={kind:'gloves',material:'Nitrile',size:'L',perBox:100,contentUnit:'gants',barcode:gtin};
 const b=boot({stock42SanteCloneProducts:JSON.stringify([{name:'Gants nitrile — taille L',category:'Protection / EPI',unit:'boîte',barcode:'3400930000120',health}])}),run=s=>vm.runInContext(s,b.context),$=id=>b.document.getElementById(id);
 b.document.defaultView.HTMLElement.prototype.scrollIntoView=function(){};
 for(const id of ['quickProductScanBtn','quickScanBtn','exitScanBtn','moveScanBtn','startBtn'])assert.equal($(id).disabled,false,id);
 await run('startQuickProductScanner()');assert.match($('status').textContent,/Caméra indisponible/);assert.equal(b.document.body.classList.contains('scanner-active'),true);
 $('healthScanManual').value='3400930000120';await $('healthScanRead').onclick();assert.equal($('qBarcode').value,gtin);assert.equal($('qProduct').value,'Gants nitrile — taille L');assert.equal($('qSize').value,'L');assert.equal($('qUnit').value,'boîte');assert.equal($('qQty').value,'');assert.equal(b.document.body.classList.contains('scanner-active'),false);
 await run("handleQuickProductBarcode('4006381333931')");assert.equal($('qProduct').value,'__new__');assert.match($('quickStatus').textContent,/Saisissez le nom/);assert.equal(b.requests.length,0);
 await run('startQuickScanner()');$('healthScanManual').value='42-R3-N2-A';await $('healthScanRead').onclick();assert.equal($('qLocation').value,'42-R3-N2-A');
 await run('startExitScanner()');$('healthScanManual').value='38-ETAGE-01';await $('healthScanRead').onclick();assert.equal(run('exitLocation'),'38-ETAGE-01');assert.equal(b.document.body.dataset.appView,'exits');assert.equal(b.requests.length,0);
 let stopped=0,callback,resolveCamera,opened=0;
 b.context.navigator.mediaDevices={getUserMedia(){}};
 b.context.MockReader=class{decodeFromConstraints(constraints,video,fn){opened++;assert.equal(constraints.audio,false);assert.equal(constraints.video.facingMode.ideal,'environment');callback=fn;return new Promise(r=>resolveCamera=r);}};
 run('ZXingBrowser={BrowserMultiFormatReader:MockReader};window.ZXingBrowser=ZXingBrowser');
 const opening=run('startQuickProductScanner()');await tick();await run('stopScanner()');resolveCamera({stop(){stopped++;}});await opening;assert.equal(stopped,1);assert.equal(run('running'),false);
 const live=run('startQuickScanner()');await tick();const control={stop(){stopped++;}};resolveCamera(control);await live;assert.equal(run('running'),true);callback({getText(){return '42-R3-N2-A';}},null,control);await tick();assert.equal($('qLocation').value,'42-R3-N2-A');assert.equal(run('running'),false);assert.equal(stopped,2);
 const before=opened,one=run('startQuickProductScanner()'),two=run('startQuickScanner()');await tick();assert.equal(opened-before,1);assert.match($('scannerTitle').textContent,/nouveau lot/);resolveCamera({stop(){stopped++;}});await Promise.all([one,two]);await run('stopScanner()');assert.equal(run('running'),false);
 assert.ok(!fs.readFileSync(__dirname+'/../sante-stock42/index.html','utf8').includes('openfoodfacts.org'));
 console.log('PASS: real EAN/QR/DataMatrix decoding, GTIN checksums, local product recall, QR routing, camera failure/cancel race/cleanup, no stock write and no food lookup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
