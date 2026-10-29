import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {geographyItems,geographyChapters} from '../src/geography-content.mjs';
import {geographyDrills} from '../src/geography/drills.mjs';
import {prefectures} from '../src/geography/places.mjs';
import {scienceItems,scienceUnits,scienceFields} from '../src/science-content.mjs';
import {classicalWords} from '../src/classical-words.mjs';
import {readingGuide} from '../src/reading-guide.mjs';
import {examTopics} from '../src/exam-content.mjs';
import {readingGrammar,readingPhrases,sentenceGuides} from '../src/reading-explanations.mjs';
import {historyTrails} from '../src/history-content.mjs';
import {features} from '../src/catalog.mjs';
import {exploreLessons,exploreExplanation,labExplanation,templates} from '../src/interactive-lessons.mjs';
import {paragraphs} from '../src/reading-domain.mjs';
import {intersection,circuit} from '../src/domain.mjs';
import {textOf} from '../src/material-search.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=async name=>JSON.parse(await fs.readFile(path.join(root,'data',name+'.json'),'utf8'));
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export async function buildMaterialCatalog(){
 const [review,history,vocabulary,english,index,baseLexicon,dictionary]=await Promise.all(['review','history','vocabulary','english/words','reading/index','reading-lexicon','reading-dictionary'].map(json));
 const documents=[];
 const add=(category,subject,id,title,body,route,parts)=>documents.push({id:category+':'+id,category,subject,title,body:textOf(body),route,...(parts?{parts}:{})});
 for(const x of scienceItems){const unit=scienceUnits.find(u=>u.id===x.unit);add('science','理科',x.id,x.question,[unit.title,'中'+x.grade,scienceFields[x.field],x.answer,x.reason,x.connection],'science-memory/'+x.id);}
 for(const x of geographyItems)add('geography','社会',x.id,x.title,[geographyChapters.find(c=>c.id===x.chapter)?.title,x.location,x.summary,x.why,x.compare,x.read,x.pitfall,x.question,x.answer],'geography/'+x.id);
 for(const x of history)add('history','社会',x.id,x.event,[x.date,x.area,x.period,x.detail,x.note,x.tags],'history/'+x.id);
 for(const x of historyTrails)add('history','社会','trail-'+x.id,x.title,x.intro,'history?trail='+x.id);
 for(const x of review)add('review',x.subject,x.id,x.title,[x.unit,x.question,x.answer,x.why,x.examples,x.memory,x.tags,x.imageAlt],'review/'+x.id);
 for(const x of vocabulary){
  add('vocabulary','国語',x.id,x.title,[x.reading,x.category,x.question,x.answer,x.context,x.confusion,x.tags],'vocabulary/'+x.id);
  for(const [i,q]of (x.quiz||[]).entries()){const id=q.id||x.id+'-'+i;add('quiz','国語',id,x.title+'：'+q.question,[q.context,q.question,q.choices,q.why,q.explanation],'vocabulary?mode=context&question='+encodeURIComponent(id));}
 }
 for(const x of classicalWords)add('classical','国語',x.id,x.word,[x.kind,x.reading,x.meaning],'classical?word='+encodeURIComponent(x.word));
 for(const x of english)add('english','英語',x.id,x.display||x.word,[x.word,x.meaning,x.pos,x.forms,x.variants,x.example,x.exampleJa,x.explanation,x.related],'english-words?q='+encodeURIComponent(x.word)+'&word='+encodeURIComponent(x.id));
 const books=await Promise.all(index.map(x=>json('reading/'+x.id)));
 for(const x of books){
  const parts=[...paragraphs(x.passage).map((text,i)=>({text,label:'本文・段落'+(i+1),target:'p-'+i})),...paragraphs(x.translation).map((text,i)=>({text,label:'和訳・段落'+(i+1),target:'t-'+i})),...(x.questions||[]).map((q,i)=>({text:textOf([q.prompt,q.options,q.evidence,q.explanation]),label:'設問'+(i+1),target:'q-'+i}))];
  add('reading','英語',x.id,x.title,parts.map(p=>p.text),'reading/'+x.id,parts);
 }
 for(const [i,x]of readingGuide.entries())add('guide','英語','reading-guide-'+i,x.title,[x.example,x.meaning,x.explanation],'reading?guide='+i);
 // These are the exact, merged definitions shown by the reader's tap-to-explain helper.
 for(const [word,x]of Object.entries({...dictionary,...baseLexicon}))add('guide','英語','word-'+word,word,[x.meaning,x.pos,x.example,x.explanation],'reading?word='+encodeURIComponent(word));
 for(const x of readingGrammar)add('guide','英語',x.id,x.title,x.explanation,'reading?explain='+x.id);
 for(const x of readingPhrases)add('guide','英語',x.id,x.label,[x.words,x.meaning,x.explanation],'reading?explain='+x.id);
 for(const [i,[sentence,x]]of Object.entries(sentenceGuides).entries())add('guide','英語','sentence-'+i,sentence,[x.translation,x.chunks,x.explanation],'reading?explain=sentence-'+i);
 for(const x of examTopics)add('exam',x.subject,x.id,x.title,[x.approach,x.pitfall,x.evidence],'exam?subject='+encodeURIComponent(x.subject)+'&topic='+encodeURIComponent(x.id));
 for(const x of geographyDrills)add('interactive','社会',x.id,x.title,[x.question,x.choices,x.reason,x.headers,x.rows,x.data],'geography?tab=practice&item='+x.id);
 for(const x of prefectures)add('geography','社会',x.id,x.name,[x.capital,x.region],'geography?tab=places&item='+x.id);
 const p={oxygen:2,totalA:100,totalB:200,partA:40,partB:60},r={k:.5,total:10},q={sorted:[2,3,4,4,5,6,8,10]},diff=[1];
 for(const [id,subject,title]of exploreLessons)add('interactive',subject,'explore-'+id,title,plain(exploreExplanation(id,{p,r,q,diff,a:40,b:30})),'explore/'+id);
 for(const [id,title,subject]of [['function','関数と交点','数学'],['geometry','相似と面積','数学'],['circuit','電気回路','理科'],['motion','運動とグラフ','理科']]){
  const values={points:intersection(.5,1,2),k:1.5,c:{v1:2,v2:4,i1:.2,i2:.2},params:{},parallel:false};
  add('interactive',subject,'labs-'+id,title,plain(labExplanation(id,values)+' '+(id==='circuit'?labExplanation(id,{...values,c:circuit(6,10,20,'parallel'),parallel:true}):'')),'labs?tab='+id);
 }
 for(const [subject,body]of Object.entries(templates))add('interactive',subject,'evidence-'+subject,subject+'：根拠を整理する',body,'evidence?subject='+encodeURIComponent(subject));
 for(const x of features)add('feature',x.subject,x.id,x.title,x.desc,x.id);
 if(new Set(documents.map(d=>d.id)).size!==documents.length)throw Error('Duplicate search document');
 const counts={};for(const d of documents){if(!d.title||!d.route||!d.body)throw Error('Empty search document: '+d.id);counts[d.category]=(counts[d.category]||0)+1;}
 return {schema:1,counts,documents};
}
export async function buildMaterialSearch(out){const catalog=await buildMaterialCatalog();await fs.writeFile(path.join(out,'data/material-search.json'),JSON.stringify(catalog));return catalog.counts;}
