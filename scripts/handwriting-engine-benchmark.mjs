import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {syntheticPage,compareMask} from '../src/handwriting-clean/fixtures.mjs';
import {cleanPixels} from '../src/handwriting-clean/engine.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),report={device:os.cpus()[0]?.model,node:process.version,fixture:'1200x1600 deterministic synthetic paper; not photographed handwriting accuracy',measurement:'CPU pixel processing only; no image decode, encode, transfer or disk IO',cases:{},batches:[]};
for(const [name,options]of Object.entries({color:{},black:{black:true},coloredPrint:{coloredPrint:true},shadow:{shadow:true}})){const f=syntheticPage(1200,1600,options),result=cleanPixels(f);report.cases[name]={elapsedMs:result.elapsedMs,...compareMask(f,result)};}
for(const count of [1,3,10]){const fixture=syntheticPage(),started=performance.now();for(let i=0;i<count;i++)cleanPixels(fixture);report.batches.push({count,pixelMs:performance.now()-started});}
const dir=path.join(root,'tmp','handwriting-evaluation');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'pixel-engine.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
