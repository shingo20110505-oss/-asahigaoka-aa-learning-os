import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFile(new URL(p,root),'utf8');
const normalize=s=>String(s).trim().toLowerCase().replaceAll('’',"'").replace(/\s+/g,' ');
const ranks=new Map((await read('scripts/english-sources/ngsl-1.2-stats.csv')).trim().split(/\r?\n/).slice(1).map(s=>{const [w,r]=s.split(',');return [normalize(w),Number(r)];}));
const lemmaRows=(await read('scripts/english-sources/ngsl-1.2-lemmas.csv')).split(/\r?\n/).filter(s=>s.trim()&&!s.startsWith('#')).map(s=>s.split(',').map(normalize));
const aliases=new Map(),forms=new Map();for(const [word,...rest]of lemmaRows){forms.set(word,rest);for(const form of rest)if(!ranks.has(form)&&!aliases.has(form))aliases.set(form,word);}
// Corpus token fragments are not spellings learners should memorize.
const fragments=new Set(['m','s','re','ve','d','ll','t','isn','aren','ain','wasn','weren','don','doesn','didn','haven','hasn','hadn','couldn','wouldn','shouldn','mustn','needn','shan','won']);
const entries=new Map(),counts={sourceRows:0,excludedProper:0,excludedMarked:0,excludedInvalid:0,formRows:0,variantRows:0};
const add=(word,meaning,extra={})=>{word=normalize(word);if(!word||!meaning)return;const old=entries.get(word);entries.set(word,{...old,word,meaning,...extra,sources:[...new Set([...(old?.sources||[]),...(extra.sources||[])])]});};
const clean=s=>s.replace(/[『』]/g,'').replace(/\{[^}]+\}/g,'').trim();
const inferPOS=s=>{const tags=[];for(const [re,pos]of [[/〈[CU]〉|\{名\}/,'n'],[/\{動\}|他動詞|自動詞/,'v'],[/\{形\}/,'adj'],[/\{副\}/,'adv'],[/\{前\}/,'prep'],[/\{接\}/,'conj'],[/\{代\}/,'pron']])if(re.test(s))tags.push(pos);return tags.join('/')||'unknown';};
for(const row of (await read('scripts/english-sources/ejdict.tsv')).split(/\r?\n/)){
 const i=row.indexOf('\t');if(i<0)continue;counts.sourceRows++;const raw=row.slice(0,i),meaning=row.slice(i+1).trim();
 if(/^[A-Z]/.test(raw)){counts.excludedProper++;continue;}
 if(/《(?:差別|卑|俗|軽べつ)|侮蔑|卑語|差別語/.test(meaning)){counts.excludedMarked++;continue;}
 const words=raw.split(',').map(normalize).filter(w=>/^[a-z]+(?:[ '-][a-z]+){0,5}$/.test(w));
 if(!words.length||!/[\u3040-\u30ff\u3400-\u9fff]/.test(meaning)){counts.excludedInvalid++;continue;}
 const word=words[0],target=aliases.get(word);
 // Inflections are searchable forms, never additional study headwords. Retain
 // independently attested NGSL homographs (left, found, etc.) as headwords.
 if(target&&!ranks.has(word)){forms.set(target,[...new Set([...(forms.get(target)||[]),...words])]);counts.formRows++;continue;}
 const inflected=meaning.match(/^([a-z][a-z '-]*)の(?:過去|複数|三人称|現在分詞)/);
 if(inflected&&!ranks.has(word)){const head=normalize(inflected[1]);forms.set(head,[...new Set([...(forms.get(head)||[]),...words])]);counts.formRows++;continue;}
 const variant=meaning.replace(/《[^》]*》/g,'').trim().match(/^=\s*([a-z][a-z'-]*)[.。]?$/);
 if(variant&&variant[1]!==word&&!ranks.has(word)){aliases.set(word,variant[1]);forms.set(variant[1],[...new Set([...(forms.get(variant[1])||[]),...words])]);counts.variantRows++;continue;}
 if(entries.has(word))continue;
 add(word,clean(meaning),{pos:inferPOS(meaning),sources:['ejdict'],quality:'dictionary-import',variants:words.slice(1)});
}
const language=await read('src/reading-language.mjs');
const object=name=>vm.runInNewContext('('+language.split(/\r?\n/).find(s=>s.startsWith('const '+name+'=')).slice(('const '+name+'=').length,-1)+')',Object.create(null),{timeout:1000});
const basic=object('basic');const posMap={'名詞':'n','動詞':'v','形容詞':'adj','副詞':'adv','前置詞':'prep','接続詞':'conj','代名詞':'pron','冠詞':'article','助動詞':'aux'};
for(const [word,[pos,meaning]]of Object.entries(basic))add(word,meaning,{pos:pos.split('・').map(p=>posMap[p]||p).join('/'),stage:'basic',sources:['rise'],quality:'rise-existing'});
const base=JSON.parse((await read('app/legacy/main-runtime.js')).split(/\r?\n/).find(s=>s.startsWith('const DATA = ')).slice(13,-1)).vocab;
const rawRows=async file=>(await read(file)).match(/const RAW=`([^`]+)`/s)[1].trim().split(/\r?\n/).map(s=>{const[word,meaning,pos,level,example]=s.split('|');return{word,meaning,pos,level,example};});
const curated=[...base,...await rawRows('english-vocabulary-supplement-v1.js'),...(await Promise.all([1,2,3,4].map(i=>rawRows(`english-vocabulary-supplement-v2-data-${i}.js`)))).flat()];
for(const x of curated){const word=normalize(x.word);if(aliases.has(word)&&!ranks.has(word))continue;add(word,x.meaning,{pos:x.pos,stage:x.level==='core'?'basic':x.level==='phrase'?'entrance':'entrance',sources:['rise'],quality:'rise-existing',example:x.example,related:x.family||[]});}
const lexicon=JSON.parse(await read('data/reading-lexicon.json'));
for(const[word,x]of Object.entries(lexicon)){if((!entries.has(word)||entries.get(word).quality==='dictionary-import')&&!aliases.has(word)&&/^[a-z]+(?:[ '-][a-z]+){0,5}$/.test(word))add(word,x.meaning,{pos:x.pos||'unknown',sources:['rise'],quality:'rise-existing',example:x.example});}
const overrides=JSON.parse(await read('scripts/english-sources/overrides.json'));
for(const x of overrides)add(x.word,x.meaning,{...x,sources:['rise-original'],quality:'authored'});
const phrasesText=await read('src/reading-explanations.mjs');const phraseRows=vm.runInNewContext('('+phrasesText.match(/const phraseRows\s*=\s*(\[[\s\S]*?\]);/)[1]+')',Object.create(null),{timeout:1000});
for(const[pattern,word,meaning,explanation]of phraseRows)add(word,meaning,{pos:'phrase',stage:'entrance',sources:['rise-original'],quality:'authored',explanation,pattern});
const missingNGSL=[...ranks.keys()].filter(w=>!entries.has(w));
const rows=[...entries.values()].map(x=>{
 const rank=ranks.get(x.word),stage=rank&&rank<=1000?'basic':x.stage||(rank?'entrance':'extension');
 const kind=x.word.includes(' ')?'phrase':'word';
 const capitalize=new Set(['i','january','february','march','april','may','june','july','august','september','october','november','december','monday','tuesday','wednesday','thursday','friday','saturday','sunday','english','japanese']);
 const display=['may','march'].includes(x.word)?x.word+' / '+x.word[0].toUpperCase()+x.word.slice(1):capitalize.has(x.word)?x.word[0].toUpperCase()+x.word.slice(1):x.word;
 return {id:'en-'+createHash('sha256').update(x.word).digest('hex').slice(0,16),...x,display,kind,stage,rank:rank||null,pos:x.pos||'unknown',forms:[...new Set([...(forms.get(x.word)||[]),...(x.variants||[])])].filter(w=>w!==x.word&&!fragments.has(w)),sources:[...new Set([...x.sources,...(rank?['ngsl']:[])])]};
}).sort((a,b)=>({basic:0,entrance:1,extension:2}[a.stage]-{basic:0,entrance:1,extension:2}[b.stage])||(a.rank||99999)-(b.rank||99999)||a.word.localeCompare(b.word,'en'));
const group=key=>Object.fromEntries([...new Set(rows.map(x=>x[key]))].map(k=>[k,rows.filter(x=>x[key]===k).length]));
const sources=[{id:'ejdict',title:'EJDict-hand',url:'https://github.com/kujirahand/EJDict',license:'CC0-1.0',revision:'9663055d59a8cb1a35078a71db7a09ff39305828'},{id:'ngsl',title:'NGSL 1.2 — Browne, Culligan & Phillips',url:'https://www.newgeneralservicelist.com/new-general-service-list',license:'CC-BY-SA-4.0'},{id:'rise',title:'RISEの既存語彙・読解辞書',license:'Existing project material; retained provenance'},{id:'rise-original',title:'RISE独自の補足',license:'CC-BY-SA-4.0'}];
const metadata={schema:1,version:'2026-10-27.1',license:'CC-BY-SA-4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/',sources,counts:{...counts,headwords:rows.length,kind:group('kind'),stage:group('stage'),forms:rows.reduce((n,x)=>n+x.forms.length,0),examples:rows.filter(x=>x.example).length,translatedExamples:rows.filter(x=>x.exampleJa).length,unclassifiedPOS:rows.filter(x=>x.pos==='unknown').length,ngslRanked:ranks.size,ngslCovered:ranks.size-missingNGSL.length},missingNGSL,scope:'中学基礎・高校入試準備から発展語まで。基本はNGSL頻度上位1000とRISE基礎語、入試準備は残りのNGSLと既存教材・熟語。学年別の公式指定語彙リストではありません。',limitations:['教科書全社・全版との照合は未実施。完全網羅を保証しません。','発展語には専門語・古い表現が含まれます。辞書移入語の語義と品詞は全件の人手校閲未実施。','品詞が判定できない語は未分類。例文・和訳は整備済みの語だけ表示します。','活用形と綴りの別形は見出し数に加算しません。NGSLに独立見出しがある同綴り異義語は保持します。']};
await fs.mkdir(new URL('data/english/',root),{recursive:true});
await fs.writeFile(new URL('data/english/words.json',root),JSON.stringify(rows));
await fs.writeFile(new URL('data/english/metadata.json',root),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata.counts));console.log('Missing ranked NGSL: '+missingNGSL.join(', '));
