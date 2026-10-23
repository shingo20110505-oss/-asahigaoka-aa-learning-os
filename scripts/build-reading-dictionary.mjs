import fs from 'node:fs/promises';
import {tokenize,lemmaCandidates} from '../src/reading-language.mjs';
const root=new URL('../',import.meta.url),sha='9663055d59a8cb1a35078a71db7a09ff39305828',cache=new URL('../../ejdict-cache/',import.meta.url);
await fs.mkdir(cache,{recursive:true});
const wanted=new Set();for(const file of await fs.readdir(new URL('data/reading/',root))){if(file==='index.json')continue;const book=JSON.parse(await fs.readFile(new URL('data/reading/'+file,root),'utf8'));for(const word of tokenize(book.passage))for(const lemma of lemmaCandidates(word.text))wanted.add(lemma);}
const entries={};for(let offset=0;offset<26;offset+=4){await Promise.all(Array.from({length:Math.min(4,26-offset)},(_,j)=>String.fromCharCode(97+offset+j)).map(async letter=>{const path=new URL(sha+'-'+letter+'.txt',cache);let text;try{text=await fs.readFile(path,'utf8');}catch{const r=await fetch(`https://raw.githubusercontent.com/kujirahand/EJDict/${sha}/src/${letter}.txt`);if(!r.ok)throw Error('Dictionary fetch failed: '+r.status);text=await r.text();await fs.writeFile(path,text);}for(const row of text.split(/\r?\n/)){const split=row.indexOf('\t');if(split<0)continue;const words=row.slice(0,split).split(','),meaning=row.slice(split+1).trim();for(const raw of words){const word=raw.trim().toLowerCase();if(wanted.has(word)&&meaning)entries[word]={meaning,source:'ejdict'};}}}));}
await fs.writeFile(new URL('data/reading-dictionary.json',root),JSON.stringify(entries));
console.log(JSON.stringify({entries:Object.keys(entries).length,source:'EJDict-hand / CC0',commit:sha}));
