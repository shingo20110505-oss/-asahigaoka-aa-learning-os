import {PROFILE,seededRandom,shuffle,hashSeed,validateQuestion,assertExam} from './core.mjs';

const ri=(r,a,b)=>Math.floor(r()*(b-a+1))+a;
const pick=(r,xs)=>xs[Math.floor(r()*xs.length)];
const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
function makeSingle({key,domain,title,stem,stimuli,answer,distractors,explanation,reasoning,skills,level='application',points=1,expectedSeconds=80,seed}){
  const random=seededRandom(seed+':choices:'+key);
  const rows=shuffle([{text:String(answer),correct:true,explanation},...distractors.map(d=>({text:String(d.text),correct:false,explanation:d.explanation,distractorType:d.type}))],random)
    .map((c,i)=>({...c,id:'c'+(i+1)}));
  const correct=rows.find(c=>c.correct);
  const q={id:key+'-'+hashSeed(seed+':'+key).toString(36),templateKey:key,title,domain,format:'single_choice',points,level,expectedSeconds,
    stem,stimuli,choices:rows.map(({correct,...c})=>c),answers:[correct.id],intent:'資料・実験条件を整理し、知識を根拠として適用する。',explanation,reasoningSteps:reasoning,skills,
    audit:{method:'deterministic-recompute',verified:true,recomputedAnswer:String(answer)}};
  const v=validateQuestion(q);if(!v.ok)throw new Error('Generated invalid science question '+key+': '+v.errors.join(', '));return q;
}

function bioPhotosynthesis(seed){const r=seededRandom(seed),dark=pick(r,[0,1]),light=dark?4:5;return makeSingle({seed,key:'bio_photosynthesis_control',domain:'biology',title:'光合成と対照実験',level:'standard',expectedSeconds:55,
  stimuli:[{label:'実験',kind:'table',content:`同じ植物の葉Aはアルミニウムはくで一部を覆い、葉Bは覆わずに${light}時間光を当てた。その後、葉を脱色してヨウ素液をつけた。覆っていない部分だけが青紫色になった。`}],
  stem:'この実験から直接確かめられることとして最も適切なものを選びなさい。',answer:'光が当たった部分ではデンプンがつくられたこと。',
  distractors:[{text:'葉のすべての細胞で同じ量のデンプンがつくられたこと。',type:'scope_overreach',explanation:'覆った部分との違いがあるため、葉全体を同じとはいえません。'},{text:'植物は光がなくても同じ速さで光合成すること。',type:'cause_effect_reverse',explanation:'結果はむしろ光の有無による差を示しています。'},{text:'ヨウ素液が光をつくり出したこと。',type:'concept_confusion',explanation:'ヨウ素液はデンプンの有無を調べる試薬です。'}],
  explanation:'覆っていない部分だけが青紫色になったので、光が当たった部分でデンプンができたと判断できます。',reasoning:['比較する条件は「光が当たったかどうか」。','ヨウ素液で青紫色になった部分にはデンプンがある。','差が出た条件と結果を結び付ける。'],skills:['sci.biology.experiment_control','sci.biology.photosynthesis']});}

function bioEnzyme(seed){const r=seededRandom(seed),a=ri(r,1,3),b=a+ri(r,4,6),c=b+ri(r,3,5);return makeSingle({seed,key:'bio_enzyme_data',domain:'biology',title:'消化酵素と温度',expectedSeconds:85,
  stimuli:[{label:'結果',kind:'table',content:`同量のデンプン液とだ液を用い、10℃・37℃・70℃で10分間反応させた。できた糖の相対量は順に ${a}、${c}、${b} であった。その他の条件は同じにした。`}],
  stem:'結果から最も適切にいえることを選びなさい。',answer:'この条件では37℃のときにデンプンの分解が最も進んだ。',
  distractors:[{text:'温度が高いほど必ず分解は速くなる。',type:'scope_overreach',explanation:'70℃では37℃より糖の量が少なく、単調増加ではありません。'},{text:'70℃ではデンプンが最も多く分解された。',type:'data_misread',explanation:`糖の相対量は37℃の ${c} が最大です。`},{text:'温度以外の条件を変えたことが原因で差が出た。',type:'control_variable_error',explanation:'問題文ではその他の条件を同じにしています。'}],
  explanation:`糖の相対量が最大なのは37℃の ${c} なので、この条件では37℃で分解が最も進んだといえます。`,reasoning:['生成物である糖の量を比較する。','最大値の温度を特定する。','実験範囲を超えて一般化しない。'],skills:['sci.biology.digestion','sci.experiment.data_interpretation']});}

