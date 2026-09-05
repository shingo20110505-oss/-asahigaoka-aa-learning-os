#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-}"
AI_ACCESS_TOKEN="${2:-}"
BASE="${BASE%/}"
ORIGIN='https://shingo20110505-oss.github.io'
EXPECTED_WORKER_VERSION='1.4.0'
EXPECTED_HARDENING_VERSION='2.0.0'
EXPECTED_GEMINI_TRANSPORT_REVISION='dual-transport-v4'

if [[ -z "$BASE" || -z "$AI_ACCESS_TOKEN" ]]; then
  echo 'Usage: verify-ai-worker-production.sh <deployment-url> <access-token>' >&2
  exit 2
fi

health_ready=false
for attempt in $(seq 1 12); do
  if curl -fsSL --max-time 30 "$BASE/health" -o /tmp/ai-health.json \
    && EXPECTED_WORKER_VERSION="$EXPECTED_WORKER_VERSION" EXPECTED_HARDENING_VERSION="$EXPECTED_HARDENING_VERSION" EXPECTED_GEMINI_TRANSPORT_REVISION="$EXPECTED_GEMINI_TRANSPORT_REVISION" \
      node -e 'const h=require("/tmp/ai-health.json"); process.exit(h.ok===true && h.version===process.env.EXPECTED_WORKER_VERSION && h.hardeningVersion===process.env.EXPECTED_HARDENING_VERSION && h.geminiTransportRevision===process.env.EXPECTED_GEMINI_TRANSPORT_REVISION && h.service==="rise-ai-platform" ? 0 : 1)'; then
    health_ready=true
    break
  fi
  sleep 5
done
[[ "$health_ready" == true ]]

status_ready=false
for attempt in $(seq 1 12); do
  STATUS_HTTP="$(curl -sS --max-time 30 -w '%{http_code}' \
    -X POST \
    -H "Origin: $ORIGIN" \
    -H "Authorization: Bearer $AI_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    --data '{}' \
    "$BASE/v1/status" -o /tmp/ai-status.json || true)"
  if [[ "$STATUS_HTTP" == 200 ]] \
    && EXPECTED_WORKER_VERSION="$EXPECTED_WORKER_VERSION" EXPECTED_HARDENING_VERSION="$EXPECTED_HARDENING_VERSION" EXPECTED_GEMINI_TRANSPORT_REVISION="$EXPECTED_GEMINI_TRANSPORT_REVISION" \
      node -e 'const s=require("/tmp/ai-status.json"); process.exit(s.ready===true && s.version===process.env.EXPECTED_WORKER_VERSION && s.hardeningVersion===process.env.EXPECTED_HARDENING_VERSION && s.geminiTransportRevision===process.env.EXPECTED_GEMINI_TRANSPORT_REVISION && s.safeguards?.providerDeadlines===true && s.safeguards?.quota429StopsGeneration===true && s.service==="rise-ai-platform" ? 0 : 1)'; then
    status_ready=true
    break
  fi
  sleep 5
done
if [[ "$status_ready" != true ]]; then
  echo 'Production /v1/status did not converge to the expected Worker build.' >&2
  cat /tmp/ai-status.json >&2 || true
  exit 1
fi

GEMINI_QUOTA_EXHAUSTED=false
GROQ_QUOTA_EXHAUSTED=false
READING_VERIFIED=false
MATH_VERIFIED=false
SCIENCE_VERIFIED=false

READING_HTTP_STATUS="$(curl -sS --max-time 180 -w '%{http_code}' \
  -X POST \
  -H "Origin: $ORIGIN" \
  -H "Authorization: Bearer $AI_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"schemaVersion":1,"difficulty":4,"readingType":"argument","assistMode":"scaffold","allowedGrammar":["basic","past","future","modal","infinitive","gerund","comparison","passive","presentPerfect","asMuchAs","asManyAs"],"weakSkills":[{"id":"en.read.inference","label":"英語・推論"}],"weakWords":[{"word":"evidence","meaningJa":"根拠"}],"knownWords":["student","school","plan"],"recentTopics":[],"recentErrorTypes":[]}' \
  "$BASE/v1/reading" -o /tmp/ai-reading.json || true)"

if [[ "$READING_HTTP_STATUS" == 200 ]]; then
  READING_VERIFIED=true
