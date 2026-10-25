import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanPixels} from '../src/handwriting-clean/engine.mjs';
import {compareMask} from '../src/handwriting-clean/fixtures.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),dir=path.join(root,'tmp','handwriting-evaluation'),report={fixture:'Same synthetic Japanese text/triangle/stroke-path fixtures as handwriting-model-eval.py; not real worksheet accuracy',measurement:'Pixel processing (excludes PNG decode/encode)',cases:{}};
for(const name of ['color','black','overlap','colored-print','shadow']){
  const f={width:1200,height:1600,data:new Uint8ClampedArray(await fs.readFile(path.join(dir,name+'-written.rgba'))),ink:new Uint8Array(await fs.readFile(path.join(dir,name+'-ink.bin'))),print:new Uint8Array(await fs.readFile(path.join(dir,name+'-print.bin')))},r=cleanPixels(f);
  report.cases[name]={elapsedMs:r.elapsedMs,...compareMask(f,r)};await fs.writeFile(path.join(dir,name+'-local-result.rgba'),r.data);
}
await fs.writeFile(path.join(dir,'same-fixture-color.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
