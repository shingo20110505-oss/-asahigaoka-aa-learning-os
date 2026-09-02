# AA Learning OS architecture boundary — Phase 1

Runtime ownership is explicit: App Shell -> State -> Learning -> Subject engines -> UI -> PWA -> QA.

`app/legacy/main-runtime.js` is the compatibility island extracted from the former giant inline runtime. Phase 1 deliberately moves it without rewriting its behavior. New development should use `window.AA_APP` layer APIs rather than adding more same-name global overrides.

Protected: learning history, review progress/data, PWA, Megumin/companion image display and local image storage, saved/replayed voice features, AI reading, Chronologia, Japanese 15,000-word content, current adaptive learning, and the completed Science/Social entrance-exam engines. Science and Social are active subject engines and must not be downgraded to legacy generic fallbacks by architecture work.

The old `v23-pet-settings.js` filename was misleading: it also owned the login image/voice settings UI. Its exact media-settings implementation is retained under `companion-media-settings-v1.js`; only the obsolete pet naming/reference is removed.