function bioGenetics(seed){const r=seededRandom(seed),n=pick(r,[20,24,30,32]),round=n+pick(r,[-2,0,2]),wrinkled=n-pick(r,[-2,0,2]);return makeSingle({seed,key:'bio_genetics_testcross',domain:'biology',title:'遺伝と検定交雑',expectedSeconds:105,
  stimuli:[{label:'交配結果',kind:'data',content:`丸い種子をつくる形質をA、しわの形質をaとする。丸形の個体Xをaaの個体と交配すると、子は丸形${round}個、しわ形${wrinkled}個で、ほぼ1:1になった。`}],
  stem:'個体Xの遺伝子型として最も適切なものを選びなさい。',answer:'Aa',
  distractors:[{text:'AA',type:'concept_confusion',explanation:'AA×aaなら子はすべてAaで丸形になります。'},{text:'aa',type:'concept_confusion',explanation:'aaなら個体X自身がしわ形になります。'},{text:'AAまたはaa',type:'scope_overreach',explanation:'約1:1という結果はAa×aaで説明できます。'}],
  explanation:'Aa×aaではAaとaaが1:1で生じるため、観察結果と一致します。',reasoning:['相手の遺伝子型はaa。','AA×aaなら丸形のみ、Aa×aaなら丸形:しわ形=1:1。','観察比と照合する。'],skills:['sci.biology.genetics','sci.biology.ratio_reasoning']});}

function bioTranspiration(seed){const r=seededRandom(seed),both=pick(r,[4.8,5.2,5.6]),upper=Math.round(both*.62*10)/10,none=Math.round(both*.12*10)/10;return makeSingle({seed,key:'bio_transpiration_surface',domain:'biology',title:'蒸散と葉の表面',expectedSeconds:95,
  stimuli:[{label:'質量減少',kind:'table',content:`同じ大きさの葉をつけた枝で2時間の質量減少を測った。何も塗らない:${both}g、葉の裏面だけワセリン:${upper}g、葉の両面にワセリン:${none}g。`}],
  stem:'この結果から最もよく支持される考えを選びなさい。',answer:'この葉では、蒸散は主に葉の裏面から起こっている。',
  distractors:[{text:'蒸散は葉の表面からは全く起こらない。',type:'scope_overreach',explanation:'両面をふさいでも少量の質量減少があり、「全く」とは断定できません。'},{text:'ワセリンを塗るほど蒸散量が増える。',type:'inverse_relation',explanation:'実際には質量減少が小さくなっています。'},{text:'葉の裏面をふさいでも結果は変わらない。',type:'data_misread',explanation:`${both}gから${upper}gへ減っており、変化があります。`}],
  explanation:'裏面をふさぐと質量減少が大きく減るため、この葉では裏面からの蒸散の寄与が大きいと考えられます。',reasoning:['質量減少を蒸散量の指標として扱う。','裏面をふさいだときの変化量を見る。','「主に」と「全く」を区別する。'],skills:['sci.biology.transpiration','sci.experiment.control_variable']});}

