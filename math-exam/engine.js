/* Original Aichi-style mathematics. Pure, deterministic, no network or learner data. */
(function(root){
'use strict';
const VERSION='1.0.0';
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const frac=(n,d=1)=>{const g=gcd(n,d);n/=g;d/=g;if(d<0){n=-n;d=-d;}return d===1?String(n):`${n}/${d}`;};
const num=x=>Number.isInteger(x)?String(x):String(Math.round(x*1000000)/1000000);
function rng(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const units={number:'数と式',algebra:'式の活用',equation:'方程式',function:'関数と図形',statistics:'データの活用',probability:'確率・場合分け',geometry:'平面・空間図形'};
const skillMap={number:'math.algebra',algebra:'math.algebra',equation:'math.equation',function:'math.function',statistics:'math.statistics',probability:'math.probability',geometry:'math.geometry'};
function question(family,p,stem,answer,wrongs,steps,unit,difficulty,thinking,figure=null){
 const a=String(answer),seen=new Set([a]),choices=[{text:a,ok:true,reason:steps.join('\n')}];
 for(const [value,reason] of wrongs){const text=String(value);if(!seen.has(text)){seen.add(text);choices.push({text,ok:false,reason,error:family+':'+(choices.length),distractorType:thinking});}}
 if(choices.length!==4)throw new Error('Non-unique choices: '+family);
 return {family,parameters:p,stem,choices,answerIndex:0,selectCount:1,partialPoints:0,explanation:steps.map((s,i)=>`${i+1}. ${s}`).join('\n'),solutionSteps:steps,examUnit:unit,difficulty5:difficulty,thinking,figure,skills:[{id:skillMap[unit],role:'primary'}],source:{area:unit,origin:'verified-math-template',curriculum:'junior-high',difficulty:difficulty*2},format:'aichi-mark',subject:'math',type:'math',expectedMs:difficulty*40000,context:'aichi-math-application',applicationLevel:difficulty>=4?'advanced':difficulty>=3?'applied':'standard',domainPrimary:unit,cognitiveSkills:[thinking],sourceRelation:'original-pattern',gradingMode:'answer-unit-all-or-nothing',nonOfficial:true};
}
function make(family,seed=1,level=2){
 const rand=rng(seed),pick=a=>a[Math.floor(rand()*a.length)],k=pick([2,3,4,6]),n=pick([3,4,5,6]),j=pick([2,3,4]);let p={};
 const Q=(s,a,w,steps,u,d,t,f=null)=>question(family,p,s,a,w,steps,u,d,t,f);
 if(family==='signed'){p={n,j};return Q(`−${n}²＋${j}×(${n}−1) を計算しなさい。`,-n*n+j*(n-1),[[n*n+j*(n-1),'−n²はn²に負号を付ける。'],[-n*n+j*n-1,'かっこの中を先に計算する。'],[-n*n-j*(n-1),'正の項を足すところで、引いてしまっている。']],[`−${n}²＝−${n*n}。`,`かっこ内は${n-1}なので、−${n*n}＋${j*(n-1)}＝${-n*n+j*(n-1)}。`],'number',1,'operation_order');}
 if(family==='radical'){p={k};return Q(`√${8*k*k}−√${2*k*k} の値を選びなさい。`,`${k}√2`,[[`${3*k}√2`,'引き算の符号を確認する。'],[`${k}√6`,'根号内を直接引くことはできない。'],[`${2*k}√2`,'第2項も計算に含める。']],[`√${8*k*k}＝${2*k}√2、√${2*k*k}＝${k}√2。`,`係数を引いて${k}√2。`],'number',1,'radical_simplification');}
 if(family==='factor'){p={n,j};return Q(`x²−${n+j}x＋${n*j} を因数分解しなさい。`,`(x−${n})(x−${j})`,[[`(x＋${n})(x＋${j})`,'xの係数が正になってしまう。'],[`(x−${n})(x＋${j})`,'定数項が負になってしまう。'],[`(x−${n+j})(x−1)`,'定数項とxの係数を両方照合する。']],[`和が−${n+j}、積が${n*j}になる2数は−${n}と−${j}。`,`展開して元の式に戻ることを確認する。`],'algebra',1,'factorization');}
 if(family==='equation'){p={n,j};return Q(`連立方程式 x＋y＝${n+j}、2x−y＝${2*n-j} の解を選びなさい。`,`x＝${n}, y＝${j}`,[[`x＝${n+1}, y＝${j-1}`,'和だけでなく2本目の式も確認する。'],[`x＝${n-1}, y＝${j+1}`,'2本目の式が成り立たない。'],[`x＝${-n}, y＝${-j}`,'移項の符号を確認する。']],[`2式を加えると3x＝${3*n}よりx＝${n}。`,`1本目へ代入してy＝${j}。`],'equation',2,'simultaneous');}
 if(family==='quadratic'){p={n,j};return Q(`方程式 (x−${n})²＝${j*j} の解を選びなさい。`,`x＝${n-j}, ${n+j}`,[[`x＝${n+j}`,'平方根は正負の2つある。'],[`x＝${-n-j}, ${-n+j}`,'x−nからxを求めるときはnを加える。'],[`x＝${n-j*j}, ${n+j*j}`,'平方根をとる。']],[`x−${n}＝±${j}。`,`x＝${n-j}, ${n+j}。`],'equation',2,'both_roots');}
 if(family==='rate'){p={k,n};return Q(`関数 y＝${k}x² で、xが−${n}から${n+2}まで増加するときの変化の割合を選びなさい。`,2*k,[[k*(2*n+2),'yの増加量をxの増加量で割る。'],[4*k,'両端のxの値を符号付きで扱う。'],[-2*k,'増加量の引く順序をそろえる。']],[`xの増加量は${2*n+2}。`,`yの増加量は${k}×(${n+2}²−${n}²)＝${k*((n+2)**2-n*n)}。`,`割ると${2*k}。`],'function',2,'rate_of_change');}
 if(family==='integer'){p={n};return Q(`連続する3つの整数の和が${3*n}である。最大の整数を選びなさい。`,n+1,[[n,'平均は中央の整数。'],[n-1,'求めるのは最大の整数。'],[3*n-1,'3つの整数をx−1,x,x＋1と置く。']],[`中央をxとすると(x−1)＋x＋(x＋1)＝${3*n}。`,`x＝${n}より最大は${n+1}。`],'algebra',2,'modeling');}
 if(family==='histogram'){
 const counts=[2,j,8,6,4],total=20+j;p={counts,width:5,total};const ans=frac(6,total);
 return Q(`図は${total}人の通学時間である。階級は「以上・未満」で区切る。この図だけから必ず正しいといえる記述を選びなさい。`,`15分以上20分未満の相対度数は${ans}である。`,[['平均値は正確に12.5分である。','階級内の個々の値が不明なので平均値は確定しない。'],['四分位範囲は正確に10分である。','四分位数の個々の値は読み取れない。'],['最長の通学時間は25分である。','最後の階級は25分未満である。']],[`総度数は${total}、15〜20分の度数は6。`,`相対度数は6÷${total}＝${ans}。`,`階級内の値が分からないため、平均値や四分位範囲の正確な値は断定できない。`],'statistics',3,'certainty',{type:'histogram',counts,width:5});}
 if(family==='circle'){p={k};return Q(`円周上にA、B、Cがあり、Oは中心である。Cを含まない弧ABに対する中心角∠AOBが${k*20}°のとき、∠ACBを選びなさい。`,`${k*10}°`,[[`${k*20}°`,'円周角と中心角は等しくない。'],[`${k*40}°`,'円周角は中心角の半分。'],['90°','ABが直径であるとは与えられていない。']],[`同じ弧に対する円周角は中心角の半分。`,`${k*20}÷2＝${k*10}°。`],'geometry',2,'circle_angle');}
 if(family==='cone'){p={k};return Q(`円すいの底面の半径は${3*k}cm、高さは${4*k}cmである。体積を選びなさい。`,`${12*k**3}π cm³`,[[`${36*k**3}π cm³`,'円すいは底面積×高さ÷3。'],[`${12*k*k}π cm³`,'体積は長さの3乗に比例する。'],[`${5*k**3}π cm³`,'底面の半径と高さを式に代入して確かめる。']],[`底面積は${9*k*k}π。`,`体積は${9*k*k}π×${4*k}÷3＝${12*k**3}π cm³。`],'geometry',2,'solid_volume');}
 if(family==='probability'){
 p={n};let good=0;for(let a=1;a<=n;a++)for(let b=1;b<=n;b++)if(a!==b&&(a*b)%2===0)good++;const ans=frac(good,n*(n-1));
 return Q(`1から${n}までの数字を1枚ずつ書いたカード${n}枚から、続けて2枚を取り出す。取り出したカードは戻さない。2数の積が偶数となる確率を選びなさい。`,ans,[[frac(good,n*n),'戻さないため2枚目の候補は1枚減る。'],[frac(n-Math.ceil(n/2),n),'2数の積が偶数になる条件を考える。'],['1','2枚とも奇数になる場合が残る。']],[`順序を区別すると全体は${n}×${n-1}＝${n*(n-1)}通り。`,`積が奇数なのは2枚とも奇数の場合。奇数は${Math.ceil(n/2)}枚ある。`,`余事象を引くと${good}通りなので確率は${ans}。`],'probability',4,'complement_and_no_replacement');}
 if(family==='boxplot'){
 p={shift:k};const q1=10+k,med=20+k,q3=30+k;
 return Q(`A組20人、B組40人の得点の箱ひげ図を示す。同じ点数の人が複数いてもよい。図から必ず正しいといえる記述を選びなさい。`,'両組の四分位範囲と中央値は、それぞれ等しい。',[[`${med}点以上の人数は両組で等しい。`,'母数が異なり、中央値と同じ点数の人数も不明。'],['平均点は両組で等しい。','箱ひげ図には平均値が示されていない。'],['A組で中央値未満の人は必ず10人である。','中央値と同じ値が複数ある場合、中央値未満が10人とは限らない。']],[`両組ともQ1＝${q1}、中央値＝${med}、Q3＝${q3}。`,`四分位範囲は${q3}−${q1}＝20。`,`中央値は値の位置を表す。等しい値が重なる可能性を無視して人数を断定しない。`],'statistics',4,'ties_and_guarantees',{type:'boxplot',rows:[{name:'A組（20人）',values:[k,q1,med,q3,40+k]},{name:'B組（40人）',values:[k+2,q1,med,q3,45+k]}]});}
 if(family==='meanbounds'){
 const counts=[2,4,8,6],low=19+k,high=29+k;p={counts,start:k,width:10};return Q(`図は20人の移動時間をまとめたものである。各階級は「以上・未満」とする。平均値m分について必ず成り立つものを選びなさい。`,`${low}≦m＜${high}`,[[`m＝${low+5}`,'階級値による平均は推定であり正確な平均ではない。'],[`${low+2}≦m＜${high-2}`,'各階級の端に寄ったデータもあり得る。'],[`m＜${low}`,'全員を階級の下端に置いた値より小さくはならない。']],[`各階級の下端で合計を見積もると${20*low}分以上。`,`上端で見積もった合計${20*high}分には達しない。`,`20人で割り、${low}≦m＜${high}。平均を確定させず、可能な範囲を求める。`],'statistics',4,'bounds_from_grouped_data',{type:'histogram',counts,width:10,start:k});}
 if(family==='sampling'){
 p={n,j};return Q(`ある工場で同じ日に作った製品${n*1000}個から無作為に100個を取り出すと、不良品が${j}個あった。この結果を使った判断として最も適切なものを選びなさい。`,`不良品は全体で約${n*10*j}個と推定できるが、正確な個数とは限らない。`,[[`不良品は必ず${n*10*j}個である。`,'標本からの推定にはばらつきがある。'],[`全体の不良品は${j}個だけである。`,'未調査分を無視している。'],['取り出しやすい製品だけを選んでも、無作為抽出と同じである。','抽出方法の偏りは推定に影響する。']],[`標本での割合は${j}/100。`,`${n*1000}×${j}/100＝${n*10*j}個と推定する。`,`無作為抽出でも、標本の割合が母集団と必ず一致するわけではない。`],'statistics',3,'sampling_uncertainty');}
 if(family==='reflection'){
 p={k};const a=k/2,C=4*k;return Q(`Oは原点。放物線y＝ax²上に、x座標が2の点Aと4の点Bがある（a＞0）。y軸上の点Cを動かすと、CA＋CBが最小になるときC＝(0,${C})となった。四角形OABCの面積を二等分する、Oを通る直線を選びなさい。`,`y＝${frac(7*k,3)}x`,[[`y＝${2*k}x`,'係数aを求めた後、面積二等分の条件が必要。'],[`y＝${frac(4*k,3)}x`,'三角形OCDの面積を四角形全体の半分とする。'],[`y＝${3*k}x`,'線の傾きは交点のy座標÷x座標で求める。']],[`Aをy軸対称に移すとA′＝(−2,4a)。A′とB＝(4,16a)を結ぶ直線のy切片は8a。`,`8a＝${C}よりa＝${frac(k,2)}。A＝(2,${2*k})、B＝(4,${8*k})。`,`四角形OABCの面積は${12*k}。辺BC上のDまで三角形OCDを取ると、面積は${2*k}×Dのx座標。`,`半分の${6*k}にするにはDのx座標が3。BCはy＝${k}x＋${4*k}なのでD＝(3,${7*k})。`,`したがってy＝${frac(7*k,3)}x。`],'function',5,'reflection_area_bisection',{type:'coordinates',points:{O:[0,0],A:[2,2*k],B:[4,8*k],C:[0,C]},edges:[['O','A'],['A','B'],['B','C'],['C','O']],parabola:a});}
 if(family==='moving_value'||family==='moving_equal'){
 const L=2*k,H=k;p={L,H};const base=`長方形ABCDはAB＝${L}cm、BC＝${H}cm。点PはAからB、C、Dの順に辺上を毎秒1cmで動き、Dで止まる。動き始めてx秒後の△ADPの面積をy cm²とする。`;
 const fig={type:'coordinates',points:{A:[0,0],B:[L,0],C:[L,H],D:[0,H]},edges:[['A','B'],['B','C'],['C','D'],['D','A']],note:'Pの移動：A → B → C → D'};
 if(family==='moving_value')return Q(`${base}\nx＝${L+H/2}のとき、yを選びなさい。`,`${k*k} cm²`,[[`${2*k*k} cm²`,'三角形の面積は底辺×高さ÷2。'],[`${k*k/2} cm²`,'底辺ADに対する高さはABの長さで一定。'],[`${frac(5*k*k,4)} cm²`,'BC上ではPの移動距離を高さに使わない。']],[`Pは辺BC上。底辺AD＝${H}に対する高さは${L}。`,`y＝${H}×${L}÷2＝${k*k}。`],'function',3,'constant_interval',fig);
 const t=k*k/2;return Q(`${base}\n0≦x≦${2*L+H}でy＝${num(t)}となる時刻は何個あるか。`,'2個',[['1個','増加区間だけでなく減少区間もある。'],['3個','一定区間の面積は指定値と異なる。'],['無数にある','一定区間は最大面積であり指定値ではない。']],[`AB上ではy＝${frac(H,2)}xで増加。`,`BC上ではy＝${L*H/2}で一定。`,`CD上ではy＝${frac(H,2)}(${2*L+H}−x)で減少。`,`指定値${num(t)}は0より大きく最大面積未満なので、増加・減少区間に1個ずつ、計2個。`],'function',4,'piecewise_intersections',fig);}
 if(family==='similarity'){
 p={k,j};const AB=3*k,AC=3*j;return Q(`△ABCでDは辺AB上、Eは辺AC上にあり、DE∥BC。AD＝${k}cm、DB＝${2*k}cm、AC＝${AC}cm、△ABCの面積は${9*k*j}cm²である。四角形DBCEの面積を選びなさい。`,`${8*k*j} cm²`,[[`${6*k*j} cm²`,'面積比は相似比の2乗。'],[`${k*j} cm²`,'求めるのは小三角形ではなく残りの四角形。'],[`${3*k*j} cm²`,'長さ比1:3を面積比に直接使わない。']],[`AD:AB＝1:3。平行線より△ADE∽△ABC。`,`面積比は1:9なので△ADE＝${k*j}。`,`残りは${9*k*j}−${k*j}＝${8*k*j}cm²。`],'geometry',3,'similarity_area_complement',{type:'coordinates',points:{A:[0,3],B:[0,0],C:[4,0],D:[0,2],E:[4/3,2]},edges:[['A','B'],['B','C'],['C','A'],['D','E']],note:'概形。辺の長さは問題文の数値を使う。'});}
 if(family==='square_length'||family==='square_area'){
 p={k};const fig={type:'coordinates',points:{A:[0,4*k],B:[4*k,4*k],C:[4*k,0],D:[0,0],F:[3*k,0],E:[4*k,17*k/6]},edges:[['A','B'],['B','C'],['C','D'],['D','A'],['A','F'],['A','E']],note:`AB＝${4*k}cm、FC＝${k}cm、∠DAF＝∠FAE`};
 const stem=`正方形ABCDの一辺は${4*k}cm。Fは辺DC上にありFC＝${k}cm。Eは辺BC上にあり、AFは∠DAEの二等分線である。`;
 if(family==='square_length')return Q(stem+' AFの長さを選びなさい。',`${5*k} cm`,[[`${7*k} cm`,'直角をはさむ2辺は加えない。'],[`${4*k} cm`,'AFは正方形の辺ではない。'],[`${3*k} cm`,'DFの長さをAFと取り違えない。']],[`DF＝${4*k}−${k}＝${3*k}。`,`直角三角形ADFよりAF²＝${4*k}²＋${3*k}²＝${25*k*k}。`,`AF＝${5*k}cm。`],'geometry',3,'auxiliary_right_triangle',fig);
 return Q(stem+' 四角形AECFの面積を選びなさい。',`${frac(23*k*k,3)} cm²`,[[`${8*k*k} cm²`,'角の二等分線は面積を二等分するとは限らない。'],[`${10*k*k} cm²`,'△ABEの面積も除く。'],[`${frac(7*k*k,3)} cm²`,'これは△ABEの面積。']],[`FからAEに垂線FHを下ろす。△ADFと△AHFは斜辺と鋭角が等しい直角三角形なので、AH＝AD＝${4*k}、FH＝DF＝${3*k}。`,`AFが∠DAEを二等分するため、∠BAE＝90°−2∠DAF。EからABへの長さをBE＝t、AE＝rと置く。`,`角の二等分線上の点FからADとAEへの距離は等しく、△AFEの面積は(3k)r/2。一方、座標方向の底辺・高さで(16k²−3kt)/2。よって3r＝16k−3t。`,`r²＝(4k)²＋t²に代入してt＝7k/6。ここではBE＝${frac(7*k,6)}。`,`正方形から△ADFと△ABEを除く。${16*k*k}−${6*k*k}−${frac(7*k*k,3)}＝${frac(23*k*k,3)}cm²。`],'geometry',5,'bisector_auxiliary_area',fig);}
 if(family==='pyramid_height'||family==='pyramid_ratio'){
 p={k};const fig={type:'pyramid',side:2*k};const stem=`正四角すいOABCDはすべての辺の長さが${2*k}cm。底面の対角線の交点をEとし、OEの中点をFとする。`;
 if(family==='pyramid_height')return Q(stem+' 高さOEを選びなさい。',`${k}√2 cm`,[[`${2*k} cm`,'側辺と高さは別の線分。'],[`${2*k}√2 cm`,'底面の対角線全体を用いない。'],[`${k} cm`,'底面中心から頂点までの距離は半対角線。']],[`底面の半対角線EA＝${k}√2。`,`直角三角形OEAでOE²＝${2*k}²−(${k}√2)²＝${2*k*k}。`,`OE＝${k}√2cm。`],'geometry',4,'solid_to_plane',fig);
 return Q(stem+' Fを通り底面に平行な平面で切る。底面側に残る立体の体積は、もとの体積の何倍か。','7/8',[['1/2','高さの比をそのまま体積比にしない。'],['3/4','面積比ではなく体積比を使う。'],['1/8','これは頂点側の小さい四角すいの割合。']],[`頂点側の小さい四角すいともとの四角すいの相似比は1:2。`,`体積比は1:8。`,`底面側に残る割合は1−1/8＝7/8。`],'geometry',4,'solid_similarity_complement',fig);}
 if(family==='tetrahedron'){
 p={k,n};return Q(`一辺${2*k}cmの立方体で、同じ頂点Bから出る3本の辺上にP、Q、Rがある。BP＝${k}cm、BQ＝${k}cm、BR＝${2*k}cm。四面体BPQRの体積を選びなさい。`,`${frac(k**3,3)} cm³`,[[`${k**3} cm³`,'底面の三角形と高さから錐の係数1/3を使う。'],[`${frac(2*k**3,3)} cm³`,'底面積を求める際の1/2が必要。'],[`${2*k**3} cm³`,'直方体全体の体積ではない。']],[`3辺は互いに垂直なので、底面△BPQの面積は${k}×${k}÷2。`,`高さはBR＝${2*k}。`,`三角錐の体積は底面積×高さ÷3＝${frac(k**3,3)}cm³。`],'geometry',4,'solid_to_plane');}
 throw new Error('Unknown math family: '+family);
}
const FAMILIES=['signed','radical','factor','equation','quadratic','rate','integer','histogram','circle','cone','probability','boxplot','meanbounds','sampling','reflection','moving_value','moving_equal','similarity','square_length','square_area','pyramid_height','pyramid_ratio','tetrahedron'];
function buildSet(seed=1,level=2){
 const families=['signed','radical','factor','equation','quadratic','rate','integer','histogram','circle','cone',seed%2?'probability':'boxplot','reflection','moving_value','moving_equal','similarity','square_length','square_area','pyramid_height','pyramid_ratio'];
 const rand=rng(seed+9901);const pairSeed=seed*101+37;
 return families.map((family,i)=>{
  const qs=['moving_value','moving_equal','square_length','square_area','pyramid_height','pyramid_ratio'].includes(family)?pairSeed:seed*97+i*31+level;
  const q=make(family,qs,level);q.code=`math-v1-${seed}-${level}-${i+1}`;q.id=q.reviewKey=q.code;q.points=[10,11,13].includes(i)?2:1;q.bigQuestion=i<10?'大問1':i<14?'大問2':'大問3';q.bigTitle=i<10?'基礎・標準':i<14?'条件整理・融合':'図形の応用';q.officialSmallLabel=i<10?`(${i+1})`:i<14?['(1)','(2)','(3)①','(3)②'][i-10]:['(1)','(2)①','(2)②','(3)①','(3)②'][i-14];q.courseLevel=level;q.testMode=true;
  for(let j=q.choices.length-1;j>0;j--){const k=Math.floor(rand()*(j+1));[q.choices[j],q.choices[k]]=[q.choices[k],q.choices[j]];}q.answerIndex=q.choices.findIndex(c=>c.ok);return q;
 });
}
function figureHTML(fig){
 if(!fig)return '';let shapes='';const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;const text=(x,y,s)=>`<text x="${x}" y="${y}" stroke="none" fill="currentColor" font-size="13">${esc(s)}</text>`;
 if(fig.type==='histogram'){
  const counts=fig.counts,max=Math.max(...counts),w=270/counts.length;
  for(let v=0;v<=max;v+=2)shapes+=line(42,185-v*140/max,318,185-v*140/max,'opacity=".2"')+text(18,189-v*140/max,v);
  counts.forEach((c,i)=>{shapes+=`<rect x="${42+i*w}" y="${185-c*140/max}" width="${w}" height="${c*140/max}" fill="#749cca" fill-opacity=".5"/>`+text(42+i*w,207,(fig.start||0)+i*fig.width);});shapes+=text(312,207,(fig.start||0)+counts.length*fig.width)+text(15,22,'人数')+text(270,232,'時間（分）');
 }else if(fig.type==='boxplot'){
  const max=50,x=v=>40+v*5;
  for(let n=0;n<=max;n+=10)shapes+=text(x(n)-4,221,n)+line(x(n),204,x(n),211);
  fig.rows.forEach((r,i)=>{const y=70+i*95,[min,q1,med,q3,m]=r.values;shapes+=text(30,y-27,r.name)+line(x(min),y,x(m),y)+line(x(min),y-12,x(min),y+12)+line(x(m),y-12,x(m),y+12)+`<rect x="${x(q1)}" y="${y-13}" width="${x(q3)-x(q1)}" height="26" fill="var(--card,#fff)"/>`+line(x(med),y-13,x(med),y+13);r.values.forEach((v,j)=>{shapes+=text(x(v)-6,y+30,v);});});
 }else if(fig.type==='coordinates'){
  const ps=Object.values(fig.points),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);let loX=Math.min(0,...xs),hiX=Math.max(...xs),loY=Math.min(0,...ys),hiY=Math.max(...ys);const sx=236/Math.max(1,hiX-loX),sy=150/Math.max(1,hiY-loY),scale=Math.min(sx,sy);const x=v=>48+(v-loX)*(fig.parabola?sx:scale),y=v=>196-(v-loY)*(fig.parabola?sy:scale);
  if(fig.parabola){let pts=[];for(let i=0;i<=40;i++){let v=hiX*i/40;pts.push(`${x(v)},${y(fig.parabola*v*v)}`);}shapes+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#3473aa"/>`+text(300,205,'x')+text(27,28,'y')+line(x(0),25,x(0),207)+line(30,y(0),305,y(0));}
  for(const [a,b] of fig.edges){const A=fig.points[a],B=fig.points[b];shapes+=line(x(A[0]),y(A[1]),x(B[0]),y(B[1]));}
  for(const [name,p] of Object.entries(fig.points)){shapes+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="2"/>`+text(x(p[0])+5,y(p[1])-7,name);}
 }else if(fig.type==='pyramid'){
  const pts={O:[166,28],A:[60,157],B:[215,198],C:[285,137],D:[133,101],E:[174,148],F:[170,88]};
  for(const [a,b] of [['O','A'],['O','B'],['O','C'],['O','D'],['A','B'],['B','C'],['C','D'],['D','A'],['O','E']])shapes+=line(...pts[a],...pts[b],['D','E'].includes(b)?'stroke-dasharray="5 4"':'');
  for(const [name,p] of Object.entries(pts))shapes+=text(p[0]+6,p[1]+(name==='O'?-8:14),name);
 }
 return `<figure class="mathFigure"><svg viewBox="0 0 350 245" role="img" aria-label="${esc(fig.note||'問題の条件を表す図')}" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none">${shapes}</g></svg>${fig.note?`<figcaption>${esc(fig.note)}</figcaption>`:''}</figure>`;
}
root.AAMathEngine={VERSION,FAMILIES,units,make,buildSet,figureHTML,frac};
if(typeof module!=='undefined')module.exports=root.AAMathEngine;
})(typeof window==='undefined'?globalThis:window);
