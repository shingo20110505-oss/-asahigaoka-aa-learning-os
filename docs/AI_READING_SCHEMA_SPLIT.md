# Gemini English Reading Schema Split

Rise keeps two different schema responsibilities for AI English reading generation.

## Remote authoring schema

Gemini receives a lightweight structured-output schema. It preserves the required top-level learning content, but flattens each question to parallel arrays:

- `choices: string[]`
- `choiceReasonsJa: string[]`

The remote schema intentionally omits nonessential length, count, pattern, and deep nested-choice constraints. This reduces Gemini structured-output schema complexity and avoids using provider schema acceptance as the quality boundary.

## Rise acceptance schema

Immediately after Gemini returns JSON, the provider converts the parallel arrays to the canonical Rise shape:

- `choices: [{ text, reasonJa }]`

The existing `validateReading` logic then remains the acceptance authority. It still enforces passage word range, paragraph count, Japanese/English language separation, allowed grammar, glossary quality, exactly five unique question types, exactly four choices per question, answer index validity, explanation language, exact passage evidence, and required detail/inference coverage.

After deterministic validation, Groq still independently solves all five questions without the Gemini answer key. Rise accepts the set only when the blind verifier agrees and the existing confidence/evidence gates pass.

Therefore the Gemini schema simplification is transport compatibility only; it does not reduce Rise's semantic or answer-quality requirements.
