(()=>{'use strict';
if(window.__AA_EXPLANATION_EXAMPLES_V2__)return;window.__AA_EXPLANATION_EXAMPLES_V2__=true;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const stripLegacy=s=>String(s??'').replace(/\s*【例文】[\s\S]*?【意味・ポイント】[\s\S]*$/,'').trim();
const placeholder=s=>!s||/Choose the meaning|Recognize |meaningful context|passage uses|We practiced how to use|They decided to .* information carefully|The .* was important in the discussion|The .* were important in the discussion/i.test(String(s));
const CLASSICAL_ID={
 jc01:['花を見れば、いとあはれなり。','「あはれ」＝しみじみと心を動かされる趣。'],
 jc02:['春の夜はいとをかし。','「をかし」＝趣がある、すばらしい。'],
 jc03:['山はいと高し。','「いと」＝とても、たいそう。'],
 jc04:['風いみじく吹く。','「いみじ」＝程度が甚だしい。文脈により「ひどい」「すばらしい」など。'],
 jc05:['月の行方、いとゆかし。','「ゆかし」＝見たい・知りたい・聞きたい。'],
 jc06:['世にありがたき人なり。','「ありがたし」＝めったにない、珍しい。'],
 jc07:['小さき子の笑ふさま、うつくし。','「うつくし」＝かわいらしい、愛らしい。'],
 jc08:['親は子をかなしと思ふ。','「かなし」＝いとしい、かわいい。'],
 jc09:['月の光、めでたし。','「めでたし」＝すばらしい、立派だ。'],
 jc10:['雨降りて、つれづれなり。','「つれづれ」＝することがなく退屈なさま。'],
 jc11:['東の空、やうやう白くなりゆく。','「やうやう」＝だんだん、しだいに。'],
 jc12:['門を出でて、やがて帰りぬ。','「やがて」＝そのまま、すぐに。文脈で判断する。'],
 jc13:['物音におどろきて起く。','「おどろく」＝はっと気づく、目を覚ます。'],
 jc14:['人々、門の前にてののしる。','「ののしる」＝大声で騒ぐ、評判になる。'],
 jc15:['客をねんごろにもてなす。','「ねんごろなり」＝心をこめて親切だ。'],
 jc16:['あやしき小屋に住む。','「あやし」＝粗末だ、身分が低い、不思議だ等。文脈で判別する。'],
 jc17:['友に別れて、心わびし。','「わびし」＝つらい、心細い。'],
 jc18:['なつかしき人に会ひぬ。','「なつかし」＝親しみが感じられる、心ひかれる。'],
 jc19:['つとめて、山へ出づ。','「つとめて」＝早朝。'],
 jc20:['昔のこと、ふとおぼゆ。','「おぼゆ」＝自然に思われる、感じられる。'],
 jc21:['師にその由をまうす。','「まうす」＝「言ふ」の謙譲語で、申し上げる。'],
 jc22:['帝、かくのたまふ。','「のたまふ」＝「言ふ」の尊敬語で、おっしゃる。'],
 jc23:['翁、姫に文をたまふ。','「たまふ」＝お与えになる等の尊敬語。'],
 jc24:['ここに侍り。','「侍り」＝おります／ございます。謙譲・丁寧の用法を文脈で見る。']
};
const KANBUN_ID={
 jk01:['雨未降。','書き下し：雨、未だ降らず。／「未」＝まだ〜ない。'],
 jk02:['将行。','書き下し：将に行かんとす。／「将」＝今にも〜しようとする。'],
 jk03:['当学。','書き下し：当に学ぶべし。／「当」＝当然〜すべきだ。'],
 jk04:['応知。','書き下し：応に知るべし。／「応」＝きっと〜だろう・〜すべきだ。'],
 jk05:['須学。','書き下し：須らく学ぶべし。／「須」＝ぜひ〜する必要がある。'],
 jk06:['宜休。','書き下し：宜しく休むべし。／「宜」＝〜するのがよい。'],
 jk07:['人生猶夢。','書き下し：人生は猶ほ夢のごとし。／「猶」＝ちょうど〜のようだ。'],
 jk08:['盍学乎。','書き下し：盍ぞ学ばざる。／「盍」＝どうして〜しないのか。'],
 jk09:['勿忘。','書き下し：忘るる勿れ。／「勿」＝〜するな。'],
 jk10:['莫入。','書き下し：入る莫れ。／「莫」＝〜するな。'],
 jk11:['不知其名。','書き下し：其の名を知らず。／「不」＝〜ない。'],
 jk12:['此非人。','書き下し：此れ人に非ず。／「非」＝〜ではない。'],
 jk13:['何懼。','書き下し：何ぞ懼れんや。／反語なら「どうして恐れようか、いや恐れない」。'],
 jk14:['安忘志。','書き下し：安くんぞ志を忘れんや。／反語なら強い否定になる。'],
 jk15:['誰知之。','書き下し：誰か之を知らん。／「誰」を用いた疑問。'],
 jk16:['雨降。故道濡。','書き下し：雨降る。故に道濡る。／「故」＝だから、それゆえ。']
};
const IDIOM_ID={
 ji01:['難しい機械の調整に、担当者も手を焼いている。','「手を焼く」＝扱いに困る。'],
 ji02:['受験勉強に腰を据えて取り組む。','「腰を据える」＝落ち着いて本格的に取り組む。'],
 ji03:['提出期限を忘れないよう、先生から釘を刺された。','「釘を刺す」＝後で問題が起きないよう念を押す。'],
 ji04:['せっかく話がまとまりかけたところで、水を差すような発言が出た。','「水を差す」＝順調な物事のじゃまをする。'],
 ji05:['十年間続いた大会が、今年で幕を下ろした。','「幕を下ろす」＝物事を終える。'],
 ji06:['長年世話になった恩師には、今でも頭が上がらない。','「頭が上がらない」＝恩義などがあって対等に振る舞えない。'],
 ji07:['予定外の出費が重なり、予算から三千円ほど足が出た。','「足が出る」＝予算や収入を超えて不足が生じる。'],
 ji08:['毎日英文を書くことで、表現の腕を磨く。','「腕を磨く」＝技能を高める。'],
 ji09:['「復習が足りない」と言われ、耳が痛かった。','「耳が痛い」＝自分の弱点を指摘され、聞くのがつらい。'],
 ji10:['無事に合格したと聞き、家族は胸をなで下ろした。','「胸をなで下ろす」＝心配がなくなって安心する。'],
 ji11:['仕事の途中で長話をして、油を売っている。','「油を売る」＝仕事を怠けて無駄話などをする。'],
 ji12:['彼は地域の多くの人と知り合いで、顔が広い。','「顔が広い」＝知り合いが多い。'],
 ji13:['彼女は口が堅いので、安心して秘密を相談できる。','「口が堅い」＝秘密を他人に漏らさない。'],
 ji14:['先生は大会を実現するために骨を折った。','「骨を折る」＝苦労して力を尽くす。'],
 ji15:['彼の観察力には、クラスのみんなが一目置いている。','「一目置く」＝相手の能力などを認め、敬意を払う。'],
 ji16:['過去の失敗例も調べ、温故知新の姿勢で新しい改善策を考えた。','「温故知新」＝昔のことを学び、そこから新しい知識や道理を得る。'],
 ji17:['何度も試行錯誤を重ね、最も安定する実験条件を見つけた。','「試行錯誤」＝試みと失敗を繰り返しながら解決法を探す。'],
 ji18:['雪辱を果たすため、選手たちは臥薪嘗胆の日々を送った。','「臥薪嘗胆」＝目的を遂げるため、長く苦労に耐えること。'],
 ji19:['読解力は一朝一夕には身につかない。','「一朝一夕」＝きわめて短い期間。多くは「一朝一夕には〜ない」と使う。'],
 ji20:['最後の一文が加わり、その発表の画竜点睛となった。','「画竜点睛」＝物事を完成させる最後の重要な仕上げ。'],
 ji21:['ノートを飾ることに時間を使い、勉強が進まないのでは本末転倒だ。','「本末転倒」＝大切なことと枝葉のことを取り違える。'],
 ji22:['参加者は異口同音に「この案がよい」と答えた。','「異口同音」＝多くの人が口をそろえて同じことを言う。'],
 ji23:['予定外の質問にも、発表者は臨機応変に答えた。','「臨機応変」＝その場の状況に応じて適切に対応する。'],
 ji24:['二つの案は細部こそ違うが、内容は大同小異だ。','「大同小異」＝細かな違いはあっても、大体は同じ。']
};
const TERM={
 '主語':['鳥が空を飛ぶ。','「鳥が」が主語で、「飛ぶ」の動作主。'],
 '述語':['鳥が空を飛ぶ。','「飛ぶ」が述語で、主語について述べる。'],
 '修飾語':['赤い花が庭に咲く。','「赤い」が名詞「花」を詳しくする。'],
 '接続語':['雨が降った。しかし、試合は行われた。','「しかし」は前後を逆接で結ぶ。'],
 '独立語':['はい、分かりました。','「はい」は他の文節と直接係り受けしない独立語。'],
 '文節':['私は／図書館で／本を／読む。','文を意味のまとまりで区切る。'],
 '単語':['私／は／本／を／読む。','文節をさらに、意味や働きをもつ最小単位に分ける。'],
 '自立語':['静かな町を歩く。','「町」「歩く」などは単独で文節の中心になれる。'],
 '付属語':['私は本を読む。','「は」「を」は単独で文節を作れない付属語。'],
 '活用':['書く→書かない→書きます→書けば。','文中の働きに応じて語形が変化する。'],
 '五段活用':['書かない・書きます・書く・書けば・書け。','「書く」は語尾が複数の段にわたって変化する五段活用。'],
 '上一段活用':['見ない・見ます・見る・見れば・見ろ。','「見る」は上一段活用。'],
 '下一段活用':['食べない・食べます・食べる・食べれば・食べろ。','「食べる」は下一段活用。'],
 'サ行変格活用':['しない・します・する・すれば・しろ。','「する」はサ行変格活用。'],
 'カ行変格活用':['来ない・来ます・来る・来れば・来い。','「来る」はカ行変格活用。'],
 '未然形':['手紙を書かない。','「書か」が未然形で、助動詞「ない」につながる。'],
 '連用形':['手紙を書きます。','「書き」が連用形で、助動詞「ます」につながる。'],
 '終止形':['私は手紙を書く。','文を言い切る「書く」が終止形。'],
 '連体形':['私が書く手紙。','名詞「手紙」を修飾する「書く」が連体形。'],
 '仮定形':['手紙を書けば分かる。','「書け」が仮定形で、接続助詞「ば」につながる。'],
 '命令形':['早く書け。','「書け」が命令形。'],
 '敬語・尊敬語':['先生がおっしゃる。','「おっしゃる」は先生の動作を高める尊敬語。'],
 '敬語・謙譲語':['私が先生に申し上げる。','「申し上げる」は自分側の動作を低め、相手を立てる謙譲語。'],
 '敬語・丁寧語':['私は学生です。','「です」により聞き手に丁寧に述べる。'],
 '同音異義語':['計画を「変える」／家に「帰る」。','音が同じ・近くても、意味と表記が異なる語を文脈で判断する。'],
 '同訓異字':['時間を計る／長さを測る／重さを量る。','同じ訓でも対象によって漢字を使い分ける。'],
 '比喩・直喩':['彼の笑顔は太陽のようだ。','「ようだ」を用いてたとえる直喩。'],
 '比喩・隠喩':['彼はクラスの太陽だ。','「ようだ」などを使わず、直接たとえる隠喩。'],
 '擬人法':['風が窓をたたいている。','人でない「風」を人のように表現している。'],
 '反復法':['走れ、走れ、ゴールまで。','同じ語句を繰り返し、意味やリズムを強調する。'],
 '倒置法':['美しい、その夕焼けは。','通常の語順を入れ替え、印象を強める。'],
 '体言止め':['窓の外に広がる、青い海。','文末を名詞「海」で止め、余韻や強調を生む。'],
 '対句':['学ぶ者は進み、怠る者は退く。','対応する形の表現を並べ、対照やリズムを生む。'],
 '反語':['これほど大切なことを、誰が忘れるだろうか。','疑問の形だが、「誰も忘れない」という強い断定を表す。'],
 '指示語の読解':['新しい図書館ができた。そこには自習室もある。','「そこ」は直前の「新しい図書館」を指す。'],
 '接続語の読解':['十分に練習した。しかし、本番では緊張した。','前後が逆方向なので「しかし」が合う。'],
 '原因と結果':['雨が降ったため、試合が中止になった。','原因＝雨、結果＝試合中止。'],
 '対比':['紙の本は書き込みやすい。一方、電子書籍は持ち運びやすい。','同じ評価軸で違いを整理する。'],
 '言い換え':['「費用を減らす」＝「コストを削減する」。','表現が違っても内容が同じかを確認する。'],
 '事実と意見':['「気温は30度だった」は事実。「今日は暑すぎる」は意見。','検証可能な記述と、評価・判断を含む記述を区別する。'],
 '要約':['「雨で道路が混雑し、到着が遅れた」→「雨による渋滞で遅れた」。','中心情報と因果関係を保ちながら短くする。'],
 '文学・心情':['「返事を書いては消した」という行動から、迷いや不安を読む。','心情は言動や描写を根拠に判断する。'],
 '歴史的仮名遣い':['けふ、都へまゐる。','「けふ」→現代仮名遣い「きょう」。'],
 '古文の主語補完':['姫、文を読みて笑ふ。のち、母に見せたり。','「見せたり」の主語は、前後の動作の流れから姫と考える。'],
 '古文の係り結び':['花ぞ美しき。','係助詞「ぞ」により、結びが連体形「美しき」になる。'],
 '古文の助動詞「けり」':['昔、男ありけり。','「けり」＝過去。「昔、男がいた」。文脈により詠嘆も表す。'],
 '古文の助動詞「つ・ぬ」':['文を書きつ。','「つ」＝完了。「手紙を書き終えた」。文脈により強意も表す。'],
 '古文の助動詞「む」':['われ、明日都へ行かむ。','一人称主語なので「行こう」という意志と判断できる。'],
 '古文の助動詞「べし」':['急ぎ帰るべし。','文脈により「帰るべきだ」など、当然・適当・命令等を表す。'],
 '古文の敬語':['帝、文を御覧ず。','尊敬語「御覧ず」から、動作主が身分の高い人物だと分かる。'],
 '返り点':['見レ山。','レ点に従って返り、書き下しは「山を見る」。'],
 '送り仮名':['書ヲ読ム。','「読ム」の送り仮名を補い、書き下しでは「書を読む」とする。'],
 '置き字':['学於師。','「於」は置き字。書き下しは「師に学ぶ」で、「於」そのものは読まない。'],
 '使役形':['使人学。','書き下し：人をして学ばしむ。＝人に学ばせる。'],
 '受身形':['見笑於人。','書き下し：人に笑はる。＝人に笑われる。'],
 '否定形':['不知其名。','書き下し：其の名を知らず。＝その名を知らない。'],
 '疑問形':['何求。','書き下し：何をか求む。＝何を求めるのか。'],
 '比較形':['百聞不如一見。','書き下し：百聞は一見に如かず。＝何度も聞くより一度見る方がよい。']
};
const KANJI={
 '踏襲':'新しい制度は、基本的な考え方を前年度から踏襲している。','普遍':'人を尊重するという考えには、時代を超えた普遍的な価値がある。','顕著':'対策を始めてから、誤答の減少が顕著に表れた。','遂行':'調査班は、決められた手順に従って任務を遂行した。','懸念':'大雨による河川の増水が懸念されている。','促進':'鉄道の整備は地域間の交流を促進した。','抑制':'節電の工夫によって電力消費を抑制する。','顧慮':'相手の事情を顧慮して、締切を一日延ばした。','配慮':'周囲の安全に配慮して実験を行った。','示唆':'この結果は、別の要因が影響した可能性を示唆している。',
 '把握':'まず文章全体の構成を把握してから設問を読む。','概念':'比例の概念を具体例と結び付けて理解する。','論拠':'自分の主張を支える十分な論拠を示す。','妥当':'複数の資料に照らすと、その判断は妥当だといえる。','相違':'二つの資料には、数値の示し方に相違がある。','対照':'明るい前半と暗い後半が対照をなしている。','推移':'グラフから人口の推移を読み取る。','変遷':'交通手段の変遷を時代順に整理する。','契機':'留学を契機に、外国文化への関心が高まった。','端緒':'一つの証言が事件解明の端緒となった。',
 '脈絡':'前後の脈絡を確かめれば、この語の意味が分かる。','趣旨':'案内文の趣旨を一文でまとめる。','趣向':'来場者を楽しませるため、展示に新しい趣向を凝らした。','簡潔':'結論を二文で簡潔に説明する。','冗長':'同じ内容の繰り返しを削ると、冗長な文章が読みやすくなった。','抽象':'「自由」のような抽象的な概念は、具体例を使うと理解しやすい。','具体':'理由だけでなく、具体的な例も挙げて説明する。','克服':'苦手な図形問題を反復して弱点を克服した。','是正':'地域間の格差を是正するための政策が検討された。','是非':'計画を実施するかどうか、その是非を話し合う。',
 '擁護':'弁護士は依頼人の権利を擁護する。','侵害':'他人の権利を侵害してはならない。','権威':'権威のある人物の意見でも、根拠を確かめる必要がある。','権限':'担当者に、作業に必要な権限を与える。','規範':'法律や道徳は、社会生活の規範となる。','慣習':'地域に古くから伝わる慣習を調べた。','風潮':'環境への配慮を重視する風潮が広がっている。','風土':'温暖な気候と海に囲まれた風土が、その文化に影響した。','矛盾':'その説明は前の発言と矛盾している。','整合':'実験結果が仮説と整合しているか確かめる。',
 '網羅':'この資料集は入試に必要な重要事項を網羅している。','包括':'児童の学習と生活を包括的に支援する。','排除':'条件を一つずつ確認し、誤差の原因を排除する。','排他的':'異なる意見を認めない排他的な態度は議論を狭める。','寛容':'異なる考え方にも寛容な姿勢で耳を傾ける。','寛大':'彼は後輩の失敗に対して寛大な態度を示した。','慎重':'証拠が少ない段階では結論を慎重に出すべきだ。','迅速':'災害時には迅速な情報共有が必要だ。','緻密':'条件を一つずつ確認する緻密な計画を立てた。','精緻':'研究者はデータをもとに精緻な分析を行った。',
 '漠然':'将来への漠然とした不安を、具体的な課題に分けて考えた。','曖昧':'主語が省略されているため、文の意味が曖昧になっている。','明瞭':'結論と理由を分けると、文章の論理が明瞭になる。','妨げる':'睡眠不足は集中を妨げることがある。','阻害':'過度な通知は学習への集中を阻害する。','寄与':'公共交通の整備は地域の活性化に寄与する。','貢献':'その研究成果は医療技術の向上に貢献した。','享受':'私たちは社会のさまざまな公共サービスを享受している。','享楽':'享楽だけを追い求める生活を批判する文章だった。','介入':'政府が市場に介入する場合、その目的と影響を考える必要がある。',
 '媒介':'言葉を媒介として、人は考えを他者に伝える。','淘汰':'環境に適応した形質が、自然淘汰によって残りやすくなる。','選別':'回収した資源ごみを種類ごとに選別する。','偏在':'石油資源は世界の特定地域に偏在している。','均衡':'需要と供給の均衡が崩れると、価格が変動することがある。','均一':'溶液を均一にするため、よくかき混ぜた。','拡充':'自習スペースを拡充して、利用できる席を増やした。','縮小':'人口減少に伴い、路線の規模が縮小された。','逡巡':'彼は答えを言うべきか逡巡した。','躊躇':'分からない点があれば、質問することを躊躇しない。',
 '錯覚':'遠近法によって、実際より奥行きがあるように錯覚する。','錯誤':'計算過程の小さな錯誤が最終結果を変えた。','帰結':'前提が誤っていれば、そこから導かれる帰結も信頼できない。','帰納':'複数の具体例から共通点を見つけ、帰納的に結論を導く。','演繹':'一般的な法則を個別の事例に当てはめ、演繹的に考える。','前提':'その議論は「資料が正確である」という前提に立っている。','仮説':'観察結果を説明する仮説を立て、実験で確かめる。','検証':'仮説が正しいか、追加のデータで検証する。','考察':'実験結果から分かることを、根拠とともに考察する。','洞察':'複数の資料を比較することで、問題の本質への洞察が深まった。'
};
function readingSentences(){if(typeof DATA==='undefined')return[];const out=[];for(const sc of (DATA.readingScenarios||[])){for(const x of [...(sc.facts||[]),sc.lesson,sc.inference,sc.extension]){if(!x)continue;for(const s of String(x).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[])if(clean(s))out.push(clean(s))}}return out}
let sentenceCache=null;
function sourceSentence(word){const w=clean(word).toLowerCase();if(!w)return'';if(!sentenceCache)sentenceCache=readingSentences();const escaped=w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),re=new RegExp(`(^|[^A-Za-z])${escaped}(?=$|[^A-Za-z])`,'i');return sentenceCache.find(s=>re.test(s))||''}
function japaneseExample(q){const src=q?.source||{},id=String(src.id||'');if(CLASSICAL_ID[id])return{title:'古文の例文',text:CLASSICAL_ID[id][0],sub:CLASSICAL_ID[id][1]};if(KANBUN_ID[id])return{title:'漢文の用例',text:KANBUN_ID[id][0],sub:KANBUN_ID[id][1]};if(IDIOM_ID[id])return{title:id>='ji16'?'四字熟語の例文':'慣用句の例文',text:IDIOM_ID[id][0],sub:IDIOM_ID[id][1]};const correct=q?.choices?.[q.answerIndex]?.text||'',keys=[src.prompt,correct,String(src.prompt||'').replace(/^次の説明に最も対応する語句・法則を選ぶ：/,'')].map(clean);for(const k of keys)if(TERM[k]){const area=src.area||String(q.context||'');return{title:String(area).includes('classical')?'古文の例文':String(area).includes('kanbun')?'漢文の用例':'用例',text:TERM[k][0],sub:TERM[k][1]}}return null}
function infoFor(q){if(!q)return null;const src=q.source||{};if(q.type==='vocab'||String(q.id||'').startsWith('vocab:')){let text='';if(src.source==='aa23-original-gloss'||placeholder(src.example))text=sourceSentence(src.word);else text=src.example||sourceSentence(src.word);return text?{title:'英単語の例文',text:clean(text),sub:src.word&&src.meaning?`${src.word} ＝ ${src.meaning}`:''}:null}if(q.type==='kanji'||String(q.id||'').startsWith('kanji:')||src.area==='kanji'){let k=src;if(typeof DATA!=='undefined'&&(!k.word||!k.reading))k=(DATA.kanji||[]).find(x=>x.word===src.prompt||x.word===src.word||String(x.id)===String(src.id))||k;const word=clean(k.word||src.prompt),text=KANJI[word]||(!placeholder(k.example)&&/[。！？]$/.test(clean(k.example||''))?clean(k.example):'');return text?{title:'漢字・語彙の例文',text,sub:k.reading?`${word}（${k.reading}）＝ ${k.meaning||src.answer||''}`:(k.meaning?`${word} ＝ ${k.meaning}`:'')}:null}if(src.subject==='japanese'||q.type==='japanese')return japaneseExample(q);return null}
function exampleBox(inf){if(!inf)return'';return `<div class="aaExampleBoxV2"><div class="aaExampleTitleV2">${esc(inf.title)}</div><div class="aaExampleTextV2">${esc(inf.text)}</div>${inf.sub?`<div class="aaExampleSubV2">${esc(inf.sub)}</div>`:''}</div>`}
function ensureCSS(){if(document.getElementById('aa-example-v2-css'))return;const s=document.createElement('style');s.id='aa-example-v2-css';s.textContent='.aaExampleBox{display:none!important}.aaExampleBoxV2{display:block;margin-top:12px;padding:12px 13px;border-radius:12px;background:color-mix(in srgb,var(--card) 88%,var(--blue2));border:1px solid color-mix(in srgb,var(--blue) 20%,var(--line))}.aaExampleTitleV2{font-size:10px;letter-spacing:.08em;font-weight:900;color:var(--blue);margin-bottom:6px}.aaExampleTextV2{font-size:14px;line-height:1.8;font-weight:750}.aaExampleSubV2{font-size:11px;line-height:1.7;color:var(--sub);margin-top:6px}';document.head.appendChild(s)}
function rowExample(id,prompt,answer,area){if(CLASSICAL_ID[id])return CLASSICAL_ID[id];if(KANBUN_ID[id])return KANBUN_ID[id];if(IDIOM_ID[id])return IDIOM_ID[id];for(const k of [prompt,answer])if(TERM[clean(k)])return TERM[clean(k)];return null}
function suffix(inf){return inf?` 【例文】${inf[0]} 【意味・ポイント】${inf[1]}`:''}
function patchJapaneseBanks(){const cur=window.AA_V2_CURRICULUM?.japanese;if(Array.isArray(cur))for(const row of cur){if(!Array.isArray(row))continue;row[4]=stripLegacy(row[4]);const inf=rowExample(String(row[0]),row[2],row[3],row[1]);if(inf)row[4]+=suffix(inf)}const bank=window.AA_V2_TEST_API?.banks?.japanese;if(Array.isArray(bank))for(const row of bank){row.explanation=stripLegacy(row.explanation);const inf=rowExample(String(row.id),row.prompt,row.answer,row.area);if(inf)row.explanation+=suffix(inf)}}
function patchVocab(){if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab))return;sentenceCache=null;for(const v of DATA.vocab){if(!v?.word)continue;if(v.source==='aa23-original-gloss'||placeholder(v.example)){const ex=sourceSentence(v.word);if(ex){v.example=ex;const low=String(v.word).toLowerCase(),pos=ex.toLowerCase().indexOf(low);if(pos>=0)v.cloze=ex.slice(0,pos)+'_____'+ex.slice(pos+low.length)}}}}
function sanitizeQ(q){if(!q||typeof q!=='object')return q;return{...q,explanation:stripLegacy(q.explanation),choices:Array.isArray(q.choices)?q.choices.map(c=>({...c,reason:stripLegacy(c.reason)})):q.choices}}
function patchFeedback(){if(window.__AA_EXAMPLE_FEEDBACK_PATCHED_V2__)return;const base=window.feedbackHTML;if(typeof base!=='function')return;window.__AA_EXAMPLE_FEEDBACK_PATCHED_V2__=true;window.feedbackHTML=function(q,a){ensureCSS();const cleanQ=sanitizeQ(q),html=base(cleanQ,a),inf=infoFor(cleanQ);return html+exampleBox(inf)}}
function audit(){const gloss=typeof DATA==='undefined'?[]:(DATA.vocab||[]).filter(v=>v?.source==='aa23-original-gloss'),withSource=gloss.filter(v=>!!sourceSentence(v.word)).length;return{version:'2.0.0',quality:'curated-or-source-sentence-only',kanjiCurated:Object.keys(KANJI).length,classicalCurated:Object.keys(CLASSICAL_ID).length,kanbunCurated:Object.keys(KANBUN_ID).length,idiomCurated:Object.keys(IDIOM_ID).length,termCurated:Object.keys(TERM).length,glossWords:gloss.length,glossWithReadingSentence:withSource}}
function patchAll(){ensureCSS();patchVocab();patchJapaneseBanks();patchFeedback();window.AA_EXPLANATION_EXAMPLES={version:'2.0.0',quality:'curated-or-source-sentence-only',infoFor,sourceSentence,audit};}
patchAll();document.addEventListener('aa:v23ready',patchAll);setTimeout(patchAll,400);setTimeout(patchAll,1400);
})();