function bioEcosystem(seed){return makeSingle({seed,key:'bio_foodweb_change',domain:'biology',title:'食物連鎖と個体数変化',expectedSeconds:85,
  stimuli:[{label:'食物関係',kind:'diagram_text',content:'植物プランクトン → 動物プランクトン → 小魚。ある時期に小魚だけが急減し、その他の環境条件は大きく変化しなかった。'}],
  stem:'その直後に起こりやすい変化の組合せとして最も適切なものを選びなさい。',answer:'動物プランクトンが増え、植物プランクトンが減る。',
  distractors:[{text:'動物プランクトンが減り、植物プランクトンが増える。',type:'cause_effect_reverse',explanation:'小魚による捕食圧が弱まるため、動物プランクトンは増えやすくなります。'},{text:'動物プランクトンも植物プランクトンも必ず変化しない。',type:'condition_omission',explanation:'食べる・食べられる関係の変化を無視しています。'},{text:'小魚が減ると植物プランクトンだけが直ちに全滅する。',type:'scope_overreach',explanation:'「全滅」まで導く根拠はありません。'}],
  explanation:'小魚が減ると動物プランクトンへの捕食が減り、動物プランクトンが増えやすくなります。その結果、植物プランクトンはより多く食べられ減りやすくなります。',reasoning:['小魚減少の直接影響を考える。','捕食されにくくなった動物プランクトンは増える。','その増加が植物プランクトンへ及ぼす二段階目の影響を考える。'],skills:['sci.biology.ecosystem','sci.biology.causal_chain']});}

function chemMass(seed){const r=seededRandom(seed),m=ri(r,18,36);return makeSingle({seed,key:'chem_mass_closed_system',domain:'chemistry',title:'質量保存',level:'standard',expectedSeconds:45,
  stimuli:[{label:'実験',kind:'condition',content:`密閉した容器全体の反応前の質量は${m}.0gであった。容器内で気体が発生する反応を起こしたが、ふたは開けなかった。`}],stem:'反応後の容器全体の質量として最も適切なものを選びなさい。',answer:`${m}.0 g`,
  distractors:[{text:`${m-2}.0 g`,type:'condition_omission',explanation:'気体が発生しても密閉容器から外へ出ていません。'},{text:`${m+2}.0 g`,type:'concept_confusion',explanation:'反応で物質全体の質量が新たに増えるわけではありません。'},{text:'気体が発生したので判断できない',type:'condition_omission',explanation:'密閉系であることから全質量は保存されます。'}],explanation:'密閉系では反応前後で容器内外への物質の出入りがないため、全質量は変わりません。',reasoning:['系の境界が密閉か確認する。','気体も容器内の物質として数える。','質量保存を適用する。'],skills:['sci.chemistry.mass_conservation']});}

function chemOxidation(seed){const r=seededRandom(seed),cu=pick(r,[4.0,6.0,8.0,10.0]),o=cu/4,total=cu+o;return makeSingle({seed,key:'chem_fixed_mass_ratio',domain:'chemistry',title:'酸化と質量比',expectedSeconds:105,
  stimuli:[{label:'既知の関係',kind:'data',content:'銅を十分に加熱して完全に酸化させると、この実験条件では銅:結びついた酸素の質量比が4:1になった。'}],stem:`${fmt(cu)}gの銅を完全に酸化させたとき、できる酸化物の質量として最も適切なものを選びなさい。`,answer:`${fmt(total)} g`,
  distractors:[{text:`${fmt(o)} g`,type:'intermediate_value',explanation:'これは結びつく酸素だけの質量です。'},{text:`${fmt(cu-o)} g`,type:'formula_substitution',explanation:'酸化では酸素が加わるので差ではなく和をとります。'},{text:`${fmt(cu*4)} g`,type:'proportion_error',explanation:'4:1を「4倍」と解釈した誤りです。'}],explanation:`酸素は${fmt(cu)}÷4=${fmt(o)}g結びつくので、酸化物は${fmt(cu)}+${fmt(o)}=${fmt(total)}gです。`,reasoning:['質量比4:1から酸素の質量を求める。','生成物は銅と結びついた酸素の合計。','途中値と最終値を区別する。'],skills:['sci.chemistry.proportion','sci.chemistry.oxidation']});}

