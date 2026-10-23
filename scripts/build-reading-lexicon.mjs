import fs from 'node:fs/promises';
// Reuse the existing RISE vocabulary without loading the legacy application.
const root=new URL('../',import.meta.url), entries={};
const add=(word,value)=>{entries[word.toLowerCase()]={...entries[word.toLowerCase()],...value};};
for(const name of ['v23-english-gloss1.js','v23-english-gloss2.js','v23-english-gloss3.js']){
 const text=await fs.readFile(new URL(name,root),'utf8');
 const object=text.match(/Object\.assign\(READING_GLOSSARY,(\{.*\})\);/s)?.[1];
 if(!object)throw Error('Missing glossary: '+name);
 for(const [word,meaning] of Object.entries(JSON.parse(object)))add(word,{meaning});
}
for(const name of ['english-vocabulary-supplement-v1.js','english-vocabulary-supplement-v2-data-1.js','english-vocabulary-supplement-v2-data-2.js']){
 const text=await fs.readFile(new URL(name,root),'utf8'),raw=text.match(/const RAW=`([^`]+)`/s)?.[1];
 if(!raw)throw Error('Missing vocabulary: '+name);
 for(const row of raw.trim().split(/\r?\n/)){const [word,meaning,pos,level,example]=row.split('|');if(word&&meaning)add(word,{meaning,pos,example});}
}
for(const row of (await fs.readFile(new URL('reading-lexicon-additions.txt',import.meta.url),'utf8')).trim().split(/\r?\n/)){const [word,meaning,pos]=row.split('|');add(word,{meaning,pos});}
await fs.writeFile(new URL('data/reading-lexicon.json',root),JSON.stringify(entries));
console.log('Preserved RISE vocabulary: '+Object.keys(entries).length+' entries');
