# Rise Unified Vocabulary Quiz

`quiz/index.html` unifies **English, Japanese, and Social Studies only**.

## Source-of-truth rule

The unified page does not own a separate learning-history store.

- English answers call the existing AA vocabulary `recordAttempt` + `updateSRS` path and share `aa_vocab_quiz_wrong_v1`.
- Japanese answers share `kokugoChronologiaStateV2`, `aa_kokugo_vocab_wrong_queue_v1`, and `aa_kokugo_vocab_full15000_cycle_v1`.
- Social Studies answers call Chronologia's existing `recordAnswer()` and therefore keep `chronologia-aichi-v3` as the source of truth.

The original English vocabulary page, Japanese 15,000-word page, and Chronologia timeline remain available as independent learning surfaces.

Do not add Science or Math to this unified vocabulary scope unless the product requirement explicitly changes.