function chemSolubility(seed){const r=seededRandom(seed),hot=pick(r,[70,80,90]),cold=pick(r,[25,30,35]),dissolved=hot-10,crystal=dissolved-cold;return makeSingle({seed,key:'chem_solubility_crystal',domain:'chemistry',title:'溶解度と再結晶',expectedSeconds:120,
  stimuli:[{label:'溶解度',kind:'table',content:`水100gに溶ける物質Xの最大量は、60℃で${hot}g、20℃で${cold}gである。60℃の水100gにXを${dissolved}g溶かした。`}],stem:'この溶液を20℃まで冷やしたとき、析出する結晶の質量として最も適切なものを選びなさい。',answer:`${crystal} g`,
  distractors:[{text:`${cold} g`,type:'intermediate_value',explanation:'これは20℃で水100gに溶けていられる最大量です。'},{text:`${hot-cold} g`,type:'condition_omission',explanation:'最初に溶かした量は溶解度の最大値ではなく'+dissolved+'gです。'},{text:`${dissolved+cold} g`,type:'formula_substitution',explanation:'析出量は「溶けていた量−冷却後に溶けていられる量」です。'}],explanation:`20℃では${cold}gまで溶けたままなので、${dissolved}-${cold}=${crystal}gが析出します。`,reasoning:['最初に実際に溶けている量を確認する。','20℃で残れる最大量を読む。','差を結晶量として求める。'],skills:['sci.chemistry.solubility','sci.chemistry.data_calculation']});}

function chemNeutralization(seed){const r=seededRandom(seed),acid0=pick(r,[10,12,15]),base0=acid0*1.2,target=pick(r,[20,25,30]),ans=target*1.2;return makeSingle({seed,key:'chem_neutralization_ratio',domain:'chemistry',title:'中和と体積比',expectedSeconds:110,
  stimuli:[{label:'実験結果',kind:'data',content:`同じ濃度条件を保った塩酸${acid0}mLをちょうど中和するのに、水酸化ナトリウム水溶液が${fmt(base0)}mL必要だった。`}],stem:`同じ水溶液を使って塩酸${target}mLをちょうど中和するのに必要な水酸化ナトリウム水溶液は何mLか。`,answer:`${fmt(ans)} mL`,
  distractors:[{text:`${fmt(target/1.2)} mL`,type:'inverse_relation',explanation:'必要量の比例関係を逆にしています。'},{text:`${fmt(ans-acid0)} mL`,type:'formula_substitution',explanation:'元の体積を引く操作は中和比の計算ではありません。'},{text:`${target} mL`,type:'condition_omission',explanation:'実験で得られた体積比1:1.2を無視しています。'}],explanation:`必要な体積比は塩酸:水酸化ナトリウム=${acid0}:${fmt(base0)}=1:1.2なので、${target}×1.2=${fmt(ans)}mLです。`,reasoning:['実験から体積比を求める。','同じ濃度条件なので比例関係を使う。','目標の塩酸量に倍率を掛ける。'],skills:['sci.chemistry.neutralization','sci.chemistry.proportion']});}

function chemGas(seed){return makeSingle({seed,key:'chem_gas_identification',domain:'chemistry',title:'気体の同定',level:'standard',expectedSeconds:65,
  stimuli:[{label:'観察',kind:'table',content:'発生した気体は無色で、石灰水を白くにごらせた。火のついた線香を入れても燃え方は強くならなかった。'}],stem:'この気体として最も適切なものを選びなさい。',answer:'二酸化炭素',
  distractors:[{text:'酸素',type:'concept_confusion',explanation:'酸素なら線香の燃え方が強くなります。'},{text:'水素',type:'concept_confusion',explanation:'水素は石灰水を白くにごらせる確認法ではありません。'},{text:'アンモニア',type:'concept_confusion',explanation:'アンモニアは刺激臭があり、石灰水を白くにごらせる特徴とは一致しません。'}],explanation:'石灰水を白くにごらせる代表的な気体は二酸化炭素です。',reasoning:['複数の観察結果を列挙する。','各気体の確認法と照合する。','両方の条件に一致する気体を選ぶ。'],skills:['sci.chemistry.gas_properties']});}

