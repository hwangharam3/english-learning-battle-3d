/* =========================================================
   question.js
   교과서 Lesson 4 'Looking to Nature for Help' 지문 기반 문제은행 (총 30문항)
   - easy 12 / mid 12 / hard 6
   - 교과서 본문(Dealing with Plastic Waste / Purifying Polluted Soil / Producing Algae Biofuel)과 Word Formation 내용 사용
   - passage / q 는 innerHTML 로 출력됨 → <br>, <u> 사용 가능
   - answer 는 choices 기준 0-based (게임에서 보기 순서를 매번 셔플)
   ========================================================= */

/* ---------- 난이도/제한시간 설정 (여기만 고치면 됨) ---------- */
const QUIZ_CONFIG = {
  // stage 구간별 난이도 출제 비율 (합계 1.0)
  levelWeights: [
    { maxStage: 2,        w: { easy: 0.7, mid: 0.3, hard: 0.0 } },
    { maxStage: 7,        w: { easy: 0.2, mid: 0.6, hard: 0.2 } },
    { maxStage: Infinity, w: { easy: 0.0, mid: 0.5, hard: 0.5 } }
  ],
  // stage 구간별 기본 제한시간(초)
  timeLimits: [
    { maxStage: 2,        sec: 25 },
    { maxStage: 7,        sec: 25 },
    { maxStage: Infinity, sec: 20 }
  ],
  hardBonusSec: 5 // hard 문제 추가 시간
};

