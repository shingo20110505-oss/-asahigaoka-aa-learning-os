# RISE rebuild — implementation contract

RISE is a comprehensive learning app for an Asahigaoka applicant, not only a study tracker. The user authorized implementation, testing and GitHub publication. Preserve the full scope across work sessions. Passwords are set later through a loopback-only PC setup UI, never in chat or source control.

## Required experience

- Rebuild information architecture, visual design and runtime independently of v4.
- Preserve all 114 review items and images, original IDs, past done/seen records and any unknown legacy fields. Snapshot original browser data before migration; never clear it. Provide portable backup/restore.
- Preserve 130 English passages/translations and old reading progress. Improve the reader with saved position, explicit completion, reading time, annotations, vocabulary capture, configurable typography and translation controls.
- Preserve 1,000 historical events, canonical IDs, favorites/progress, explanations. Add filtered browsing, side-by-side comparison, related items and notes.
- Add useful researched digital learning features: spaced retrieval, personal flashcards, Japanese vocabulary/context/usage (especially Aichi Japanese question 2), linked notes, materials library, global search, function/geometry experiments, science experiments, focus sessions, planning, calendar, test and mistake analysis, school-goal tools.
- Management is one part, alongside reading, understanding, memorizing, organizing and AI consultation. Do not fill the app with generic generated practice that a book does better. Vocabulary/memorization practice is explicitly requested.
- New original responsive UI: phone 390px, tablet 768/1024px both orientations, desktop 1440px, keyboard/focus/accessibility, reduced motion, PWA safe areas, offline/readable fallback.
- Remove obsolete content from the published app and runtime. Avoid legacy override/MutationObserver stacks and eagerly loaded datasets.
- Chat: real-time, no paid OpenAI API; PC bridge, authenticated same-origin chat UI, owner/guest passwords, per-browser guest history and files on PC, optional recovery transfer, no artificial total-GB quota, resumable chunks. Auth/ownership on server; no arbitrary public Codex RPC, PC files, commands, credentials or inherited personal integrations.
- Owner uses their own eligible Codex subscription. Do not implicitly grant guests the owner's OpenAI entitlement; guest inference must use a supported separately configured backend. Guest auth/history must work independently of inference configuration.
- School-network connectivity and password entry cannot be claimed verified until actually tested. Never represent setup-required features as connected.

## Evidence at baseline

Git baseline: `1a92145` (2026-10-21 checkout). No AGENTS.md found.

| System | Authoritative source | Browser storage |
|---|---|---|
| Review | review-bank-v1.js, review/index.html | asahi_review_progress_v1 (`done`, `seen`) |
| English reader | reading-v2/app.js, reading-v2-data/manifest.json + supplements | rise_reading_v2_progress_v1 (`answers`) |
| History | chronologia.html + ordered packs/curated corrections | chronologia-aichi-v3 |
| Other old learning | app/legacy/main-runtime.js | asahi_learning_os_v1; preserve even though old UI is retired |

History IDs 353–385 must retain the canonical base records after curated patches; event 368 retains the existing Nixon Shock correction. IDs must never be reassigned during extraction.

## Research informing implementation

- IES, *Organizing Instruction and Study to Improve Student Learning*: spaced study, retrieval, graphical+verbal explanations, concrete/abstract representations. https://ies.ed.gov/ncee/wwc/PracticeGuide/1
- Desmos sliders: immediate parameter/graph correspondence. Independent local implementation, no embedded dependency. https://help.desmos.com/hc/en-us/articles/202529069-Sliders-and-Movable-Points
- PhET Ohm's law: interactive voltage/resistance/current relationship. Independent local implementation. https://phet.colorado.edu/en/simulations/ohms-law
- Obsidian backlinks: navigable links between a note and its references. https://obsidian.md/help/plugins/backlinks
- Aichi official 2027 general examination: 2027-02-24; dates must remain editable for other cohorts. https://www.pref.aichi.jp/uploaded/attachment/612084.pdf
- Aichi official selection: Asahigaoka general course, method V; rating sum ×2 + five-subject test sum ×2, test each /22, total basis /310. This is not an admission probability or cutoff. https://www.pref.aichi.jp/uploaded/attachment/623174.pdf
- Official 2024–2026 five-subject analysis and Japanese question-2 mapping are recorded in ASAHIGAOKA_RESEARCH.md and src/exam-content.mjs. These observations are not a prediction of future examinations.

## Completion evidence required

1. Data extraction equality/counts/images and preserved canonical event IDs.
2. Migration idempotency, unknown-field preservation, storage failures, backup/restore and two-tab edits.
3. Actual browser workflows for every implemented module with persisted data after reload.
4. Numerical property tests for labs; content validation and documented Japanese exam alignment.
5. Chat session/role/ownership/recovery/upload isolation, streaming interruption/reconnect, authentication failure, offline host, no unconfigured-backend success claims.
6. Responsive browser inspection at all target widths, keyboard/reduced-motion checks, JS errors and overflow.
7. Published asset allowlist, no secrets/private data, service worker upgrade/offline checks, GitHub CI/deployment and live verification.

## Current state

Research and baseline inspection complete for the original runtime/storage. Implementation in progress. No completion claim; all above gates remain open until supported by current tests and runtime evidence.

## Checked implementation, 2026-10-22

- `node --test tests/rise-*.test.mjs`: 30 tests pass, covering migration, data IDs, numerical model invariants, calendar dates, reading time/filters, private chat isolation, recovery, interrupted uploads, streaming, media signatures and prompt bounds.
- `node scripts/build-rise.mjs` and `node scripts/validate-rise-build.mjs`: 114 review items, 130 reading texts, 1,000 original history records; original review image and approved logo bytes preserved. History UI includes 7 explicitly sourced additions.
- Browser checks: new reading screen at 390/768/1024/1440 CSS pixels, 16 learning routes at 390px, representative routes at tablet/desktop widths. No horizontal overflow in the checked states.
- Reader summary, paragraph notes/roles, favorites and review date survive reload. Learning-note creation followed by update leaves one linked note. Simulated save failure keeps the draft and prevents leaving before retry.
- History note persistence and backup/restore including a file were exercised in a separate disposable localhost fixture. Chat mock-provider tests do not establish real Codex inference.
- Old 54 workflow definitions are preserved under `legacy/workflows/*.disabled`. The replacement CI only uploads `dist`, using pinned Actions and read-only build permissions. Old runtime and PC-private bridge files are excluded from the published artifact.

Still required for the full chat delivery: PC setup wizard and local password entry, actual owner Codex authentication/inference, guest backend configuration, authenticated remote relay/deployment, physical iPad/school-network verification. These must not be represented as operational because mock-provider tests pass. No PHP or paid API is introduced.

## 維持する条件

- ロゴは既存の承認済み v5 画像をそのまま使う。ヘッダー、favicon、PWA、Apple touch icon を含む。色や形を加工しない。
- PHP は使わない。フロントは静的 HTML/CSS/JavaScript、PC 側は Node.js。将来 PHP を採用する場合は導入時点の最新安定版とセキュリティ修正を確認する。
