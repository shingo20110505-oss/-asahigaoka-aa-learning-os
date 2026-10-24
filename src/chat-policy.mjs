export const OWNER_LIMITS=Object.freeze({maxPrompt:30000,maxContext:180000,maxImages:24,maxImageBytes:12*1024*1024});
export const GUEST_LIMITS=Object.freeze({maxPrompt:4000,maxContext:6000,maxImages:4,maxImageBytes:8*1024*1024});
export const chatLimits=role=>OWNER_LIMITS;

// These bounds concern a single AI request. Original uploads and stored history
// have no total-GB quota and are never discarded to fit the model context.
export function validateChatInput({text,files},limits){
  if(text.length>limits.maxPrompt)throw Error('1回の質問は'+limits.maxPrompt.toLocaleString('ja-JP')+'文字以内にしてください。');
  const images=files.flatMap(f=>f.kind==='image'?[f]:f.frames||[]);
  if(images.length>limits.maxImages)throw Error('画像と動画の静止画は、合計'+limits.maxImages+'枚以内で送ってください。');
  if(images.some(f=>f.size>limits.maxImageBytes))throw Error('AIに渡す画像は1枚'+limits.maxImageBytes/1024/1024+'MB以内に縮小してください。元ファイルの保存容量の制限ではありません。');
}