window.QUESTION_BANK = [
  /* ===================== EASY (12) ===================== */
  {
    passage:"Our environment is in trouble. With the planet becoming warmer, sea levels are rising and natural disasters such as forest fires and floods are increasing.",
    type:"내용 이해", q:"지구가 점점 따뜻해지면서 일어나는 일로 글에 언급된 것은?",
    choices:["해수면 상승과 자연재해 증가","사막의 면적 감소","빙하의 급격한 증가","강수량의 꾸준한 감소"], answer:0,
    explanation:"sea levels are rising, forest fires and floods are increasing 이라고 했다.", level:"easy"
  },
  {
    passage:"Plastic, in particular, is causing problems with soil and water pollution. It is clear that humans are a major <u>contributor</u> to the destruction of nature.",
    type:"어휘 의미", q:"밑줄 친 contributor의 의미로 가장 알맞은 것은?",
    choices:["(어떤 결과의) 원인 제공자","구경꾼","피해자","연구원"], answer:0,
    explanation:"contribute + -or → contributor, '기여하는 사람/요인'. 여기서는 자연 파괴의 큰 원인이라는 뜻이다.", level:"easy"
  },
  {
    passage:"survive + -or → survivor<br>contribute + -or → contributor",
    type:"어휘 형성", q:"위와 같은 방식(동사 + -or)으로 만들어진 단어로 알맞은 것은?",
    choices:["visit + -or → visitor","sick + -or → sickor","dark + -or → darkor","child + -or → childor"], answer:0,
    explanation:"동사에 -or를 붙이면 '~하는 사람'이 된다. visit → visitor.", level:"easy"
  },
  {
    passage:"dark + -ness → darkness<br>sick + -ness → sickness",
    type:"어휘 형성", q:"형용사에 -ness를 붙여 만든 명사로 알맞은 것은?",
    choices:["kind → kindness","kind → kindor","kind → kindion","kind → kindly"], answer:0,
    explanation:"형용사 + -ness = 명사. kind → kindness.", level:"easy"
  },
  {
    passage:"About fifty percent of plastic is produced for single-use products. That means the items are used just once and then <u>discarded</u>.",
    type:"어휘 의미", q:"밑줄 친 discarded와 의미가 가장 가까운 것은?",
    choices:["thrown away","kept","repaired","bought"], answer:0,
    explanation:"한 번 쓰고 discard(버리다) = throw away.", level:"easy"
  },
  {
    passage:"About fifty percent of plastic is produced for single-use products.",
    type:"내용 이해", q:"전체 플라스틱의 약 절반은 어떤 제품으로 만들어지는가?",
    choices:["일회용 제품","건축 자재","자동차 부품","장난감"], answer:0,
    explanation:"fifty percent of plastic is produced for single-use products.", level:"easy"
  },
  {
    passage:"Mealworms are the larvae of a certain species of beetle. Special bacteria live inside them. These bacteria can break down plastic.",
    type:"내용 이해", q:"What can the special bacteria in mealworms do?",
    choices:["They can break down plastic.","They can make plastic.","They can clean the ocean water.","They can turn into beetles."], answer:0,
    explanation:"Special bacteria live inside them. These bacteria can break down plastic.", level:"easy"
  },
  {
    passage:"Mealworms are the <u>larvae</u> of a certain species of beetle.",
    type:"어휘 의미", q:"larvae(larva의 복수형)의 뜻으로 가장 알맞은 것은?",
    choices:["애벌레, 유충","성충","알","번데기 껍질"], answer:0,
    explanation:"larva는 곤충의 애벌레(유충)를 뜻한다. mealworm은 딱정벌레의 유충이다.", level:"easy"
  },
  {
    passage:"Although polluted soil can be dug up and transported to a landfill, this process is expensive.",
    type:"내용 이해", q:"Besides being expensive, what is the problem with digging up polluted soil and transporting it to a landfill?",
    choices:["It only moves the problem to another area.","It makes the soil cleaner than before.","It takes only a few minutes.","It kills all the willow trees."], answer:0,
    explanation:"Moreover, it only moves the problem to another area and does not really solve it.", level:"easy"
  },
  {
    passage:"Statistics show that about thirty to forty percent of people in the world drink coffee each day.",
    type:"내용 이해", q:"윗글에 따르면 하루에 커피를 마시는 사람의 비율은?",
    choices:["세계 인구의 약 30~40%","세계 인구의 약 3~4%","세계 인구의 약 80%","세계 인구의 약 13%"], answer:0,
    explanation:"about thirty to forty percent of people in the world drink coffee each day.", level:"easy"
  },
  {
    passage:"Used coffee grounds are normally sent to landfills. There, they can create a harmful greenhouse gas.",
    type:"내용 이해", q:"What can the coffee grounds that are sent to landfills create?",
    choices:["A harmful greenhouse gas","Clean water","New coffee beans","Healthy soil"], answer:0,
    explanation:"매립지로 보내진 커피 찌꺼기는 해로운 온실가스를 만들 수 있다.", level:"easy"
  },
  {
    passage:"Biofuel is a natural fuel that is made from plant or animal sources.",
    type:"어휘 의미", q:"윗글에 따르면 biofuel은 무엇인가?",
    choices:["식물이나 동물에서 얻은 천연 연료","플라스틱으로 만든 연료","석유에서 뽑은 연료","전기를 만드는 기계"], answer:0,
    explanation:"biofuel = a natural fuel made from plant or animal sources.", level:"easy"
  },

  /* ===================== MID (12) ===================== */
  {
    passage:"However, less than ten percent of the world's plastic waste has been recycled so far. Often, plastic waste is moved to places where it is just dumped or burned.",
    type:"내용 일치", q:"윗글의 내용과 일치하는 것은?",
    choices:["지금까지 재활용된 플라스틱 쓰레기는 10% 미만이다","플라스틱 쓰레기는 대부분 재활용된다","플라스틱 쓰레기는 모두 안전하게 처리된다","플라스틱은 한 번도 태워진 적이 없다"], answer:0,
    explanation:"less than ten percent of the world's plastic waste has been recycled so far.", level:"mid"
  },
  {
    passage:"Between 8 and 14 million metric tons of plastic end up in the ocean every year. This puts many marine species in danger. With this in mind, scientists are turning to mealworms.",
    type:"내용 이해", q:"과학자들이 mealworm에 주목하게 된 배경으로 가장 알맞은 것은?",
    choices:["바다로 흘러드는 플라스틱이 해양 생물을 위협하기 때문에","mealworm이 식량으로 인기가 많아서","플라스틱 가격이 올라서","바다에 곤충이 부족해서"], answer:0,
    explanation:"With this in mind(이를 염두에 두고)는 앞 문장, 즉 바다의 플라스틱 문제를 가리킨다.", level:"mid"
  },
  {
    passage:"Mealworms are the larvae of a certain species of beetle. Special bacteria live inside them. These bacteria can break down plastic. This means that mealworms can actually feed on plastic.",
    type:"내용 이해", q:"밑줄 친 This means that ~ 가 의미하는 바로 알맞은 것은? (This means that mealworms can actually feed on plastic.)",
    choices:["mealworm은 플라스틱을 먹이로 삼을 수 있다","mealworm은 플라스틱을 만든다","mealworm은 플라스틱 때문에 죽는다","mealworm은 박테리아를 먹지 않는다"], answer:0,
    explanation:"박테리아가 플라스틱을 분해하므로 mealworm은 플라스틱을 먹이로 먹을 수 있다.", level:"mid"
  },
  {
    passage:"Scientists are now looking for ways to cultivate the bacteria outside of mealworms. They also want to speed up the process by which the bacteria break down plastic.",
    type:"어휘 의미", q:"윗글의 cultivate와 의미가 가장 가까운 것은?",
    choices:["grow","destroy","throw away","hide"], answer:0,
    explanation:"cultivate는 '재배하다, 기르다'. 박테리아를 mealworm 밖에서 기르는 방법을 찾고 있다.", level:"mid"
  },
  {
    passage:"Mining and other industries are causing soil pollution across the globe. Fortunately, there is an eco-friendly and cost-effective way to restore polluted soil—planting willow trees.",
    type:"어휘 의미", q:"윗글의 restore와 의미가 가장 가까운 것은?",
    choices:["bring back to a good condition","make worse","carry away","measure"], answer:0,
    explanation:"restore는 '복원하다, 회복시키다'. 오염된 토양을 원래 상태로 되돌린다는 뜻이다.", level:"mid"
  },
  {
    passage:"Willow trees have extensive and well-developed root systems. As a result, they naturally extract a wide range of harmful materials from the soil.",
    type:"내용 이해", q:"버드나무가 토양의 해로운 물질을 제거할 수 있는 이유는?",
    choices:["넓고 잘 발달한 뿌리를 가지고 있기 때문에","잎이 매우 크기 때문에","물을 거의 필요로 하지 않기 때문에","열매에 독이 있기 때문에"], answer:0,
    explanation:"extensive and well-developed root systems. As a result, they naturally extract ... 라고 했다.", level:"mid"
  },
  {
    passage:"Willow trees can also grow quickly, even in soil with a high acidity level or a lot of heavy metals in it.",
    type:"내용 이해", q:"윗글에서 버드나무의 장점으로 언급된 것은?",
    choices:["산성도가 높거나 중금속이 많은 토양에서도 빨리 자란다","열매를 맺어 식량이 된다","추운 지방에서만 자란다","물속에서만 자란다"], answer:0,
    explanation:"even in soil with a high acidity level or a lot of heavy metals.", level:"mid"
  },
  {
    passage:"Scientists have found that some species of willow trees are able to absorb harmful materials better than others. Therefore, this promising area should be further explored to find out which trees are the most effective.",
    type:"내용 이해", q:"과학자들이 앞으로 더 연구해야 한다고 한 것은?",
    choices:["어떤 버드나무가 가장 효과적인지","어떤 나무가 가장 빨리 죽는지","어떤 토양이 가장 비싼지","버드나무를 어디에서 팔지"], answer:0,
    explanation:"to find out which trees are the most effective.", level:"mid"
  },
  {
    passage:"Researchers have found that they can grow algae on old coffee grounds without adding any other nutrients. If these algae are exposed to twenty hours of light and four hours of darkness each day, they eventually produce high-quality biofuel.",
    type:"내용 일치", q:"윗글의 내용과 일치하는 것은?",
    choices:["조류는 다른 영양분 없이 커피 찌꺼기에서 자랄 수 있다","조류는 하루 종일 어둠 속에서 자란다","조류를 키우려면 비료를 많이 넣어야 한다","조류는 새 커피 원두에서만 자란다"], answer:0,
    explanation:"without adding any other nutrients — 다른 영양분을 넣지 않아도 된다.", level:"mid"
  },
  {
    passage:"If these algae are exposed to _____ hours of light and _____ hours of darkness each day, they eventually produce high-quality biofuel.",
    type:"세부 정보", q:"빈칸에 순서대로 들어갈 숫자로 알맞은 것은?",
    choices:["20, 4","4, 20","12, 12","16, 8"], answer:0,
    explanation:"twenty hours of light and four hours of darkness each day.", level:"mid"
  },
  {
    passage:"We cannot stop everyone in the world from drinking coffee. However, we can reduce greenhouse gas emissions by turning used coffee grounds into biofuel. The biofuel is renewable and sustainable, and it creates only a small amount of emissions.",
    type:"요지", q:"윗글의 요지로 가장 알맞은 것은?",
    choices:["커피 찌꺼기를 바이오 연료로 바꾸면 온실가스 배출을 줄일 수 있다","사람들은 커피를 마시지 말아야 한다","바이오 연료는 만들기가 불가능하다","온실가스는 줄일 방법이 없다"], answer:0,
    explanation:"커피 소비를 막을 순 없지만 찌꺼기를 바이오 연료로 바꿔 배출을 줄일 수 있다는 내용이다.", level:"mid"
  },
  {
    passage:"It seems that Mother Nature has given us one more chance. In return, we need to look for more ways to keep the environment healthy and clean.",
    type:"어휘 의미", q:"윗글의 In return과 의미가 가장 가까운 것은?",
    choices:["as a way of repaying that","for no reason","at the same time","by accident"], answer:0,
    explanation:"자연이 기회를 준 것에 '보답으로' 우리는 환경을 지킬 방법을 더 찾아야 한다.", level:"mid"
  },

  /* ===================== HARD (6) ===================== */
  {
    passage:"Although humans have caused many ______ problems, they are now turning to ______ for solutions.",
    type:"빈칸 추론", q:"빈칸에 들어갈 말로 가장 알맞은 것은?",
    choices:["environmental / nature","economic / machines","social / games","medical / money"], answer:0,
    explanation:"인간이 환경 문제를 일으켰지만 이제는 자연에서 해결책을 찾고 있다는 글 전체의 요지이다.", level:"hard"
  },
  {
    passage:"Mining and other industries are causing soil pollution across the globe. Although polluted soil can be dug up and transported to a landfill, this process is expensive. Moreover, it only moves the problem to another area and does not really solve it. Fortunately, there is an eco-friendly and cost-effective way to restore polluted soil.",
    type:"글의 흐름", q:"'Fortunately'가 쓰인 이유로 가장 알맞은 것은?",
    choices:["앞서 말한 방법의 한계 뒤에 더 나은 해결책이 제시되기 때문에","앞 내용이 모두 긍정적이기 때문에","새로운 문제를 소개하기 위해","앞 내용을 그대로 반복하기 위해"], answer:0,
    explanation:"굴착·운송은 비싸고 문제를 옮길 뿐이라는 한계 뒤에, 친환경적이고 비용 효율적인 방법(버드나무)을 소개한다.", level:"hard"
  },
  {
    passage:"Recycling can help reduce the amount of plastic in our landfills. However, less than ten percent of the world's plastic waste has been recycled so far.",
    type:"글의 흐름", q:"However 앞뒤 문장의 관계로 가장 알맞은 것은?",
    choices:["재활용의 효과 ↔ 실제 재활용 비율은 낮다는 대조","원인 ↔ 결과","예시 ↔ 일반화","시간 순서"], answer:0,
    explanation:"재활용이 도움이 되지만 실제로는 10% 미만만 재활용되었다는 대조 관계이다.", level:"hard"
  },
  {
    passage:"Mealworms can actually feed on plastic. Scientists are now looking for ways to cultivate the bacteria outside of mealworms. This may help us keep our landfills plastic-free.",
    type:"추론", q:"과학자들이 박테리아를 mealworm 밖에서 키우려는 이유로 가장 알맞은 것은?",
    choices:["더 많은 플라스틱을 더 빠르게 분해하는 데 활용하려고","mealworm을 멸종시키려고","플라스틱 제품을 더 많이 만들려고","박테리아를 식량으로 쓰려고"], answer:0,
    explanation:"mealworm에만 의존하지 않고 박테리아를 길러 플라스틱 분해를 확대·가속하려는 것이다.", level:"hard"
  },
  {
    passage:"Mining and other industries are causing soil pollution across the globe. ... Research on the effectiveness of using willow trees for this purpose is in development. Scientists have found that some species of willow trees are able to absorb harmful materials better than others.",
    type:"추론", q:"윗글에서 추론할 수 있는 것으로 가장 알맞은 것은?",
    choices:["모든 버드나무가 똑같이 효과적인 것은 아닐 것이다","버드나무 연구는 이미 모두 끝났다","버드나무는 토양에 아무 영향도 주지 않는다","버드나무는 오염된 토양에서 자랄 수 없다"], answer:0,
    explanation:"일부 종이 다른 종보다 더 잘 흡수한다고 했으므로 종마다 효과가 다르다고 추론할 수 있다.", level:"hard"
  },
  {
    passage:"These are just a few solutions we can find in nature. There could be many more possible solutions to the problems we currently face. It seems that Mother Nature has given us one more chance. If we do, the future of our planet may be bright after all.",
    type:"주제", q:"윗글 전체의 주제로 가장 알맞은 것은?",
    choices:["자연에서 환경 문제의 해결책을 찾을 수 있다","자연은 이미 완전히 파괴되었다","기술이 자연보다 항상 낫다","환경 문제는 해결할 필요가 없다"], answer:0,
    explanation:"플라스틱(mealworm), 토양(버드나무), 온실가스(조류 바이오 연료) 모두 자연에서 찾은 해결책이다.", level:"hard"
  }
];

