# Review v2 maintenance

## Source of truth

- Edit `main` only.
- Review content lives only in `review-bank-v1.js`.
- Never edit `gh-pages` by hand.
- `gh-pages` is a generated/publication target for the whole app.

## Runtime structure

- `review/index.html` — the only active Review UI.
- `review-bank-v1.js` — the only Review content bank.
- `review.html` — legacy URL compatibility redirect only.
- `review-page-v1.js` — legacy in-app Review compatibility shim only.
- `aa-companion-v2.js` — app header Review button; it points to `./review/`.

## Publishing

`.github/workflows/site-publish.yml` is the only publisher.

Every push to `main` runs:

1. Review-bank validation.
2. Review-routing validation.
3. Login voice/image/runtime validation.
4. Critical JavaScript syntax checks.
5. Runtime mirror from `main` to `gh-pages`.
6. Generation of public `release.json` containing the exact published `main` SHA, Review version/count, and Service Worker version.

This prevents `main` and the public site from silently drifting apart.

## Adding an item

1. Add one object to `review-bank-v1.js` on `main`.
2. Give it a unique `id`.
3. Increment `AA_REVIEW_BANK_VERSION`.
4. Do not edit Review UI files for ordinary content additions.
5. Let GitHub Actions validate and publish the entire site.
6. Confirm public `release.json` and the public Review page after deployment.

## Stability rules

- Keep progress storage key `asahi_review_progress_v1` unchanged so existing `覚えた` state survives releases.
- Do not create a second Review UI.
- Do not duplicate Review items into grammar/problem-generation files.
- New Review UI features belong in `review/index.html`; content belongs in `review-bank-v1.js`.
- Old entry points must forward to `./review/` instead of implementing their own Review screen.
- Login voice/image changes must continue to pass `scripts/validate-runtime-assets.mjs`.
- Service Worker logic must remain generic; do not maintain long per-file freshness regexes again.
