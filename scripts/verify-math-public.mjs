import {createHash} from "node:crypto";
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
