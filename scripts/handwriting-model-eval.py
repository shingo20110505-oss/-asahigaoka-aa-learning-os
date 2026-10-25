"""Reproducible CPU comparison. Review the external IS-Net source before invoking.

This script uses only a state_dict (weights_only=True); never loads a pickled model.
Model and dependencies stay in tmp, never in the shipped application.
"""
import argparse, ctypes, hashlib, importlib.util, io, json, platform, time, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tmp/handwriting-evaluation'
OUT.mkdir(parents=True, exist_ok=True)

def fixture(kind, width=1200, height=1600):
    original = Image.new('RGB', (width,height), (248,247,244))
    printing = Image.new('L',(width,height)); pd=ImageDraw.Draw(printing)
    font_path=Path('C:/Windows/Fonts/meiryo.ttc')
    font=ImageFont.truetype(str(font_path),28)
    d=ImageDraw.Draw(original)
    for y in range(70,1400,110):
        text=f'問 {(y-70)//110+1}　次の問いに答えなさい。x² + 3x = 10'
        color=(190,25,30) if kind=='colored-print' and y==70 else (25,25,25)
        d.text((70,y),text,font=font,fill=color);pd.text((70,y),text,font=font,fill=255)
        d.line((70,y+70,1100,y+70),fill=(110,110,110),width=2);pd.line((70,y+70,1100,y+70),fill=255,width=2)
    # A geometric diagram and labels are printed content, not disposable background.
    diagram=[(120,1550),(250,1440),(380,1550),(120,1550)]
    d.line(diagram,fill=(25,25,25),width=3);pd.line(diagram,fill=255,width=3)
    for x,y,text in [(100,1510,'A'),(245,1405,'B'),(385,1510,'C')]:
        d.text((x,y),text,font=font,fill=(25,25,25));pd.text((x,y),text,font=font,fill=255)
    ink=Image.new('L',(width,height)); inkdraw=ImageDraw.Draw(ink)
    written=original.copy(); wd=ImageDraw.Draw(written)
    for i,y in enumerate(range(120,1450,110)):
        color=(35,45,180) if i%2 else (195,30,40)
        if kind in ('black','overlap'):color=(35,35,35)
        if kind=='overlap':y-=35
        pts=[(780,y),(805,y-20),(820,y+10),(855,y-25),(880,y+5),(930,y-10)]
        wd.line(pts,fill=color,width=5);inkdraw.line(pts,fill=255,width=5)
        wd.ellipse((970,y-20,1020,y+20),outline=color,width=5);inkdraw.ellipse((970,y-20,1020,y+20),outline=255,width=5)
    a=np.array(original);b=np.array(written)
    if kind=='shadow':
        shading=np.linspace(.67,1,width)[None,:,None];a=(a*shading).astype(np.uint8);b=(b*shading).astype(np.uint8)
    Image.fromarray(a).save(OUT/f'{kind}-original.png');Image.fromarray(b).save(OUT/f'{kind}-written.png');ink.save(OUT/f'{kind}-ink.png');printing.save(OUT/f'{kind}-print.png')
    rgba=np.concatenate([b,np.full((height,width,1),255,dtype=np.uint8)],axis=2);(OUT/f'{kind}-written.rgba').write_bytes(rgba.tobytes());(OUT/f'{kind}-ink.bin').write_bytes((np.array(ink)>0).astype(np.uint8).tobytes());(OUT/f'{kind}-print.bin').write_bytes((np.array(printing)>0).astype(np.uint8).tobytes())
    return a,b,np.array(ink)>0,np.array(printing)>0

def metrics(mask,ink,printing):
    tp=int(np.sum(mask&ink));fp=int(np.sum(mask&~ink));fn=int(np.sum(~mask&ink))
    visible_print=printing&~ink
    return dict(precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn),iou=tp/max(1,tp+fp+fn),visible_print_retained=1-float(np.sum(mask&visible_print))/max(1,int(visible_print.sum())),selected=int(mask.sum()))

