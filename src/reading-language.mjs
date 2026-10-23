// Reading support uses explicit vocabulary and conservative phrase/grammar matches.
// Dictionary meanings are never presented as a complete translation of a sentence.
export const normalizeWord=x=>String(x).toLowerCase().replaceAll('’',"'");
const irregular={used:'use',using:'use',lying:'lie',dying:'die',tying:'tie',meant:'mean',dealt:'deal',was:'be',were:'be',is:'be',are:'be',am:'be',been:'be',being:'be',has:'have',had:'have',did:'do',does:'do',done:'do',went:'go',gone:'go',saw:'see',seen:'see',took:'take',taken:'take',gave:'give',given:'give',made:'make',knew:'know',known:'know',thought:'think',bought:'buy',brought:'bring',caught:'catch',taught:'teach',found:'find',felt:'feel',left:'leave',lost:'lose',met:'meet',stood:'stand',sat:'sit',ran:'run',said:'say',told:'tell',began:'begin',begun:'begin',became:'become',came:'come',got:'get',gotten:'get',grew:'grow',grown:'grow',wrote:'write',written:'write',read:'read',built:'build',held:'hold',heard:'hear',kept:'keep',paid:'pay',sent:'send',spent:'spend',spoke:'speak',spoken:'speak',broke:'break',broken:'break',chose:'choose',chosen:'choose',drew:'draw',drawn:'draw',drove:'drive',driven:'drive',ate:'eat',eaten:'eat',fell:'fall',fallen:'fall',flew:'fly',flown:'fly',forgot:'forget',forgotten:'forget',lay:'lie',lain:'lie',led:'lead',let:'let',put:'put',rose:'rise',risen:'rise',sold:'sell',set:'set',shook:'shake',shaken:'shake',showed:'show',shown:'show',slept:'sleep',stole:'steal',stolen:'steal',swam:'swim',swum:'swim',threw:'throw',thrown:'throw',understood:'understand',woke:'wake',woken:'wake',wore:'wear',worn:'wear',won:'win',children:'child',people:'person',men:'man',women:'woman',feet:'foot',teeth:'tooth',mice:'mouse',leaves:'leaf',lives:'life',better:'good',best:'good',worse:'bad',worst:'bad'};
const basic={a:['冠詞','一つの、ある'],an:['冠詞','一つの、ある'],the:['冠詞','その（特定できるものを指す）'],and:['接続詞','そして、～と'],but:['接続詞','しかし'],or:['接続詞','または'],so:['接続詞・副詞','だから／とても／そのように'],because:['接続詞','～なので'],before:['前置詞・接続詞','～の前に'],after:['前置詞・接続詞','～の後に'],during:['前置詞','～の間に'],while:['接続詞','～している間に／一方で'],when:['接続詞・疑問詞','～するとき／いつ'],if:['接続詞','もし～なら／～かどうか'],as:['前置詞・接続詞','～として／～するように／～するとき'],than:['接続詞・前置詞','～より'],with:['前置詞','～と一緒に／～を使って'],without:['前置詞','～なしで、～せずに'],from:['前置詞','～から'],into:['前置詞','～の中へ'],about:['前置詞・副詞','～について／およそ'],between:['前置詞','～の間に'],through:['前置詞','～を通って'],of:['前置詞','～の'],to:['前置詞・不定詞の印','～へ／後ろに動詞の原形を置いて不定詞を作る'],for:['前置詞','～のために／～の間'],in:['前置詞','～の中に／～に'],on:['前置詞','～の上に／～について'],at:['前置詞','～で／～に'],by:['前置詞','～によって／～までに'],be:['動詞・助動詞','～である。進行形や受け身にも使う'],do:['動詞・助動詞','する。疑問文・否定文にも使う'],have:['動詞・助動詞','持つ。過去分詞と組み合わせると完了形'],can:['助動詞','～できる'],could:['助動詞','～できた／～かもしれない'],will:['助動詞','～するだろう／～するつもりだ'],would:['助動詞','～だろう／～したものだ'],may:['助動詞','～かもしれない／～してよい'],might:['助動詞','～かもしれない'],must:['助動詞','～しなければならない／～に違いない'],should:['助動詞','～すべきだ／～のはずだ'],not:['副詞','～ない'],no:['限定詞・応答','一つも～ない／いいえ'],this:['代名詞・限定詞','これ、この'],that:['代名詞・限定詞・接続詞など','それ、その。後ろに文をつなぐ用法もある'],these:['代名詞・限定詞','これら、これらの'],those:['代名詞・限定詞','それら、それらの'],there:['副詞','そこに。there is / are では存在を表す'],here:['副詞','ここに'],i:['代名詞','私は'],you:['代名詞','あなたは／あなたを'],he:['代名詞','彼は'],she:['代名詞','彼女は'],it:['代名詞','それは／それを'],we:['代名詞','私たちは'],they:['代名詞','彼らは／それらは'],my:['代名詞の所有格','私の'],your:['代名詞の所有格','あなたの'],his:['代名詞の所有格・所有代名詞','彼の／彼のもの'],her:['代名詞','彼女の／彼女を'],our:['代名詞の所有格','私たちの'],their:['代名詞の所有格','彼らの／それらの'],me:['代名詞','私を／私に'],him:['代名詞','彼を／彼に'],us:['代名詞','私たちを／私たちに'],them:['代名詞','彼らを／それらを'],who:['疑問詞・関係代名詞','誰／人を説明する文をつなぐ'],which:['疑問詞・関係代名詞','どちら／ものを説明する文をつなぐ'],what:['疑問詞・関係代名詞','何／～すること・もの'],why:['疑問詞など','なぜ／理由を表す'],how:['疑問詞など','どのように／どのくらい'],where:['疑問詞など','どこ／場所を表す'],all:['限定詞・代名詞','すべての、すべて'],some:['限定詞・代名詞','いくつかの、ある'],more:['比較級','より多くの／もっと'],most:['最上級・限定詞','最も／大部分の'],other:['形容詞','ほかの'],another:['限定詞・代名詞','もう一つの、別の'],then:['副詞','そのとき、それから'],only:['副詞・形容詞','～だけ、唯一の'],also:['副詞','～もまた'],still:['副詞・形容詞','まだ／じっとした'],even:['副詞','～でさえ、さらに'],down:['副詞・前置詞','下へ／～に沿って'],up:['副詞・前置詞','上へ'],off:['副詞・前置詞','離れて／切れて'],out:['副詞','外へ'],few:['数量表現','少数の'],fewer:['比較級','より少ない（数えられるもの）'],less:['比較級','より少ない（量）'],twice:['副詞','2回、2倍'],really:['副詞','本当に'],almost:['副詞','ほとんど、もう少しで'],never:['副詞','一度も～ない'],ago:['副詞','～前に'],each:['限定詞・代名詞','それぞれの'],both:['限定詞・代名詞','両方の'],neither:['限定詞・代名詞','どちらも～ない'],either:['限定詞・代名詞など','どちらか／（否定文で）～も'],any:['限定詞・代名詞','いくらかの／どの～でも'],its:['代名詞の所有格','それの'],itself:['再帰代名詞','それ自身'],themselves:['再帰代名詞','彼ら自身／それら自体'],myself:['再帰代名詞','私自身'],yourself:['再帰代名詞','あなた自身']};
const contractions={"can't":'cannot（～できない）',"couldn't":'could not',"won't":'will not',"wouldn't":'would not',"shouldn't":'should not',"don't":'do not',"doesn't":'does not',"didn't":'did not',"isn't":'is not',"aren't":'are not',"wasn't":'was not',"weren't":'were not',"haven't":'have not',"hasn't":'has not',"hadn't":'had not',"i'm":'I am',"you're":'you are',"we're":'we are',"they're":'they are',"he's":'he is / he has',"she's":'she is / she has',"it's":'it is / it has',"that's":'that is / that has',"there's":'there is / there has',"i've":'I have',"we've":'we have',"they've":'they have',"you've":'you have',"i'll":'I will',"he'll":'he will',"she'll":'she will',"we'll":'we will',"they'll":'they will',"you'll":'you will',"i'd":'I would / I had',"he'd":'he would / he had',"she'd":'she would / she had',"we'd":'we would / we had',"they'd":'they would / they had',"let's":'let us（～しよう）'};
export function lemmaCandidates(raw){
 const w=normalizeWord(raw),out=[w];if(irregular[w])out.push(irregular[w]);
 if(w.endsWith("'s"))out.push(w.slice(0,-2));
 if(/(ies|ied)$/.test(w))out.push(w.slice(0,-3)+'y');
 for(const ending of ['ing','ed','est','er'])if(w.endsWith(ending)&&w.length>ending.length+1){const s=w.slice(0,-ending.length);out.push(s,s+'e');if(/(.)\1$/.test(s))out.push(s.slice(0,-1));if(s.endsWith('i'))out.push(s.slice(0,-1)+'y');}
 if(w.endsWith('es'))out.push(w.slice(0,-2));if(w.endsWith('s')&&!w.endsWith('ss'))out.push(w.slice(0,-1));
 return [...new Set(out)];
}
const posLabels={n:'名詞',v:'動詞',adj:'形容詞',adv:'副詞',prep:'前置詞',conj:'接続詞',pron:'代名詞',phrase:'熟語・連語'};
export function lookupWord(raw,lexicon){
 const word=normalizeWord(raw);if(contractions[word])return {word,lemma:word,pos:'短縮形',meaning:contractions[word]};
 for(const lemma of lemmaCandidates(word)){if(lemma!==word&&basic[lemma]&&!['be','do','have'].includes(lemma))continue;if(basic[lemma])return {word,lemma,pos:basic[lemma][0],meaning:basic[lemma][1]};const entry=lexicon[lemma];if(entry)return {word,lemma,...entry,pos:(entry.pos||'').split('/').map(x=>posLabels[x]||x).join('・')};}
 return {word,lemma:word,meaning:'',pos:''};
}
export function tokenize(text){return [...String(text).matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));}
export function sentences(text){
 const result=[];let start=0;const re=/[.!?]+(?:["”’'](?=\s|$))?(?=\s|$)/g;
 for(const m of text.matchAll(re)){const end=m.index+m[0].length,part=text.slice(start,end);if(part.trim())result.push({text:part.trim(),start:start+part.search(/\S/),end});start=end;}
 if(text.slice(start).trim())result.push({text:text.slice(start).trim(),start:start+text.slice(start).search(/\S/),end:text.length});return result;
}
export function phraseMatches(text,phrases){
 const words=tokenize(text),hits=[];
 for(const phrase of phrases){const pattern=phrase.words.split(' ');for(let i=0;i<=words.length-pattern.length;i++){
  const match=pattern.every((part,j)=>part.split('/').includes(normalizeWord(words[i+j].text)));
  if(match&&!/[^A-Za-z’'\s-]/.test(text.slice(words[i].start,words[i+pattern.length-1].end)))hits.push({...phrase,start:words[i].start,end:words[i+pattern.length-1].end});
 }}return hits.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
}
export function inspectToken(text,start,lexicon,phrases){
 const token=tokenize(text).find(x=>x.start===start);if(!token)return null;
 const sentence=sentences(text).find(s=>start>=s.start&&start<s.end),word=normalizeWord(token.text);let entry=lookupWord(word,lexicon);
 // A dictionary may have a separate noun/adjective entry for taking, opening, etc.
 // Keep that entry, but also show the verb form; a nearby be-verb is a useful clue.
 if(entry.lemma===word&&entry.source==='ejdict'&&/(ing|ed)$/.test(word)){
  const lemma=lemmaCandidates(word).slice(1).find(w=>{const x=lexicon[w];return x&&x.source!=='ejdict'&&(!x.pos||x.pos.split('/').includes('v'));});
  if(lemma){const form={...lookupWord(lemma,lexicon),word,lemma};
   if(/ing$/.test(word)&&/\b(?:am|is|are|was|were|be|been|being)(?:\s+(?:not|still|already|always|never|[a-z]+ly)){0,3}\s+$/i.test(text.slice(sentence?.start||0,start)))entry={...form,formLabel:'-ing形（進行形の候補）',otherMeaning:entry.meaning};
   else entry={...entry,verbForm:form};
  }
 }
 return {...entry,token,sentence,phrases:phraseMatches(text,phrases).filter(x=>start>=x.start&&start<x.end)};
}
export function matchGrammar(text,rules){return rules.flatMap(rule=>{const matches=[...text.matchAll(new RegExp(rule.pattern,'gi'))];return matches.length?[{...rule,examples:matches.map(m=>m[0])}]:[];});}
