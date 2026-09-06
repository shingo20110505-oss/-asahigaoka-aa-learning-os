(()=>{'use strict';
const ids=['s06','s07','s08','s09','s12','s16','s17','a01','a02','a03','a04','a05','a08','a09','a22','a23','a24','a25'];
const labelStyle='font:700 12px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;fill:#dce7ff';
const subStyle='font:700 10px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;fill:#91a7cf';
const line='stroke:#8ba0ff;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round';
const accent='stroke:#d4a7ff;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round';
const soft='stroke:#63ddb7;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round';
const dash='stroke:#7188b8;stroke-width:2;fill:none;stroke-dasharray:6 6';
const dot=(x,y,n)=>`<circle cx="${x}" cy="${y}" r="4" fill="#f7f9ff"/><text x="${x+7}" y="${y-7}" style='${labelStyle}'>${n}</text>`;
const t=(x,y,s,sub=false)=>`<text x="${x}" y="${y}" style='${sub?subStyle:labelStyle}'>${s}</text>`;
const wrap=(aria,inner,caption)=>`<figure class="mathDiagram" data-math-diagram><svg viewBox="0 0 320 180" role="img" aria-label="${aria}">${inner}</svg><figcaption>${caption}</figcaption></figure>`;
const diagrams={
 s06:()=>wrap('直角三角形で斜辺に高さを下ろした図',`<path d="M45 145 L145 35 L275 145 Z" style='${line}'/><path d="M145 35 L145 145" style='${accent}'/><path d="M145 132 h13 v13" style='${soft}'/>${dot(45,145,'A')}${dot(145,35,'C')}${dot(275,145,'B')}${dot(145,145,'H')}${t(86,163,'p',true)}${t(208,163,'q',true)}${t(154,92,'h',true)}`,'斜辺を p・q に分ける高さ h を見つける'),
 s07:()=>wrap('三角形の角の二等分線の図',`<path d="M45 145 L160 28 L280 145 Z" style='${line}'/><path d="M160 28 L178 145" style='${accent}'/><path d="M144 49 Q160 58 171 47" style='${soft}'/><path d="M171 47 Q181 61 185 48" style='${soft}'/>${dot(160,28,'A')}${dot(45,145,'B')}${dot(280,145,'C')}${dot(178,145,'D')}`,'A の二等分線 AD → BD:DC = AB:AC'),
 s08:()=>wrap('三角形と内接円の図',`<path d="M45 145 L160 28 L280 145 Z" style='${line}'/><circle cx="160" cy="106" r="39" style='${soft}'/><path d="M160 106 L160 145" style='${accent}'/><path d="M160 133 h12 v12" style='${soft}'/>${dot(160,106,'I')}${t(172,126,'r',true)}`,'内心から各辺までの高さはすべて r'),
 s09:()=>wrap('円の外の一点から二本の接線を引いた図',`<circle cx="205" cy="92" r="58" style='${line}'/><path d="M48 92 L169 47 M48 92 L169 137" style='${accent}'/>${dot(48,92,'P')}${dot(169,47,'A')}${dot(169,137,'B')}${t(98,57,'PA',true)}${t(98,136,'PB',true)}`,'同じ点 P からの接線は PA = PB'),
 s12:()=>wrap('対称移動で折れ線を一直線にする図',`<path d="M30 92 H290" style='${line}'/><path d="M58 36 L151 92 L262 38" style='${accent}'/><path d="M151 92 L262 146" style='${dash}'/><path d="M58 36 L262 146" style='${soft}'/>${dot(58,36,'A')}${dot(151,92,'P')}${dot(262,38,'B')}${dot(262,146,"B'")}`,'B を基準線の反対側へ移し、A・P・B′を一直線にする'),
 s16:()=>wrap('同じ角をはさむ二つの三角形の図',`<path d="M52 142 L145 52 L235 142 M52 142 L145 52 L290 112" style='${line}'/><path d="M129 70 Q145 84 159 68" style='${soft}'/>${dot(145,52,'O')}${t(83,102,'a',true)}${t(187,102,'b',true)}${t(248,78,'d',true)}${t(113,151,'c',true)}${t(157,77,'θ',false)}`,'共有角 θ をはさむ2辺の積で面積比を作る'),
 s17:()=>wrap('直方体の空間対角線の図',`<path d="M62 65 H210 V145 H62 Z M102 35 H250 V115 H210 M210 65 L250 35 M210 145 L250 115 M62 65 L102 35 M62 145 L102 115 M102 35 V115" style='${line}'/><path d="M62 145 L250 35" style='${accent}'/>${t(150,82,'d',false)}${t(129,160,'a',true)}${t(255,80,'b',true)}${t(76,103,'c',true)}`,'空間対角線 d = √(a²+b²+c²)'),
 a01:()=>wrap('チェバの定理の三角形と三本の線分の図',`<path d="M48 146 L160 28 L282 146 Z" style='${line}'/><path d="M160 28 L178 146 M48 146 L224 90 M282 146 L102 91" style='${accent}'/><circle cx="160" cy="96" r="5" fill="#63ddb7"/>${dot(160,28,'A')}${dot(48,146,'B')}${dot(282,146,'C')}${dot(178,146,'D')}${dot(224,90,'E')}${dot(102,91,'F')}${t(168,90,'P',true)}`,'目印は「3本が一点 P で交わる」'),
 a02:()=>wrap('メネラウスの定理の三角形と一直線上の三点の図',`<path d="M58 146 L160 28 L272 146 Z" style='${line}'/><path d="M25 118 L300 73" style='${accent}'/>${dot(160,28,'A')}${dot(58,146,'B')}${dot(272,146,'C')}${dot(96,106,'F')}${dot(209,88,'E')}${dot(286,75,'D')}`,'目印は「D・E・F が1本の直線上」'),
 a03:()=>wrap('円の内部で二本の弦が交わる図',`<circle cx="160" cy="92" r="70" style='${line}'/><path d="M95 56 L229 128 M92 126 L231 55" style='${accent}'/>${dot(160,91,'P')}${dot(95,56,'A')}${dot(229,128,'B')}${dot(92,126,'C')}${dot(231,55,'D')}`,'交点 P から同一直線上の2点までを1組にする'),
 a04:()=>wrap('接線と割線による方べきの図',`<circle cx="210" cy="92" r="58" style='${line}'/><path d="M48 128 L190 145" style='${accent}'/><path d="M48 128 L262 74" style='${accent}'/>${dot(48,128,'P')}${dot(190,145,'T')}${dot(161,99,'A')}${dot(262,74,'B')}${t(91,142,'PT',true)}`,'接線 PT と割線 PAB が見えたら PT² = PA×PB'),
 a05:()=>wrap('円に内接する四角形と二本の対角線の図',`<circle cx="160" cy="92" r="73" style='${line}'/><path d="M110 37 L229 65 L203 145 L83 117 Z" style='${accent}'/><path d="M110 37 L203 145 M229 65 L83 117" style='${soft}'/>${dot(110,37,'A')}${dot(229,65,'B')}${dot(203,145,'C')}${dot(83,117,'D')}`,'4頂点が同じ円上 → 対角線の積 = 向かい合う辺の積の和'),
 a08:()=>wrap('スチュワートの定理の三角形と cevian の図',`<path d="M48 146 L160 30 L280 146 Z" style='${line}'/><path d="M160 30 L188 146" style='${accent}'/>${dot(160,30,'A')}${dot(48,146,'B')}${dot(280,146,'C')}${dot(188,146,'D')}${t(101,96,'c',true)}${t(225,95,'b',true)}${t(118,163,'m',true)}${t(229,163,'n',true)}${t(172,94,'d',true)}`,'AD=d、BD=m、DC=n の対応を図で固定する'),
 a09:()=>wrap('角の二等分線の長さを求める図',`<path d="M48 146 L160 30 L280 146 Z" style='${line}'/><path d="M160 30 L184 146" style='${accent}'/><path d="M145 51 Q160 62 174 50 M174 50 Q184 61 188 49" style='${soft}'/>${dot(160,30,'A')}${dot(48,146,'B')}${dot(280,146,'C')}${dot(184,146,'D')}${t(171,91,'AD',true)}`,'二等分線 AD 自体の長さを求めるときに使う'),
 a22:()=>wrap('正四面体の頂点から底面重心への高さの図',`<path d="M160 25 L68 137 L250 137 Z M160 25 L160 116 M68 137 L160 116 L250 137" style='${line}'/><path d="M160 25 L160 116" style='${accent}'/><circle cx="160" cy="116" r="4" fill="#63ddb7"/>${dot(160,25,'A')}${t(170,73,'h',false)}${t(168,119,'G',true)}${t(140,154,'a',true)}`,'頂点 A から底面の重心 G へ下ろす高さ h'),
 a23:()=>wrap('正四面体の底面積と高さを使う図',`<path d="M160 24 L67 138 L252 138 Z M160 24 L160 116 M67 138 L160 116 L252 138" style='${line}'/><path d="M160 24 L160 116" style='${accent}'/><path d="M67 138 L160 116 L252 138" style='${soft}'/>${t(170,72,'h',false)}${t(132,158,'底面 S',true)}${t(176,125,'G',true)}`,'V = 1/3 × 底面積 × 高さ を正四面体専用式にまとめる'),
 a24:()=>wrap('長方形と任意点Pから四頂点への距離の図',`<rect x="55" y="35" width="210" height="110" rx="2" style='${line}'/><path d="M143 96 L55 35 M143 96 L265 35 M143 96 L265 145 M143 96 L55 145" style='${accent}'/>${dot(55,35,'A')}${dot(265,35,'B')}${dot(265,145,'C')}${dot(55,145,'D')}${dot(143,96,'P')}`,'長方形なら向かい合う頂点への距離平方和が等しい'),
 a25:()=>wrap('平行四辺形と二本の対角線の図',`<path d="M70 140 L120 45 L260 45 L210 140 Z" style='${line}'/><path d="M70 140 L260 45 M120 45 L210 140" style='${accent}'/>${t(150,86,'p',false)}${t(181,109,'q',false)}${t(83,94,'a',true)}${t(151,157,'b',true)}`,'2本の対角線 p,q と隣辺 a,b を一式で結ぶ')
};
window.RISE_EXAM_MATH_VISUALS={version:'1.0.0',ids,render:id=>diagrams[id]?diagrams[id]():''};
if(typeof document==='undefined')return;
const style=document.createElement('style');
style.textContent='.mathDiagram{margin:11px 0 2px;padding:10px 10px 8px;border:1px solid rgba(139,160,255,.16);border-radius:14px;background:linear-gradient(180deg,rgba(8,23,49,.96),rgba(7,18,39,.96));overflow:hidden}.mathDiagram svg{display:block;width:100%;height:auto;max-height:190px}.mathDiagram figcaption{margin-top:5px;color:#9fb0ce;font-size:9px;line-height:1.5;font-weight:800}.formulaCard:has(.mathDiagram) .formula{margin-bottom:0}.diagramTag{display:inline-flex;align-items:center;min-height:23px;padding:0 7px;border-radius:999px;font-size:9px;font-weight:950;border:1px solid rgba(139,160,255,.22);background:rgba(139,160,255,.08);color:#dce5ff}';
document.head.appendChild(style);
function enhance(){
 const grid=document.querySelector('#grid');if(!grid)return;
 grid.querySelectorAll('.formulaCard').forEach(card=>{
  if(card.querySelector('[data-math-diagram]'))return;
  const id=card.querySelector('[data-fav]')?.dataset.fav;if(!id||!diagrams[id])return;
  const formula=card.querySelector('.formula');if(!formula)return;
  formula.insertAdjacentHTML('afterend',diagrams[id]());
  const meta=card.querySelector('.meta');if(meta&&!meta.querySelector('.diagramTag'))meta.insertAdjacentHTML('beforeend','<span class="diagramTag">図つき</span>');
 });
 const promise=document.querySelector('.promise');if(promise&&!promise.querySelector('[data-visual-promise]'))promise.insertAdjacentHTML('beforeend','<span data-visual-promise>図で見抜く</span>');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{enhance();const grid=document.querySelector('#grid');if(grid)new MutationObserver(enhance).observe(grid,{childList:true})},{once:true});else{enhance();const grid=document.querySelector('#grid');if(grid)new MutationObserver(enhance).observe(grid,{childList:true})}
})();