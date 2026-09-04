# Rise Vocabulary Data Foundation v1

## Purpose

This phase prepares the English, Japanese and Social vocabulary/recall systems for later integration without changing the production quiz UI or replacing any existing learning history.

The integrated quiz scope is **English + Japanese + Social only**. Science and Math are intentionally excluded from this vocabulary quiz foundation.

## Non-destructive rule

The new foundation is an adapter layer. Existing systems remain authoritative for progress:

- English: `AA_VOCAB_CATALOG_API` + `asahi_learning_os_v1` + `aa_vocab_quiz_wrong_v1`
- Japanese: `kokugoChronologiaStateV2` + `aa_kokugo_vocab_wrong_queue_v1` + `aa_kokugo_vocab_full15000_cycle_v1`
- Social: `chronologia-aichi-v3`

No new competing progress history is introduced here.

## Parallel workstreams

### EN — English data

Inventory and normalize words, phrases, meanings, part of speech, pronunciation, forms, importance, examples and relation metadata. Keep the existing SRS ID as the progress reference. English long reading continues to consume the same SRS/known/weak vocabulary state.

### JA — Japanese data

Audit the 15,000-entry bank, categories, readings, meanings and rank metadata. Preserve the native no-repeat cycle, wrong queue, learned/review state and mobile interaction hardening.

### SOC — Social / Chronologia

Expose event/year recall facts through a normalized adapter, but keep Chronologia itself as a separate timeline learning product. Preserve mixed/event-to-year/year-to-event semantics and native weak/stage state.

### QA — Contracts

`scripts/audit-vocabulary-foundation.mjs` verifies the three-subject scope, required source files, critical native storage/API contracts and the Japanese 15,000-row JSONL dataset.

## Data flow

Native data → Vocabulary Core adapter → future Quiz Engine / Review / Analysis

Progress flows back to each native source of truth. The adapter must not copy or reset learner progress.

## What is deliberately not done in this phase

- No change to `quiz/index.html`
- No replacement of `vocab.html`
- No replacement of `kokugo-chronologia/`
- No replacement of `chronologia.html`
- No localStorage migration
- No Service Worker cache change, because the new core is not yet loaded by production runtime
- No visual redesign

## Next implementation sequence

1. Use this inventory and schema to clean/extend English and Japanese source data in parallel.
2. Add source-specific adapters and automated data quality reports.
3. Wire the adapters to the shared Quiz Engine while preserving native progress writes.
4. Connect English quiz state to English long reading through the existing SRS loop.
5. Connect unified review/analysis views.
6. Only after behavior and history equivalence are verified, finish the integrated quiz page UI and consider retiring old UI routes.
