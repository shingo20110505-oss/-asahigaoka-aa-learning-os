// All pure-arm answers are byte-identical to v5; checked against the saved runs.
// Only product routing changes the following answers. Review remains separate from inference.
import{grades as previous}from'./grade-gemma-v5.mjs';
export const conditionsVersion='2026-10-28.8',modelId='gemma4-e2b-q4';
export const armOrder=['none','verbatim','rag','assisted'];
export const grades=structuredClone(previous);
grades.g6=[2,2,2,2,'生成・専用計算とも100000cm=1km。実用方式は計算処理を使用。'];
grades.g7=[0,1,0,2,'生成は午前6時を答えられない。専用計算は135÷15=9時間、15−9=6時。'];
grades.k1=[0,2,2,2,'実用方式も教材定義を直接返し、現代語との混同を避ける。'];
grades.k4=[0,2,0,2,'RAGは訳を不適切に保留。実用方式は教材の早朝・翌朝を直接返す。'];
grades.e4=[2,1,2,0,'実用方式は未分類の語形を推測せず回答保留。正答数には含めない。'];