function phySeries(seed){const r=seededRandom(seed),set=pick(r,[[12,20,40],[9,10,20],[6,10,20],[12,30,30]]),[v,r1,r2]=set,total=r1+r2,i=v/total;return makeSingle({seed,key:'phy_series_current',domain:'physics',title:'直列回路の電流',points:2,expectedSeconds:130,
  stimuli:[{label:'回路',kind:'diagram_text',content:`${v}Vの電源に${r1}Ωと${r2}Ωの抵抗を直列につないだ。電流計の抵抗は無視する。`}],stem:'回路を流れる電流として最も適切なものを選びなさい。',answer:`${fmt(i)} A`,
  distractors:[{text:`${fmt(v/r1)} A`,type:'condition_omission',explanation:'一方の抵抗だけを使っており、直列全体の合成抵抗を考えていません。'},{text:`${fmt(v/r2)} A`,type:'condition_omission',explanation:'もう一方の抵抗だけで計算しています。'},{text:`${fmt(v/(r1*r2/(r1+r2)))} A`,type:'concept_confusion',explanation:'並列回路の合成抵抗を使った誤りです。'}],explanation:`直列の合成抵抗は${r1}+${r2}=${total}Ω。よって I=V/R=${v}/${total}=${fmt(i)}Aです。`,reasoning:['接続が直列であることを確認する。','合成抵抗を加算する。','オームの法則I=V/Rを適用する。'],skills:['sci.physics.circuit','sci.physics.multistep_calculation']});}

function phyOhm(seed){const r=seededRandom(seed),res=pick(r,[20,30,40,50]),v=pick(r,[3,6,9]),i=v/res;return makeSingle({seed,key:'phy_ohm_graph',domain:'physics',title:'電圧・電流と抵抗',expectedSeconds:90,
  stimuli:[{label:'測定値',kind:'table',content:`抵抗Xに${v}Vを加えたとき、電流は${fmt(i)}Aだった。電圧と電流は原点を通る直線関係になった。`}],stem:'抵抗Xの抵抗値として最も適切なものを選びなさい。',answer:`${res} Ω`,
  distractors:[{text:`${fmt(i/v)} Ω`,type:'formula_substitution',explanation:'R=V/IではなくI/Vを計算しています。'},{text:`${fmt(v*i)} Ω`,type:'formula_substitution',explanation:'電圧と電流を掛ける式ではありません。'},{text:`${res*2} Ω`,type:'proportion_error',explanation:'測定値から直接R=V/Iで求められます。'}],explanation:`R=V/I=${v}/${fmt(i)}=${res}Ωです。`,reasoning:['オームの法則V=IRを使う。','R=V/Iに変形する。','単位がΩになることを確認する。'],skills:['sci.physics.ohms_law','sci.physics.graph_ratio']});}

