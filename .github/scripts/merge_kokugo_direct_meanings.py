from pathlib import Path
import json, re

root = Path('kokugo-chronologia')
patch_dir = root / 'meaning-ja-patches'
override_path = root / 'meaning-ja-overrides.json'
override_js_path = root / 'meaning-ja-overrides.js'
status_path = root / 'meaning-ja-status.json'

merged = {}
if override_path.exists():
    try:
        current = json.loads(override_path.read_text(encoding='utf-8') or '{}')
        if isinstance(current, dict):
            merged.update({str(k): str(v) for k, v in current.items() if str(v).strip()})
    except Exception:
        pass

for p in sorted(patch_dir.glob('chunk-*.json')):
    rows = json.loads(p.read_text(encoding='utf-8'))
    if not isinstance(rows, list):
        raise SystemExit(f'{p} must contain a list')
    for r in rows:
        key = str(r['id'])
        meaning = str(r['meaning']).strip()
        if not meaning:
            raise SystemExit(f'empty meaning in {p}: {key}')
        if not re.search(r'[ぁ-んァ-ヶ一-龠々〆ヵヶ]', meaning):
            raise SystemExit(f'non-Japanese meaning in {p}: {key} {meaning!r}')
        merged[key] = meaning

payload = json.dumps(merged, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
override_path.write_text(payload + '\n', encoding='utf-8')
override_js_path.write_text('window.KOKUGO_DIRECT_MEANINGS=' + payload + ';\n', encoding='utf-8')

source_dir = root / 'translation-source'
chunks = sorted(source_dir.glob('chunk-*.json'))
completed = sum(1 for c in chunks if (patch_dir / c.name).exists())
chunk_size = 50

status = {
    'mode': 'assistant_direct_japanese',
    'translated_entries': len(merged),
    'total_entries': 15000,
    'completed_chunks': completed,
    'total_chunks': len(chunks),
    'chunk_size': chunk_size,
}
status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

sw = Path('sw.js')
t = sw.read_text(encoding='utf-8')
t = re.sub(r"const VERSION='[^']+';", f"const VERSION='2.5.{completed}-quality2-chronologia1000-kokugo-direct-ja';", t, count=1)
sw.write_text(t, encoding='utf-8')

print(json.dumps(status, ensure_ascii=False))
