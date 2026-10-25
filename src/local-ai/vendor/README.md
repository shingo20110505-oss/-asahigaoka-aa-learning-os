# Vendored browser runtime

`web-llm-0.2.86.mjs` is the unmodified `lib/index.js` from `@mlc-ai/web-llm@0.2.86`. The filename is changed for RISE's module layout. Upstream source-map comment is retained; the optional development source map is not shipped.

- Package: https://registry.npmjs.org/@mlc-ai/web-llm/-/web-llm-0.2.86.tgz
- Verified package SRI: `sha512-plciXBCYtY7iTKHzEcsqOfSO+s5u8NqMYFPnHmRbsN8CEdKcolgXIoGLPbzO6FtJHV43m7YP00x6qQ6Kb8CJJw==`
- License: Apache-2.0; original license is `LICENSE.web-llm`. The bundle retains embedded third-party attribution.
- Source: https://github.com/mlc-ai/web-llm

No package install or lifecycle scripts were executed. No model weights are included. Model revisions and compiled-WASM revision are pinned in `../models.mjs`. The runtime is cached with the RISE shell; model downloads happen only after the explicit preparation/comparison action.
