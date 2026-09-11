# Rise Unified Vocabulary Quiz

`quiz/index.html` unifies **English, Japanese, and Social Studies only**.

## Source-of-truth rule

The unified page does not own a separate learning-history store.

- English answers call the existing AA vocabulary `recordAttempt` + `updateSRS` path and share `aa_vocab_quiz_wrong_v1`.
- Japanese answers share `kokugoChronologiaStateV2`, `aa_kokugo_vocab_wrong_queue_v1`, and `aa_kokugo_vocab_full15000_cycle_v1`.
- Social Studies answers call Chronologia's existing `recordAnswer()` and therefore keep `chronologia-aichi-v3` as the source of truth.

The original English vocabulary page, Japanese 15,000-word page, and Chronologia timeline remain available as independent learning surfaces.

## Runtime contract

`unified-native-v1.js` is the single interaction controller for finite sessions,
the infinite course, and wrong-only review. The older `review-algorithm-v1.js`
and `infinite-course-v1.js` files are retained only as historical assets and are
not loaded by `quiz/index.html`.

- A question key is used at most once per finite session.
- English, modern Japanese, classical/kanbun, and Social selection cycles are
  persisted separately from scores and learning history. Infinite sessions
  begin a fresh no-repeat cycle after the current pool is exhausted.
- Wrong-only review recalculates the native unresolved set after every answer,
  honors the selected direction/type/rank, and stops after one pass in a finite
  session.
- Dynamic question, answer, and explanation text is rendered with DOM text
  nodes rather than HTML injection.

Do not add Science or Math to this unified vocabulary scope unless the product requirement explicitly changes.
