(()=>{'use strict';
if(window.__AA_READING_NATURAL_V2__)return;window.__AA_READING_NATURAL_V2__=true;
if(typeof DATA==='undefined'||!Array.isArray(DATA.readingScenarios))return;

const bannedIds=/^v23r\d+$/;
const generated=DATA.readingScenarios.filter(sc=>bannedIds.test(String(sc.id||'')));
const bySetting=new Map();
for(const sc of generated){
  const key=String(sc.setting||'').trim();
  if(!key||bySetting.has(key))continue;
  const copy={...sc};
  copy.id='nat-core-'+String(bySetting.size+1).padStart(2,'0');
  copy.title=String(sc.title||key).split(' — ')[0];
  copy.genre=['report','experiment','expository','report'][bySetting.size%4];
  copy.naturalCore=(sc.facts||[]).slice(0,3);
  const a=copy.naturalCore;
  copy.facts=[a[0]||'',a[1]||'',a[1]||'',a[2]||'',a[2]||''];
  copy.extension='';
  copy.origin='curated-from-v23-core';
  bySetting.set(key,copy);
}
DATA.readingScenarios=DATA.readingScenarios.filter(sc=>!bannedIds.test(String(sc.id||'')));

const EXTRA={
'library seating':[
  'The class did not decide that one part of the library was best for every kind of work. Students needing quiet work still preferred the seats near the entrance.',
  'The result led to a simple change: the library marked some seats for quiet individual work and others for short group tasks.'
],
'school bus':[
  'The earlier bus did not solve every delay, but it made missed connections much less common. Most students said that five extra minutes in the morning were acceptable.',
  'The school kept the new time and continued to check traffic during winter, when the roads could be slower.'
],
'recycling station':[
  'Some people still read the longer instruction board, especially when they had an unusual item. For common items, however, the picture above the bin was easier to use.',
  'The town kept both kinds of information instead of choosing only one.'
],
'museum route':[
  'The small room itself did not change. The important change came at the moment of choosing a direction.',
  'After the arrow was added, more visitors entered the room without asking staff for help.'
],
'plant growth':[
  'The students were surprised because they had expected the largest amount to produce the tallest plants. Too much fertilizer, however, did not help the plants in their test.',
  'They repeated the test before writing their report.'
],
'sleep survey':[
  'The class was careful not to say that sleep alone caused every score difference. Some students slept for the same number of hours but spent very different amounts of time studying.',
  'The final report described sleep as one factor among several.'
],
'heat island walk':[
  'The students also noticed that the difference became smaller later in the day. Shade mattered most during the warmer afternoon measurements.',
  'Their map used several days of data rather than a single hot day.'
],
'water bottle':[
  'Different members valued different features. Runners cared about weight, while younger members found an easy cap especially useful.',
  'The club chose two bottle types instead of naming one design the winner for everyone.'
],
'school festival queue':[
  'At first, the long line made the committee think that the stand simply needed more workers. The timing record showed that many customers were waiting to pay, not waiting for food.',
  'Separating payment from food service made the line move more smoothly.'
],
'reading notes':[
  'Highlighting was not useless. It helped students find a sentence again quickly. The margin notes, however, forced them to state a connection in their own words.',
  'The class began to use both methods for different purposes.'
],
'bird survey':[
  'The first count was not wrong; it was simply limited to one place. Trees, open ground, and a small pond attracted different birds.',
  'The club changed its report title from “Birds at Our School” to “Birds in Four School Habitats.”'
],
'online notice':[
  'The short summary did not remove the detailed rules. It gave members a quick starting point and let them open a longer section only when they needed it.',
  'The club used the same format for its next event.'
],
'battery test':[
  'Price still mattered when two batteries performed almost the same. The students also learned that one test with one motor could not answer every question about battery quality.',
  'Their report described the result as useful for that motor rather than for all devices.'
],
'cafeteria menu':[
  'The health description was accurate, but many students said that it did not help them imagine the food. The second description mentioned the flavor and the local farm that supplied the vegetables.',
  'The cafeteria later used short, concrete descriptions for unfamiliar dishes.'
],
'walking route':[
  'The students did not tell everyone to use the longer route. They showed the travel time and the crossing points so that families could choose with more information.',
  'For many students, three extra minutes felt like a reasonable trade for fewer busy crossings.'
],
'rain garden':[
  'The garden did not remove all water from the parking area. It slowed the strongest flow and held part of the rain for a short time.',
  'The town planned to observe the area through another rainy season before adding more gardens.'
],
'practice schedule':[
  'The musicians used the same total practice time, so the difference was not simply caused by doing more work. Shorter sessions also gave them several chances to return to difficult parts.',
  'They kept one longer rehearsal before concerts but used shorter sessions during ordinary weeks.'
],
'map scale':[
  'Visitors going to the entrance, café, and main hall usually preferred the simple map. People looking for a small gallery sometimes needed the detailed version.',
  'The museum placed the simple map at the entrance and kept detailed maps near information desks.'
],
'phone charging':[
  'Replacing a damaged cable helped several phones immediately. Other slow phones still needed a different explanation, such as an old adapter or a nearly full battery.',
  'The class wrote a checklist instead of claiming that one cause explained every case.'
],
'local market':[
  'The reusable bags had been available before the change, but many customers noticed them only after paying. Moving them earlier changed the timing of the choice.',
  'The market kept the new position because it required no extra discount or advertisement.'
],
'class discussion':[
  'The quiet minute did not make every student speak, but it gave more students something to say before the discussion became fast. Students could write one idea or one question during that minute.',
  'The teacher later used the same step before difficult discussions.'
],
'sports hydration':[
  'The team did not treat the schedule as a fixed rule for every day. On cooler days, the coach allowed more flexibility, while hotter days required closer attention.',
  'The plan focused on safety without turning every practice into the same routine.'
],
'community survey':[
  'The online answers were still useful, but they mainly represented residents comfortable with the online form. Paper copies reached several residents missed by the first survey.',
  'The town reported the two collection methods so readers could understand the sample.'
],
'study app':[
  'A reminder helped only when students still paid attention to it. Several students said that too many alerts made all alerts feel unimportant.',
  'The class recommended a small number of well-timed reminders instead of simply sending more.'
]
};

for(const sc of bySetting.values()){
  const extra=EXTRA[sc.setting]||[];
  sc.naturalExtra=extra;
  DATA.readingScenarios.push(sc);
}

function fmt(id,genre,theme,setting,title,grammar,paragraphs,finalFact,lesson,inference,causeStem,causeAnswer,detailDistractors){
  return {id,genre,theme,setting,title,grammar,passageParagraphs:paragraphs,facts:[
    paragraphs[0].split(/(?<=[.!?])\s+/)[0]||paragraphs[0],
    paragraphs[0].split(/(?<=[.!?])\s+/)[1]||paragraphs[0],
    paragraphs[1]?.split(/(?<=[.!?])\s+/)[0]||paragraphs[1]||paragraphs[0],
    paragraphs[2]?.split(/(?<=[.!?])\s+/)[0]||paragraphs[2]||paragraphs[1]||paragraphs[0],
    finalFact
  ],lesson,inference,causeStem,causeAnswer,detailDistractors,origin:'hand-curated-natural-v2'};
}

const F=[
fmt('nat-f01','narrative','school','art room','The Blue Umbrella',['past'],[
  'Mina was carrying a large poster to the art room when she noticed a blue umbrella beside the stairs. She was already late, so she moved it away from the walkway and hurried upstairs.',
  'After class, rain began to fall. A first-year student was standing near the entrance and looking worried. Mina remembered the umbrella, but it was no longer beside the stairs.',
  'She asked at the school office and learned that a teacher had taken it to the lost-and-found box. The first-year student smiled when Mina showed him the box.',
  'Mina reached the bus stop later than usual, but she did not regret stopping to help.'
],'The first-year student found the umbrella in the lost-and-found box.','A small helpful action can matter even when it costs a little time.','Mina valued helping the younger student more than arriving at the bus stop as early as possible.','Why did Mina go to the school office?','Because she remembered the umbrella and wanted to help the worried student find it.',[
  'Mina bought a new umbrella for the first-year student.',
  'The teacher asked Mina to carry the poster back downstairs.',
  'Mina left the umbrella beside the stairs until the next morning.'
]),
fmt('nat-f02','narrative','community','local festival','One Empty Table',['past'],[
  'Kota volunteered at a local festival and was assigned to a table with maps and event times. During the first hour, almost no one stopped there, so he began to think that the table was unnecessary.',
  'Then an older visitor asked for a quiet place to rest. Kota showed her a small garden on the map. Soon a family asked for the nearest restroom, and another visitor needed the bus time.',
  'Kota realized that the table was useful in a different way from the busy food stands. It did not attract a crowd, but it helped people at the moment they needed information.',
  'At the end of the day, he suggested adding a larger “Information” sign instead of removing the table.'
],'Kota suggested keeping the table and adding a larger sign.','Usefulness is not always measured by the size of a crowd.','A service can be valuable even when only a small number of people use it at one time.','Why did Kota change his opinion about the table?','Because several visitors needed information that the table could provide.',[
  'The table became the busiest food stand at the festival.',
  'Kota decided that maps were not useful for visitors.',
  'The festival moved the information table into the garden.'
]),
fmt('nat-f03','email','culture','exchange program','Email from Lucy',['basic','future'],[
  'Hi Yui, I will arrive in Nagoya on Saturday morning. Thank you for planning so many things for my first weekend in Japan.',
  'I would love to see the castle, but please do not worry about filling every hour. After a long flight, I may need some quiet time in the afternoon.',
  'On Sunday, could we visit the small pottery market you told me about? I am more interested in meeting local makers than buying expensive souvenirs.',
  'See you soon! Lucy'
],'Lucy wants to visit the pottery market on Sunday.','A good host should pay attention to a guest’s interests and energy, not only create a busy schedule.','Lucy prefers a relaxed weekend with one local experience to a schedule packed with famous places.','Why does Lucy ask for some quiet time on Saturday afternoon?','Because she may be tired after a long flight.',[
  'Lucy wants to spend all weekend shopping for expensive souvenirs.',
  'Lucy asks Yui to cancel the pottery market on Sunday.',
  'Lucy will arrive in Nagoya on Sunday evening.'
]),
fmt('nat-f04','email','community','library volunteer desk','A Change to Tuesday',['presentPerfect','future'],[
  'Dear Mr. Sato, I have enjoyed helping at the library on Tuesdays this summer. I have learned a lot from helping children find books.',
  'Next Tuesday, however, my school has added a practice for the speech contest. I will not be able to arrive at four as usual.',
  'Could I come from five to six instead? If that is difficult, I can help on Thursday this week.',
  'Thank you for considering the change. Emi'
],'Emi offers Thursday as another possible day.','A clear request gives the reason for a change and also offers a practical alternative.','Emi is trying to keep her volunteer responsibility even though her school schedule has changed.','Why can Emi not arrive at her usual time next Tuesday?','Because her school added a speech-contest practice.',[
  'Emi has decided to stop volunteering at the library.',
  'The library will close at five next Tuesday.',
  'Emi asks to move every Tuesday shift to Thursday.'
]),
fmt('nat-f05','speech','environment','school assembly','A Bottle Is Not the Whole Story',['basic','modal'],[
  'Many of us carry reusable bottles to school. This is a useful habit, but the bottle itself does not automatically reduce waste.',
  'If we buy a new bottle every few months because we like a different design, we may use more materials than necessary. A durable bottle becomes helpful when we keep using it.',
  'The same idea applies to many products. Before replacing something, we can check if the old one still works.',
  'My suggestion is simple: choose carefully, use things longer, and repair them when possible.'
],'The speaker recommends using useful products for a longer time.','Environmental choices depend on the way products are used over time, not only on the label “reusable.”','Keeping a durable product can sometimes matter more than repeatedly buying new reusable products.','Why does the speaker mention buying a new bottle every few months?','To show that a reusable product can still use unnecessary materials when it is replaced too often.',[
  'The speaker says that students should never use bottles at school.',
  'The speaker recommends buying a new design every month.',
  'The speaker says that repairing products always costs more than replacing them.'
]),
fmt('nat-f06','speech','community','community center','The Repair Table',['infinitive','basic'],[
  'Last month, our community center opened a small repair table. People brought lamps, toys, and bags with simple problems.',
  'The goal was not to make old things perfect. Volunteers showed owners the steps for replacing a loose screw, sewing a short tear, or checking a cable safely.',
  'Some items still had to be replaced, but many returned home ready for use. More important, several visitors said they felt more confident about trying a small repair.',
  'Next month, the center plans to add a basic bicycle-care session.'
],'The center plans to add a bicycle-care session next month.','Repair events can build skills as well as extend the life of useful objects.','The project gave people knowledge that they could use after leaving the center.','Why did volunteers show owners how to do simple repairs?','Because the project aimed to teach useful repair skills, not only fix items for visitors.',[
  'Every broken item at the center became completely new.',
  'The center stopped the repair table after one month.',
  'Visitors were not allowed to touch their own items.'
]),
fmt('nat-f07','conversation','school','club room','Which Project Should We Choose?',['basic','comparison'],[
  'Aya: We have enough money for one project. We can paint the club room or buy two new microphones.',
  'Ren: The walls look old, but our microphones still work. They just sound weak in the large hall.',
  'Aya: We use the hall only twice a year. We use this room every week.',
  'Ren: Good point. Let’s paint the room now and borrow microphones for the school festival. We can save for new ones next year.'
],'Aya and Ren decide to paint the club room first.','A good choice considers frequency of use as well as the attraction of an option.','The students choose the project that will affect their ordinary weekly activity more often.','Why does Ren agree to paint the club room first?','Because the club uses the room every week but uses the large hall only twice a year.',[
  'They decide to buy four microphones immediately.',
  'They decide to stop using the club room.',
  'They decide to paint the large hall instead.'
]),
fmt('nat-f08','conversation','transport','station platform','The Earlier Train',['future','basic'],[
  'Tomo: If we take the 7:42 train, we will reach the museum at 8:55. The workshop starts at nine.',
  'Sara: Five minutes is not much time. We also have to walk from the station.',
  'Tomo: The 7:28 train gets there at 8:40, but we will have to leave home earlier.',
  'Sara: I prefer the earlier train. I would rather wait near the museum than run from the station.'
],'Sara chooses the 7:28 train.','A slightly earlier plan can reduce the risk created by a very small time margin.','Sara values having extra time near the museum more than leaving home fourteen minutes later.','Why does Sara prefer the earlier train?','Because the later train leaves too little time for the walk from the station.',[
  'Sara wants to arrive after the workshop begins.',
  'The 7:28 train reaches the museum at 8:55.',
  'Tomo and Sara decide not to visit the museum.'
]),
fmt('nat-f09','notice','school','science room','Science Workshop Notice',['basic','modal'],[
  'SCIENCE WORKSHOP — Saturday, 10:00–12:00, Science Room 2.',
  'Students will build a small paper bridge and test the amount of weight it can hold. Bring a pencil and a ruler. All other materials will be provided.',
  'There are twenty places. Sign up at the office by Thursday. Students from the bridge workshop last term should choose another activity this time.',
  'The room opens at 9:45. Please arrive before 10:00 because the safety explanation comes first.'
],'Students must sign up by Thursday.','A notice should help readers act by giving the time, place, materials, limit, and important conditions clearly.','A student needs to read more than the title to check if the workshop is available.','Why should students arrive before 10:00?','Because the safety explanation is given at the beginning.',[
  'Students must bring all bridge materials from home.',
  'The workshop is open to more than fifty students.',
  'Students can sign up after the workshop starts.'
]),
fmt('nat-f10','notice','school','festival office','Lost and Found at the Festival',['basic'],[
  'LOST AND FOUND — The festival office is beside the main entrance.',
  'Small items such as keys, wallets, and glasses are kept at the office during the festival. Large items such as umbrellas are placed on the marked rack outside the office.',
  'When you ask for an item, please describe it before the staff show it to you. This helps us return items to the correct owner.',
  'Items not collected today will be moved to the school office on Monday.'
],'Uncollected items will be moved to the school office on Monday.','Clear procedures help a lost-and-found service return items safely and efficiently.','The staff ask for a description so that a person cannot simply choose any lost item.','Why must a person describe a lost item before seeing it?','To help the staff confirm that the item belongs to the person.',[
  'All umbrellas are kept inside the festival office.',
  'The festival office closes permanently on Monday.',
  'Lost items are given to the first person asking for them.'
]),
fmt('nat-f11','newspaper','environment','school roof','A Garden Above the Classrooms',['presentPerfect','basic'],[
  'For three years, students have cared for a small garden on the roof of East Middle School. At first, the garden was used only by the science club.',
  'This spring, the cooking club began growing herbs there, and an art class used the garden for sketching. Teachers also started taking small groups outside for short breaks.',
  'The change created a new problem: different groups sometimes wanted the same space at the same time. The student council made a simple online calendar.',
  'Since the calendar was introduced, the garden has been easier to share without giving one group permanent control.'
],'An online calendar made the roof garden easier for different groups to share.','A shared place becomes more useful when access is organized fairly as the number of users grows.','The garden’s success created a need for coordination rather than a need to exclude new users.','Why did the student council create an online calendar?','Because several groups sometimes wanted to use the roof garden at the same time.',[
  'The school closed the roof garden to all clubs.',
  'The science club gained permanent control of the garden.',
  'The cooking club stopped growing herbs in spring.'
]),
fmt('nat-f12','newspaper','culture','local pottery studio','Hands That Remember',['past','basic'],[
  'Our newspaper visited a pottery studio. The same family has run it for three generations. The oldest potter, Mr. Mori, learned by watching his mother work.',
  'He said the shape of a cup can be measured, but good balance is also felt through the hands. His daughter now uses digital photos to record each stage of difficult pieces.',
  'The family does not see the camera as a replacement for hand skills. They use it to compare old work, explain techniques to younger learners, and remember small changes.',
  'At the studio, tradition and new tools are not enemies; each helps the other in a different way.'
],'The family uses digital photos to support learning and record techniques.','Traditional skills and new tools can support each other when they serve different purposes.','The studio keeps hand skills while using technology to make learning and comparison easier.','Why does the family take digital photos of difficult pieces?','To record stages, compare work, and explain techniques to younger learners.',[
  'The family stopped teaching pottery by hand.',
  'Mr. Mori learned pottery only from online videos.',
  'The studio uses cameras to replace every hand skill.'
]),
fmt('nat-f13','opinion','education','study desk','Paper Notes Still Have a Place',['basic','comparison'],[
  'Digital notes are easy to search and carry, so I use them for long documents. Still, paper notes are better for some of my study tasks.',
  'When I solve a difficult math problem, I often draw arrows, cross out one idea, and write a new one beside it. I can do these things on a tablet, but paper feels faster to me.',
  'This does not mean paper is always better. For vocabulary lists and shared class information, digital notes are more convenient.',
  'A useful rule is simple: choose a tool for the task, not one tool for every task.'
],'The writer chooses different note-taking tools for different tasks.','The best study tool can depend on the task rather than one tool being superior in every situation.','The writer values flexibility and uses both paper and digital notes.','Why does the writer prefer paper for some difficult math problems?','Because drawing, crossing out ideas, and adding new notes feels faster on paper.',[
  'The writer refuses to use digital notes for any subject.',
  'The writer believes vocabulary lists must always be written on paper.',
  'The writer says tablets cannot display long documents.'
]),
fmt('nat-f14','opinion','community','neighborhood','One Hour of Volunteering',['gerund','basic'],[
  'Some people avoid volunteering because they imagine that it requires a whole day. I used to think the same thing.',
  'Last year, I joined a neighborhood cleanup for only one hour. I could not finish every task, but I collected litter along one street and met two neighbors I had never spoken to before.',
  'Since then, I have joined several short activities. Small amounts of time are easier to fit into my schedule, so I can participate more regularly.',
  'Long projects are valuable, but short opportunities can open the door for people with limited time.'
],'Short volunteer activities helped the writer participate more regularly.','Short opportunities can make community participation possible for people with limited time.','A small time commitment can be meaningful when it makes regular participation easier.','Why did the writer begin joining more volunteer activities?','Because short activities were easier to fit into the writer’s schedule.',[
  'The writer now volunteers for a whole day every week.',
  'The writer decided that neighborhood cleanups have no value.',
  'The writer stopped meeting people during volunteer activities.'
]),
fmt('nat-f15','experiment','science','science lab','Which Material Softens Sound?',['passive','comparison'],[
  'Three boxes were lined with different materials: cloth, thin paper, and foam. The same small speaker was placed inside each box.',
  'The sound level was measured from the same distance while the same recording was played. The foam-lined box produced the lowest reading.',
  'The students then repeated the test because one reading can be affected by a small change in position. The same order appeared in the second test.',
  'The class concluded that foam reduced the measured sound most effectively under the conditions of this experiment.'
],'The foam-lined box produced the lowest sound-level reading in both tests.','A fair comparison keeps important conditions the same and repeats measurements before drawing a limited conclusion.','The repeated result supports the conclusion for this setup, but it does not prove that foam is best for every possible sound problem.','Why did the students repeat the sound test?','Because a single reading could be affected by a small change in position.',[
  'The students used a different speaker for every box.',
  'Thin paper produced the lowest reading in both tests.',
  'The students measured each box from a different distance.'
]),
fmt('nat-f16','report','data','library','When Do Students Use the Library?',['basic','comparison'],[
  'The school library counted student visits for one week. The total number was highest on Wednesday, but the daily total did not show the whole pattern.',
  'Before school, most visitors returned books or printed homework. At lunch, many students came in small groups. After school, longer individual study was more common.',
  'The library had planned to add more group tables because Wednesday was busy. After looking at the time-of-day data, it chose movable tables instead.',
  'The same space could then support short group use at lunch and individual study later in the day.'
],'The library chose movable tables after examining visits by time of day.','A total count can hide differences in the use of a place at different times.','More detailed timing data changed the library’s furniture decision.','Why did the library change from fixed group tables to movable tables?','Because students used the library in different ways at different times of day.',[
  'The library found that nobody studied after school.',
  'Wednesday had the fewest visitors of the week.',
  'The library removed all tables after the survey.'
]),
fmt('nat-f17','narrative','school','music room','The Quiet Part',['past'],[
  'During rehearsal, Rina always played the loudest part of the song with confidence. The quiet middle section made her nervous, so she rushed through it.',
  'One afternoon, the conductor stopped the group after the quiet section. He did not ask Rina to play louder. He asked everyone else to listen to the space between the notes.',
  'On the next try, Rina slowed down and noticed the piano line behind her. The section felt less empty because she was listening instead of trying to fill every second.',
  'At the concert, the quiet part became the moment she remembered most clearly.'
],'Rina improved the quiet section by slowing down and listening to the other part.','Improvement can come from changing attention, not simply adding more force or speed.','Rina became more confident when she listened to the music around her instead of trying to fill the silence.','Why did the conductor ask the group to listen to the space between notes?','To help them understand the quiet section instead of simply making it louder.',[
  'Rina decided to skip the quiet section at the concert.',
  'The conductor asked Rina to play every note faster.',
  'The piano stopped playing during the middle section.'
]),
fmt('nat-f18','email','culture','host family','A Small Request Before Friday',['basic','future'],[
  'Hi Ms. Green, thank you again for letting me stay with your family next week. I am excited about Friday dinner.',
  'I wanted to tell you one small thing before I arrive. I do not eat peanuts because they make me ill, but other nuts are fine.',
  'Please do not prepare a special meal just for me. If a dish contains peanuts, I can choose another dish.',
  'I thought it was better to tell you early so that dinner can stay easy for everyone. Best, Haru'
],'Haru tells the host family about a peanut problem before arriving.','Sharing an important need early can prevent confusion without demanding special treatment.','Haru wants the host family to know about the health issue while keeping the meal simple.','Why does Haru send the message before arriving?','To give the host family useful health information early and avoid confusion at dinner.',[
  'Haru asks the family to remove every kind of nut from the house.',
  'Haru says that no dinner should be prepared on Friday.',
  'Haru plans to bring a special meal for the whole family.'
]),
fmt('nat-f19','conversation','daily life','store','Do We Need the Larger Bag?',['basic','comparison'],[
  'Miki: This bag is only one hundred yen more, and it is much larger.',
  'Jun: Larger is useful only if we need the space. We usually carry a notebook, a bottle, and one lunch box.',
  'Miki: True. The large bag also feels heavier even when it is empty.',
  'Jun: Let’s choose the smaller one. If our needs change later, we can think again instead of paying for extra space now.'
],'Miki and Jun choose the smaller bag.','A larger product is not automatically more useful when the extra capacity is unnecessary.','The two shoppers choose based on their actual use rather than size alone.','Why do Miki and Jun choose the smaller bag?','Because it already fits the things they usually carry and is lighter.',[
  'They choose the larger bag because it is cheaper.',
  'They decide not to buy any bag.',
  'They usually carry several large sports items every day.'
]),
fmt('nat-f20','speech','environment','school hall','The Clothes We Already Own',['basic','modal'],[
  'Buying a shirt made from better materials can be a good choice, but there is another question we often forget: do we need a new shirt at all?',
  'The clothes already in our closets required water, energy, and work to produce. Using them longer can reduce the need for new production.',
  'This does not mean we should never buy clothes. We should replace clothes after they no longer fit or after repair becomes impossible.',
  'Before shopping, we can first check the clothes already in our closets. The most sustainable item may be one we already own.'
],'The speaker recommends checking existing clothes before buying new ones.','Reducing unnecessary replacement can matter as much as choosing a better new product.','The speaker supports thoughtful buying rather than a total ban on new clothes.','Why does the speaker mention the resources used to make clothes already in a closet?','To show that continuing to use existing clothes can also reduce environmental impact.',[
  'The speaker says that nobody should ever buy new clothes.',
  'The speaker recommends throwing away clothes that can be repaired.',
  'The speaker says that old clothes required no energy to produce.'
]),
fmt('nat-f21','notice','school','school building','Evacuation Drill — Wednesday',['basic','modal'],[
  'EVACUATION DRILL — Wednesday at 10:20.',
  'When the alarm sounds, leave bags and books in the classroom. Walk with your class to the east field. Do not run on the stairs.',
  'Class leaders will bring the attendance card. Students should not return to the building until a teacher gives permission.',
  'If heavy rain makes the east field unsafe, an announcement will direct classes to the gym instead.'
],'Students must wait for a teacher’s permission before returning to the building.','Emergency notices must give clear actions while also explaining an alternative when conditions change.','The drill has a main plan and a different location for heavy rain.','Why should students leave bags and books in the classroom?','So they can leave the room promptly without carrying unnecessary items during the drill.',[
  'Students should run down the stairs after the alarm.',
  'Every student must bring the attendance card.',
  'The drill will always move to the gym, even in good weather.'
]),
fmt('nat-f22','newspaper','school','library','The Seats Near the Window',['basic'],[
  'A row of library seats near the windows became popular after new lamps were installed. By October, students were often waiting for those seats even when other desks were empty.',
  'The library asked students for short comments. Many liked the lamps, but others chose the window seats because power outlets were close enough for school tablets.',
  'The staff had first planned to buy more lamps. Instead, they added power strips to two other rows of desks.',
  'Within a week, students were spread more evenly around the room.'
],'Adding power strips to other desks reduced the crowd near the window seats.','A popular place may attract people for a less obvious reason than the feature everyone first notices.','The comments helped the library identify access to power as an important reason for the seating pattern.','Why did the library add power strips instead of only buying more lamps?','Because student comments showed that nearby power outlets were one reason the window seats were popular.',[
  'The library removed every lamp near the windows.',
  'Students said that they never used tablets in the library.',
  'The staff closed the other rows of desks for a week.'
]),
fmt('nat-f23','opinion','school','school life','Why I Keep One Free Afternoon',['infinitive','basic'],[
  'At the beginning of the term, I tried to schedule an activity every afternoon. My calendar looked productive, but I was often moving from one place to another without finishing small school tasks.',
  'Now I keep Wednesday afternoon mostly free. I use part of it to finish homework, visit the library, or simply rest before evening study.',
  'A free block does not mean that I do nothing. It gives me room to respond when another day becomes busy.',
  'For me, planning some empty time has made the rest of the week more reliable.'
],'The writer keeps Wednesday afternoon mostly free to create flexibility.','A schedule can become more reliable when it includes some unplanned time.','The writer sees free time as useful space for recovery and unfinished tasks, not as wasted time.','Why did the writer stop scheduling an activity every afternoon?','Because the full schedule left little room to finish small tasks or handle busy days.',[
  'The writer decided to stop doing homework during the week.',
  'Wednesday is the only day when the library is open.',
  'The writer now schedules two activities every Wednesday afternoon.'
]),
fmt('nat-f24','experiment','science','classroom window','Do Plants Turn Toward Light?',['past','basic'],[
  'Four young plants were placed beside a window. Each pot was marked so the students could see its original direction.',
  'After three days, the stems had begun to lean toward the window. The students then turned each pot halfway around.',
  'Three days later, the new growth had bent toward the window again. The students photographed the plants from the same position each day.',
  'The class used the repeated change in direction as evidence that the growing stems responded to the direction of light.'
],'After the pots were turned, new growth bent toward the window again.','Repeated observations after changing one condition can make a biological response easier to identify.','The second change in stem direction made it less likely that the first lean was only the original shape of the plants.','Why did the students turn each pot halfway around?','To test if new growth would change direction toward the light again.',[
  'The students moved the window to the other side of the room.',
  'The stems stopped growing after the pots were turned.',
  'The students photographed each plant from a different position every day.'
])
];

for(const sc of F)DATA.readingScenarios.push(sc);

const simpleInferenceBad=[
  'One method is always best in every situation.',
  'The people in the passage should stop the activity completely.',
  'The result proves that the same choice will work for everyone.'
];

function asSentence(s){return String(s||'').trim().replace(/\s+/g,' ')}
function buildLegacyPassage(sc,diff,mode){
  const f=(sc.naturalCore&&sc.naturalCore.length?sc.naturalCore:sc.facts||[]).filter(Boolean);
  const paras=[];
  if(f.length>=5){
    paras.push(`${asSentence(f[0])} ${asSentence(f[1])}`);
    paras.push(`${asSentence(f[2])} ${asSentence(f[3])}`);
    paras.push(asSentence(f[4]));
    if(mode!=='micro'&&diff>=5&&sc.extension)paras.push(asSentence(sc.extension));
  }else{
    if(f[0])paras.push(asSentence(f[0]));
    if(f[1])paras.push(asSentence(f[1]));
    if(f[2])paras.push(asSentence(f[2]));
    if(mode!=='micro'&&diff>=5&&Array.isArray(sc.naturalExtra)&&sc.naturalExtra.length){
      paras.push(asSentence(sc.naturalExtra[0]));
      if(diff>=8&&sc.naturalExtra[1])paras.push(asSentence(sc.naturalExtra[1]));
    }
  }
  return paras.filter(Boolean).join('\n\n');
}
const previousMakeReadingPassage=makeReadingPassage;
makeReadingPassage=function(sc,diff=7,mode='standard'){
  if(sc?.passageParagraphs?.length){
    let p=[...sc.passageParagraphs];
    return p.join('\n\n');
  }
  if(sc?.origin==='curated-from-v23-core'||/^r\d+$/.test(String(sc?.id||'')))return buildLegacyPassage(sc,diff,mode);
  return previousMakeReadingPassage(sc,diff,mode);
};

function choice(text,ok,reason,error){return{text,ok,reason,error}}
function qChoices(correct,bad,correctReason){
  const arr=[choice(correct,true,correctReason||'This choice matches the passage.')];
  for(let i=0;i<3;i++)arr.push(choice(bad[i]||simpleInferenceBad[i],false,i===0?'This changes an important fact from the passage.':i===1?'This is not supported by the passage.':'This is too broad or opposite to the passage.',i===0?'detailMismatch':i===1?'unsupported':'overgeneral'));
  return shuffleChoices(arr);
}
function makeNaturalQuestions(sc,passage,diff){
  const facts=sc.facts||[],dm=READING_DISTRACTORS[sc.id]||[[],[]];
  const detailBad=(sc.detailDistractors||dm[0]||[]).slice(0,3);
  const finalFact=facts[4]||facts.at(-1)||'';
  const causeStem='本文中の行動・判断が変わった主な理由として最も適切なものを選びなさい。';
  const causeAnswer=sc.causeAnswer||'Because the earlier result or experience showed that the first approach did not work well enough.';
  const causeBad=[
    'Because a teacher ordered them to change it without giving any reason.',
    'Because they already knew the final answer before the activity began.',
    'Because they wanted to spend more money even though the passage gave no such reason.'
  ];
  const infBad=(dm[1]||simpleInferenceBad).slice(0,3);
  const main=`The main point is that ${String(sc.lesson||'careful choices should fit the situation').replace(/[.]$/,'').replace(/^([A-Z])/,m=>m.toLowerCase())}.`;
  const mainBad=[
    `The passage mainly gives a complete history of ${sc.setting||'the place'}.`,
    'The passage argues that one fixed choice is best for everyone.',
    'The passage shows that the people should stop the activity completely.'
  ];
  const para=String(sc.lesson||sc.inference||'').replace(/[.]$/,'')+'.';
  const paraBad=[
    'The first choice should never be changed, even when the situation changes.',
    'More information always guarantees a correct decision.',
    'A single result can prove the same conclusion in every situation.'
  ];
  const qs=[
    {type:'detail',stem:'本文の内容として正しいものを選びなさい。',choices:qChoices(finalFact,detailBad,'This statement matches a specific result or action in the passage.'),skill:'en.read.detail',evidenceNeedles:[finalFact]},
    {type:'cause',stem:causeStem,choices:qChoices(causeAnswer,causeBad,'This reason matches the change or decision described in the passage.'),skill:'en.read.cause',evidenceNeedles:[facts[1],facts[2],facts[3]].filter(Boolean)},
    {type:'inference',stem:'本文から最もよく導ける考えを選びなさい。',choices:qChoices(sc.inference,infBad,'This idea stays within the evidence given in the passage.'),skill:'en.read.inference',evidenceNeedles:[facts[2],facts[3],facts[4]].filter(Boolean)},
    {type:'mainIdea',stem:'本文の主題として最も適切なものを選びなさい。',choices:qChoices(main,mainBad,'This choice connects the events or information with the main point of the passage.'),skill:'en.read.mainIdea',evidenceNeedles:[]},
    {type:'paraphrase',stem:'本文の教訓を最も適切に言い換えたものを選びなさい。',choices:qChoices(para,paraBad,'This sentence restates the lesson without making it broader than the passage.'),skill:'en.read.paraphrase',evidenceNeedles:[facts[3],facts[4]].filter(Boolean)}
  ];
  let supported=['comparison','presentPerfect','gerund','infinitive','passive','modal'];
  let gtag=(sc.grammar||[]).find(t=>supported.includes(t)&&state.profile.grammarGate[t]!==false)||supported.find(t=>state.profile.grammarGate[t]!==false)||'modal';
  qs.push(grammarQuestion(gtag,passage));
  return qs.map((q,i)=>{
    let refs=evidenceRefs(passage,q.evidenceNeedles||[]);
    return {id:`reading:${sc.id}:${hash(passage)}:q${i}`,type:q.type,stem:q.stem,choices:q.choices,answerIndex:q.choices.findIndex(c=>c.ok),explanation:q.choices.find(c=>c.ok)?.reason||'',skills:[{id:q.skill||'en.grammar.transfer',role:'primary'}],expectedMs:q.type==='inference'?70000:50000,context:sc.theme,evidenceRefs:refs,evidence:refs.length?refs.map(r=>`第${r.paragraph}段落${r.sentence}文目`).join('・'):(q.type==='grammarTransfer'?'文法知識':'本文全体')};
  });
}
readingQuestionSet=function(sc,passage,diff){return makeNaturalQuestions(sc,passage,diff)};

for(const sc of DATA.readingScenarios){
  if(!READING_DISTRACTORS[sc.id]){
    const d=(sc.detailDistractors||[
      'The passage says that the plan worked perfectly from the beginning.',
      'The people in the passage stopped the activity before making a decision.',
      'The final result was exactly the opposite of the one described.'
    ]).slice(0,3);
    READING_DISTRACTORS[sc.id]=[d,[...simpleInferenceBad]];
  }
}

const BAD_PHRASES=[
 'The group compared the result with its first expectation.',
 'They used the evidence to decide what to do next.',
 'Before drawing a conclusion, the group compared its first expectation with the new result.',
 'The lesson was not simply to work harder or collect more information.'
];
function audit(){
  const genres=new Set(DATA.readingScenarios.map(x=>x.genre));
  const sample=DATA.readingScenarios.slice(0,Math.min(80,DATA.readingScenarios.length)).map(sc=>makeReadingPassage(sc,7,'standard'));
  const bad=sample.filter(t=>BAD_PHRASES.some(p=>t.includes(p)));
  return {version:'2.0.0',scenarioCount:DATA.readingScenarios.length,genres:[...genres],bannedPhraseHits:bad.length,removedMechanicalVariants:generated.length,pass:DATA.readingScenarios.length>=50&&genres.size>=8&&bad.length===0};
}
window.AA_READING_NATURALNESS=audit();
document.dispatchEvent(new CustomEvent('aa:reading-naturalness',{detail:window.AA_READING_NATURALNESS}));
})();