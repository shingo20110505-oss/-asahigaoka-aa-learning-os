# RISE workspace completion

This change implements the requested workspace features without replacing the logo, public URL, or existing learning data. No paid API is introduced. Local verification is complete as described below; publication and the production bridge update remain pending.

## Acceptance checklist

- [x] Handwriting: selection scale, rotate, width, undo/redo; each page keeps its viewport; multiple pages and image backgrounds remain editable.
- [x] Notes: selection preserves list/window scroll; quick capture and attachment workflows stay usable on phones.
- [x] Split workspace: read materials while writing a note, independently scroll both panes, add files to either or both, preserve drafts on navigation.
- [x] Calendar: general/all-day/timed/multiple-day events, visible titles, recurrence, location and attachments, editing/deletion, existing reading reviews retained.
- [x] Chat UI/provider contracts: tools in the current conversation (web search, explicit current-screen context, image creation, practice questions, handwriting cleanup); preserve draft/history and role isolation.
- [x] Materials: multiple-file selection for side chat, edge tap navigation and swipe, small floating AI control, image uses available canvas.
- [x] App UI: compact controls, responsive desktop/tablet/phone, keyboard/focus support, no horizontal overflow or obstructed composer in the tested viewports.
- [x] Local functional checks: shared file ownership, model cache retirement, browser interactions and role-separated offline history.
- [ ] Full network tests and service-worker cold-start check in an environment with loopback connections enabled.
- [ ] Main CI, Pages publication, production bridge restart and real Codex search/image smoke check.

## Verification evidence (2026-10-26)

- The Node suite passed 133 of 144 tests in the restricted session. The other 11 require a loopback socket and failed with `connect EACCES 127.0.0.1` or the resulting relay 503; they are not recorded as passing. Additional provider/atomic-save/workspace tests are in `tests/rise-chat-plugins.test.mjs`, `tests/rise-atomic-json.test.mjs`, and `tests/rise-workspace-completion.test.mjs`.
- Gateway boundary checks: 7 passed.
- Build validator: 331 public files, 114 review entries, 1,000 history entries, 150 readings; logo is byte-identical; private bridge data excluded.
- `scripts/test-workspace-ui.mjs` passed 13 interaction groups using real Chromium, IndexedDB, and the bridge request handler through `scripts/hermetic-http.mjs`. AI responses are fixtures. Tested viewports: 1280×900, 390×844, 820×1180. Screenshots and results are under ignored `test-results/workspace/`.
- Additional PDF attachment checks exercise a single destination, stored bytes and a local blob-frame source; the preview policy now permits local blob frames and no longer allows the retired model hosts. Native PDF rendering is not asserted because [Playwright documents a headless PDF-navigation limitation](https://playwright.dev/docs/api/class-page#page-goto). This does not verify physical iPad PDF rendering.
- Hermetic mode makes no network connection and deliberately skips service-worker network caching. It verifies saved chat access and account separation, not an actual offline network cold start. CI runs the same test against loopback HTTP with the service worker enabled.
- Fixed transient Windows atomic-replacement failures with bounded retries; permanent failures retain the old record. Fixed the mobile composer so attachment scrolling cannot push the send button outside the form. Hidden answers, form fields and closed disclosures are excluded from current-screen context.
- Public deployment was not attempted after GitHub write approval was rejected under `approval policy: never`. The already-running production bridge was preserved because a replacement process could not reach its relay in this session.

Local UI test:

```powershell
$env:RISE_PLAYWRIGHT_MODULE = 'absolute/path/to/playwright/index.mjs'
$env:RISE_USE_CHROME = '1'
$env:RISE_TEST_HERMETIC = '1' # omit when real loopback networking is available
$env:RISE_TEST_PORT = '0'
node scripts/test-workspace-ui.mjs
```

The fixture uses temporary, isolated accounts and never opens the production `.rise-private` directory. Public CI artifacts contain only synthetic screenshots and the check result.

## References

- [LoiLo handwriting tools](https://help.loilonote.app/--5d3a9bcc7260d1001781cc5e): selection, movement, scaling/rotation, stroke width, duplicate and erase.
- [Codex web search](https://learn.chatgpt.com/docs/web-search): hosted search configured independently of local command permissions.

Physical iPad A16 performance is not claimed by desktop or viewport-emulation tests.

## Updated scope and usage limit

- Remove the current local LLM runtimes, models and comparison UI. Purge their browser model caches when the updated app opens; keep learning files and role-separated chat history.
- Finish all current implementation, validation and publication first.
- Only then create a separate Codex chat to research A16 and evaluate heavier models, while account remaining usage is above 30%. Integrate into main only if practical quality and performance are demonstrated.
- Latest user correction: stop work when account remaining usage reaches 30% (usedPercent >= 70). Check at work boundaries, including before starting the separate chat. This is a remaining-usage limit, not a requirement to consume 40%.
