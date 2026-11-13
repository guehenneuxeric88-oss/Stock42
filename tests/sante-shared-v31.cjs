const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const makeSheet=()=>({rows:[['headers']],failNextAppend:false,getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())}},getLastRow(){return this.rows.length},getRange(r,c,n=1,k=1){const self=this;return {setValues(v){v.forEach((row,i)=>{self.rows[r+i-1]??=[];row.forEach((v,j)=>self.rows[r+i-1][c+j-1]=v)});return this},getValues(){return Array.from({length:n},(_,i)=>Array.from({length:k},(_,j)=>self.rows[r+i-1]?.[c+j-1]??''))},setNumberFormat(){return this}}},appendRow(row){if(this.failNextAppend){this.failNextAppend=false;throw Error('simulated outage')}this.rows.push(row)}});
const lots=makeSheet(),moves=makeSheet(),props={SANTE_API_TOKEN:'test-only-secret'};
const ss={getId:()=> '1kcr4LWpIyWEKYYUXglsMdENVqnHpY_qwGC3s3UFawwo',getSheetByName:n=>n==='Réception & lots Santé'?lots:moves};
const ctx={console,SpreadsheetApp:{openById:()=>ss,flush(){}},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k]})},Utilities:{formatDate:d=>d.toISOString().slice(0,10),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s).digest()]}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../apps-script/Stock42SanteTest.gs'),'utf8'),ctx);
const token=props.SANTE_API_TOKEN,now=new Date('2026-11-13T16:00:00Z'),uid=()=>crypto.randomBytes(16).toString('hex');
for(const [id,size,expiry,maker] of [['S0001','L','2031-03-31','26000278'],['S0002','M','2031-03-30','ZFROM2603']]){lots.rows.push([id,now,'Gants nitrile — '+size,'Protection / EPI',500,'gant',new Date(expiry),'Péremption','','','Site 42','À ranger','À ranger','Boîte de 100',maker,'','']);moves.rows.push([now,id,'Gants nitrile','Entrée',500,'gant','','','Test iPhone','test','entry_'+id,now,0]);}
moves.rows.push([now,'S0001','Gants nitrile','Retour / annulation de sortie',100,'gant','','','test','test','return_legacy',now,100],[now,'S0001','Gants nitrile','Sortie',100,'gant','','','reconstituée','test','legacy_exit_return_legacy',now,-100]);
const read=()=>ctx.santeLire(token);const act=c=>ctx.santeAgir(token,c);
assert.throws(()=>ctx.santeLire('bad'),/incorrecte/);let s=read();assert.equal(s.lots.reduce((n,l)=>n+l.quantity,0),1000);assert.equal(s.events.find(e=>e.uid==='return_legacy').reversesUid,'legacy_exit_return_legacy');
const command={action:'sortie',uid:uid(),id:'S0001',quantity:100,revision:s.revision};s=act(command);assert.equal(s.lots[0].quantity,400);const rows=moves.rows.length;
s=act(command);assert.equal(moves.rows.length,rows);assert.equal(s.lots[0].quantity,400);
assert.throws(()=>act({...command,quantity:200}),/autre opération/);
assert.throws(()=>act({...command,uid:uid()}),/stock a changé/);
assert.throws(()=>act({action:'sortie',uid:uid(),id:'S0001',quantity:999,revision:s.revision}),/indisponible/);
s=act({action:'retour',uid:uid(),id:'S0001',reversesUid:command.uid,revision:s.revision});assert.equal(s.lots[0].quantity,500);
assert.throws(()=>act({action:'retour',uid:uid(),id:'S0001',reversesUid:command.uid,revision:s.revision}),/déjà annulée/);
const entry={action:'entree',uid:uid(),size:'M',quantity:200,expiry:'2032-01-01',revision:s.revision};
moves.failNextAppend=true;assert.throws(()=>act(entry),/simulated outage/);assert.ok(props.SANTE_PENDING);s=read();assert.equal(props.SANTE_PENDING,undefined);assert.equal(s.lots.length,3);assert.equal(s.lots[2].quantity,200);s=act(entry);assert.equal(s.lots.length,3);assert.equal(s.events.filter(e=>e.uid===entry.uid).length,1);
assert.throws(()=>act({action:'entree',uid:uid(),size:'L',quantity:100,expiry:'2031-02-30',revision:s.revision}),/Péremption/);
assert.throws(()=>act({action:'entree',uid:uid(),size:'L',quantity:100,expiry:'2020-01-01',revision:s.revision}),/Péremption/);
// Échec après écriture effective : la reprise ne doit pas ajouter deux lignes.
const originalAppend=moves.appendRow;moves.appendRow=function(row){originalAppend.call(this,row);this.appendRow=originalAppend;throw Error('lost acknowledgement')};
const cmd2={action:'sortie',id:'S0002',quantity:10,uid:uid(),revision:s.revision};assert.throws(()=>act(cmd2),/lost acknowledgement/);s=read();assert.equal(s.lots[1].quantity,490);assert.equal(s.events.filter(e=>e.uid===cmd2.uid).length,1);assert.equal(act(cmd2).lots[1].quantity,490);
// Un lot périmé est consultable mais non consommable.
lots.rows[1][6]=new Date('2020-01-01');s=read();assert.throws(()=>act({action:'sortie',id:'S0001',quantity:1,uid:uid(),revision:s.revision}),/périmé/);
console.log('PASS: authentification, reprise 1000 gants/V2, sorties et annulations, double envoi, conflit entre appareils, surconsommation, dates, réception et reprise après deux types de panne, blocage périmés.');
// Emplacements V3.2 : mêmes codes que V55, sans aucun accès au classeur alimentaire.
s=read();assert.equal(s.locations.length,78);assert.ok(s.locations.includes('42-R1-N5-C'));assert.ok(s.locations.includes('38-ETAGE-18'));
const firstQuantity=s.lots[0].quantity;
const transfer={action:'rangement',uid:uid(),id:'S0001',location:'38 etage 01',revision:s.revision};s=act(transfer);assert.equal(s.lots[0].site,'Site 38');assert.equal(s.lots[0].location,'38-ETAGE-01');assert.equal(s.lots[0].status,'Rangé');assert.equal(s.lots[0].quantity,firstQuantity);const transferRows=moves.rows.length;
assert.equal(s.events.find(e=>e.uid===transfer.uid).impact,0);assert.equal(s.events.find(e=>e.uid===transfer.uid).source,'À ranger');assert.equal(s.events.find(e=>e.uid===transfer.uid).destination,'38-ETAGE-01');
act(transfer);assert.equal(moves.rows.length,transferRows);
assert.throws(()=>act({...transfer,uid:uid(),revision:s.revision}),/déjà à cet emplacement/);
assert.throws(()=>act({...transfer,uid:uid(),location:'38-ETAGE-19',revision:s.revision}),/Emplacement inconnu/);
assert.throws(()=>act({...transfer,uid:uid(),location:'https://example.com/42-R1-N1-A',revision:s.revision}),/Emplacement inconnu/);
moves.failNextAppend=true;const moveBack={action:'rangement',uid:uid(),id:'S0001',location:'42-R1-N5-C',revision:s.revision};assert.throws(()=>act(moveBack),/simulated outage/);assert.equal(lots.rows[1][10],'Site 42');s=read();assert.equal(s.lots[0].location,'42-R1-N5-C');assert.equal(s.lots[0].site,'Site 42');assert.equal(s.lots[0].quantity,firstQuantity);assert.equal(s.events.filter(e=>e.uid===moveBack.uid).length,1);assert.equal(act(moveBack).lots[0].quantity,firstQuantity);
assert.throws(()=>act({...transfer,uid:uid(),location:'38-ETAGE-02'}),/stock a changé/);
s=act({action:'rangement',uid:uid(),id:'S0001',location:'À ranger',revision:s.revision});assert.equal(s.lots[0].status,'À ranger');assert.equal(s.lots[0].site,'Site 42');
s=act({action:'entree',uid:uid(),size:'M',quantity:100,expiry:'2032-10-01',location:'38-ETAGE-02',revision:s.revision});assert.equal(s.lots.at(-1).site,'Site 38');assert.equal(s.lots.at(-1).status,'Rangé');
console.log('PASS: 78 codes réutilisés, transferts 42/38, sites et statuts, impact nul, QR invalide/URL refusés, reprise après interruption, idempotence, conflit, réception directe au 38.');
