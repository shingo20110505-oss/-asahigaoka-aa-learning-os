// Original examples. These explain reading strategies; they are not copied exam passages.
export const readingGuide = [
  {title:'まず主語と動詞をつかむ', example:'The book on the desk belongs to Mei.', meaning:'机の上の本はメイのものです。', explanation:'主語は The book、動詞は belongs。「机の上の」という説明 on the desk をいったん外すと、文の骨組みが見えます。長い名詞のまとまりを、別の文と取り違えないようにします。'},
  {title:'関係代名詞の説明を戻す', example:'The bag that I bought yesterday is blue.', meaning:'私が昨日買ったかばんは青いです。', explanation:'that I bought yesterday は直前の The bag を説明しています。文全体の主語は The bag、動詞は is。関係代名詞の内側と外側で、主語・動詞を分けて読みます。'},
  {title:'it / they / this の中身を言う', example:'Aya put the apples in a box. They were still green.', meaning:'アヤはりんごを箱に入れました。りんごはまだ青かったのです。', explanation:'They は複数なので、この文では the apples を指します。this は直前の出来事全体を指すこともあります。近い単語に機械的につなげず、数・意味・前後関係を確認します。'},
  {title:'対比の前後を一組にする', example:'The bus was cheap. However, it took much longer.', meaning:'バスは安かったのですが、ずっと長い時間がかかりました。', explanation:'前半の長所「安い」と後半の短所「時間がかかる」が対比されています。however の直後だけを見るのではなく、何と何を比べているのかを短く書きます。but・although・instead も前後を確認する手がかりです。'},
  {title:'理由と結果の向きを確認する', example:'We stayed inside because the rain was heavy.', meaning:'雨が激しかったので、私たちは屋内にいました。', explanation:'because 以下が理由、stayed inside が結果です。結果が先に書かれていても、原因と取り違えないようにします。therefore は前の内容を受けた結果や結論の手がかりです。'},
  {title:'比較の基準・数・否定を落とさない', example:'This year, fewer students came by bus than last year.', meaning:'今年は、昨年よりバスで来た生徒が少なかったです。', explanation:'比較対象は this year と last year、比べる量は生徒の「人数」です。割合を示してはいません。more / fewer / less の対象、not / only / all / some の範囲を確かめてから、表やグラフと対応させます。'},
  {title:'受け身と時の流れを分けて読む', example:'The bridge was built in 1980 and has been used since then.', meaning:'その橋は1980年に建設され、それ以来使われています。', explanation:'was built は過去の受け身、has been used は現在完了の受け身です。建設された時点と、そこから現在まで続く使用を区別します。since はこの文では継続の始点を表します。'},
  {title:'選択肢より先に根拠をつかむ', example:'Emi tried the new route, but she returned to the old one because it was safer.', meaning:'エミは新しい道を試しましたが、より安全だったので元の道に戻りました。', explanation:'「元の道に戻った理由」なら、because 以下が直接の根拠です。本文と同じ語があるだけで選ばず、誰が・何を・なぜ、そして否定や条件が一致しているかを確かめます。'}
];
export const paragraphRoles = ['未分類', '導入・問い', '主張・要点', '理由・根拠', '具体例', '対比・転換', '結果・まとめ', '出来事・心情'];
