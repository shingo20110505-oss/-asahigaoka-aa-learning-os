from pathlib import Path

def replace_once(path, old, new):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    if new in s:
        return False
    if old not in s:
        raise AssertionError(f"marker missing in {path}: {old[:120]!r}")
    p.write_text(s.replace(old,new,1),encoding='utf-8')
    return True

replace_once(
    'index.html',
    '<script src="./learning-engine-v22.js"></script>\n',
    '<script src="./learning-engine-v22.js"></script>\n<script src="./math-exam/adapter.js?version=1.1.0"></script>\n'
)

sw=Path('sw.js')
s=sw.read_text(encoding='utf-8')
old_version="const VERSION='2.5.307-quality2-chronologia1000-aichi-math-application-1.0.1-20260902-japanese-exam-1.0.0';"
new_version="const VERSION='2.5.308-quality2-chronologia1000-aichi-math-application-1.0.1-20260902-japanese-exam-1.0.0-math-full-1.1.0';"
if new_version not in s:
    if old_version not in s:
        raise AssertionError('service worker version marker missing')
    s=s.replace(old_version,new_version,1)
adapter_cache="CORE.unshift(url('math-exam/adapter.js'));"
if adapter_cache not in s:
    marker="CORE.unshift(url('math-exam/engine.js'));\n"
    if marker not in s:
        raise AssertionError('math engine service-worker marker missing')
    s=s.replace(marker,marker+adapter_cache+"\n",1)
sw.write_text(s,encoding='utf-8')

q=Path('quality-ci-runner-v1.js')
s=q.read_text(encoding='utf-8')
legacy='''    const mathSets = [1401,2202,3503,4804].map(seed => window.AAMathEngine.buildSet(seed, 2));
    const math = mathSets.flat();
    const mathFormulaPracticePreserved = window.AA_QUALITY_REPAIR_FINAL?.math?.ok === true;
    add('愛知県型数学・応用検算', mathFormulaPracticePreserved && math.length === 76 && mathSets.every(qs => qs.length === 19 && qs.reduce((n,q)=>n+q.points,0) === 22) && math.every(q => q.choices.length === 4 && q.choices.filter(c => c.ok).length === 1 && q.source.curriculum === 'junior-high') && math.some(q => q.thinking === 'certainty') && math.some(q => q.thinking === 'reflection_area_bisection') && math.some(q => q.thinking === 'piecewise_intersections'), '通常演習を保持／4セット・76問／19解答単位・22点／応用思考を検査');
'''
intermediate='''    const mathSets = [1401,2202,3503,4804].map(seed => window.AAMathEngine.buildSet(seed, 2));
    const math = mathSets.flat();
    const normalMath = Array.from({length: 44}, (_,i) => makeMathQ(9, 910000 + i));
    const mathFull = window.AAMathFullReplacement;
    add('愛知県型数学・応用検算', mathFull?.ok === true && document.documentElement.dataset.aaMathFullReplacement === 'PASS' && math.length === 76 && mathSets.every(qs => qs.length === 19 && qs.reduce((n,q)=>n+q.points,0) === 22) && math.every(q => q.choices.length === 4 && q.choices.filter(c => c.ok).length === 1 && q.source.curriculum === 'junior-high') && normalMath.every(q => q.source?.route === 'full-replacement' && q.source?.origin === 'verified-math-template' && q.choices.length === 4 && q.choices.filter(c=>c.ok).length === 1) && normalMath.some(q => q.mathFigure) && math.some(q => q.thinking === 'certainty') && math.some(q => q.thinking === 'reflection_area_bisection') && math.some(q => q.thinking === 'piecewise_intersections'), '通常演習も検証済みエンジンへ完全置換／4セット・76問／通常44問／図・応用思考を検査');
'''
desired='''    const mathSets = [1401,2202,3503,4804].map(seed => window.AAMathEngine.buildSet(seed, 2));
    const math = mathSets.flat();
    const mathFormulaPracticePreserved = window.AA_QUALITY_REPAIR_FINAL?.math?.ok === true;
    const normalMath = Array.from({length: 44}, (_,i) => makeMathQ(9, 910000 + i));
    const mathFull = window.AAMathFullReplacement;
    add('愛知県型数学・応用検算', mathFormulaPracticePreserved && mathFull?.ok === true && document.documentElement.dataset.aaMathFullReplacement === 'PASS' && math.length === 76 && mathSets.every(qs => qs.length === 19 && qs.reduce((n,q)=>n+q.points,0) === 22) && math.every(q => q.choices.length === 4 && q.choices.filter(c => c.ok).length === 1 && q.source.curriculum === 'junior-high') && normalMath.every(q => q.source?.route === 'full-replacement' && q.source?.origin === 'verified-math-template' && q.choices.length === 4 && q.choices.filter(c=>c.ok).length === 1) && normalMath.some(q => q.mathFigure) && math.some(q => q.thinking === 'certainty') && math.some(q => q.thinking === 'reflection_area_bisection') && math.some(q => q.thinking === 'piecewise_intersections'), '通常演習も検証済みエンジンへ完全置換／既存FINAL品質ゲート保持／4セット・76問／通常44問／図・応用思考を検査');
'''
if desired not in s:
    if intermediate in s:
        s=s.replace(intermediate,desired,1)
    elif legacy in s:
        s=s.replace(legacy,desired,1)
    else:
        raise AssertionError('quality CI math marker missing')