function phyMotion(seed){const r=seededRandom(seed),dt=pick(r,[0.2,0.25,0.5]),dx=pick(r,[0.8,1.0,1.5]),speed=dx/dt;return makeSingle({seed,key:'phy_motion_table',domain:'physics',title:'運動と平均の速さ',expectedSeconds:95,
  stimuli:[{label:'記録',kind:'table',content:`台車の位置を一定時間ごとに記録したところ、${dt}秒の間に${dx}m進んだ区間があった。`}],stem:'この区間の平均の速さとして最も適切なものを選びなさい。',answer:`${fmt(speed)} m/s`,
  distractors:[{text:`${fmt(dt/dx)} m/s`,type:'inverse_relation',explanation:'速さは時間÷距離ではなく距離÷時間です。'},{text:`${fmt(dx*dt)} m/s`,type:'formula_substitution',explanation:'距離と時間を掛ける式ではありません。'},{text:`${fmt(speed*60)} m/s`,type:'unit_conversion',explanation:'秒を分へ変換する必要はなく、m/sのまま求めます。'}],explanation:`平均の速さ=距離÷時間=${dx}÷${dt}=${fmt(speed)}m/sです。`,reasoning:['求める単位がm/sであることを確認する。','距離を時間で割る。','逆数や不要な単位換算を避ける。'],skills:['sci.physics.motion','sci.physics.rate']});}

function phyPressure(seed){const r=seededRandom(seed),force=pick(r,[100,120,150,200]),area=pick(r,[0.02,0.025,0.04,0.05]),p=force/area;return makeSingle({seed,key:'phy_pressure',domain:'physics',title:'圧力',level:'standard',expectedSeconds:70,
  stimuli:[{label:'条件',kind:'data',content:`床を垂直に押す力が${force}N、床と接する面積が${area}m²である。`}],stem:'床が受ける圧力として最も適切なものを選びなさい。',answer:`${fmt(p)} Pa`,
  distractors:[{text:`${fmt(force*area)} Pa`,type:'formula_substitution',explanation:'圧力は力×面積ではなく力÷面積です。'},{text:`${fmt(area/force)} Pa`,type:'inverse_relation',explanation:'分子と分母が逆です。'},{text:`${force} Pa`,type:'condition_omission',explanation:'接触面積を考慮していません。'}],explanation:`圧力=力÷面積=${force}÷${area}=${fmt(p)}Paです。`,reasoning:['圧力の式P=F/Aを確認する。','単位がすでにNとm²なのでそのまま代入する。','面積が小さいほど圧力は大きくなることとも整合する。'],skills:['sci.physics.pressure']});}

function phyEnergy(seed){const r=seededRandom(seed),input=pick(r,[400,500,600,800]),rate=pick(r,[.6,.7,.75,.8]),use=input*rate,percent=rate*100;return makeSingle({seed,key:'phy_energy_efficiency',domain:'physics',title:'エネルギー変換効率',expectedSeconds:100,
  stimuli:[{label:'装置',kind:'data',content:`ある装置に${input}Jのエネルギーを与えたところ、目的に利用できたエネルギーは${use}Jだった。`}],stem:'この装置のエネルギー変換効率として最も適切なものを選びなさい。',answer:`${percent} %`,
  distractors:[{text:`${100-percent} %`,type:'cause_effect_reverse',explanation:'これは利用されなかった割合です。'},{text:`${fmt(input/use)} %`,type:'inverse_relation',explanation:'効率は出力÷入力×100です。'},{text:`${use} %`,type:'unit_conversion',explanation:'Jの値をそのまま%として扱っています。'}],explanation:`効率=${use}/${input}×100=${percent}%です。`,reasoning:['有効に使えたエネルギーを出力とする。','出力÷入力を計算する。','百分率に直す。'],skills:['sci.physics.energy','sci.physics.ratio']});}

function earthHumidity(seed){const r=seededRandom(seed),set=pick(r,[[17.3,10.38,60],[15.4,9.24,60],[20.0,14.0,70],[18.0,13.5,75]]),[sat,actual,hum]=set;return makeSingle({seed,key:'earth_humidity',domain:'earth',title:'湿度と飽和水蒸気量',points:2,expectedSeconds:140,
  stimuli:[{label:'空気の状態',kind:'data',content:`気温一定の空気1m³について、その温度での飽和水蒸気量は${sat}g/m³、実際に含まれる水蒸気量は${actual}g/m³である。`}],stem:'この空気の湿度として最も適切なものを選びなさい。',answer:`${hum} %`,
  distractors:[{text:`${100-hum} %`,type:'cause_effect_reverse',explanation:'飽和まで不足している割合と取り違えています。'},{text:`${fmt(sat/actual*100)} %`,type:'inverse_relation',explanation:'分子と分母が逆です。'},{text:`${fmt(actual)} %`,type:'unit_conversion',explanation:'水蒸気量の数値をそのまま百分率にしてはいけません。'}],explanation:`湿度=実際の水蒸気量÷飽和水蒸気量×100=${actual}÷${sat}×100=${hum}%です。`,reasoning:['湿度の分母は飽和水蒸気量。','実際の水蒸気量との比を求める。','100を掛けて%にする。'],skills:['sci.earth.humidity','sci.earth.multistep_calculation']});}

