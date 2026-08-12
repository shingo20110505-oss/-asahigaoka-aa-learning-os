from pathlib import Path
import json, re

root = Path('kokugo-chronologia')
data_path = root / 'data.jsonl'
source_dir = root / 'translation-source'
patch_dir = root / 'meaning-ja-patches'
source_dir.mkdir(parents=True, exist_ok=True)
patch_dir.mkdir(parents=True, exist_ok=True)

rows = [json.loads(x) for x in data_path.read_text(encoding='utf-8').splitlines() if x.strip()]
chunk_size = 100
for start in range(0, len(rows), chunk_size):
    chunk = rows[start:start+chunk_size]
    n = start // chunk_size + 1
    out = []
    for r in chunk:
        out.append({
            'id': r.get('id'),
            'term': r.get('term',''),
            'reading': r.get('reading',''),
            'meaning': r.get('meaning',''),
            'type': r.get('type',''),
            'rank': 'B' if r.get('type') in ('yoji','idiom') else 'C',
        })
    (source_dir / f'chunk-{n:04d}.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

(root / 'meaning-ja-overrides.json').write_text('{}\n', encoding='utf-8')
(root / 'meaning-ja-overrides.js').write_text('window.KOKUGO_DIRECT_MEANINGS={};\n', encoding='utf-8')
(root / 'meaning-ja-status.json').write_text(json.dumps({
    'mode':'assistant_direct_japanese',
    'translated_entries':0,
    'total_entries':len(rows),
    'completed_chunks':0,
    'total_chunks':(len(rows)+chunk_size-1)//chunk_size,
    'chunk_size':chunk_size,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

p = root / 'index.html'
s = p.read_text(encoding='utf-8')

if 'meaning-ja-overrides.js' not in s:
    s = s.replace('<script src="../idiom/idiom-bank.js"></script>', '<script src="../idiom/idiom-bank.js"></script><script src="./meaning-ja-overrides.js"></script>', 1)

s = s.replace("fetch('./data.jsonl',{cache:'force-cache'})", "fetch('./data.jsonl?v=direct-ja',{cache:'no-cache'})")
s = s.replace("meaning:x.meaning||'辞書語義なし'", "meaning:(window.KOKUGO_DIRECT_MEANINGS||{})[String(x.id)]||x.meaning||'辞書語義なし'")
s = s.replace("meaning:x.meaning||''", "meaning:(window.KOKUGO_DIRECT_MEANINGS||{})[String(x.id)]||x.meaning||''")
s = s.replace('辞書拡張分の意味はJMdict由来の英語gloss、手作業確認済み語は日本語意味を優先します。', '意味欄は日本語化を順次反映しています。手作業確認済み語は確認済みの日本語意味を優先し、辞書拡張分は直接わかりやすい日本語へ直していきます。')

if 'KOKUGO_DIRECT_MEANING_OVERRIDE_V1' not in s:
    s = s.replace('</script></body></html>', '</script><!-- KOKUGO_DIRECT_MEANING_OVERRIDE_V1 --></body></html>', 1)

p.write_text(s, encoding='utf-8')

assert 'meaning-ja-overrides.js' in s
assert 'KOKUGO_DIRECT_MEANINGS' in s
assert "cache:'no-cache'" in s
assert len(list(source_dir.glob('chunk-*.json'))) == (len(rows)+chunk_size-1)//chunk_size
print(f'prepared rows={len(rows)} chunks={(len(rows)+chunk_size-1)//chunk_size}')
