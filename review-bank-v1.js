(()=>{'use strict';
// Managed source of truth: edit this file on main only. GitHub Actions publishes it to Pages and verifies the exact public file hash.
const items=[
  {
    id:'en-day-date-day-of-month-20260811',
    subject:'英語',unit:'疑問文・日付',title:'day / date / day of the month の区別',
    question:'「What day is it today?」「What is the date today?」「What day of the month is it today?」は、それぞれ何をたずねている？',
    answer:'What day is it today? は「今日は何曜日？」。What is the date today? は「今日は何日？」。What day of the month is it today? も「今日は（今月の）何日？」で、date を使った文と同じ内容をたずねています。',
    why:'英語の day は文脈によって「日」だけでなく「曜日」を表します。day of the month とすると「その月の中の何番目の日」という意味になるため、曜日ではなく日付をたずねます。',
    examples:['What day is it today? → It’s Tuesday.（今日は何曜日？ → 火曜日です）','What is the date today? → It’s August 11th.（今日は何日？ → 8月11日です）','What day of the month is it today? → It’s the 11th.（今日は今月の何日？ → 11日です）'],
    memory:'day だけ → 曜日 / date → 日付 / day of the month → 今月の何日',tags:['day','date','曜日','日付','書き換え'],createdAt:'2026-08-11'
  },
  {
    id:'en-made-of-made-from-20260811',subject:'英語',unit:'前置詞・受け身',title:'made of と made from の違い',question:'be made of と be made from はどう使い分ける？',answer:'be made of は、完成品を見ても元の材料が分かるときに使います。be made from は、加工されて元の材料の形が分かりにくくなっているときに使います。',why:'of は「材料そのものが残っている」感覚、from は「元の材料から変化してできた」感覚です。実際の英語では文脈による揺れもありますが、中学英語ではこの区別で覚えると使いやすいです。',examples:['This desk is made of wood.（この机は木でできています）','Cheese is made from milk.（チーズは牛乳から作られます）','Wine is made from grapes.（ワインはぶどうから作られます）'],memory:'made of＝材料の形が残る / made from＝加工されて元の形が分かりにくい',tags:['made of','made from','材料','前置詞','受け身'],createdAt:'2026-08-11'
  },
  {
    id:'en-comparative-than-any-other-singular-20260811',subject:'英語',unit:'比較級・最上級',title:'比較級 + than any other + 単数名詞',question:'「比較級 + than any other + 単数名詞」はどんな意味になり、なぜ名詞は単数形になる？',answer:'「ほかのどの〜よりも…」という意味で、実質的に最上級とほぼ同じ意味になります。any other の後ろの名詞は単数形にします。',why:'any other は「ほかのどの1つを取っても」という考え方なので、後ろには単数名詞を置きます。同じ集団の中で1つずつ比べて、すべてより上だと表すため、結果として最上級と同じ内容になります。',examples:['Mt. Fuji is higher than any other mountain in Japan.（富士山は日本のほかのどの山よりも高い）','Mt. Fuji is the highest mountain in Japan.（富士山は日本でいちばん高い山だ）','than any other mountain ○ / than any other mountains ×'],memory:'比較級 + than any other + 単数名詞 ＝「ほかのどの〜よりも」＝ほぼ最上級',tags:['比較級','than any other','単数名詞','最上級','書き換え'],createdAt:'2026-08-11'
  },
  {
    id:'en-because-because-of-test-20260812',subject:'英語',unit:'接続詞・前置詞',title:'【反映テスト】because と because of の使い分け',question:'because と because of の後ろには、それぞれ何を置く？',answer:'because の後ろには「主語 + 動詞」の文を置き、because of の後ろには名詞・代名詞・動名詞などの名詞相当語句を置きます。',why:'because は接続詞なので文と文をつなぎます。because of は前置詞句なので、of の後ろには名詞相当の語句が必要です。',examples:['I stayed home because it was raining.（雨が降っていたので家にいました）','I stayed home because of the rain.（雨のため家にいました）','because + S + V / because of + 名詞'],memory:'because＋文 / because of＋名詞',tags:['反映テスト','because','because of','接続詞','前置詞'],createdAt:'2026-08-12'
  },
  {
    id:'en-an-adjective-noun-20260812',subject:'英語',unit:'語順・冠詞',title:'a / an + 形容詞 + 名詞の語順',question:'「an important step」のように、a / an・形容詞・名詞はどの順番に並べる？',answer:'a / an + 形容詞 + 名詞 の順番にします。たとえば「重要な一歩」は an important step です。',why:'a / an は単数の数えられる名詞につく冠詞で、形容詞があるときはその形容詞の前に置きます。important は母音の音で始まるため a ではなく an を使います。',examples:['Recycling is an important step to save our natural resources.（リサイクルは私たちの天然資源を守るための重要な一歩です）','an important step ○ / important an step ×','a useful idea（役に立つ考え）'],memory:'a / an → 形容詞 → 名詞。an important step の順番を固定する',tags:['冠詞','a','an','形容詞','語順'],createdAt:'2026-08-12'
  },
  {
    id:'en-how-can-i-get-to-20260812',subject:'英語',unit:'会話表現・道案内',title:'How can I get to ～? の使い方',question:'「～へはどうやって行けばいいですか？」と道をたずねる英語表現は？',answer:'How can I get to ～? を使います。たとえば「駅へはどうやって行けばいいですか？」は How can I get to the station? です。',why:'How は方法をたずね、can I get to ～ で「私は～へ行くことができますか」という形になります。合わせて「～へはどうやって行けばいいですか」という定番の道案内表現です。',examples:['How can I get to the station?（駅へはどうやって行けばいいですか）','How can I get to the library?（図書館へはどうやって行けばいいですか）','Excuse me. How can I get to the station?（すみません。駅へはどうやって行けばいいですか）'],memory:'道を聞く → How can I get to + 場所?',tags:['How can I get to','道案内','疑問文','会話表現'],createdAt:'2026-08-12'
  },
  {
    id:'en-may-i-speak-to-phone-20260812',subject:'英語',unit:'会話表現・電話',title:'May I speak to ～? と Speaking.',question:'電話で「～さんをお願いします」と言うときと、「はい、私です」と答えるときの表現は？',answer:'「～さんをお願いします」は May I speak to ～?、「はい、私です」は Speaking. と言います。',why:'電話では speak to + 人 で「その人と話す」という意味になります。相手を呼び出すときは May I speak to Tom? のように、話したい人の名前を入れます。本人が電話に出ている場合の Speaking. は「話しているのは私です」という定番表現です。',examples:['May I speak to Tom?（トムさんをお願いします）','Speaking.（はい、私です）','Hello? This is Jiro. May I speak to Tom?（もしもし、ジローです。トムさんをお願いします）'],memory:'電話で「～さんを」→ May I speak to + 人? / 本人なら Speaking.',tags:['May I speak to','Speaking','電話','会話表現'],createdAt:'2026-08-12'
  },
  {
    id:'sci-plants-q25-q26-20260812',subject:'理科',unit:'植物の分類',title:'問25・26 ゼニゴケの雌株と植物の分類',question:'写真の問(25)(26)を解く。問(25)はゼニゴケの雌株がA・Bのどちらか。問(26)はア〜コの植物を、コケ植物・シダ植物・裸子植物・双子葉類・単子葉類に分類する。',image:'assets/20260812-science-q25-q26-v2.svg',imageAlt:'問25・26を再作成したベクター問題図。ゼニゴケの雌株判定と、スギゴケ・イヌワラビ・ツユクサ・イチョウ・ツツジ・スギナ・スギ・サクラ・ゼニゴケ・トウモロコシの分類問題。',answer:'(25) B。 (26) コケ植物：ア・ケ／シダ植物：イ・カ／裸子植物：エ・キ／双子葉類：オ・ク／単子葉類：ウ・コ。',why:'ゼニゴケの雌株には、柄の先が傘の骨のように放射状に分かれた雌器托ができます。植物の分類は、コケ植物（スギゴケ・ゼニゴケ）、シダ植物（イヌワラビ・スギナ）、裸子植物（イチョウ・スギ）、被子植物の双子葉類（ツツジ・サクラ）、単子葉類（ツユクサ・トウモロコシ）で整理します。',examples:['コケ植物：ア スギゴケ、ケ ゼニゴケ','シダ植物：イ イヌワラビ、カ スギナ','裸子植物：エ イチョウ、キ スギ','双子葉類：オ ツツジ、ク サクラ','単子葉類：ウ ツユクサ、コ トウモロコシ'],memory:'コケ＝スギゴケ・ゼニゴケ／シダ＝イヌワラビ・スギナ／裸子＝イチョウ・スギ／双子葉＝ツツジ・サクラ／単子葉＝ツユクサ・トウモロコシ',tags:['ゼニゴケ','雌株','植物の分類','コケ植物','シダ植物','裸子植物','双子葉類','単子葉類','問25','問26'],createdAt:'2026-08-12'
  },
  {
    id:'ja-kanji-biwako-20260812',subject:'国語',unit:'漢字・地名',title:'琵琶湖（びわこ）の漢字',question:'「びわこ」を漢字で書きなさい。',answer:'琵琶湖',why:'滋賀県にある日本最大の湖は「琵琶湖」と書きます。「びわ」の2字が難しいので、地名としてひとかたまりで書けるようにします。',examples:['びわこ → 琵琶湖','琵琶湖は滋賀県にある。'],memory:'びわこ＝琵琶湖。「琵」「琶」の2字をセットで覚える',tags:['漢字','琵琶湖','びわこ','地名','滋賀県'],createdAt:'2026-08-12'
  },
  {
    id:'sci-organophosphate-ache-20260812',subject:'理科',unit:'化学物質・有機リン',title:'有機リン系農薬とアセチルコリンエステラーゼ',question:'有機リン系農薬は、神経伝達に関わるどの酵素の働きを阻害する？',answer:'アセチルコリンエステラーゼ。',why:'有機リン系農薬の代表的な作用は、アセチルコリンを分解する酵素アセチルコリンエステラーゼの働きを阻害することです。その結果、アセチルコリンが過剰にたまり、神経系に影響が出ます。',examples:['有機リン系農薬 → アセチルコリンエステラーゼを阻害','アセチルコリンエステラーゼ → アセチルコリンを分解する酵素'],memory:'有機リン → AChE（アセチルコリンエステラーゼ）阻害',tags:['有機リン','有機リン系農薬','アセチルコリンエステラーゼ','神経伝達'],createdAt:'2026-08-12'
  },
  {
    id:'soc-enlightenment-locke-montesquieu-rousseau-20260814',subject:'社会',unit:'近代ヨーロッパ・啓蒙思想',title:'ロック・モンテスキュー・ルソーの違い',question:'ロック・モンテスキュー・ルソーについて、著書と重要な考え方をそれぞれ答えなさい。',answer:'ロック：『統治二論（市民政府二論）』―自然権・社会契約説・抵抗権。モンテスキュー：『法の精神』―三権分立。ルソー：『社会契約論』―人民主権。',why:'ロックは、人が生まれながらに持つ自然権を守るために政府をつくり、政府が権利を侵害すれば人民には抵抗する権利があると考えました。モンテスキューは権力の集中を防ぐため、立法・行政・司法を分ける三権分立を唱えました。ルソーは、人々の合意で社会・国家が成り立つという社会契約の考えから、政治の最終的な主権は人民にあるという人民主権を唱えました。',examples:['ロック → 統治二論 → 自然権・社会契約説・抵抗権','モンテスキュー → 法の精神 → 三権分立','ルソー → 社会契約論 → 人民主権','自然権の思想は近代的人権思想の重要な源流になった'],memory:'ロック＝権利を守れ／モンテスキュー＝権力を分けろ／ルソー＝政治の主人公は人民',tags:['ロック','モンテスキュー','ルソー','啓蒙思想','自然権','抵抗権','三権分立','人民主権','社会契約説'],createdAt:'2026-08-14'
  }
];
function normalize(x){return {...x,examples:Array.isArray(x.examples)?x.examples:[],tags:Array.isArray(x.tags)?x.tags:[]}}
const bank=items.map(normalize);
window.AA_REVIEW_BANK=bank;
window.AA_REVIEW_BANK_VERSION='1.0.10';
window.AA_REVIEW_BANK_BY_ID=Object.fromEntries(bank.map(x=>[x.id,x]));
})();