function earthFront(seed){return makeSingle({seed,key:'earth_front_passage',domain:'earth',title:'前線通過と気象変化',expectedSeconds:100,
  stimuli:[{label:'観測',kind:'time_series',content:'正午ごろ強い雨。通過前は南寄りの風で気温18℃、通過後は西寄りの風に変わり、気温が12℃まで急に下がった。気圧は通過直前まで低下し、その後上昇した。'}],stem:'この地点を通過した前線として最も考えやすいものを選びなさい。',answer:'寒冷前線',
  distractors:[{text:'温暖前線',type:'concept_confusion',explanation:'通過後の急な気温低下と風向変化は寒冷前線の典型的特徴です。'},{text:'停滞前線',type:'condition_omission',explanation:'短時間で明瞭な通過変化があり、停滞している状況とは合いません。'},{text:'前線は通過していない',type:'data_misread',explanation:'風向・気温・気圧・降水が一連に変化しています。'}],explanation:'強い雨の後に風向が変わり気温が急低下し、気圧が上昇へ転じるのは寒冷前線通過時の特徴と整合します。',reasoning:['降水だけでなく気温・風向・気圧を同時に見る。','通過前後の変化方向を整理する。','最も一致する前線を選ぶ。'],skills:['sci.earth.weather','sci.earth.multisource_inference']});}

function earthSeismic(seed){const r=seededRandom(seed),diff=pick(r,[4,5,6,8]),distance=diff*6;return makeSingle({seed,key:'earth_ps_time',domain:'earth',title:'初期微動継続時間',expectedSeconds:115,
  stimuli:[{label:'モデル',kind:'data',content:`P波の速さを6km/s、S波の速さを3km/sとする。ある観測点ではP波到着からS波到着まで${diff}秒だった。`}],stem:'震源から観測点までの距離として最も適切なものを選びなさい。',answer:`${distance} km`,
  distractors:[{text:`${diff*3} km`,type:'intermediate_value',explanation:'S波の速さに時間差を直接掛けただけで、P波との到着差を表せません。'},{text:`${diff*6*3} km`,type:'formula_substitution',explanation:'二つの速度をそのまま掛ける式ではありません。'},{text:`${Math.round(distance/2)} km`,type:'proportion_error',explanation:'到着時間差は d/3−d/6=d/6 なので距離は時間差の6倍です。'}],explanation:`距離をd kmとすると到着時間差はd/3−d/6=d/6秒。d/6=${diff}よりd=${distance}kmです。`,reasoning:['P波とS波それぞれの到着時間を距離/速さで表す。','S波時間−P波時間が観測された時間差。','方程式を解く。'],skills:['sci.earth.seismic_wave','sci.earth.model_calculation']});}