elif [[ "$READING_HTTP_STATUS" == 429 ]] && node -e 'const p=require("/tmp/ai-reading.json"); process.exit(p.error?.code==="quota_exceeded" ? 0 : 1)'; then
  GEMINI_QUOTA_EXHAUSTED=true
  echo 'Gemini free quota is exhausted; generation is correctly stopped and verified/local pool fallback remains required.'
elif [[ "$READING_HTTP_STATUS" == 429 ]] && node -e 'const p=require("/tmp/ai-reading.json"); process.exit(p.error?.code==="groq_quota_exceeded" ? 0 : 1)'; then
  GROQ_QUOTA_EXHAUSTED=true
  echo 'Groq free quota is exhausted; new items are correctly rejected.'
else
  cat /tmp/ai-reading.json >&2 || true
  exit 1
fi

if [[ "$GROQ_QUOTA_EXHAUSTED" != true ]]; then
  node -e "const E=require('./math-exam/engine.js'); const q=E.make('probability',20260904,2); process.stdout.write(JSON.stringify({schemaVersion:1,subject:'math',item:{id:'deploy-math-probability',stem:q.stem,choices:q.choices.map(choice=>choice.text),expectedAnswerIndex:q.answerIndex,figure:q.figure||null}}));" > /tmp/math-verify-request.json
  MATH_HTTP_STATUS="$(curl -sS --max-time 120 -w '%{http_code}' \
    -X POST \
    -H "Origin: $ORIGIN" \
    -H "Authorization: Bearer $AI_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/math-verify-request.json \
    "$BASE/v1/verify" -o /tmp/math-verify.json || true)"
  if [[ "$MATH_HTTP_STATUS" == 200 ]]; then
    MATH_VERIFIED=true
  elif [[ "$MATH_HTTP_STATUS" == 429 ]] && node -e 'const p=require("/tmp/math-verify.json"); process.exit(p.error?.code==="groq_quota_exceeded" ? 0 : 1)'; then
    GROQ_QUOTA_EXHAUSTED=true
    echo 'Groq free quota became exhausted during math audit; strict verification stopped as designed.'
  else
    cat /tmp/math-verify.json >&2 || true
    exit 1
  fi
else
  printf '{"skipped":"groq_quota"}' > /tmp/math-verify.json
fi

if [[ "$GEMINI_QUOTA_EXHAUSTED" != true && "$GROQ_QUOTA_EXHAUSTED" != true ]]; then
  EXAM_HTTP_STATUS="$(curl -sS --max-time 180 -w '%{http_code}' \
    -X POST \
    -H "Origin: $ORIGIN" \
    -H "Authorization: Bearer $AI_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    --data '{"schemaVersion":1,"subject":"science","count":1,"difficulty":7,"skill":"sci.aichi.application","focus":["実験","資料読解","計算"],"recentQuestionIds":[],"recentFingerprints":[]}' \
    "$BASE/v1/exam" -o /tmp/ai-exam.json || true)"
  if [[ "$EXAM_HTTP_STATUS" == 200 ]]; then
    SCIENCE_VERIFIED=true
  elif [[ "$EXAM_HTTP_STATUS" == 429 ]] && node -e 'const p=require("/tmp/ai-exam.json"); process.exit(["quota_exceeded","groq_quota_exceeded"].includes(p.error?.code) ? 0 : 1)'; then
    CODE="$(node -e 'const p=require("/tmp/ai-exam.json"); process.stdout.write(p.error.code)')"
    if [[ "$CODE" == quota_exceeded ]]; then GEMINI_QUOTA_EXHAUSTED=true; else GROQ_QUOTA_EXHAUSTED=true; fi
    echo 'Free-provider quota became exhausted during science generation; further generation stopped as designed.'
  else
    cat /tmp/ai-exam.json >&2 || true
    exit 1
  fi
else
  printf '{"skipped":"provider_quota"}' > /tmp/ai-exam.json
fi

export GEMINI_QUOTA_EXHAUSTED GROQ_QUOTA_EXHAUSTED READING_VERIFIED MATH_VERIFIED SCIENCE_VERIFIED
export DEPLOYMENT_URL="$BASE"
node scripts/verify-ai-worker-production-result.mjs
