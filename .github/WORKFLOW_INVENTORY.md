# Workflow inventory after Phase 1

## Active
- `chronologia-63-qa.yml`
- `chronologia-deep-audit.yml`
- `content-v24-audit.yml`
- `core-ci.yml`
- `deploy-ai-worker.yml`
- `deploy-pages.yml`
- `difficulty-5subject-audit.yml`
- `kokugo-chronologia-audit.yml`
- `kokugo-jukugo-advanced-audit.yml`
- `reading-1000-audit.yml`
- `replenish-reading.yml`
- `science-exam-ci.yml`
- `social-exam-check.yml`
- `social-public-verify.yml`

## Retired / archived
Legacy one-shot fixes, restores, public observers, report writers, old verification jobs, and Phase 1 helper workflows have been removed from `.github/workflows`. Historical one-shot workflows that were worth retaining are stored under `.github/workflow-archive/legacy-one-shot/` where they cannot trigger.

## Policy
- `deploy-pages.yml` is the single GitHub Pages publisher.
- Pages concurrency does not cancel an in-flight deployment.
- Reading replenishment only commits generated content; its push to `main` naturally triggers Pages and does not manually dispatch a second deploy.
- Deployment/public verification status files remain path-ignored so their bookkeeping commits do not recursively trigger Pages.
- Science and Social entrance-exam implementations are completed, protected production systems. Their CI/public verification workflows remain active.
- `core-ci.yml` is the permanent read-only gate for architecture, review, runtime assets, reading, Japanese and mathematics integrity.
- New reusable workflows require a clear long-lived responsibility; temporary migration or diagnostic workflows must be retired after use.
