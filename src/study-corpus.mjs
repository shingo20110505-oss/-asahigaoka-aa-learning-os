import {geographyItems,geographyText,geographySources,geographyVersion} from './geography-content.mjs';
import {classicalWords} from './classical-words.mjs';
import {readingGuide} from './reading-guide.mjs';
const guideAliases=[['主語','動詞','svo'],['関係代名詞'],['代名詞','指示語'],['although','however','逆接','対比'],['because','therefore','因果'],['比較級','fewer','less','否定'],['受動態','受け身','現在完了'],['根拠','選択肢']];
export function buildStudyCorpus({english=[],history=[]}={}){
 return [
 ...geographyItems.map(x=>({id:x.id,title:x.title,category:'geography',route:'geography/'+x.id,text:geographyText(x),aliases:[x.title,...x.title.split(/[・：]/),...(x.key==='jp-trade'?['輸入額','輸出額','輸入量','輸出量','貿易額','単価','為替']:[])],sources:x.sourceIds.map(id=>geographySources[id].url),version:geographyVersion,quality:'RISE独自教材・関連資料付き'})),
 ...classicalWords.map(x=>({id:'classical-'+x.id,title:x.kind+'：'+x.word,category:x.kind==='古文'?'classical':'kanbun',route:'classical?word='+encodeURIComponent(x.word),text:x.word+'（'+x.reading+'）：'+x.meaning,aliases:[x.word,x.reading],sources:[],quality:'RISE既存単語教材'})),
 ...english.map(x=>({id:'english-'+x.id,title:x.word,category:'english',route:'english-words?q='+encodeURIComponent(x.word),text:x.word+'：'+x.meaning+(x.explanation?'\n'+x.explanation:'')+(x.example?'\n例：'+x.example:'')+(x.forms?.length?'\n関連する語形：'+x.forms.filter(v=>typeof v==='string').join(' / '):''),aliases:[x.word,...(x.variants||[]).filter(v=>typeof v==='string'),...(x.forms||[]).filter(v=>typeof v==='string')],sources:['https://github.com/kujirahand/EJDict','https://www.newgeneralservicelist.com/new-general-service-list'],quality:x.quality||'既存辞書・個別未校閲',license:'CC-BY-SA-4.0（EJDict由来部分はCC0）'})),
 ...history.map(x=>({id:'history-'+x.id,title:x.date+' · '+x.event,category:'history',route:'history/'+x.id,text:[x.date+' '+x.event,x.note?.summary||x.detail,x.note?.background,x.note?.result,x.note?.exam].filter(Boolean).join('\n'),aliases:[x.event,...(x.tags||[])],sources:x.sources||[],quality:x.sources?.length?'出典付き補正教材':'RISE既存年表・項目ごとの外部照合は未完了',priority:x.sources?.length?5:0})),
 ...readingGuide.map((g,i)=>({id:'reading-guide-'+i,title:g.title,category:'grammar',route:'reading',text:g.example+'\n'+g.meaning+'\n'+g.explanation,aliases:guideAliases[i]||[g.title],sources:[],quality:'RISE独自文法教材',priority:20}))
 ];
}
export function referenceFromDocument(doc,{maxChars=1400}={}){return{id:doc.id,title:doc.title,route:doc.route,excerpt:doc.text.slice(0,maxChars),sources:doc.sources,category:doc.category,quality:doc.quality,version:doc.version};}
