// Runtime and remote model revisions are pinned; no weights are bundled with RISE.
export const RUNTIME_VERSION='0.2.86';
const libRoot='https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/00fe7a40e57e5e8eb9fef87526a4bf28ad5846c0/web-llm-models/v0_2_86/base/';
export const MODELS=Object.freeze([
 {id:'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',name:'Qwen2.5 · 0.5B',description:'軽さを優先',revision:'32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad',vramMB:944.62,wasm:'Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',thinking:false},
 {id:'Qwen3-0.6B-q4f16_1-MLC',name:'Qwen3 · 0.6B',description:'日本語の軽い質問',revision:'8c14ce481d4c692769976ad52afea453a102df19',vramMB:1403.34,wasm:'Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm',thinking:true},
 {id:'Qwen3.5-0.8B-q4f16_1-MLC',name:'Qwen3.5 · 0.8B',description:'比較用',revision:'0ec138972555613c1d7812a821778ad0398c8790',vramMB:1629.49,wasm:'Qwen3.5-0.8B-q4f16_1_cs1k-webgpu.wasm',thinking:true},
].map(m=>Object.freeze({...m,model:`https://huggingface.co/mlc-ai/${m.id}/resolve/${m.revision}/`,model_lib:libRoot+m.wasm})));
export const DEFAULT_MODEL=MODELS[1].id;
export function modelById(id){const found=MODELS.find(m=>m.id===id);if(!found)throw Error('未対応の端末内モデルです。');return found;}
export const appConfig={cacheBackend:'cache',model_list:MODELS.map(m=>({model_id:m.id,model:m.model,model_lib:m.model_lib,required_features:['shader-f16'],low_resource_required:true,vram_required_MB:m.vramMB,overrides:{context_window_size:4096,...(m.id.startsWith('Qwen3.5')?{max_history_size:1}:{})}}))};
export const LOCAL_SYSTEM='あなたは日本の中学生の学習を手伝うアシスタントです。質問には日本語で、必要な理由や例も添えて答えてください。不明なことは推測で断定せず、資料が必要ならそう伝えてください。検索や画像解析を実行したとは言わないでください。';

export function normalizeMessages(messages){
 const clean=(Array.isArray(messages)?messages:[]).filter(m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string'&&m.content.trim()).map(m=>({role:m.role,content:m.content.trim()}));
 if(!clean.length||clean.at(-1).role!=='user')throw Error('質問を入力してください。');
 if(clean.at(-1).content.length>1800)throw Error('端末内AIには、質問を1,800文字以内に分けて送ってください。');
 let chars=0,start=clean.length;
 while(start>0&&chars+clean[start-1].content.length<=2400){chars+=clean[--start].content.length;}
 while(start<clean.length-1&&clean[start].role!=='user')start++;
 return {messages:[{role:'system',content:LOCAL_SYSTEM},...clean.slice(start)],contextTruncated:start>0};
}
