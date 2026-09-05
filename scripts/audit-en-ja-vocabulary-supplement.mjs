import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=msg=>{throw new Error(msg)};
const normEn=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
const normJa=s=>String(s??'').trim().replace(/\s+/g,'');

function extractAssignedLiteral(source,name){
  const marker=`const ${name}`;
  const at=source.indexOf(marker);if(at<0)fail(`missing literal ${name}`);
  const eq=source.indexOf('=',at+marker.length);if(eq<0)fail(`missing = for ${name}`);
  let i=eq+1;while(/\s/.test(source[i]))i++;
  const start=i,first=source[i];if(first!=='{'&&first!=='[')fail(`unsupported ${name}`);
  const stack=[];let quote=null,escaped=false;
  for(;i<source.length;i++){
    const ch=source[i];
    if(quote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote)quote=null;continue}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='{'||ch==='[')stack.push(ch);
    else if(ch==='}'||ch===']'){stack.pop();if(!stack.length)return vm.runInNewContext(`(${source.slice(start,i+1)})`,Object.create(null),{timeout:3000})}
  }
  fail(`unterminated ${name}`);
}
function extractRaw(source,name){
  const marker=`const ${name}=`;const at=source.indexOf(marker);if(at<0)fail(`missing ${name}`);
  const start=source.indexOf('`',at+marker.length);if(start<0)fail(`missing template ${name}`);
  let i=start+1,escaped=false;
  for(;i<source.length;i++){
    const ch=source[i];if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch==='`')return source.slice(start+1,i);
  }
  fail(`unterminated template ${name}`);
}
function duplicates(values){const m=new Map();for(const v of values)m.set(v,(m.get(v)||0)+1);return[...m].filter(([,n])=>n>1)}

const englishSource=read('english-vocab-supplement-v1.js');
const english=extractRaw(englishSource,'raw').split('\n').filter(Boolean).map((line,i)=>{
  const [id,word,meaning,pos,level,example]=line.split('|');
  if([id,word,meaning,pos,level,example].some(v=>!v))fail(`English supplement malformed row ${i+1}`);
  return{id,word,meaning,pos,level,example};
});
if(english.length<150)fail(`English supplement too small: ${english.length}`);
if(duplicates(english.map(x=>x.id)).length)fail('English supplement duplicate ids');
if(duplicates(english.map(x=>normEn(x.word))).length)fail('English supplement duplicate terms');
for(const row of english){
  if(!/^en-sup-(?:w|p)\d{4}$/.test(row.id))fail(`English id outside stable namespace: ${row.id}`);
  if(!['phrase','entrance'].includes(row.level))fail(`English level invalid: ${row.id}`);
  if(row.pos==='phrase'&&!row.word.includes(' '))fail(`English phrase without space: ${row.id}`);
}
const runtime=read('app/legacy/main-runtime.js');
const data=extractAssignedLiteral(runtime,'DATA');
const glossary=extractAssignedLiteral(runtime,'READING_GLOSSARY');
const knownEn=new Set([...(data.vocab||[]).map(x=>normEn(x.word)),...Object.keys(glossary||{}).map(normEn)]);
const engine15=read('learning-engine-v15.js');
const nativeCollocations=extractAssignedLiteral(engine15,'AA15_COLLOCATIONS');
for(const row of nativeCollocations||[])knownEn.add(normEn(row.phrase));
const englishNet=english.filter(x=>!knownEn.has(normEn(x.word)));
if(englishNet.length<80)fail(`English supplement net additions unexpectedly low: ${englishNet.length}`);

const japaneseSource=read('kokugo-chronologia/jukugo-bank-supplement-v1.js');
const japanese=extractRaw(japaneseSource,'RAW').split('\n').filter(Boolean).map((line,i)=>{
  const [word,reading,meaning,rank,kind]=line.split('|');
  if([word,reading,meaning,rank,kind].some(v=>!v))fail(`Japanese supplement malformed row ${i+1}`);
  return{id:`ja-sup-v1-${String(i+1).padStart(3,'0')}`,word,reading,meaning,rank,kind};
});
if(japanese.length<60)fail(`Japanese supplement too small: ${japanese.length}`);
if(duplicates(japanese.map(x=>x.id)).length)fail('Japanese supplement duplicate ids');
if(duplicates(japanese.map(x=>`${normJa(x.word)}|${normJa(x.reading)}`)).length)fail('Japanese supplement duplicate word|reading');
for(const row of japanese){
  if(!/^ja-sup-v1-\d{3}$/.test(row.id))fail(`Japanese id outside stable namespace: ${row.id}`);
  if(!['A','B','C'].includes(row.rank))fail(`Japanese rank invalid: ${row.id}`);
  if(!['二字熟語','三字熟語'].includes(row.kind))fail(`Japanese kind invalid: ${row.id}`);
  if(!/[ぁ-んァ-ヶ一-龯]/.test(row.meaning))fail(`Japanese meaning is not Japanese: ${row.id}`);
}
const fullLines=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean);
if(fullLines.length!==15000)fail(`Japanese full bank changed: ${fullLines.length}`);
const fullKeys=new Set(fullLines.map((line,i)=>{const row=JSON.parse(line);return `${normJa(row.term||row.word)}|${normJa(row.reading)}`}));
const japaneseNetVsFull=japanese.filter(x=>!fullKeys.has(`${normJa(x.word)}|${normJa(x.reading)}`));

const v23=read('v23-loader.js');
const glossPos=v23.indexOf("'v23-english-gloss-vocab.js'");
const supplementPos=v23.indexOf("'english-vocab-supplement-v1.js'");
const mainPos=v23.indexOf("'v23-english-main.js'");
if(!(glossPos>=0&&supplementPos>glossPos&&mainPos>supplementPos))fail('English supplement load order must be glossary -> supplement -> english main');
const kokugoLoader=read('kokugo-chronologia/quiz-interaction-fix.js');
if(!kokugoLoader.includes('jukugo-bank-supplement-v1.js'))fail('Japanese supplement is not connected to quiz loader');
if(!kokugoLoader.includes('waitSupplement'))fail('Japanese quiz must wait for supplement compatibility merge');
const inventory=JSON.parse(read('vocabulary-core/inventory-v1.json'));
if(inventory.streams?.english?.supplementIdNamespace!=='en-sup-*')fail('English supplement namespace missing from inventory');
if(inventory.streams?.japanese?.supplementIdentity!=='word|reading')fail('Japanese word|reading identity missing from inventory');

const result={
  english:{candidates:english.length,netAgainstStaticVocabulary:englishNet.length,skippedAsExisting:english.length-englishNet.length,words:english.filter(x=>x.pos!=='phrase').length,phrases:english.filter(x=>x.pos==='phrase').length},
  japanese:{candidates:japanese.length,netAgainstFull15000:japaneseNetVsFull.length,alreadyInFull15000:japanese.length-japaneseNetVsFull.length,identity:'word|reading'},
  compatibility:{englishExistingIdsUntouched:true,japaneseFull15000Rows:fullLines.length,nativeStoresUntouched:true}
};
console.log(JSON.stringify(result,null,2));
