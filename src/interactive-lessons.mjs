export const exploreLessons=[['moving','数学','動点と場合分け'],['box','数学','データと箱ひげ図'],['reflection','数学','反射と最短経路'],['pyramid','数学','立体の平行断面'],['neutral','理科','中和とイオン'],['mass','理科','反応と質量'],['quake','理科','地震波と時間差'],['inheritance','理科','遺伝の組合せ'],['experiment','理科','実験の条件比較'],['data','英語・社会','割合と実数']];
const f=n=>Number(n.toFixed(2));
const explanations={
 moving:({p,r,q,diff,a,b})=>`<h3>式が変わるのはどこ？</h3><p>0〜8秒は S=3t、8〜14秒は S=56−4t、14〜22秒は S=3t−42。点がBとCに着く時刻で式が変わります。</p><p>底辺OCは固定ですが、高さはPの位置で変わります。グラフの折れ曲がりと図の位置を同時に確かめましょう。</p>`,
 box:({p,r,q,diff,a,b})=>`<h3>端の値を変えると？</h3><p>最大値だけを大きくすると、平均値と中央値は同じように動くでしょうか。入力して比較できます。</p><p>小さい順：${q.sorted.map(f).join(' / ')}</p><p>中学校で扱う、個数が奇数なら全体の中央値を除いて上下の中央値を求める方法です。ひげは最小値・最大値。箱ひげ図だけでは、個々の値や平均値は確定しません。</p><a href="https://www.stat.go.jp/naruhodo/5_tokucho/chirabari.html" target="_blank" rel="noopener">総務省統計局：散らばりの見方 ↗</a>`,
 reflection:({p,r,q,diff,a,b})=>'<h3>なぜ反転するのか</h3><p>Pが軸上にあるのでAP=A′P。A′→P→Bが一直線になったとき、折れ線の長さが最小になります。</p><p>A′Bと軸の交点はx=4.25。図上の見た目に加えて、直線の式でも確かめられます。</p>',
 pyramid:({p,r,q,diff,a,b})=>`<h3>長さ・面積・体積は別の比</h3><p>高さの比 k=${f(r.k)}。断面の辺は8k、面積は64k²、上側の体積は256k³です。全体の体積は256 cm³。</p><p>底面に平行な切断だけを扱います。入試の斜めの切断では、相似にできる三角形や補助線を別に見つける必要があります。</p>`,
 neutral:({p,r,q,diff,a,b})=>'<h3>中和しても残る粒子</h3><p>塩酸と水酸化ナトリウム水溶液を、反応する量の単位をそろえて混ぜるモデル。H⁺とOH⁻が1対1で水になります。Na⁺とCl⁻は水溶液中に残ります。</p><p>数字は体積やpHではありません。濃度が異なる液を、同じ体積だから同量として扱うことはできません。水の電離は省略しています。</p>',
 mass:({p,r,q,diff,a,b})=>`<h3>どちらかがなくなると、反応は止まる</h3><p>銅：酸素=4：1の質量比を使うモデルです。酸素${p.oxygen} gで反応できる銅は最大${p.oxygen*4} g。そこから先の銅は残ります。</p><p>密閉系全体の質量は${f(r.total)} gで変わりません。「できた酸化銅」と「残った物質」を合わせて確認しましょう。反応が十分進んだ理想化です。</p>`,
 quake:({p,r,q,diff,a,b})=>'<h3>時間差は距離とどう変わる？</h3><p>Pの到着は距離÷Pの速さ、Sの到着は距離÷Sの速さ。その差が初期微動継続時間です。同じ速さの条件なら、距離に比例します。</p><p>均一な地中を一定の速さで伝わる学習モデルです。実際の地震速報や到着予測には使えません。</p><a href="https://www.jma.go.jp/jma/kishou/know/jishin/eew/shikumi/shikumi.html" target="_blank" rel="noopener">気象庁：P波・S波と速報のしくみ ↗</a>',
 inheritance:({p,r,q,diff,a,b})=>'<h3>遺伝子型と見える形質を分ける</h3><p>Aがaに対して完全な顕性を示す、一つの形質のモデルです。AAとAaは同じ形質、aaは別の形質になります。</p><p>Aa×Aaでは遺伝子型が1:2:1、形質が3:1。これは確率なので、子が4個体なら必ず3個体と1個体になるわけではありません。顕性は「優れている」の意味ではありません。</p>',
 experiment:({p,r,q,diff,a,b})=>`<h3>${diff.length===1?'一つの条件の影響を比較できる':'この組合せだけでは影響を分けられない'}</h3><p>異なる条件：${diff.map(i=>['','温度','濃度','明暗'][i]).join('・')||'なし'}。</p><p>変える条件は一つにし、それ以外の条件をそろえます。「測る結果」（例：一定時間に生じた気体の体積）も同じ方法・時間で測定します。</p><p>表は条件を整理するための架空例です。観測結果や、実際の物質に関する実験手順ではありません。</p>`,
 data:({p,r,q,diff,a,b})=>`<h3>人数が多い＝割合が大きい？</h3><p>同じ架空データを「人数」と「割合」で表示しています。割合=該当人数÷全体×100。比べるときは、分母・単位・時点をそろえます。</p><p lang="en">A: ${p.partA} out of ${p.totalA} people. B: ${p.partB} out of ${p.totalB} people.</p><p lang="en">${p.partA===p.partB?'The numbers are equal.':p.partA>p.partB?'A has more people in this category than B.':'B has more people in this category than A.'} ${a===b?'The percentages are equal.':a>b?'The percentage is higher in A.':'The percentage is higher in B.'}</p><p>人数だけを固定して全体の人数を変え、英文もどう変わるか確かめましょう。</p>`,
};
export const exploreExplanation=(id,values)=>explanations[id](values);

