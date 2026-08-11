(()=>{'use strict';
if(window.__AA_DIFFICULTY_CHALLENGE_V1__)return;window.__AA_DIFFICULTY_CHALLENGE_V1__=true;
const C=window.AA_V2_CURRICULUM;if(!C)return;
const stats={version:'1.0.0',added:{japanese:0,science:0,social:0,englishVocab:0}};
function add(subject,row){C[subject]=C[subject]||[];if(C[subject].some(r=>r?.[0]===row[0]))return;C[subject].push(row);stats.added[subject]++}
const J=[
['ja','modern','反論を踏まえた主張評価','筆者が反対意見を認めた上で、どの条件なら自説が成り立つかを示している場合に読むべき中心','反対意見の存在だけで筆者が自説を撤回したと判断せず、譲歩後の限定・再主張を確認する。',9],
['ja','modern','因果の飛躍の検討','二つの事実が同時に起きただけでは、一方が他方の原因だと断定できない','第三の要因や逆向きの因果がないかを資料と本文から検討する。',10],
['ja','modern','複数資料の整合性','本文の主張と表・グラフ・別資料が同じ結論を支えるかを、条件をそろえて判断する','対象・期間・単位が異なる資料をそのまま比較しない。',10],
['ja','modern','定義のずれを見抜く','同じ語が段落によって異なる意味で使われていないか確認する','筆者が途中で定義を限定・拡張した場合、その範囲を保って要約する。',10],
['ja','modern','根拠の十分性','一つの具体例だけで一般的な主張を断定できるとは限らない','例の代表性、反例、調査範囲を考えて根拠の強さを評価する。',11],
['ja','modern','文章全体の論証構造','問題提起・仮説・根拠・反論処理・結論のつながりを一つの流れとして捉える','段落要旨を並べるだけでなく、各段落が前の内容をどう受けているか説明する。',11],
['ja','literary','視点人物の認識変化','同じ出来事への見方が物語の前後でどう変わったかを言動と描写から捉える','心情語がなくても、行動・会話・情景の選び方を根拠にする。',9],
['ja','literary','象徴表現の反復','同じ物や景色が複数場面で現れるとき、人物の変化との対応を読む','一度だけの比喩ではなく、反復位置と意味の変化を確認する。',10],
['ja','literary','語り手の信頼性','語り手の理解が事実のすべてとは限らない場合、他人物の行動や後の事実と照合する','一人称の感想と作品内で確認できる事実を区別する。',11],
['ja','classical','敬語から主語を特定する','尊敬語の動作主と謙譲語の敬意の向きを組み合わせ、省略された人物を特定する','単語の意味だけでなく人物関係と会話の流れを同時に追う。',9],
['ja','classical','古語の多義を文脈で限定する','一つの古語に複数の意味がある場合、目的語・場面・人物関係から最も自然な義を選ぶ','現代語と形が同じ語ほど、現代語の意味に引きずられない。',10],
['ja','classical','助動詞の意味の重なり','同じ助動詞でも主語や文末表現によって推量・意思・勧誘などが変わる','接続だけで決めず、話者・人称・文脈を合わせて判断する。',11],
['ja','kanbun','否定表現の重なり','不・未・莫・無などの位置と返読を確認し、否定の対象を正確に取る','字面の順番のまま訳さず、書き下し文の係り受けを作ってから意味を取る。',9],
['ja','kanbun','反語と疑問の判定','疑問語があっても文脈上答えを求めず強い否定・断定を示す場合は反語と判断する','前後の主張と結論が一致するかで判別する。',10],
['ja','kanbun','句法を組み合わせた読解','再読文字・否定・比較など複数句法が一文にあるとき、返読順と意味を段階的に整理する','一つの句法だけを見て全体の訳を決めない。',11]
];
let n=1;for(const [,area,term,answer,note,d] of J)add('japanese',[`v25ja${String(n++).padStart(3,'0')}`,area,`【Level ${d}・考察】${term}で最も重要な読み方`,answer,`${term}：${answer}。${note}`,d]);
const S=[
['experiment','交絡要因を除く実験設計','調べたい条件以外をできるだけ同じにし、結果に影響する別の要因を分離する','二群で同時に複数条件が違えば、結果差の原因を一つに絞れない。',9],
['experiment','再現性と測定回数','同じ条件で繰り返し測定し、偶然のばらつきに左右されにくい結論にする','一回だけの値では測定誤差や個体差を見分けにくい。',9],
['experiment','平均値だけでは分からないこと','平均が同じでも値の散らばりや外れ値が異なる場合がある','個々の測定値や範囲も確認して結果の安定性を判断する。',10],
['experiment','グラフの傾きの解釈','横軸が一定量増えたときの縦軸の変化量として変化の割合を読む','点の高さだけでなく区間ごとの増え方・減り方を比較する。',10],
['experiment','モデルの限界','モデルは現象の一部を単純化して表すため、再現できない条件がある','モデルで一致したことを実際のあらゆる条件へ無条件に一般化しない。',11],
['chemistry','中和後のイオンを考える','酸とアルカリを混ぜた後も、反応に使われなかったイオンや生成物中のイオンが残る場合がある','H+とOH-だけでなく、溶液中の全イオンを物質量の関係で追う。',9],
['chemistry','電気分解の電極反応','陽極と陰極で起こる変化を、イオンの移動と電子の受け渡しから対応させる','電極名を丸暗記せず、正負のイオンと電子の関係を整理する。',10],
['chemistry','燃料電池のエネルギー変換','水素と酸素の化学エネルギーを電気エネルギーへ変え、反応生成物として水ができる','充電して電気をためる装置とは原理が異なる。',10],
['chemistry','沈殿生成の判定','混合したイオンの組合せから水に溶けにくい物質が生じるか判断する','反応前の溶液名だけでなく、溶液中に存在するイオンを組み合わせる。',11],
['physics','電磁誘導の大きさ','コイルを貫く磁界の変化を大きくすると誘導電流が大きくなる','磁石を速く動かす、巻数を増やすなど「磁界の変化」を中心に整理する。',9],
['physics','変圧器の電圧比','交流で一次・二次コイルの電圧比は巻数比に対応する','理想的には V1:V2=N1:N2 として比較する。直流では同じ働きをしない。',10],
['physics','仕事とエネルギーの統合','摩擦などで力学的エネルギーが減って見えるときも、熱など別の形へ移っている','力学的エネルギー保存が成り立つ条件を確認する。',11],
['earth','前線通過と気象要素の統合','気温・風向・気圧・降水の時間変化を合わせて前線の通過を判断する','一つの気象要素だけで前線種別を断定しない。',9],
['earth','天体の日周運動と年周運動','一日の見かけの動きと季節による見える星座の変化を地球の自転・公転に分ける','時間尺度の違いを手掛かりに原因を区別する。',10],
['earth','月の満ち欠けと位置関係','太陽・地球・月の位置関係から地球から見える明るい部分を判断する','月自身が光るのではなく、太陽光を反射している。',11]
];
n=1;for(const [area,term,answer,note,d] of S)add('science',[`v25sc${String(n++).padStart(3,'0')}`,area,`【Level ${d}・実験考察】${term}で結論を出すときの要点`,answer,`${term}：${answer}。${note}`,d]);
const O=[
['history','複数史料から歴史像を組み立てる','史料ごとの立場・目的・作成時期を確認し、共通点と相違点を照合する','一つの史料だけを当時の社会全体の意見とみなさない。',9],
['history','制度改革の因果連鎖','改革の背景→制度変更→社会への影響を時系列と因果でつなぐ','出来事の年号だけでなく、前の課題に何を変えようとした改革かを説明する。',10],
['history','継続と変化の比較','時代が変わっても続いた要素と大きく変化した要素を同じ観点で比較する','政治制度・産業・身分・外交など比較軸をそろえる。',11],
['history','世界史と日本史の同時代関係','海外の戦争・革命・経済変化が日本の外交や国内政策にどう影響したかを結び付ける','国内の出来事だけで因果を閉じず、国際環境を確認する。',11],
['geography','人口の実数と割合の区別','人口そのものと総人口に占める割合を区別し、分母が異なる資料を適切に読む','割合が高くても実数が最大とは限らない。',9],
['geography','一人当たり指標への換算','総量だけで地域を比べず、人口や面積で割った指標も使って規模の影響を調整する','総量の大きさと効率・密度を混同しない。',10],
['geography','産業立地の複合要因','原料・市場・交通・労働力・関連企業・政策など複数要因の組合せで立地を説明する','一つの要因だけで全地域・全産業を説明しない。',10],
['geography','地域間比較の条件統一','同じ年・同じ単位・同じ対象範囲の資料をそろえて比較する','統計年や集計範囲が異なる場合は、その差を踏まえて解釈する。',11],
['civics','三権分立と相互抑制','国会・内閣・裁判所が権力を分担し、互いを抑制する仕組みを具体的な制度で対応させる','単に三機関の名前を覚えるだけでなく、内閣不信任・違憲審査などの関係を読む。',9],
['civics','基本的人権の衝突と調整','複数の権利・公共的利益が関係する場合、どの権利をどの範囲で調整するか考える','一方の権利が常に無制限に優先すると考えない。',10],
['civics','地方自治の政策評価','住民の必要、費用、地域差、持続可能性など複数の観点から政策を評価する','賛成・反対の人数だけでなく政策の効果と負担を見る。',11],
['economy','需要供給と条件変化','価格以外の要因で需要曲線・供給曲線そのものが動く場合と、価格変化による量の変化を区別する','「需要が増える」と「需要量が増える」を資料の条件から読み分ける。',9],
['economy','名目値と実質的な変化','金額が増えても物価上昇を考慮すると実質的な購買力が同じとは限らない','異なる年の金額だけを直接比較せず、物価など背景条件を確認する。',10],
['economy','財政政策の効果と負担','政策の便益だけでなく財源・将来負担・対象者の違いも合わせて考える','一つの指標が改善しただけで政策全体を評価しない。',11],
['international','国際協力の利害調整','環境・貿易・安全保障などで各国の立場が異なる中、共通ルールと負担分担を探る','国際機関が各国政府に常に強制できるとは限らない。',10],
['international','持続可能性の複数指標','経済・社会・環境の指標を組み合わせ、短期効果と長期影響の両方を見る','一つの数値だけを最大化することが持続可能とは限らない。',11],
['data','相関と因果の区別','二つの値が一緒に変化しても、それだけで一方が他方の原因とは断定できない','第三の要因、逆の因果、偶然の一致を検討する。',9],
['data','割合変化とポイント差','百分率の増減率とパーセントポイントの差を区別する','20%から25%への変化は5ポイント増であり、25%増でもあるため表現を区別する。',10],
['data','複数資料の統合判断','地図・表・グラフ・文章資料を共通の問いに沿って対応させ、矛盾する情報があれば条件を確認する','一資料だけで結論を出さず、単位・期間・対象をそろえる。',11]
];
n=1;for(const [area,term,answer,note,d] of O)add('social',[`v25so${String(n++).padStart(3,'0')}`,area,`【Level ${d}・資料統合】${term}で最も適切な判断`,answer,`${term}：${answer}。${note}`,d]);
if(typeof DATA!=='undefined'&&Array.isArray(DATA.vocab)){
 const EV=[
 ['be consistent with','〜と一致している','The second result is consistent with the pattern in the first graph.'],
 ['be independent of','〜から独立している','The result should be independent of the order in which the samples are tested.'],
 ['be associated with','〜と関連している','High temperature was associated with faster evaporation in the survey.'],
 ['be limited to','〜に限定される','The conclusion should be limited to the conditions tested in the experiment.'],
 ['be compared on the basis of','〜を基準に比較される','The two plans should be compared on the basis of cost and safety.'],
 ['draw a conclusion from','〜から結論を導く','We should not draw a conclusion from only one unusual result.'],
 ['take A into consideration','Aを考慮に入れる','The committee took travel time into consideration before changing the schedule.'],
 ['be supported by evidence','証拠によって裏付けられている','The claim is supported by evidence from three different surveys.'],
 ['distinguish A from B','AとBを区別する','Students must distinguish a cause from a simple correlation.'],
 ['be applicable to','〜に適用できる','The rule is applicable to both examples in the passage.'],
 ['from a different perspective','異なる観点から','The second article looks at the issue from a different perspective.'],
 ['under the same conditions','同じ条件のもとで','The measurements were repeated under the same conditions.'],
 ['in relation to','〜との関連で','The graph should be read in relation to the population of each region.'],
 ['on the assumption that','〜と仮定して','The estimate was made on the assumption that the rate would remain constant.'],
 ['be taken into account','考慮に入れられる','Differences in population size must be taken into account.'],
 ['provide evidence for','〜の根拠を示す','The data provide evidence for the writer’s explanation.'],
 ['be contrary to','〜と反対である','The new result was contrary to the team’s first prediction.'],
 ['in the absence of','〜がない場合に','In the absence of sunlight, the plants stopped producing new leaves.'],
 ['to a certain extent','ある程度まで','The new rule improved safety to a certain extent, but it did not solve every problem.'],
 ['with respect to','〜に関して','The two regions differ with respect to population density.']
 ];
 let i=1,seen=new Set(DATA.vocab.map(v=>String(v.word||'').toLowerCase()));for(const [word,meaning,example] of EV){const key=word.toLowerCase();if(seen.has(key))continue;DATA.vocab.push({id:'v25e'+String(i++).padStart(3,'0'),word:key,meaning,pos:'phrase',syn:'',example,family:[],level:'advanced',cloze:example.replace(word,'_____'),source:'aa25-difficulty-challenge'});seen.add(key);stats.added.englishVocab++}
}
window.AA_DIFFICULTY_CHALLENGE_STATS=stats;document.dispatchEvent(new CustomEvent('aa:difficulty-challenge',{detail:stats}));
})();