q.write_text(s,encoding='utf-8')

Path('scripts/verify-math-public.mjs').write_text(r'''import {createHash} from "node:crypto";
import fs from "node:fs/promises";
import vm from "node:vm";
const base=process.argv[2],source=process.argv[3]||Date.now();
if(!/^https:\/\//.test(base||""))throw new Error("HTTPS base URL required");
const get=async path=>{const r=await fetch(new URL(path+"?verify="+source,base),{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(path+" HTTP "+r.status);return r.text();};
const [engineText,adapterText,catalogText]=await Promise.all([get("math-exam/engine.js"),get("math-exam/adapter.js"),get("math-exam/catalog.json")]);
const [localEngine,localAdapter,localCatalog]=await Promise.all([fs.readFile(new URL("../math-exam/engine.js",import.meta.url),"utf8"),fs.readFile(new URL("../math-exam/adapter.js",import.meta.url),"utf8"),fs.readFile(new URL("../math-exam/catalog.json",import.meta.url),"utf8")]);
const hash=s=>createHash("sha256").update(s).digest("hex");
if(hash(engineText)!==hash(localEngine)||hash(adapterText)!==hash(localAdapter)||hash(catalogText)!==hash(localCatalog))throw new Error("Public mathematics assets do not match source");
const sandbox={globalThis:null,Date,Uint32Array};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(engineText,sandbox);vm.runInContext(adapterText,sandbox);
const E=sandbox.AAMathEngine,A=sandbox.AAMathFullReplacement,catalog=JSON.parse(catalogText);
if(!E||E.VERSION!==catalog.engineVersion||!A||A.VERSION!=="1.1.0"||!A.ok)throw new Error("Mathematics engine/adapter version mismatch");
for(const pack of catalog.packs){const qs=E.buildSet(pack.seed,2);if(qs.length!==19||qs.reduce((n,q)=>n+q.points,0)!==22||qs.some(q=>q.choices.length!==4||q.choices.filter(c=>c.ok).length!==1))throw new Error("Invalid public mathematics pack");}
for(let d=1;d<=11;d++)for(let i=1;i<=30;i++){const q=A.createPracticeQuestion(d,d*10000+i);if(q.source?.route!=="full-replacement"||q.choices.length!==4||q.choices.filter(c=>c.ok).length!==1)throw new Error("Invalid public normal mathematics route");}
console.log("PUBLIC_MATH_OK "+catalog.packs.length+" packs / 19 questions / 22 points / engine="+hash(engineText)+" / adapter="+hash(adapterText)+" / normal-route=full-replacement");
''',encoding='utf-8')

print('FULL_MATH_REPLACEMENT_PATCH_OK')
