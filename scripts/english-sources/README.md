# English Word Bank: editable sources

The production files are `data/english/words.json` and `metadata.json`. Rebuild them with `node scripts/build-english-words.mjs`; do not hand-edit those outputs. Add or correct RISE meanings, POS, stages and bilingual examples in `overrides.json`.

## Frozen inputs and attribution

- **EJDict-hand**, kujirahand and contributors: https://github.com/kujirahand/EJDict . CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/ . `ejdict.tsv` combines the existing cached `src/a.txt` through `src/z.txt` at revision `9663055d59a8cb1a35078a71db7a09ff39305828` (45,366 source rows). No paid dictionary was copied.
- **New General Service List 1.2**, Charles Browne, Brent Culligan and Joseph Phillips: https://www.newgeneralservicelist.com/new-general-service-list . CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/ . Official files downloaded 2026-10-27: https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv and https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv . The ranked list contains 2,809 headwords. The teaching lemma list supplies related forms and spelling variants; corpus token fragments such as `isn` and `ve` are excluded from the learner display.
- Existing RISE sources: `data/reading-lexicon.json`, `src/reading-language.mjs`, `src/reading-explanations.mjs`, `app/legacy/main-runtime.js`, `english-vocabulary-supplement-v1.js` and all four v2 data files. Existing source attribution is retained on entries. The old 500-word course is preserved, and the new database also uses the existing supplement candidates.
- `overrides.json`: short, independently written RISE glosses and selected bilingual examples. No external AI service or paid API is used by the generator.

The adapted database, original additions, selection and classification are distributed under **CC BY-SA 4.0**, with the original CC0 rights of the EJDict material retained. This data license does not change the license of unrelated application code or existing assets. The generator records source IDs on each entry. Source snapshots are checked in so builds do not require a network download. `SHA256.json` identifies these exact inputs.

## Coverage and counting

MEXT's official January 2026 vocabulary working paper summarizes the current guidelines: 600–700 words at elementary school and 1,600–1,800 additional words at junior high school. It is not a universal list of named headwords: https://www.mext.go.jp/content/20260121-mxt_kyoiku01-000046777_03.pdf . Current junior-high foreign-language guidelines: https://www.mext.go.jp/content/20210531-mxt_kyoiku01-100002608_010.pdf . No MEXT text or proprietary textbook list is copied into the dataset.

RISE's stages are an editorial starting point, not official grade assignments: `basic` means the first 1,000 NGSL ranks plus existing basic material; `entrance` means remaining NGSL and curated RISE words/phrases; everything else is `extension`. Default search shows basic entries. NGSL is a general-English frequency list, not a Japanese entrance-exam frequency study. Coverage of every textbook edition and exam is unverified.

One normalized spelling has one stable SHA-256-based ID. Comma-separated variants, recognized alternate spellings and inflections are grouped rather than counted as additional headwords. Independently ranked homographs such as `left`, `found` and `rose` remain headwords. Single tokens (including hyphenated compounds), space-separated phrases and related forms are counted separately. Phrases are collocations as well as idioms. Case-specific meanings such as `may / May` share one entry.

Capitalized proper-name source rows, explicitly tagged vulgar/discriminatory entries and malformed/no-Japanese records are excluded; necessary days, months and selected classroom words are supplied by overrides. This is not a comprehensive age-suitability review. Extension includes technical and dated language. Existing source definitions and examples have not all been manually checked. POS is deliberately `unknown` when the source provides no reliable tag. Partial tags describe attested senses, not necessarily all uses. A missing example or Japanese translation is shown as pending rather than fabricated. Exact counts and limitations live in `data/english/metadata.json` and are visible on the page.

## Local validation

Run `node scripts/build-english-words.mjs`, `node --test tests/rise-*.test.mjs`, `node scripts/build-rise.mjs`, then `node scripts/validate-rise-build.mjs`. No user database is migrated or cleared. New learning records use `state.vocabulary["en-..."]` through the existing Store; Japanese vocabulary IDs remain separate. The sidebar's parked views hold unsaved input in memory for the current tab session; normal reload/closing the tab is not a persistent draft backup.

Source SHA-256 values use UTF-8 with LF line endings, matching the Git blobs. On Windows, normalize CRLF to LF before verifying them. The original NGSL comment whitespace is retained.