function earthStrata(seed){return makeSingle({seed,key:'earth_strata_keybed',domain:'earth',title:'地層と鍵層',level:'standard',expectedSeconds:75,
  stimuli:[{label:'露頭',kind:'diagram_text',content:'地点AとBの地層には同じ火山灰層Kが見られる。地点AではKの下に砂岩層P、上に泥岩層Qがある。地層は逆転していない。'}],stem:'地層PとQの新旧関係として最も適切なものを選びなさい。',answer:'Pの方がQより古い。',
  distractors:[{text:'Qの方がPより古い。',type:'sequence_error',explanation:'地層が逆転していないので、下位のPが古いです。'},{text:'PとQは必ず同じ時代にできた。',type:'scope_overreach',explanation:'上下に分かれた異なる層なので同時形成とはいえません。'},{text:'火山灰層Kがあるので新旧は一切判断できない。',type:'condition_omission',explanation:'逆転していないという条件から上下関係を使えます。'}],explanation:'地層が逆転していないなら、下にある地層ほど古いのでPがQより古いと判断できます。',reasoning:['逆転の有無を確認する。','上下関係を読む。','下位ほど古いという原則を適用する。'],skills:['sci.earth.strata','sci.earth.relative_age']});}

function earthAstronomy(seed){const r=seededRandom(seed),hours=pick(r,[2,3,4]),angle=hours*15;return makeSingle({seed,key:'earth_daily_motion',domain:'earth',title:'地球の自転と日周運動',expectedSeconds:90,
  stimuli:[{label:'観察',kind:'data',content:`同じ星を時刻を変えて観察すると、${hours}時間で空の上を西向きに約${angle}°移動して見えた。`}],stem:'この見かけの動きの主な原因として最も適切なものを選びなさい。',answer:'地球が西から東へ自転しているため。',
  distractors:[{text:'地球が東から西へ自転しているため。',type:'sign_direction',explanation:'見かけの天体の西向き移動とは逆向きの自転が原因です。'},{text:'その星が数時間で地球の周りを一周するため。',type:'concept_confusion',explanation:'日周運動の主因は地球の自転です。'},{text:'地球の公転だけで数時間ごとに大きく位置が変わるため。',type:'concept_confusion',explanation:'数時間スケールの共通した見かけの動きは自転で説明します。'}],explanation:'地球が西から東へ自転するため、天体は反対向きの東から西へ動くように見えます。15°/h×'+hours+'h='+angle+'°とも整合します。',reasoning:['見かけの運動方向を確認する。','観測者である地球自身の回転を考える。','見かけの方向は自転方向と反対になる。'],skills:['sci.earth.astronomy','sci.earth.reference_frame']});}

export const TEMPLATES=Object.freeze([
  bioPhotosynthesis,bioEnzyme,bioGenetics,bioTranspiration,bioEcosystem,
  chemMass,chemOxidation,chemSolubility,chemNeutralization,chemGas,
  phySeries,phyOhm,phyMotion,phyPressure,phyEnergy,
  earthHumidity,earthFront,earthSeismic,earthStrata,earthAstronomy
]);
const domainOf=fn=>fn('domain-probe').domain;
const BY_DOMAIN=Object.freeze(PROFILE.domains.reduce((m,d)=>(m[d]=TEMPLATES.filter(fn=>domainOf(fn)===d),m),{}));
export function buildExam(seed='science-exam'){
  const questions=TEMPLATES.map((fn,i)=>fn(seed+':'+i));
  return assertExam({schemaVersion:1,id:'science-exam-'+hashSeed(seed).toString(36),title:'愛知県型 理科 22点実戦',profileId:PROFILE.id,nonOfficial:true,seed:String(seed),questions});
}
export function generateQuestion({seed=String(Date.now())+Math.random(),domain=null}={}){
  const random=seededRandom(seed+':pick');let d=domain;
  if(!PROFILE.domains.includes(d)){
    const x=random(),w=PROFILE.targetWeights;d=x<w.biology?'biology':x<w.biology+w.earth?'earth':x<w.biology+w.earth+w.physics?'physics':'chemistry';
  }
  const pool=BY_DOMAIN[d],fn=pool[Math.floor(random()*pool.length)];return fn(seed+':'+d);
}
export function templateCounts(){return Object.fromEntries(PROFILE.domains.map(d=>[d,BY_DOMAIN[d].length]));}
