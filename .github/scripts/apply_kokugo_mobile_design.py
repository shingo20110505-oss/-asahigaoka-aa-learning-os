from pathlib import Path
import re

p = Path('kokugo-chronologia/index.html')
s = p.read_text(encoding='utf-8')

# Remove previously injected mobile layout blocks so this patch is idempotent.
s = re.sub(r'/\* KOKUGO_MOBILE_DUAL_COLUMN_V\d+ \*/.*?(?=</style>)', '', s, flags=re.S)

css = '''/* KOKUGO_MOBILE_DUAL_COLUMN_V2 */
@media(max-width:760px){
  .tableWrap{overflow:visible;border:0;background:transparent;border-radius:0}
  .table{min-width:0;width:100%}
  .tr{grid-template-columns:minmax(112px,34%) minmax(0,1fr) 38px;grid-template-rows:auto auto auto;background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;overflow:hidden}
  .tr>div{min-height:0;border:0;padding:8px 9px}
  .tr>div:nth-child(1),.tr>div:nth-child(5){display:none}
  .tr>div:nth-child(2){grid-column:1;grid-row:1;border-right:1px solid #e5e9ef;padding-bottom:3px}
  .tr>div:nth-child(3){grid-column:1;grid-row:2;border-right:1px solid #e5e9ef;padding-top:2px}
  .tr>div:nth-child(4){grid-column:2;grid-row:1 / span 2;align-self:stretch}
  .tr>div:nth-child(6){display:flex;grid-column:3;grid-row:1 / span 2;align-items:center;justify-content:center;border-left:1px solid #e5e9ef;padding:4px}
  .tr>div:nth-child(7){grid-column:1 / -1;grid-row:3;border-top:1px solid #eef1f5;padding:6px 8px}
  .th{position:sticky;top:0;z-index:15;display:grid;grid-template-columns:minmax(112px,34%) minmax(0,1fr) 38px;grid-template-rows:auto;background:#edf1f6;border:1px solid var(--line);border-radius:10px;margin-bottom:7px;overflow:hidden;box-shadow:0 1px 0 #d9e1ec}
  .th>div{display:none!important}
  .th>div:nth-child(2),.th>div:nth-child(4),.th>div:nth-child(6){display:block!important;padding:8px 6px;border:0}
  .th>div:nth-child(2){grid-column:1;border-right:1px solid #d9e1ec}
  .th>div:nth-child(4){grid-column:2}
  .th>div:nth-child(6){grid-column:3;text-align:center;border-left:1px solid #d9e1ec}
  .word{font-size:14px;line-height:1.35}
  .reading{font-size:10px;line-height:1.35}
  .meaning{font-size:12px;line-height:1.5;word-break:break-word}
  .rank{font-size:14px}
  .states{justify-content:flex-end;gap:6px}
  .mini{padding:6px 9px}
}
@media(max-width:420px){
  .tr,.th{grid-template-columns:minmax(108px,36%) minmax(0,1fr) 36px}
}
'''

if '</style>' not in s:
    raise SystemExit('missing </style>')
s = s.replace('</style>', css + '</style>', 1)
p.write_text(s, encoding='utf-8')

sw = Path('sw.js')
t = sw.read_text(encoding='utf-8')
t = re.sub(r"const VERSION='[^']+';", "const VERSION='2.4.2-quality2-chronologia1000-kokugo-mobile-rank';", t, count=1)
sw.write_text(t, encoding='utf-8')

# Validate requested mobile presentation: term, meaning, and rank visible; kind hidden.
assert 'KOKUGO_MOBILE_DUAL_COLUMN_V2' in s
assert '.tr>div:nth-child(6){display:flex' in s
assert '.tr>div:nth-child(1),.tr>div:nth-child(5){display:none}' in s
assert 'quality2-chronologia1000' in t
print('Kokugo mobile term+meaning+rank design patched')
