#!/usr/bin/env python3
import hashlib
import json
import pathlib
import subprocess
from datetime import datetime, timezone

ROOT = pathlib.Path('.')
PUBLIC = pathlib.Path('/tmp/kokugo-public')
OUT = ROOT / 'kokugo-chronologia' / 'PUBLIC_CATEGORY_VERIFY_STATUS.json'
EXPECTED_QUARANTINE = {
    '浮き草稼業','大盤振る舞い','家族団らん','九牛の一毛','元気はつらつ',
    'こんにゃく問答','極楽とんぼ','傷弓の鳥','竹林の七賢','悲喜こもごも',
    '貧者の一灯','判官びいき','和気あいあい',
}
checks = []

def add(name, cond, detail=''):
    checks.append({'name': name, 'ok': bool(cond), 'detail': str(detail)})

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

try:
    audit = json.loads((PUBLIC / 'DATA_CATEGORY_AUDIT.json').read_text(encoding='utf-8'))
    add('audit_status_clean', audit.get('status') == 'clean', audit.get('status'))
    add('audit_rows_15000', audit.get('rows') == 15000, audit.get('rows'))
    add('audit_unique_15000', audit.get('unique_term_reading') == 15000, audit.get('unique_term_reading'))
    add('audit_source_missing_zero', audit.get('source_missing_count') == 0, audit.get('source_missing_count'))
    add('audit_duplicates_zero', audit.get('duplicate_count') == 0, audit.get('duplicate_count'))
    add('audit_post_repair_mismatch_zero', audit.get('post_repair_mismatch_count') == 0, audit.get('post_repair_mismatch_count'))

    public_data = PUBLIC / 'data.jsonl'
    source_data = ROOT / 'kokugo-chronologia' / 'data.jsonl'
    public_data_sha = sha256(public_data)
    source_data_sha = sha256(source_data)
    add('data_sha256_matches_main', public_data_sha == source_data_sha, f'public={public_data_sha} source={source_data_sha}')

    rows = [json.loads(line) for line in public_data.read_text(encoding='utf-8').splitlines() if line.strip()]
    add('production_data_rows_15000', len(rows) == 15000, len(rows))
    target = [x for x in rows if str(x.get('id')) == '2044510']
    add('gesaku_zanmai_present_once', len(target) == 1, len(target))
    if target:
        x = target[0]
        add(
            'gesaku_zanmai_is_four',
            x.get('term') == '戯作三昧' and x.get('type') == 'four' and x.get('strict') is False,
            json.dumps(x, ensure_ascii=False),
        )

    public_js = PUBLIC / 'quiz-rank-select-v1.js'
    source_js = ROOT / 'kokugo-chronologia' / 'quiz-rank-select-v1.js'
    js = public_js.read_text(encoding='utf-8')
    add('quiz_version_taxonomy_guard', '2026-09-06.2-taxonomy-guard' in js)
    add('quiz_has_canonical_yoji_guard', 'isCanonicalYojiSurface' in js)
    add('quiz_preserves_selected_kind', 'kindEl.value=selectedKind' in js)
    add('quiz_no_forced_all_reset', "kindEl.value='all';" not in js)
    add('quiz_js_sha256_matches_main', sha256(public_js) == sha256(source_js), f'public={sha256(public_js)} source={sha256(source_js)}')

    public_quarantine = PUBLIC / 'taxonomy-quarantine-v1.json'
    source_quarantine = ROOT / 'kokugo-chronologia' / 'taxonomy-quarantine-v1.json'
    quarantine_doc = json.loads(public_quarantine.read_text(encoding='utf-8'))
    quarantine = quarantine_doc.get('nonCanonicalYoji') or []
    terms = {x.get('term') for x in quarantine}
    add('quarantine_count_13', len(quarantine) == 13, len(quarantine))
    add('quarantine_exact_terms', terms == EXPECTED_QUARANTINE, json.dumps(sorted(terms), ensure_ascii=False))
    add('quarantine_sha256_matches_main', sha256(public_quarantine) == sha256(source_quarantine), f'public={sha256(public_quarantine)} source={sha256(source_quarantine)}')

    result = 'success' if all(x['ok'] for x in checks) else 'failure'
    out = {
        'result': result,
        'verified_at': datetime.now(timezone.utc).isoformat(),
        'page_base': 'https://shingo20110505-oss.github.io/-asahigaoka-aa-learning-os/kokugo-chronologia/',
        'source_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
        'public_data_sha256': public_data_sha,
        'source_data_sha256': source_data_sha,
        'checks': checks,
    }
except Exception as exc:
    result = 'failure'
    out = {
        'result': result,
        'verified_at': datetime.now(timezone.utc).isoformat(),
        'page_base': 'https://shingo20110505-oss.github.io/-asahigaoka-aa-learning-os/kokugo-chronologia/',
        'error': f'{type(exc).__name__}: {exc}',
        'checks': checks,
    }

OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(out, ensure_ascii=False, indent=2))
raise SystemExit(0 if result == 'success' else 1)
