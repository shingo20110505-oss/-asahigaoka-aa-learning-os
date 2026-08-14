(()=>{'use strict';if(window.__AA_SCIENCE_CONTENT_FIX_V1__)return;window.__AA_SCIENCE_CONTENT_FIX_V1__=true;
const replacements={
  'v23-sci-146-r':'次の説明に最も対応する語句・法則を選ぶ：地球の自転により太陽が東から西へ動くように見える現象',
  'v23-sci-147-r':'次の説明に最も対応する語句・法則を選ぶ：地球の自転により星が北極星付近を中心に回るように見える現象'
};
const rows=window.AA_V2_CURRICULUM?.science||[];
for(const row of rows){if(Array.isArray(row)&&replacements[row[0]])row[2]=replacements[row[0]];}
const bank=window.AA_V2_TEST_API?.banks?.science||[];
for(const q of bank){if(q&&replacements[q.id])q.prompt=replacements[q.id];}
window.AA_SCIENCE_CONTENT_FIX_V1={version:'1.0.0',updated:Object.keys(replacements)};
})();
