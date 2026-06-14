/* ============================================================================
   Rāsikh — memorization engine
   FSRS-5 spaced-repetition scheduler wrapped in a sabaq / sabqī / manzil
   three-stream state machine. Scheduled unit = one muṣḥaf line.
   ========================================================================== */

const FSRS = (() => {
  // Battle-tested FSRS-5 default parameters (19 weights).
  const W = [0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,
             1.54575,0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,
             2.9898,0.51655,0.6621];
  const DECAY = -0.5;
  const FACTOR = Math.pow(0.9, 1/DECAY) - 1;   // = 19/81
  const MIN_S = 0.01, MAX_S = 36500;
  const clampD = d => Math.min(Math.max(d,1),10);
  const clampS = s => Math.min(Math.max(s,MIN_S),MAX_S);

  // Grades: 1 Again · 2 Hard · 3 Good · 4 Easy
  const initS = g => clampS(W[g-1]);
  const initD = g => clampD(W[4] - Math.exp(W[5]*(g-1)) + 1);

  // Retrievability after t days at stability S
  const R = (t,S) => Math.pow(1 + FACTOR*t/S, DECAY);
  // Interval (days) to reach desired retention rd
  const interval = (rd,S) => Math.max(1, Math.round((S/FACTOR)*(Math.pow(rd,1/DECAY)-1)));

  function nextD(D,g){
    const dd = -W[6]*(g-3);
    let d = D + dd*(10-D)/9;
    d = W[7]*initD(4) + (1-W[7])*d;           // mean reversion toward Easy-init
    return clampD(d);
  }
  function recallS(D,S,r,g){
    const hard = g===2 ? W[15] : 1;
    const easy = g===4 ? W[16] : 1;
    const inc = Math.exp(W[8])*(11-D)*Math.pow(S,-W[9])*(Math.exp(W[10]*(1-r))-1)*hard*easy;
    return clampS(S*(1+inc));
  }
  function forgetS(D,S,r){
    const sf = W[11]*Math.pow(D,-W[12])*(Math.pow(S+1,W[13])-1)*Math.exp(W[14]*(1-r));
    return clampS(Math.min(sf,S));
  }
  // same-day (short-term) stability change, used for learning steps
  function shortS(S,g){ return clampS(S*Math.exp(W[17]*(g-3+W[18]))); }

  return { W, DECAY, R, interval, initS, initD, nextD, recallS, forgetS, shortS, clampD, clampS };
})();

/* --------------------------------------------------------------------------
   Time helpers — day granularity, local midnight
   ------------------------------------------------------------------------ */
const Day = {
  MS: 86400000,
  todayKey(d=new Date()){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(); },
  diff(aMs,bMs){ return Math.round((aMs-bMs)/Day.MS); },
  add(ms,days){ return ms + days*Day.MS; },
  fmt(ms){ const d=new Date(ms); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
};

/* --------------------------------------------------------------------------
   Segment model — derive line-cards and verse units from QDATA
   ------------------------------------------------------------------------ */
const Model = (() => {
  const pages = QDATA.pages;
  const targets = QDATA.targets;
  const verseIndex = QDATA.verseIndex;

  // ordered (page,line) line-segments per target, plus verse lists
  const segByTarget = {};   // id -> [{seg, page, line, verses:[key], firstWord, lastWord}]
  const versesByTarget = {};// id -> [verseKey...]
  const segIndex = {};      // segId -> seg object
  const verseToTarget = {};

  function segId(page,line){ return `L:${page}:${line}`; }
  function inRange(t,key){
    const [s,a] = key.split(':').map(Number);
    return s===t.surah && a>=t.range[0] && a<=t.range[1];
  }

  targets.forEach(t => {
    const segs = [];
    const vset = [];
    t.pages.forEach(pg => {
      const page = pages[pg];
      if(!page) return;
      page.lines.forEach(ln => {
        // which target verses appear on this line (as words)
        const verses = [...new Set(ln.words
          .filter(w => w.t==='word' && w.v && inRange(t,w.v))
          .map(w => w.v))];
        if(verses.length===0) return; // header/basmala-only lines aren't scheduled
        const wordPositions = ln.words.filter(w=>w.t==='word');
        const seg = {
          seg: segId(pg,ln.n), target:t.id, page:pg, line:ln.n,
          verses, mode:t.mode
        };
        segs.push(seg);
        segIndex[seg.seg] = seg;
        verses.forEach(v => { if(!vset.includes(v)) vset.push(v); verseToTarget[v]=t.id; });
      });
    });
    segByTarget[t.id] = segs;
    versesByTarget[t.id] = vset;
  });

  // ordered verse list with metadata for drills
  function verseList(targetId){ return versesByTarget[targetId]; }
  function verseNum(key){ return Number(key.split(':')[1]); }

  // words of a verse, ordered, with their page/line/glyph
  function verseWords(key){
    const out = [];
    const idx = verseIndex[key];
    if(!idx) return out;
    const page = pages[idx.page];
    idx.lines.forEach(li => {
      const ln = page.lines.find(l=>l.n===li.line);
      ln.words.forEach(w => {
        if(w.t==='word' && w.v===key) out.push(w);
      });
    });
    return out.sort((a,b)=>a.p-b.p);
  }

  function allSegs(){ return Object.values(segIndex); }

  return { pages, targets, segByTarget, versesByTarget, segIndex, verseIndex,
           segId, verseList, verseNum, verseWords, verseToTarget, allSegs };
})();

/* --------------------------------------------------------------------------
   Store — localStorage persistence + card lifecycle
   ------------------------------------------------------------------------ */
const Store = (() => {
  const KEY = 'rasikh.v1';
  const DEFAULTS = {
    settings: { retention: 0.92, dailyNew: 3, theme: 'system' },
    cards: {},            // segId -> card
    log: [],              // {t, seg, grade}
    streak: { days: {}, current: 0, best: 0 },
    seeded: false,
    created: Date.now()
  };
  let db = load();

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){ const d = JSON.parse(raw); return Object.assign({}, DEFAULTS, d,
        {settings:Object.assign({},DEFAULTS.settings,d.settings)}); }
    }catch(e){ console.warn('load failed',e); }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){ console.warn('save failed',e); } }

  function newCard(seg){
    return { seg, state:'new', S:0, D:0, due:0, last:0, reps:0, lapses:0, learnedAt:0 };
  }
  function card(segId){ return db.cards[segId] || (db.cards[segId]=newCard(segId)); }

  // Seed: Yāsīn lines start as already-known (review, due now → stretch from there).
  // Baqara lines start new (enter on demand via Memorize).
  function seedIfNeeded(){
    if(db.seeded) return;
    const today = Day.todayKey();
    Model.allSegs().forEach(s => {
      const c = card(s.seg);
      if(s.mode==='maintain'){
        c.state='review';
        c.S = FSRS.initS(3);            // Good-init stability
        c.D = FSRS.initD(3);
        c.due = today;                  // first session reviews all, then FSRS stretches
        c.reps = 1;
        c.learnedAt = 0;                // already known long ago → manzil, not today's "new"
      }
    });
    db.seeded = true; save();
  }

  function setSetting(k,v){ db.settings[k]=v; save(); }
  function getSettings(){ return db.settings; }

  return { db, save, card, seedIfNeeded, setSetting, getSettings,
           reset(){ db = JSON.parse(JSON.stringify(DEFAULTS)); save(); } };
})();

