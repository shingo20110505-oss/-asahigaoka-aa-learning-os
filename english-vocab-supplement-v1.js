(()=>{'use strict';
if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab))return;
const VERSION='1.0.0';
const raw=`en-sup-w0001|accomplish|成し遂げる|v|entrance|The team worked together to accomplish its goal.
en-sup-w0002|advantage|利点、有利な点|n|entrance|One advantage of the plan is its low cost.
en-sup-w0003|disadvantage|欠点、不利な点|n|entrance|A disadvantage of the route is heavy traffic.
en-sup-w0004|approach|方法、取り組み方|n|entrance|The students tried a different approach to the problem.
en-sup-w0005|attitude|態度、考え方|n|entrance|A positive attitude helped the group continue.
en-sup-w0006|audience|聴衆、観客|n|entrance|The speaker changed the explanation for the audience.
en-sup-w0007|challenge|課題、挑戦|n|entrance|Reducing waste was a challenge for the school.
en-sup-w0008|communicate|伝える、意思を通わせる|v|entrance|Pictures can help people communicate an idea clearly.
en-sup-w0009|contribute|貢献する、一因となる|v|entrance|Small actions can contribute to a better environment.
en-sup-w0010|culture|文化|n|entrance|The festival is an important part of local culture.
en-sup-w0011|describe|説明する、描写する|v|entrance|Describe the difference between the two graphs.
en-sup-w0012|develop|発達させる、開発する|v|entrance|The group developed a new method after the test.
en-sup-w0013|education|教育|n|entrance|Technology can support education in many ways.
en-sup-w0014|establish|設立する、確立する|v|entrance|The club established a clear rule for the project.
en-sup-w0015|evaluate|評価する|v|entrance|Students evaluated the evidence before deciding.
en-sup-w0016|exist|存在する|v|entrance|Several possible explanations may exist.
en-sup-w0017|expand|広げる、拡大する|v|entrance|The survey was expanded to include more people.
en-sup-w0018|feature|特徴、特色|n|entrance|This feature makes the device easier to use.
en-sup-w0019|impact|影響|n|entrance|The change had a positive impact on the community.
en-sup-w0020|issue|問題、論点|n|entrance|The article discusses an important environmental issue.
en-sup-w0021|maintain|維持する、保つ|v|entrance|The school must maintain a safe learning environment.
en-sup-w0022|opportunity|機会|n|entrance|The event gave students an opportunity to meet local people.
en-sup-w0023|participate|参加する|v|entrance|Many students participated in the volunteer activity.
en-sup-w0024|perspective|観点、見方|n|entrance|The story presents the issue from a different perspective.
en-sup-w0025|policy|方針、政策|n|entrance|The city introduced a new recycling policy.
en-sup-w0026|population|人口|n|entrance|The town's population has changed over time.
en-sup-w0027|positive|前向きな、好ましい|adj|entrance|The new system produced a positive result.
en-sup-w0028|negative|否定的な、好ましくない|adj|entrance|The survey also included negative opinions.
en-sup-w0029|principle|原則、基本的な考え|n|entrance|The same principle can be used in another situation.
en-sup-w0030|process|過程、手順|n|entrance|Learning is a process that takes time.
en-sup-w0031|protect|守る、保護する|v|entrance|The project aims to protect the local river.
en-sup-w0032|provide|提供する|v|entrance|The graph provides useful information.
en-sup-w0033|recognize|認識する、見分ける|v|entrance|Readers should recognize the writer's main point.
en-sup-w0034|region|地域|n|entrance|This plant grows well in a warm region.
en-sup-w0035|respond|応答する、反応する|v|entrance|The school responded to the students' suggestions.
en-sup-w0036|responsibility|責任|n|entrance|Each member has responsibility for one part of the project.
en-sup-w0037|significant|重要な、かなりの|adj|entrance|The data show a significant change.
en-sup-w0038|society|社会|n|entrance|Technology has changed modern society.
en-sup-w0039|structure|構造、構成|n|entrance|The structure of the article makes the argument clear.
en-sup-w0040|suggest|提案する、示唆する|v|entrance|The results suggest that the new method is effective.
en-sup-w0041|tend|〜する傾向がある|v|entrance|People tend to remember information connected to a story.
en-sup-w0042|tradition|伝統|n|entrance|The town is trying to preserve a local tradition.
en-sup-w0043|variety|多様性、さまざまな種類|n|entrance|The library offers a variety of learning materials.
en-sup-w0044|benefit|利益、恩恵|n|entrance|The change brought a benefit to both students and teachers.
en-sup-w0045|consume|消費する|v|entrance|Old machines often consume more electricity.
en-sup-w0046|consequence|結果、影響|n|entrance|The decision had an unexpected consequence.
en-sup-w0047|contrast|対照、対比する|n/v|entrance|The contrast between the two plans is clear.
en-sup-w0048|indicate|示す|v|entrance|The numbers indicate a gradual increase.
en-sup-w0049|interpret|解釈する|v|entrance|Different readers may interpret the result differently.
en-sup-w0050|promote|促進する、広める|v|entrance|The campaign promotes safe bicycle use.
en-sup-w0051|represent|表す、代表する|v|entrance|Each symbol represents a different category.
en-sup-w0052|sustainable|持続可能な|adj|entrance|The group looked for a more sustainable solution.
en-sup-w0053|typical|典型的な|adj|entrance|This is a typical example of the pattern.
en-sup-w0054|unique|独自の、唯一の|adj|entrance|Each region has a unique culture.
en-sup-w0055|various|さまざまな|adj|entrance|The students considered various possible causes.
en-sup-w0056|whereas|一方で、〜であるのに対して|conj|entrance|The first plan was cheap, whereas the second was more reliable.
en-sup-w0057|otherwise|そうでなければ、それ以外は|adv|entrance|Follow the instructions; otherwise, the result may be unclear.
en-sup-w0058|therefore|それゆえ、したがって|adv|entrance|The evidence was weak; therefore, the group tested the idea again.
en-sup-w0059|moreover|そのうえ、さらに|adv|entrance|The method was simple; moreover, it saved time.
en-sup-w0060|nevertheless|それにもかかわらず|adv|entrance|The task was difficult; nevertheless, the team continued.
en-sup-w0061|consequently|その結果|adv|entrance|The route was closed; consequently, the bus arrived late.
en-sup-w0062|meanwhile|その間に、一方で|adv|entrance|One group collected data; meanwhile, the other prepared the graph.
en-sup-p0001|agree with|〜に賛成する、〜と意見が合う|phrase|phrase|I agree with your idea.
en-sup-p0002|arrive at|〜に到着する（比較的小さな場所）|phrase|phrase|We arrived at the station before noon.
en-sup-p0003|arrive in|〜に到着する（都市・国など）|phrase|phrase|They arrived in Japan in April.
en-sup-p0004|ask for|〜を求める、頼む|phrase|phrase|She asked for more information.
en-sup-p0005|be afraid of|〜を恐れている|phrase|phrase|Some students are afraid of making mistakes.
en-sup-p0006|be based on|〜に基づいている|phrase|phrase|The conclusion is based on the survey results.
en-sup-p0007|be covered with|〜で覆われている|phrase|phrase|The ground was covered with snow.
en-sup-p0008|be different from|〜と異なる|phrase|phrase|This result is different from the first one.
en-sup-p0009|be familiar with|〜をよく知っている|phrase|phrase|Most students are familiar with this rule.
en-sup-p0010|be famous for|〜で有名である|phrase|phrase|The town is famous for its traditional festival.
en-sup-p0011|be full of|〜でいっぱいである|phrase|phrase|The park was full of visitors.
en-sup-p0012|be good at|〜が得意である|phrase|phrase|She is good at explaining difficult ideas.
en-sup-p0013|be good for|〜に良い|phrase|phrase|Regular exercise is good for your health.
en-sup-p0014|be known for|〜で知られている|phrase|phrase|The area is known for its beautiful coast.
en-sup-p0015|be made from|〜から作られている（原料が変化）|phrase|phrase|Paper is made from wood.
en-sup-p0016|be made of|〜でできている（材料が分かる）|phrase|phrase|The desk is made of wood.
en-sup-p0017|be pleased with|〜に満足している、喜んでいる|phrase|phrase|The teacher was pleased with the result.
en-sup-p0018|be proud of|〜を誇りに思う|phrase|phrase|They are proud of their local culture.
en-sup-p0019|be ready for|〜の準備ができている|phrase|phrase|The team is ready for the next test.
en-sup-p0020|be responsible for|〜に責任がある|phrase|phrase|Each member is responsible for one task.
en-sup-p0021|be satisfied with|〜に満足している|phrase|phrase|The students were satisfied with the new plan.
en-sup-p0022|be similar to|〜に似ている|phrase|phrase|This pattern is similar to the previous one.
en-sup-p0023|be surprised at|〜に驚く|phrase|phrase|We were surprised at the sudden change.
en-sup-p0024|be tired of|〜に飽きている、うんざりしている|phrase|phrase|He was tired of repeating the same mistake.
en-sup-p0025|be worried about|〜を心配している|phrase|phrase|Many people are worried about climate change.
en-sup-p0026|belong to|〜に所属する、〜のものである|phrase|phrase|This book belongs to the school library.
en-sup-p0027|break down|故障する、分解する|phrase|phrase|The old machine broke down during the test.
en-sup-p0028|bring up|話題に出す、育てる|phrase|phrase|She brought up an important question.
en-sup-p0029|care about|〜を気にかける|phrase|phrase|Students care about the future of their town.
en-sup-p0030|come across|偶然出会う、見つける|phrase|phrase|I came across an interesting article.
en-sup-p0031|come from|〜の出身である、〜から来る|phrase|phrase|This idea comes from an earlier study.
en-sup-p0032|come true|実現する|phrase|phrase|Her dream finally came true.
en-sup-p0033|deal with|〜を扱う、対処する|phrase|phrase|The report deals with a local environmental problem.
en-sup-p0034|depend on|〜に依存する、〜次第である|phrase|phrase|The result depends on the conditions.
en-sup-p0035|find out|調べて分かる|phrase|phrase|The students tried to find out the cause.
en-sup-p0036|get along with|〜と仲良くやっていく|phrase|phrase|He gets along with his classmates.
en-sup-p0037|get rid of|〜を取り除く|phrase|phrase|The school tried to get rid of unnecessary waste.
en-sup-p0038|give up|あきらめる|phrase|phrase|Do not give up after one failure.
en-sup-p0039|grow up|成長する、大人になる|phrase|phrase|She grew up in a small town.
en-sup-p0040|hear from|〜から便りをもらう|phrase|phrase|I heard from my friend yesterday.
en-sup-p0041|hear of|〜について聞いたことがある|phrase|phrase|Have you ever heard of this tradition?
en-sup-p0042|keep on|〜し続ける|phrase|phrase|The group kept on collecting data.
en-sup-p0043|look after|〜の世話をする|phrase|phrase|Students look after the plants every day.
en-sup-p0044|look for|〜を探す|phrase|phrase|They looked for a better solution.
en-sup-p0045|look like|〜のように見える|phrase|phrase|The cloud looks like a bird.
en-sup-p0046|pay attention to|〜に注意を払う|phrase|phrase|Pay attention to the change in the graph.
en-sup-p0047|pick up|拾う、身につける、迎えに行く|phrase|phrase|She picked up useful expressions from the book.
en-sup-p0048|put off|延期する|phrase|phrase|The event was put off because of the storm.
en-sup-p0049|put on|身につける、上演する|phrase|phrase|The students put on a short play.
en-sup-p0050|run out of|〜を使い果たす|phrase|phrase|The team ran out of paper.
en-sup-p0051|take care of|〜の世話をする、〜に対処する|phrase|phrase|He takes care of the school garden.
en-sup-p0052|take place|行われる、起こる|phrase|phrase|The festival takes place every summer.
en-sup-p0053|think about|〜について考える|phrase|phrase|Think about the evidence before you answer.
en-sup-p0054|turn into|〜に変わる、〜に変える|phrase|phrase|The old building was turned into a library.
en-sup-p0055|wait for|〜を待つ|phrase|phrase|We waited for the bus for ten minutes.
en-sup-p0056|worry about|〜を心配する|phrase|phrase|Do not worry about one small mistake.
en-sup-p0057|at first|最初は|phrase|phrase|At first, the students trusted the first explanation.
en-sup-p0058|at least|少なくとも|phrase|phrase|At least three groups joined the project.
en-sup-p0059|at last|ついに|phrase|phrase|At last, the team found a workable solution.
en-sup-p0060|because of|〜のために、〜が原因で|phrase|phrase|The game was canceled because of the rain.
en-sup-p0061|by mistake|間違って|phrase|phrase|I deleted the file by mistake.
en-sup-p0062|by the way|ところで|phrase|phrase|By the way, did you check the new schedule?
en-sup-p0063|for example|例えば|phrase|phrase|Some resources, for example water, must be used carefully.
en-sup-p0064|for the first time|初めて|phrase|phrase|She visited the museum for the first time.
en-sup-p0065|from now on|これからは|phrase|phrase|From now on, we will record the results every day.
en-sup-p0066|in addition|さらに、加えて|phrase|phrase|The plan is cheap. In addition, it saves time.
en-sup-p0067|in addition to|〜に加えて|phrase|phrase|In addition to the graph, the report includes interviews.
en-sup-p0068|in fact|実際は|phrase|phrase|The task looked easy, but in fact it was difficult.
en-sup-p0069|in front of|〜の前に|phrase|phrase|Many students waited in front of the entrance.
en-sup-p0070|in the end|結局、最後には|phrase|phrase|In the end, the group changed its plan.
en-sup-p0071|in the future|将来は|phrase|phrase|The city hopes to reduce waste in the future.
en-sup-p0072|in this way|このようにして|phrase|phrase|In this way, the team improved the system.
en-sup-p0073|on the other hand|一方で|phrase|phrase|The first plan is cheaper. On the other hand, the second is safer.
en-sup-p0074|on time|時間どおりに|phrase|phrase|The train arrived on time.
en-sup-p0075|right away|すぐに|phrase|phrase|The students reported the problem right away.
en-sup-p0076|so far|今までのところ|phrase|phrase|So far, the new method has worked well.
en-sup-p0077|such as|〜のような|phrase|phrase|Renewable energy includes sources such as solar power.
en-sup-p0078|thanks to|〜のおかげで|phrase|phrase|Thanks to the new rule, fewer mistakes occurred.
en-sup-p0079|one another|お互いに|phrase|phrase|The members helped one another.
en-sup-p0080|each other|お互いに|phrase|phrase|The two groups compared their results with each other.
en-sup-p0081|no longer|もはや〜ない|phrase|phrase|The old rule is no longer necessary.
en-sup-p0082|more and more|ますます多くの、ますます|phrase|phrase|More and more people use the service.
en-sup-p0083|as soon as|〜するとすぐに|phrase|phrase|Call me as soon as you arrive.
en-sup-p0084|as long as|〜する限り|phrase|phrase|You can use the room as long as you follow the rules.
en-sup-p0085|as far as|〜する限りでは、〜まで|phrase|phrase|As far as we know, the result is reliable.
en-sup-p0086|the same as|〜と同じ|phrase|phrase|The second result was the same as the first.
en-sup-p0087|even if|たとえ〜でも|phrase|phrase|Even if the task is difficult, keep trying.
en-sup-p0088|even though|〜だけれども|phrase|phrase|Even though it was raining, the event continued.
en-sup-p0089|rather than|〜ではなく、むしろ|phrase|phrase|The group checked the evidence rather than guessing.
en-sup-p0090|whether or not|〜かどうかにかかわらず|phrase|phrase|The rule applies whether or not the room is busy.
en-sup-p0091|be about to|まさに〜しようとしている|phrase|phrase|The train is about to leave.
en-sup-p0092|be able to|〜することができる|phrase|phrase|Students were able to solve the problem.
en-sup-p0093|have to|〜しなければならない|phrase|phrase|We have to finish the work today.
en-sup-p0094|used to|以前は〜したものだ|phrase|phrase|There used to be a small park here.
en-sup-p0095|would like to|〜したい|phrase|phrase|I would like to learn more about the project.
en-sup-p0096|out of|〜の外へ、〜のうち|phrase|phrase|Three out of five students chose the first plan.
en-sup-p0097|in common|共通して|phrase|phrase|The two ideas have several points in common.
en-sup-p0098|in danger|危険な状態で|phrase|phrase|Some local species are in danger.
en-sup-p0099|in detail|詳しく|phrase|phrase|The report explains the method in detail.
en-sup-p0100|in general|一般に|phrase|phrase|In general, the second method was more reliable.
en-sup-p0101|in particular|特に|phrase|phrase|One result in particular surprised the students.
en-sup-p0102|in return|お返しに|phrase|phrase|She helped me, so I helped her in return.
en-sup-p0103|in time|間に合って|phrase|phrase|We arrived in time for the meeting.
en-sup-p0104|little by little|少しずつ|phrase|phrase|The situation improved little by little.
en-sup-p0105|once again|もう一度|phrase|phrase|The group tested the idea once again.
en-sup-p0106|over and over|何度も繰り返して|phrase|phrase|He practiced the speech over and over.
en-sup-p0107|take advantage of|〜を活用する|phrase|phrase|Students took advantage of the available data.
en-sup-p0108|take turns|交代でする|phrase|phrase|The members took turns reading the results.
en-sup-p0109|work on|〜に取り組む|phrase|phrase|The class worked on a local research project.`;
const reserved=new Set(["take part in","be interested in","as a result","instead of","not only a but also b","in order to","according to","be likely to","as well as","make a difference"]);
const norm=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
const rows=raw.trim().split('\n').map(line=>{const [id,word,meaning,pos,level,example]=line.split('|');return{id,word,meaning,pos,level,example,family:[],category:pos==='phrase'?'phrase':'word',tags:['aichi-entrance','supplement-v1'],qualityChecked:true,source:'rise-en-supplement-v1'}});
const existingTerms=new Set(DATA.vocab.map(v=>norm(v.word)));
const existingIds=new Set(DATA.vocab.map(v=>String(v.id)));
const added=[],skipped=[];
for(const row of rows){
 const key=norm(row.word);
 if(!row.id||!key||!row.meaning||!row.example||existingIds.has(row.id)||existingTerms.has(key)||reserved.has(key)){skipped.push({id:row.id,word:row.word,reason:existingTerms.has(key)?'existing-term':reserved.has(key)?'native-collocation':existingIds.has(row.id)?'existing-id':'invalid'});continue}
 row.cloze=row.example.replace(new RegExp(row.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'_____');
 DATA.vocab.push(row);existingIds.add(row.id);existingTerms.add(key);added.push(row.id);
 if(row.pos!=='phrase'&&typeof READING_GLOSSARY!=='undefined'&&!READING_GLOSSARY[key])READING_GLOSSARY[key]=row.meaning;
}
window.RISE_ENGLISH_SUPPLEMENT_V1=Object.freeze({version:VERSION,candidates:rows.length,added:added.length,skipped:skipped.length,addedIds:Object.freeze(added.slice()),skipped:Object.freeze(skipped.slice())});
})();