export const templates={
 国語:'資料を読むときは、数値だけでなく調査の条件も確認したい。\nなぜなら、調査対象が異なれば数値の意味も変わるからだ。\n例えば、全校生徒の回答と希望者だけの回答は、同じようには比べられない。\nしかし、条件の違いがあるからといって、すべての比較が無意味になるわけではない。',
 英語:'We want to join an event on Saturday afternoon.\nWe can spend up to 1,000 yen per person.\nEvent A starts at 10 a.m. and costs 500 yen.\nEvent B starts at 2 p.m. and costs 800 yen.\nEvent C starts at 3 p.m. and costs 1,500 yen.',
 社会:'A地域では、調査対象100人のうち40人が公共交通を利用した。\nB地域では、調査対象200人のうち60人が公共交通を利用した。\n人数はB地域の方が多い。\n全体に占める割合はA地域の方が高い。\nこの資料だけで、地域全体の利用者数は決められない。'
};

const format=n=>Number(n.toFixed(3)).toString();
const labExplanations={
 function:({points,k,c,parallel,params})=>`<h3>交点</h3><p>${points.kind==='coincident'?'2つの式は同じ直線です。':points.points.length?points.points.map(([x,y])=>`(${format(x)}, ${format(y)})`).join('<br>'):'実数の交点はありません。'}</p><p class="small">交点では ax² = mx + b。aの符号は開く向き、絶対値は同じxでのyの大きさに関係します。</p>`,
 geometry:({points,k,c,parallel,params})=>`<h3>面積は ${format(k*k)} 倍</h3><p class="small">もとの面積は 3 × 4 ÷ 2 = 6。拡大後は ${format(6*k*k)}。底辺と高さの両方がk倍になるため、面積はk²倍になります。</p>`,
 circuit:({points,k,c,parallel,params})=>`<h3>${parallel?'電圧が同じ、電流は分かれる':'電流が同じ、電圧は分かれる'}</h3><p class="small">R₁：${format(c.v1)} V / ${format(c.i1)} A<br>R₂：${format(c.v2)} V / ${format(c.i2)} A</p><p class="small">${parallel?'1/R = 1/R₁ + 1/R₂':'R = R₁ + R₂'}<br>I = V/R、P = VI</p>`,
 motion:({points,k,c,parallel,params})=>`<h3>グラフの面積が移動距離</h3><p class="small">一定の加速度で前進するモデルです。<br>v = v₀ + at<br>s = v₀t + at²/2<br>加速度を0にすると、等速直線運動になります。</p>`,
};
export const labExplanation=(id,values)=>labExplanations[id](values);
