"""Compare image processing on exactly the same synthetic fixtures as the DIS harness."""
import importlib.util,json,time
from pathlib import Path
import cv2,numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('handwriting_fixture',Path(__file__).with_name('handwriting-model-eval.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
fixture,metrics,OUT=module.fixture,module.metrics,module.OUT

def detect(rgb):
    r,g,b=[rgb[:,:,i].astype(np.int16) for i in range(3)]
    return (((r-g>38)&(r-b>38*.8))|((b-r>38)&(b-g>38*.45)))&(rgb.max(axis=2)>=75)

def run():
    report={'opencv':cv2.__version__,'fixture':'Same synthetic Japanese print and stroke-path fixture as DIS; not real worksheet accuracy','cases':{},'batches':[]}
    cases={n:fixture(n) for n in ['color','black','overlap','colored-print','shadow']}
    for n,(original,rgb,ink,printing) in cases.items():
        t=time.perf_counter();mask=detect(rgb);cleaned=cv2.inpaint(rgb,mask.astype(np.uint8)*255,3,cv2.INPAINT_TELEA);ms=(time.perf_counter()-t)*1000
        metrics_data=metrics(mask,ink,printing);metrics_data.update(process_ms=ms,outside_mask_changed_pixels=int(np.any(cleaned!=rgb,axis=2)[~mask].sum()),masked_pixel_mae=float(np.abs(cleaned.astype(float)-original)[mask].mean()) if mask.any() else 0)
        report['cases'][n]=metrics_data;Image.fromarray(cleaned).save(OUT/f'{n}-opencv-result.png')
        raw=OUT/f'{n}-local-result.rgba'
        if raw.exists():Image.fromarray(np.frombuffer(raw.read_bytes(),dtype=np.uint8).reshape((1600,1200,4))).save(OUT/f'{n}-local-result.png')
    for count in [1,3,10]:
        t=time.perf_counter()
        for i in range(count):
            n=list(cases)[i%len(cases)];rgb=np.array(Image.open(OUT/f'{n}-written.png').convert('RGB'));mask=detect(rgb);cleaned=cv2.inpaint(rgb,mask.astype(np.uint8)*255,3,cv2.INPAINT_TELEA);Image.fromarray(cleaned).save(OUT/'batch-opencv.png')
        report['batches'].append({'count':count,'read_process_png_ms':(time.perf_counter()-t)*1000})
    (OUT/'opencv.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))

if __name__=='__main__':run()
