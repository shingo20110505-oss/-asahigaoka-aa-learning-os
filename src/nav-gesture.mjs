// Separate taps on another menu, modifiers, and keyboard activation never form
// an accidental double tap. One pointer click always resumes immediately.
export class NavGesture {
 constructor(windowMs=450){this.windowMs=windowMs;this.previous=null;}
 clear(){this.previous=null;}
 activate(key,{time=performance.now(),detail=1,modified=false,keyboardReset=false}={}){
  if(keyboardReset){this.clear();return 'reset';}
  if(modified||detail===0){this.clear();return 'resume';}
  const last=this.previous;
  if(last?.key===key&&time-last.time>=0&&time-last.time<=this.windowMs){this.clear();return 'reset';}
  this.previous={key,time};return 'resume';
 }
}