def main():
    p=argparse.ArgumentParser();p.add_argument('--model-dir',type=Path,default=ROOT/'tmp/handwriting-model');p.add_argument('--size',type=int,default=512);p.add_argument('--threads',type=int,default=6);p.add_argument('--layout',choices=['stretch','author-pad'],default='stretch');p.add_argument('--fixtures-only',action='store_true');p.add_argument('--real-only',action='store_true');args=p.parse_args()
    cases={k:fixture(k) for k in ['color','black','overlap','colored-print','shadow']}
    if args.fixtures_only:return
    import torch
    torch.set_num_threads(args.threads)
    checkpoint=args.model_dir/'isnet.pth';sha=hashlib.sha256(checkpoint.read_bytes()).hexdigest()
    if sha!='d685cc76a8c4d6aebf9a82499b7771d13aaa27ebd90e933036bdd004db4beefa':raise RuntimeError('Unexpected checkpoint hash')
    source=args.model_dir/'isnet.py'
    if hashlib.sha256(source.read_bytes()).hexdigest()!='83505426387792a3cb9357254a5e21547cd074710d120485960aa8cc9d0b39bb':raise RuntimeError('External source changed: review before execution')
    code=source.read_text(encoding='utf-8')
    # The reviewed model definition only uses torch. This unused import would require torchvision.
    reviewed=args.model_dir/'isnet_reviewed.py';reviewed.write_text(code.replace('from torchvision import models',''),encoding='utf-8')
    spec=importlib.util.spec_from_file_location('reviewed_isnet',reviewed);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    t=time.perf_counter();net=module.ISNetDIS();state=torch.load(checkpoint,map_location='cpu',weights_only=True);net.load_state_dict(state,strict=True);net.eval();load_ms=(time.perf_counter()-t)*1000
    def infer(rgb):
        # Match the model author's BGR input convention; use our mask-only composition to preserve print outside the mask.
        if args.layout=='author-pad':
            ratio=min(1,args.size/max(rgb.shape[:2]));h,w=round(rgb.shape[0]*ratio),round(rgb.shape[1]*ratio)
            resized=np.ones((args.size,args.size,3),dtype=np.uint8)
            resized[:h,:w]=np.array(Image.fromarray(rgb).resize((w,h),Image.Resampling.BOX))
            resized=resized[:,:,::-1].copy()
        else:resized=np.array(Image.fromarray(rgb).resize((args.size,args.size),Image.Resampling.BILINEAR))[:,:,::-1].copy()
        tensor=torch.from_numpy(resized).permute(2,0,1).float()[None]/255-.5
        with torch.inference_mode():prediction=net(tensor)[0][0]
        if args.layout=='author-pad':
            low=prediction.min();high=prediction.max();prediction=(prediction-low)/(high-low).clamp(min=1e-8)
            prediction=torch.nn.functional.interpolate(prediction[:,:,:h,:w],size=rgb.shape[:2],mode='bilinear',align_corners=False)[0,0]
        else:
            prediction=torch.nn.functional.interpolate(prediction,size=rgb.shape[:2],mode='bilinear',align_corners=False)[0,0]
            low=prediction.min();high=prediction.max();prediction=(prediction-low)/(high-low).clamp(min=1e-8)
        return prediction.numpy()>.35
    report=dict(device=platform.processor(),platform=platform.platform(),torch=torch.__version__,threads=args.threads,input_size=args.size,layout=args.layout,checkpoint_sha256=sha,model_load_ms=load_ms,fixture_note='Synthetic Japanese print with programmatic ink; NOT real photographed worksheet accuracy.',cases={},batches=[])
    suffix='-author-pad' if args.layout=='author-pad' else ''
    for name,(original,written,ink,printing) in ([] if args.real_only else cases.items()):
        t=time.perf_counter();mask=infer(written);ms=(time.perf_counter()-t)*1000
        Image.fromarray(mask.astype(np.uint8)*255).save(OUT/f'{name}-dis-{args.size}{suffix}-mask.png')
        result=written.copy();result[mask]=[248,247,244];Image.fromarray(result).save(OUT/f'{name}-dis-{args.size}{suffix}-result.png')
        report['cases'][name]={'inference_ms':ms,**metrics(mask,ink,printing)}
        print(name,round(ms),report['cases'][name],flush=True)
    for count in ([] if args.real_only else [1,3,10]):
        t=time.perf_counter()
        for i in range(count):
            name=list(cases)[i%len(cases)];rgb=np.array(Image.open(OUT/f'{name}-written.png').convert('RGB'));mask=infer(rgb);rgb[mask]=[248,247,244];Image.fromarray(rgb).save(OUT/'batch-result.png')
        report['batches'].append({'count':count,'read_infer_png_ms':(time.perf_counter()-t)*1000})
        print('batch',report['batches'][-1],flush=True)
    if args.real_only:
        zpath=args.model_dir/'val.zip'
        if hashlib.sha256(zpath.read_bytes()).hexdigest()!='452ce1edcb8b633a19fc5a48c50877efa6808d7941918f8f4118f4fbae4016c1':raise RuntimeError('Unexpected validation archive hash')
        report['real_dataset_note']='First five sorted published validation images. Chinese task domain; no guarantee independent from model selection. No Japanese real-photo claim.';report['real_cases']=[]
        with zipfile.ZipFile(zpath) as archive:
            names=sorted(n for n in archive.namelist() if n.startswith('im/') and n.lower().endswith(('.jpg','.png')) and archive.getinfo(n).file_size<10_000_000)[:5]
            for name in names:
                rgb=np.array(Image.open(io.BytesIO(archive.read(name))).convert('RGB'));gtname='gt/'+Path(name).stem+'.png'
                gt=np.array(Image.open(io.BytesIO(archive.read(gtname))).convert('L'))>127
                if gt.shape!=rgb.shape[:2]:raise RuntimeError('Dataset dimensions mismatch')
                visible_dark=(rgb.max(axis=2)<150)&~gt
                t=time.perf_counter();mask=infer(rgb);ms=(time.perf_counter()-t)*1000
                m=metrics(mask,gt,visible_dark);m['non_handwriting_dark_retained']=m.pop('visible_print_retained')
                report['real_cases'].append(dict(name=name,width=rgb.shape[1],height=rgb.shape[0],inference_ms=ms,**m))
                result=rgb.copy();result[mask]=255;Image.fromarray(result).save(OUT/(Path(name).stem+f'-dis-{args.size}{suffix}.png'))
                print('real',report['real_cases'][-1],flush=True)
    if platform.system()=='Windows':
        class Counters(ctypes.Structure):
            _fields_=[('cb',ctypes.c_ulong),('faults',ctypes.c_ulong)]+[(n,ctypes.c_size_t) for n in ['peak_working_set','working_set','peak_paged_pool','paged_pool','peak_nonpaged_pool','nonpaged_pool','pagefile','peak_pagefile']]
        counters=Counters();counters.cb=ctypes.sizeof(counters)
        if ctypes.windll.psapi.GetProcessMemoryInfo(ctypes.c_void_p(-1),ctypes.byref(counters),counters.cb):report['process_peak_working_set_mb']=counters.peak_working_set/(1024**2)
    if args.real_only:suffix+='-real'
    (OUT/f'dis-{args.size}{suffix}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':main()
