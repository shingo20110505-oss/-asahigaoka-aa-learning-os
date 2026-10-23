import fs from 'node:fs/promises';
import {newReadings} from './reading-new-passages.mjs';
import {middleReadings} from './reading-new-passages-middle.mjs';
import {advancedReadings} from './reading-new-passages-advanced.mjs';
import {wordCount} from '../src/reading-domain.mjs';
const root=new URL('../data/reading/',import.meta.url);
const index=JSON.parse(await fs.readFile(new URL('index.json',root),'utf8')).filter(x=>!x.id.startsWith('rise-20261023-'));
const additions=[...newReadings,...middleReadings,...advancedReadings];
for(const [i,entry] of additions.entries()){
 const id='rise-20261023-'+String(i+1).padStart(3,'0'),{paragraphs,...fields}=entry;
 const book={id,...fields,passage:paragraphs.map(p=>p[0]).join('\n\n'),translation:paragraphs.map(p=>p[1]).join('\n\n'),origin:'RISE original',addedAt:'2026-10-23'};
 for(const q of book.questions)if(!book.passage.includes(q.evidence)||!q.options[q.answer])throw Error('Invalid question: '+id);
 await fs.writeFile(new URL(id+'.json',root),JSON.stringify(book,null,2)+'\n');
 index.push({id,title:book.title,level:book.level,words:wordCount(book.passage),topic:book.topic,addedAt:book.addedAt,questionCount:book.questions.length});
}
await fs.writeFile(new URL('index.json',root),JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({added:additions.length,total:index.length,levels:Object.fromEntries([1,2,3,4,5].map(level=>[level,additions.filter(x=>x.level===level).length]))}));
