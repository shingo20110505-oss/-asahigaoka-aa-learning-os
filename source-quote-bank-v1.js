(()=>{'use strict';
if(window.__AA_SOURCE_QUOTE_BANK_V1__)return;window.__AA_SOURCE_QUOTE_BANK_V1__=true;
const C=window.AA_V2_CURRICULUM;if(!C)return;
const meta=window.AA_SOURCE_QUOTES={version:'1.0.0',sources:[],added:{japanese:0,social:0,englishReading:0}};
function add(subject,row,source){C[subject]=C[subject]||[];if(C[subject].some(r=>r?.[0]===row[0]))return;C[subject].push(row);meta.added[subject]++;meta.sources.push({id:row[0],subject,source});}
function ja(id,area,quote,question,answer,explain,source,diff=6){add('japanese',[id,area,`【引用：${source}】「${quote}」\n${question}`,answer,`${explain}（出典：${source}）`,diff],source)}
function so(id,area,quote,question,answer,explain,source,diff=6){add('social',[id,area,`【資料引用：${source}】「${quote}」\n${question}`,answer,`${explain}（出典：${source}）`,diff],source)}

ja('v24qja001','classical','春はあけぼの。','「あけぼの」の意味として最も適切なもの','夜が明け始めるころ','「あけぼの」は夜明け方。季節と時間帯を対応させて読む。','『枕草子』第一段',4);
ja('v24qja002','classical','やうやう白くなりゆく山ぎは','「やうやう」の意味','だんだん','時間とともに空が明るくなる様子を表す副詞。','『枕草子』第一段',5);
ja('v24qja003','classical','夏は夜。','この一文で清少納言が夏に趣深いとする時間帯','夜','春・夏・秋・冬で好ましい時間帯を対照している。','『枕草子』第一段',4);
ja('v24qja004','classical','冬はつとめて。','「つとめて」の意味','早朝','古語「つとめて」は早朝を表す。現代語の「努力して」ではない。','『枕草子』第一段',5);
ja('v24qja005','classical','つれづれなるまゝに、日ぐらし硯にむかひて','「つれづれなる」の意味','することがなく手持ち無沙汰だ','冒頭では、することがなく一日中硯に向かっている状態を表す。','『徒然草』序段',5);
ja('v24qja006','classical','心にうつりゆくよしなしごとを','「よしなしごと」に近い意味','とりとめのないこと','心に浮かぶ、とりとめのない事柄を書き付けるという文脈。','『徒然草』序段',6);
ja('v24qja007','classical','ゆく河の流れは絶えずして、しかも、もとの水にあらず。','この比喩が象徴する考え','世の中のものは絶えず移り変わるという無常観','流れは続いて見えても同じ水ではないことを、人や住まいの変化へ重ねる。','鴨長明『方丈記』',6);
ja('v24qja008','classical','よどみに浮ぶうたかたは、かつ消え、かつ結びて','「うたかた」がたとえているものとして適切な考え','生じては消える人や住まいのはかなさ','泡が現れては消える様子を無常の比喩として用いる。','鴨長明『方丈記』',7);
ja('v24qja009','classical','男もすなる日記といふものを、女もしてみむとてするなり。','「みむ」の「む」が表す意味','意思','「女もしてみよう」という語り手の意思を表す。','紀貫之『土佐日記』',6);
ja('v24qja010','classical','男もすなる日記といふものを、女もしてみむとてするなり。','この冒頭の特徴','男性作者が女性になりきる形で日記を書き始める','作者紀貫之が女性の立場を装って書く構成が特徴。','紀貫之『土佐日記』',6);
ja('v24qja011','classical','今は昔竹取の翁といふものありけり。','「ありけり」の「けり」の基本的な働き','過去・回想','物語の冒頭で昔の出来事を語り起こす。','『竹取物語』',5);
ja('v24qja012','classical','野山にまじりて、竹をとりつゝ','「つゝ」の意味','〜し続けて・〜しながら','反復・継続する動作を表す接続助詞として読む。','『竹取物語』',6);
ja('v24qja013','classical','むかしおとこありけり。','この表現の役割','物語の人物と過去の時点を簡潔に提示する','『伊勢物語』の章段で繰り返される代表的な語り出し。','『伊勢物語』',5);
ja('v24qja014','classical','むかしおとこありけり。','「けり」の意味として最も適切なもの','過去','昔話・物語を語り起こす場面の過去を表す。','『伊勢物語』',5);
ja('v24qja015','classical','月日は百代の過客にしてゆきかふ年も又旅人なり','この表現で用いられている中心的な比喩','月日や年を旅人にたとえる比喩','時間の流れを旅人として捉え、旅を作品全体の主題へつなげる。','松尾芭蕉『おくのほそ道』',6);
ja('v24qja016','classical','旅を栖とす','「栖」に近い意味','住みか','旅そのものを住みかとする人々の生き方を述べる。','松尾芭蕉『おくのほそ道』',6);
ja('v24qja017','classical','祇園精舎の鐘の声、諸行無常の響きあり。','「諸行無常」が示す考え','すべてのものは移り変わり続ける','平家の栄華と没落を予告するような無常観が冒頭に置かれる。','『平家物語』冒頭',6);
ja('v24qja018','classical','盛者必衰の理をあらわす。','「盛者必衰」の意味','栄えている者もいつか必ず衰える','作品の中心にある栄枯盛衰の考えを端的に表す。','『平家物語』冒頭',6);

so('v24qso001','civics','すべて国民は、個人として尊重される。','この規定と最も深く関係する日本国憲法の基本的な考え','個人の尊重','第13条は個人の尊重を基礎に幸福追求の権利を定める。','日本国憲法 第13条（e-Gov法令検索）',5);
so('v24qso002','civics','健康で文化的な最低限度の生活を営む権利を有する。','この権利の名称','生存権','第25条に定められる社会権の一つ。','日本国憲法 第25条（e-Gov法令検索）',5);
so('v24qso003','civics','国会は、国権の最高機関であつて、国の唯一の立法機関である。','この条文から読み取れる国会の主な権限','法律を制定する立法','立法権を担う国会の位置付けを示す。','日本国憲法 第41条（e-Gov法令検索）',5);
so('v24qso004','civics','行政権は、内閣に属する。','三権分立で内閣が担当する権力','行政権','国会の立法、裁判所の司法と区別する。','日本国憲法 第65条（e-Gov法令検索）',4);
so('v24qso005','civics','すべて司法権は、最高裁判所及び法律の定めるところにより設置する下級裁判所に属する。','三権分立で裁判所が担当する権力','司法権','裁判所が司法権を担うことを定める。','日本国憲法 第76条（e-Gov法令検索）',5);
so('v24qso006','civics','地方自治の本旨に基いて、法律でこれを定める。','「地方自治の本旨」を構成する二つの基本的な考え','住民自治と団体自治','地方自治では住民の意思と地方公共団体の自主性を重視する。','日本国憲法 第92条（e-Gov法令検索）',7);
so('v24qso007','data','こどもの数は1329万人、45年連続の減少','この資料から直接言えること','15歳未満人口は前年より減少し、長期的な減少が続いている','数字から直接確認できる事実と、その原因の推測を区別する。','総務省統計局「我が国のこどもの数」2026年',5);
so('v24qso008','data','こどもの割合は10.8％、52年連続の低下','「10.8％」が表すもの','総人口に占める15歳未満人口の割合','人数そのものではなく総人口に対する割合である。','総務省統計局「我が国のこどもの数」2026年',5);
so('v24qso009','data','12～14歳が309万人、9～11歳が296万人','二つの年齢階級を人数で比較したとき多い方','12～14歳','割合ではなく人数を同じ単位で比較する。','総務省統計局「我が国のこどもの数」2026年',4);

if(typeof DATA!=='undefined'&&Array.isArray(DATA.readingScenarios)){
 const Q=[
 {id:'quote-en-01',theme:'literature',genre:'source-quote',setting:'Alice in Wonderland',title:'Public-domain Quote — Alice',grammar:['past'],passageParagraphs:[
  'Source: Lewis Carroll, Alice’s Adventures in Wonderland (Project Gutenberg).',
  '“Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.”',
  'The sentence appears before the unusual events of the story begin. It shows Alice’s ordinary situation and her state of mind.'
 ],facts:['Alice is sitting by her sister.','Alice is tired of having nothing to do.','The quoted sentence comes before the unusual events begin.','The scene begins in an ordinary situation.','Alice feels bored.'],lesson:'A story opening can establish an ordinary situation before a major change.',inference:'Alice is ready to notice something that breaks the boredom of the opening scene.',causeStem:'What does the quotation mainly tell us about Alice at the beginning?',causeAnswer:'She is bored with the ordinary situation around her.',detailDistractors:['She is excited because a train has arrived.','She is studying for a difficult test.','She is angry with her sister for losing a book.'],origin:'public-domain-source-quote'},
 {id:'quote-en-02',theme:'literature',genre:'source-quote',setting:'The Railway Children',title:'Public-domain Quote — Railway Children',grammar:['past'],passageParagraphs:[
  'Source: E. Nesbit, The Railway Children (Project Gutenberg).',
  '“They were not railway children to begin with.”',
  'The opening immediately tells the reader that the children’s connection with the railway will develop later rather than exist from the start.'
 ],facts:['The children were not connected with railways at first.','The title describes what they become later.','The opening contrasts the beginning with later events.','The quotation creates a question about how their lives will change.','The railway becomes important later.'],lesson:'A short opening sentence can create anticipation by contrasting the beginning with what the title promises.',inference:'The reader can expect a change that makes the railway important to the children.',causeStem:'Why is the word “begin” important in the quotation?',causeAnswer:'It suggests that the children’s relationship with the railway changes later.',detailDistractors:['It proves that the children work at a station from the first page.','It says that the children dislike all trains.','It explains that the story ends before any railway appears.'],origin:'public-domain-source-quote'}
 ];
 for(const sc of Q)if(!DATA.readingScenarios.some(x=>x.id===sc.id)){DATA.readingScenarios.push(sc);meta.added.englishReading++;meta.sources.push({id:sc.id,subject:'english',source:sc.setting})}
}
meta.total=meta.added.japanese+meta.added.social+meta.added.englishReading;
document.dispatchEvent(new CustomEvent('aa:source-quotes',{detail:meta}));
})();