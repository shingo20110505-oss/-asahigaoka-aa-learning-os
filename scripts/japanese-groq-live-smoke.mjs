import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import { verifyJapanesePackWithGroq } from '../japanese-exam/groq-verifier.mjs';

const apiKey = String(process.env.GROQ_API_KEY || '');
const model = String(process.env.JAPANESE_GROQ_MODEL || 'openai/gpt-oss-120b');
if (!apiKey) throw new Error('groq_key_missing');
if (model !== 'openai/gpt-oss-120b') throw new Error('unexpected_japanese_groq_model');

const pack = starterPacks[0];
try {
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
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    code: error?.code || error?.message || 'unknown_error',
    status: error?.status || null,
    diagnostic: error?.diagnostic || ''
  }));
  throw error;
}
