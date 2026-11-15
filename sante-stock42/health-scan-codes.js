/* Local identification only: never look up health products in a food database. */
var HealthScanCodes=(function(){
 function canonicalGtin(code){
  const s=String(code||'').trim();if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s))return '';
  let sum=0,weight=3;for(let i=s.length-2;i>=0;i--){sum+=Number(s[i])*weight;weight=weight===3?1:3;}
  return (10-sum%10)%10===Number(s[s.length-1])?s.padStart(14,'0'):'';
 }
 function product(raw){
  let s=String(raw||'').trim();if(s.length>2048)return null;
  let gs1=false;if(/^\]d2|^\]C1|^\]Q3/.test(s)){s=s.slice(3);gs1=true;}
  s=s.replace(/^\x1d/,'');
  let code=s;
  const tagged=s.match(/^\(01\)(\d{14})(?=\(|$)/);
  const machine=s.match(/^01(\d{14})(?=\d|\x1d|$)/);
  if(tagged){code=tagged[1];gs1=true;}else if(machine&&s.length>=16){code=machine[1];gs1=true;}
  const barcode=canonicalGtin(code);return barcode?{barcode,gs1}:null;
 }
 function location(raw){const s=String(raw||'').trim().toUpperCase();return /^(?:42-R[1-3]-N[1-5]-[ABC]|38-ETAGE-(?:0[1-9]|1[0-8])|42-CONGELATEUR-0[1-6]|42-FRIGO-0[1-5]|42-GARAGE-0[1-4])$/.test(s)?s:'';}
 return {canonicalGtin,product,location};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HealthScanCodes;