const QuestionSys = {
  current:null, selected:-1, used:new Set(),

  reset(){
    this.current=null;
    this.selected=-1;
    this.used.clear();
    this.hide();
  },

  _weights(stage){
    for (const r of QUIZ_CONFIG.levelWeights) if (stage <= r.maxStage) return r.w;
    return QUIZ_CONFIG.levelWeights[QUIZ_CONFIG.levelWeights.length-1].w;
  },

  _timeLimit(stage, level){
    let sec = 25;
    for (const r of QUIZ_CONFIG.timeLimits) if (stage <= r.maxStage) { sec = r.sec; break; }
    return sec + (level === "hard" ? QUIZ_CONFIG.hardBonusSec : 0);
  },

  pick(stage){
    // 아직 안 쓴 문제 풀 (모두 소진되면 초기화)
    let pool = QUESTION_BANK.filter((_,i)=>!this.used.has(i));
    if(!pool.length){
      this.used.clear();
      pool = QUESTION_BANK.slice();
    }
    // 레벨별 분류
    const by = { easy:[], mid:[], hard:[] };
    pool.forEach(q => (by[q.level] || by.mid).push(q));

    // 비율에 따라 레벨 선택 (비어 있는 레벨은 제외 → 자동 폴백)
    const w = this._weights(stage);
    let cand = ["easy","mid","hard"].filter(l => by[l].length && w[l] > 0);
    if(!cand.length) cand = ["easy","mid","hard"].filter(l => by[l].length);
    const total = cand.reduce((s,l)=>s+(w[l]||0.01),0);
    let r = Math.random()*total, lv = cand[cand.length-1];
    for (const l of cand){ r -= (w[l]||0.01); if (r <= 0){ lv = l; break; } }

    const list = by[lv];
    const q = list[Math.floor(Math.random()*list.length)];
    this.used.add(QUESTION_BANK.indexOf(q));
    this.current = {...q};
    return this.current;
  },

  show(stage,onSubmit){
    const q=this.pick(stage);
    // 정답 위치 셔플 (매번 정답 번호가 바뀌도록)
    const order=q.choices.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;const t=order[i];order[i]=order[j];order[j]=t;}
    this.current={...q,choices:order.map(i=>q.choices[i]),answer:order.indexOf(q.answer)};
    this.current.timeLimit = this._timeLimit(stage, q.level);
    this.selected=-1;
    GameCore.state="question";
    UI.question(this.current,(ok)=>onSubmit(ok));
  },

  hide(){
    const e=document.getElementById("question-panel");
    if(e)e.remove();
  }
};
window.QuestionSys = QuestionSys;
