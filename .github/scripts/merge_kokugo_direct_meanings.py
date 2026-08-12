from pathlib import Path
import json, re

root = Path('kokugo-chronologia')
patch_dir = root / 'meaning-ja-patches'
override_path = root / 'meaning-ja-overrides.json'
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
        # Direct Japanese rewrite must contain Japanese characters.
        if not re.search(r'[ぁ-んァ-ヶ一-龠々〆ヵヶ]', meaning):
            raise SystemExit(f'non-Japanese meaning in {p}: {key} {meaning!r}')
        merged[key] = meaning

override_path.write_text(json.dumps(merged, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n', encoding='utf-8')

source_dir = root / 'translation-source'
chunks = sorted(source_dir.glob('chunk-*.json'))
completed = 0
for c in chunks:
    patch = patch_dir / c.name
    if patch.exists():
        completed += 1

status = {
    'mode': 'assistant_direct_japanese',
    'translated_entries': len(merged),
    'total_entries': 15000,
    'completed_chunks': completed,
    'total_chunks': len(chunks),
    'chunk_size': 100,
}
status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Bump cache version while keeping deploy preflight marker.
sw = Path('sw.js')
t = sw.read_text(encoding='utf-8')
t = re.sub(r"const VERSION='[^']+';", f"const VERSION='2.5.{completed}-quality2-chronologia1000-kokugo-direct-ja';", t, count=1)
sw.write_text(t, encoding='utf-8')

print(json.dumps(status, ensure_ascii=False))
