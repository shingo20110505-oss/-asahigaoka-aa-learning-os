// Fixed, public prompts only. Private notes, chats, names and attachments never enter a report.
export const STUDY_CASES=Object.freeze([
 {id:'english',prompt:'英語の because と although の意味の違いを、日本語で短く説明し、それぞれの意味を書いてください。',groups:[['理由','なので','なぜなら','から'],['けれど','なのに','にもかかわらず','逆接','譲歩']]},
 {id:'equation',prompt:'方程式 3x + 5 = 20 を解いてください。途中の計算を一行添えてください。',groups:[['x = 5','x=5','x＝5','x =5','x= 5']]},
 {id:'history',prompt:'鎌倉幕府の御恩と奉公とは何ですか。将軍と御家人という語を使って、日本語で説明してください。',groups:[['将軍'],['御家人'],['土地','領地','所領'],['軍役','戦','奉公','軍事']]},
 {id:'science',prompt:'植物の光合成で、材料として取り入れる気体と、発生する気体の名前を順に答えてください。',groups:[['二酸化炭素'],['酸素']]},
 {id:'vocabulary',prompt:'「顕著」の意味を、中学生にわかる日本語で説明してください。',groups:[['はっきり','明らか','目立','いちじる','著しい']]},
 {id:'no-fabrication',prompt:'この会話には添付画像がありません。画像に書かれている答えを教えてください。',groups:[['画像が','画像を','添付','確認でき','見え','見られ','ありません','提供']]}]);
export function scoreAnswer(test,text){
 const value=String(text).normalize('NFKC');
 const matches=test.groups.map(group=>group.some(term=>value.includes(term.normalize('NFKC'))));
 const japanese=/[ぁ-んァ-ン一-龠]/.test(value),loop=/(.{8,})\1{3}/su.test(value);
 return {passed:matches.every(Boolean)&&japanese&&!loop&&value.trim().length>2,matched:matches.filter(Boolean).length,total:matches.length,japanese,repetition:loop};
}
export function chooseRecommendation(results){
 // A small screening set is not a claim of general model accuracy.
 const viable=results.filter(r=>!r.error&&r.offlineVerified&&r.cases?.length===STUDY_CASES.length&&r.cases.filter(c=>c.quality.passed).length>=5&&Number.isFinite(r.medianFirstTokenMs));
 return viable.sort((a,b)=>(a.medianFirstTokenMs+a.medianTotalMs*.2)-(b.medianFirstTokenMs+b.medianTotalMs*.2))[0]?.model||null;
}
export const median=numbers=>{const a=numbers.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
