# Review v2 maintenance

## Source of truth

- Edit `main` only.
- Review content lives only in `review-bank-v1.js`.
- Never edit the review copy on `gh-pages` by hand.
- `gh-pages` is a generated/publication target.

## Runtime structure

- `review/index.html` — the only active Review UI.
- `review-bank-v1.js` — the only Review content bank.
- `review.html` — legacy URL compatibility redirect only.
- `review-page-v1.js` — legacy in-app Review compatibility shim only.
- `aa-companion-v2.js` — app header Review button; it must point to `./review/`.

## Publishing

`.github/workflows/review-publish.yml` validates the bank and routing, then copies the managed Review runtime files from `main` to `gh-pages` automatically.

## Adding an item

1. Add one object to `review-bank-v1.js` on `main`.
2. Give it a unique `id`.
3. Increment `AA_REVIEW_BANK_VERSION`.
4. Do not edit Review UI files for ordinary content additions.
5. Let GitHub Actions validate and publish it.

## Stability rules

- Keep progress storage key `asahi_review_progress_v1` unchanged so users keep their `覚えた` state.
- Do not create a second Review UI.
- Do not duplicate Review items into grammar/problem-generation files.
- New Review UI features belong in `review/index.html`; content belongs in `review-bank-v1.js`.
- Old entry points must forward to `./review/` instead of implementing their own Review screen.