/* --------------------------------------------------------------------------
   Scheduler — review a card, compute queues, three-stream logic
   ------------------------------------------------------------------------ */
const Scheduler = (() => {
  const SABQI_WINDOW = 7;   // days a learned line stays in daily review

  function retrievability(c){
    if(c.state==='new' || !c.S) return 0;
    const t = Math.max(0, Day.diff(Day.todayKey(), c.last));
    return FSRS.R(t, c.S);
  }

  // Apply a self-grade to a line-card.
  function grade(segId, g){
    const c = Store.card(segId);
    const rd = Store.getSettings().retention;
    const today = Day.todayKey();
    const t = c.last ? Math.max(0, Day.diff(today, c.last)) : 0;

    if(c.state==='new' || c.reps===0){
      c.S = FSRS.initS(g);
      c.D = FSRS.initD(g);
      c.state = g===1 ? 'relearning' : 'review';
      c.learnedAt = today;
    } else {
      const r = FSRS.R(t, c.S || FSRS.initS(3));
      if(g===1){
        c.S = FSRS.forgetS(c.D, c.S, r);
        c.D = FSRS.nextD(c.D, g);
        c.state = 'relearning';
        c.lapses++;
      } else {
        c.S = FSRS.recallS(c.D, c.S, r, g);
        c.D = FSRS.nextD(c.D, g);
        c.state = 'review';
      }
    }
    c.reps++;
    c.last = today;
    // relearning lapses get a short leash (due next day); else FSRS interval
    const ivl = (g===1) ? 1 : FSRS.interval(rd, c.S);
    c.due = Day.add(today, ivl);
    Store.db.log.push({ t: Date.now(), seg: segId, grade: g });
    bumpStreak(today);
    Store.save();
    return { interval: ivl, due: c.due };
  }

  function bumpStreak(today){
    const s = Store.db.streak;
    const key = String(today);
    if(!s.days[key]){
      s.days[key] = (s.days[key]||0);
    }
    s.days[key] = (s.days[key]||0) + 1;
    // recompute current streak
    let cur = 0, d = today;
    while(s.days[String(d)]){ cur++; d = Day.add(d,-1); }
    s.current = cur; s.best = Math.max(s.best, cur);
  }

  // Queues for a target (or all)
  function queues(targetId){
    const today = Day.todayKey();
    const due = [], sabqi = [], manzil = [], weak = [], fresh = [];
    const segs = targetId ? Model.segByTarget[targetId] : Model.allSegs();
    segs.forEach(s => {
      const c = Store.card(s.seg);
      if(c.state==='new'){ fresh.push(s); return; }
      const isSabqi = c.learnedAt && Day.diff(today,c.learnedAt) <= SABQI_WINDOW;
      const isDue = c.due <= today;
      if(isSabqi){ sabqi.push(s); if(isDue||true) due.push(s); }
      else if(isDue){ manzil.push(s); due.push(s); }
      if(c.lapses>0 && retrievability(c) < 0.85) weak.push(s);
    });
    // de-dup due (sabqi forced daily + manzil due)
    const seen = new Set(); const dueU = [];
    due.forEach(s=>{ if(!seen.has(s.seg)){ seen.add(s.seg); dueU.push(s); } });
    return { due:dueU, sabqi, manzil, weak, fresh };
  }

  // How many new lines may be introduced today (daily target minus already learned today)
  function newAllowance(){
    const today = Day.todayKey();
    const target = Store.getSettings().dailyNew;
    let learnedToday = 0;
    Object.values(Store.db.cards).forEach(c=>{ if(c.learnedAt===today && c.state!=='new') learnedToday++; });
    return Math.max(0, target - learnedToday);
  }

  return { grade, queues, retrievability, newAllowance, SABQI_WINDOW };
})();
