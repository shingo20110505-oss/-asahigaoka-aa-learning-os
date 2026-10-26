# RISE workspace completion

The workspace features are published on the original GitHub Pages URL without replacing the logo or existing learning data. The production PC bridge is running the updated implementation, and real Codex search, ordinary-chat image generation, and both account roles have passed the public-site smoke check. No paid API is introduced.

## Acceptance checklist

- [x] Handwriting: selection scale, rotate, width, undo/redo; each page keeps its viewport; multiple pages and image backgrounds remain editable.
- [x] Notes: selection preserves list/window scroll; quick capture and attachment workflows stay usable on phones.
- [x] Split workspace: read materials while writing a note, independently scroll both panes, add files to either or both, preserve drafts on navigation.
- [x] Calendar: general/all-day/timed/multiple-day events, visible titles, recurrence, location and attachments, editing/deletion, existing reading reviews retained.
- [x] Chat UI/provider contracts: tools in the current conversation (web search, explicit current-screen context, image creation, practice questions, handwriting cleanup); preserve draft/history and role isolation.
- [x] Materials: multiple-file selection for side chat, edge tap navigation and swipe, small floating AI control, image uses available canvas.
- [x] App UI: compact controls, responsive desktop/tablet/phone, keyboard/focus support, no horizontal overflow or obstructed composer in the tested viewports.
- [x] Local functional checks: shared file ownership, model cache retirement, browser interactions and role-separated offline history.
- [x] Full network tests and service-worker offline reload check with loopback connections enabled.
- [x] Main CI, Pages publication, production bridge restart and real Codex search/image smoke check.

## Verification evidence (2026-10-26)

- The initial restricted session could not exercise loopback networking. After access was enabled, the complete 147-test Node suite passed on Windows and in Linux CI. The subsequent Codex executable-discovery regression test brings the CI suite to 148 passing tests.
- Gateway boundary checks: 7 passed.
- Build validator: 331 public files, 114 review entries, 1,000 history entries, 150 readings; logo is byte-identical; private bridge data excluded.
- `scripts/test-workspace-ui.mjs` passed 13 interaction groups using real Chromium, IndexedDB, loopback HTTP and the service worker in Linux CI. AI responses in this suite are fixtures. Tested viewports: 1280×900, 390×844, 820×1180. Screenshots and results are under ignored `test-results/workspace/` and the CI artifact.
- Additional PDF attachment checks exercise a single destination, stored bytes and a local blob-frame source; the preview policy now permits local blob frames and no longer allows the retired model hosts. Native PDF rendering is not asserted because [Playwright documents a headless PDF-navigation limitation](https://playwright.dev/docs/api/class-page#page-goto). This does not verify physical iPad PDF rendering.
- The offline check reloads the app without network access, reads the cached guest history, preserves the draft, and checks role isolation. The reconnect check injects a temporary session failure and requires automatic recovery. Hermetic mode remains available for restricted development; it is not the evidence for service-worker caching.
- Fixed transient Windows atomic-replacement failures with bounded retries; permanent failures retain the old record. Fixed the mobile composer so attachment scrolling cannot push the send button outside the form. Hidden answers, form fields and closed disclosures are excluded from current-screen context.
- [PR #94](https://github.com/shingo20110505-oss/-asahigaoka-aa-learning-os/pull/94) was merged into main at `7462cf8786e717025c24c65c65450cf8f1b4fea5`. [Pages run 40241843059](https://github.com/shingo20110505-oss/-asahigaoka-aa-learning-os/actions/runs/40241843059) and relay run `40241842867` completed successfully. The public browser reported build `423923ada950`, matching CI.
- Codex desktop had replaced its versioned executable directory. The PC configuration now selects automatic discovery; every new Codex connection resolves the current installation, while explicitly configured custom executables remain respected. The regression replaces the installed executable between two resolutions without changing the process PATH.
- A clean Chrome session exercised the actual public Pages app through AIworknavi and the relay to this PC on 2026-10-26. Guest GPT-6.1 Sol completed a hosted Apple-specification search with a confirmed search event and source link in 15.8 seconds. An ordinary chat generated an image, downloaded it and opened a decoded fullscreen preview in 27.0 seconds. Administrator GPT-6 Astra with high reasoning returned the connection-test answer in 5.5 seconds. These are individual observations, not latency guarantees. The verification conversations were deleted and both accounts logged out; existing conversations were preserved.
- The private live-check report is `test-results/ai-server-smoke.json`; screenshots are `test-results/workspace/live-guest-search.png` and `live-chat-image.png`. They are not public build assets. The server remains running independently of the verification browser.

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
