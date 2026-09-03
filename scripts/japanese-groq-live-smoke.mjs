import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import { verifyJapanesePackWithGroq } from '../japanese-exam/groq-verifier.mjs';

const apiKey = String(process.env.GROQ_API_KEY || '');
const model = String(process.env.GROQ_MODEL || 'openai/gpt-oss-20b');
if (!apiKey) throw new Error('groq_key_missing');
if (model !== 'openai/gpt-oss-20b') throw new Error('unexpected_groq_model');

const pack = starterPacks[0];
const result = await verifyJapanesePackWithGroq({ GROQ_API_KEY: apiKey, GROQ_MODEL: model }, pack);
if (!result?.verified || result.provider !== 'groq' || result.model !== model || result.questionCount !== pack.questions.length) {
  throw new Error('japanese_groq_live_smoke_failed');
}

console.log(JSON.stringify({
  ok: true,
  provider: result.provider,
  model: result.model,
  pack: pack.id,
  questions: result.questionCount,
  majors: result.majors,
  method: result.method
}));
