from pathlib import Path

# Restore/repair the vocabulary + quiz extension without touching progress data.
jp = Path('kokugo-chronologia/jukugo-extension.js')
jt = jp.read_text(encoding='utf-8')
jt = jt.replace("'\"':'&quot'", "'\"':'&quot;'", 1)
assert 'STOP6' not in jt
assert "STATE_KEY='kokugoChronologiaStateV2'" in jt
assert "WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1'" in jt
assert 'data-tab="legacy"' in jt
assert 'data-tab="quiz"' in jt
assert '&quot;' in jt
jp.write_text(jt, encoding='utf-8')

p = Path('kokugo-chronologia/index.html')
s = p.read_text(encoding='utf-8')

# Remove the malformed first attempt, including its literal \\n boundary text.
v1 = '<!-- AA_KOKUGO_QUICK_NAV_V1 -->'
if v1 in s:
    start = s.index(v1)
    end = s.find('</script>', start)
    if end < 0:
        raise SystemExit('V1 quick-nav closing script not found')
    prefix = s[:start]
    suffix = s[end + len('</script>'):]
    if prefix.endswith('\\n'):
        prefix = prefix[:-2]
    if suffix.startswith('\\n'):
        suffix = suffix[2:]
    s = prefix + suffix

v2 = '<!-- AA_KOKUGO_QUICK_NAV_V2 -->'
if v2 not in s:
    block = r'''
<!-- AA_KOKUGO_QUICK_NAV_V2 -->
<style>
#aaKokugoQuickNav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 14px}
#aaKokugoQuickNav button{border:1px solid #d7dde7;background:#fff;border-radius:12px;padding:12px 10px;font-size:12px;font-weight:900;box-shadow:0 2px 8px rgba(20,35,60,.05)}
#aaKokugoQuickNav button:active{transform:translateY(1px)}
@media(max-width:600px){#aaKokugoQuickNav{grid-template-columns:1fr}#aaKokugoQuickNav button{font-size:13px}}
</style>
<script>
(()=>{
  function go(sel){
    const el=document.querySelector(sel);
    if(!el)return false;
    el.click();
    setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),0);
    return true;
  }
  function mount(){
    if(document.getElementById('aaKokugoQuickNav'))return;
    const nav=document.getElementById('jkgNav');
    if(!nav){setTimeout(mount,80);return;}
    const q=document.createElement('div');
    q.id='aaKokugoQuickNav';
    q.innerHTML='<button data-go="vocab">慣用句・四字熟語</button><button data-go="classic">古文・漢文</button><button data-go="quiz">クイズ</button>';
    nav.parentNode.insertBefore(q,nav);
    q.addEventListener('click',e=>{
      const b=e.target.closest('button[data-go]');
      if(!b)return;
      if(b.dataset.go==='vocab'){go('[data-tab="legacy"]');return;}
      if(b.dataset.go==='classic'){
        go('[data-tab="kotenkanbun"]');
        setTimeout(()=>go('[data-kk-view="list"]'),60);
        return;
      }
      if(b.dataset.go==='quiz'){go('[data-tab="quiz"]');return;}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
</script>
'''
    if '</body>' not in s:
        raise SystemExit('body end not found')
    s = s.replace('</body>', block + '\n</body>', 1)

assert v1 not in s
assert s.count(v2) == 1
assert '[data-tab="legacy"]' in s
assert '[data-tab="kotenkanbun"]' in s
assert '[data-tab="quiz"]' in s
p.write_text(s, encoding='utf-8')
