/* Shared, deterministic inventory rules. No treatment or dosing recommendations. */
var HealthRules=(function(){
  const categories=['Médicaments','Pansements / soins','Protection / EPI','Hygiène','Matériel médical','Autre'];
  const units=['boîte','paquet','flacon','tube','sachet','unité','g','ml','L'];
  const counts=['boîte','paquet','flacon','tube','sachet','unité'];
  function text(v,max){return String(v==null?'':v).trim().slice(0,max||200);}
  function number(v){const s=String(v==null?'':v).trim().replace(',','.');return /^\d+(?:\.\d+)?$/.test(s)?Number(s):NaN;}
  function date(v){
    const s=text(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/)||s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    let y,mo,d;
    if(m){if(m[1].length===4){y=+m[1];mo=+m[2];d=+m[3];}else{y=+m[3];mo=+m[2];d=+m[1];}}
    else{const mm=s.match(/^(\d{2})\/(\d{4})$/);if(!mm)return '';mo=+mm[1];y=+mm[2];d=new Date(Date.UTC(y,mo,0)).getUTCDate();}
    if(y<2000||y>2199||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate())return '';
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }
  function details(raw){const h=raw||{};return {name:text(h.name),dosage:text(h.dosage,60),form:text(h.form,60),kind:h.kind==='gloves'?'gloves':'other',size:text(h.size,10),material:text(h.material,30),perBox:number(h.perBox)||null,contentUnit:text(h.contentUnit,30),barcode:text(h.barcode,60)};}
  function productName(name,h,category){
    h=details(h);let out=text(name);
    if(category==='Médicaments'){if(h.dosage&&!out.toLowerCase().includes(h.dosage.toLowerCase()))out+=' — '+h.dosage;if(h.form&&!out.toLowerCase().includes(h.form.toLowerCase()))out+=' — '+h.form;}
    if(h.kind==='gloves'){if(h.material&&!out.toLowerCase().includes(h.material.toLowerCase()))out+=' — '+h.material;if(h.size&&!out.toUpperCase().includes('TAILLE '+h.size.toUpperCase()))out+=' — taille '+h.size;}
    return out;
  }
  function validateEntry(raw){
    const x=raw||{},h=details(x.health),qty=number(x.quantite),unit=text(x.unite),category=text(x.categorie),name=text(x.produit);
    if(!name||!categories.includes(category)||!units.includes(unit))throw Error('Produit, catégorie et unité Santé sont obligatoires.');
    if(!Number.isFinite(qty)||qty<=0||(counts.includes(unit)&&!Number.isSafeInteger(qty)))throw Error('Saisissez un nombre entier positif de boîtes ou de contenants.');
    if(category==='Médicaments'&&(!h.dosage||!h.form))throw Error('Renseignez le dosage et la forme du médicament.');
    if(h.kind==='gloves'&&(!h.size||!h.material||unit!=='boîte'||!Number.isSafeInteger(h.perBox)||h.perBox<=0))throw Error('Gants : indiquez la taille, la matière et le nombre de gants par boîte. Le stock est suivi en boîtes entières.');
    if(unit==='boîte'&&(!Number.isSafeInteger(h.perBox)||h.perBox<=0||!h.contentUnit))throw Error('Indiquez le contenu et le nombre d’unités par boîte.');
    const type=x.typeDate==='Sans date'?'Sans date':'Péremption',expiry=type==='Sans date'?'':date(x.ddm);
    if(type==='Sans date'&&category==='Médicaments')throw Error('La péremption est obligatoire pour un médicament.');
    if(type!=='Sans date'&&!expiry)throw Error('Péremption invalide : utilisez JJ/MM/AAAA ou MM/AAAA.');
    if(type==='Sans date'&&text(x.ddm))throw Error('Effacez la date ou choisissez Péremption.');
    return {...x,produit:productName(name,h,category),categorie:category,quantite:qty,unite:unit,ddm:expiry,typeDate:type,health:h,conditionnement:unit==='boîte'?h.perBox+' '+h.contentUnit+' par boîte':text(x.conditionnement)};
  }
  function allowed(x,today){return x.typeDate==='Sans date'||!!date(x.ddm)&&date(x.ddm)>=today;}
  function compare(a,b){return (date(a.ddm)||'9999').localeCompare(date(b.ddm)||'9999')||(date(a.dateReception)||'9999').localeCompare(date(b.dateReception)||'9999')||String(a.lot).localeCompare(String(b.lot));}
  return {categories,units,counts,text,number,date,details,productName,validateEntry,allowed,compare};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HealthRules;
