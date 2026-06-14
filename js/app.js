/* ============================================================================
   Rāsikh — application
   ========================================================================== */
const $ = (s,r=document)=>r.querySelector(s);
const el = (tag, attrs={}, kids=[])=>{
  const n = document.createElement(tag);
  for(const k in attrs){
    if(k==='class') n.className=attrs[k];
    else if(k==='html') n.innerHTML=attrs[k];
    else if(k==='text') n.textContent=attrs[k];
    else if(k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
    else if(k==='data') Object.assign(n.dataset, attrs[k]);
    else if(attrs[k]!=null) n.setAttribute(k, attrs[k]);
  }
  (Array.isArray(kids)?kids:[kids]).forEach(c=>{ if(c==null) return;
    n.appendChild(typeof c==='string'?document.createTextNode(c):c); });
  return n;
};
const clear = n => { while(n.firstChild) n.removeChild(n.firstChild); };
function toast(msg){ const t=el('div',{class:'toast',text:msg}); document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1700); }
const VNUM = k => Number(k.split(':')[1]);
const fmtVerse = k => { const t = Model.targets.find(t=>t.id===Model.verseToTarget[k]);
  return `${t?t.name_en.split(' · ')[0]:'Sūra'} ${k}`; };

const State = {
  screen:'today',
  target: 'baqarah2',
  page: null,
};

/* ---------------- navigation ---------------- */
const SCREENS = ['today','read','memorize','drills','progress'];
function go(screen){
  State.screen = screen;
  SCREENS.forEach(s=>{
    $('#sc-'+s).classList.toggle('hide', s!==screen);
  });
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.s===screen));
  ({today:Today, read:Read, memorize:Memorize, drills:Drills, progress:Progress}[screen])();
  window.scrollTo(0,0);
}

/* ===========================================================================
   TODAY
   =========================================================================== */
function Today(){
  const root = $('#sc-today'); clear(root);
  const hour = new Date().getHours();
  const greet = hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const s = Store.db.streak;

  root.appendChild(el('div',{class:'shead'},[
    el('div',{},[
      el('div',{class:'eyebrow',text:greet}),
      el('h1',{class:'serif',html:'Today &nbsp;<span style="font-family:var(--serif);opacity:.5">·</span>&nbsp; رَاسِخ'}),
    ]),
    el('button',{class:'iconbtn',onclick:openSettings,'aria-label':'Settings',
      html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'}),
  ]));

  // streak + global due
  let totalDue=0, totalNew=0;
  Model.targets.forEach(t=>{ const q=Scheduler.queues(t.id); totalDue+=q.due.length; });
  totalNew = Scheduler.newAllowance();

  root.appendChild(el('div',{class:'stats',style:'margin-bottom:14px'},[
    el('div',{class:'stat'},[el('div',{class:'n accent',text:String(totalDue)}),el('div',{class:'l',text:'Due now'})]),
    el('div',{class:'stat'},[el('div',{class:'n',text:String(s.current)}),el('div',{class:'l',text:'Day streak'})]),
    el('div',{class:'stat'},[el('div',{class:'n',text:String(totalNew)}),el('div',{class:'l',text:'New today'})]),
  ]));

  // per-target cards
  Model.targets.forEach(t=>{
    const segs = Model.segByTarget[t.id];
    const known = segs.filter(x=>Store.card(x.seg).state!=='new').length;
    const q = Scheduler.queues(t.id);
    const pct = Math.round(100*known/segs.length);
    const card = el('div',{class:'card'},[
      el('div',{class:'row spread'},[
        el('div',{},[
          el('div',{class:'row',style:'gap:9px'},[
            el('h2',{class:'ar serif',style:'font-size:24px',text:t.name_ar}),
            el('span',{class:'pill '+(t.mode==='learn'?'':'gold'),text:t.mode==='learn'?'Learning':'Maintaining'}),
          ]),
          el('div',{class:'sub muted',style:'font-size:13px;margin-top:3px',text:t.name_en}),
        ]),
      ]),
      el('div',{class:'row',style:'gap:10px;margin:14px 0 6px'},[
        el('div',{class:'bar',style:'flex:1'},[el('i',{style:`width:${pct}%`})]),
        el('span',{class:'faint',style:'font:600 12px/1 var(--sans)',text:`${known}/${segs.length} lines`}),
      ]),
      el('div',{class:'row',style:'gap:8px;margin-top:14px'},[
        el('button',{class:'btn primary',style:'flex:1',disabled:q.due.length?null:true,
          onclick:()=>startReview(t.id)},`Review ${q.due.length?'('+q.due.length+')':''}`),
        t.mode==='learn' ? el('button',{class:'btn',style:'flex:1',disabled:(q.fresh.length&&Scheduler.newAllowance())?null:true,
          onclick:()=>{State.target=t.id; go('memorize');}},'Learn new') : null,
        el('button',{class:'iconbtn',onclick:()=>{State.target=t.id; State.page=t.pages[0]; go('read');},'aria-label':'Read',
          html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 5h7a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H2zM22 5h-7a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H22z"/></svg>'}),
      ]),
    ]);
    root.appendChild(card);
  });

  // weak spots
  const weak = [];
  Model.targets.forEach(t=> Scheduler.queues(t.id).weak.forEach(s=>weak.push(s)));
  if(weak.length){
    root.appendChild(el('div',{class:'card',style:'margin-top:14px'},[
      el('div',{class:'row spread'},[
        el('div',{class:'eyebrow',text:'Needs repair'}),
        el('span',{class:'pill plain',text:weak.length+' lines'}),
      ]),
      el('div',{class:'sub muted',style:'margin:8px 0 12px;font-size:13px',
        text:'Lines you have lapsed on and whose recall has decayed. A quick repair pass before new memorization.'}),
      el('button',{class:'btn block',onclick:()=>startReview(null,weak)},'Repair these lines'),
    ]));
  }

  if(totalDue===0 && weak.length===0){
    root.appendChild(el('div',{class:'card center-col',style:'margin-top:14px'},[
      el('div',{class:'big-ar serif',style:'color:var(--green)',text:'تمّ'}),
      el('div',{class:'muted',text:'Nothing due right now. Your review schedule is clear.'}),
    ]));
  }
}

/* ===========================================================================
   READ
   =========================================================================== */
function Read(){
  const root = $('#sc-read'); clear(root);
  const t = Model.targets.find(x=>x.id===State.target);
  if(State.page==null || !t.pages.includes(State.page)) State.page = t.pages[0];

  root.appendChild(el('div',{class:'shead'},[
    el('div',{},[el('div',{class:'eyebrow',text:'Read'}),
      el('h1',{class:'serif',text:'The muṣḥaf'})]),
  ]));
  root.appendChild(targetSwitch(id=>{ State.target=id; State.page=Model.targets.find(t=>t.id===id).pages[0]; Read(); }));

  const sheet = el('div',{class:'sheet',style:'margin-top:14px'},[
    el('div',{class:'inner'},[]),
  ]);
  const inner = sheet.querySelector('.inner');
  Render.registerFonts().then(()=>{
    clear(inner);
    inner.appendChild(Render.page(State.page,{ onWordTap:(w)=>{
      if(w.v) toast(`${fmtVerse(w.v)}`);
    }}));
    Render.fit(inner);
  });
  const idx = t.pages.indexOf(State.page);
  sheet.appendChild(el('div',{class:'pagefoot',text:`Page ${State.page}`}));
  root.appendChild(sheet);

  root.appendChild(el('div',{class:'row spread',style:'margin-top:14px;gap:10px'},[
    el('button',{class:'btn ghost',disabled:idx<=0?true:null,onclick:()=>{State.page=t.pages[idx-1];Read();}},'‹ Prev'),
    el('span',{class:'faint',style:'font:600 13px/1 var(--sans)',text:`${idx+1} / ${t.pages.length}`}),
    el('button',{class:'btn ghost',disabled:idx>=t.pages.length-1?true:null,onclick:()=>{State.page=t.pages[idx+1];Read();}},'Next ›'),
  ]));
  root.appendChild(el('div',{class:'faint',style:'text-align:center;margin-top:14px;font-size:12.5px',
    text:'Tap any word to see its location. Verse numbers shown in gold.'}));
}

function targetSwitch(onPick){
  const seg = el('div',{class:'segmented'});
  Model.targets.forEach(t=>{
    seg.appendChild(el('button',{class:State.target===t.id?'on':'',onclick:()=>onPick(t.id)},[
      el('span',{class:'ar',text:t.name_ar+'  '}), el('span',{text:t.short}),
    ]));
  });
  return seg;
}

/* ===========================================================================
   MEMORIZE  (acquisition: hide/peek/reveal + expanding-retrieval lock-in)
   =========================================================================== */
function Memorize(){
  const root = $('#sc-memorize'); clear(root);
  const t = Model.targets.find(x=>x.id===State.target) || Model.targets[0];
  if(t.mode!=='learn'){ State.target='baqarah2'; }
  const tgt = Model.targets.find(x=>x.id===State.target);

  root.appendChild(el('div',{class:'shead'},[
    el('div',{},[el('div',{class:'eyebrow',text:'Memorize · sabaq'}),
      el('h1',{class:'serif',text:'New portion'})]),
  ]));

  const segs = Model.segByTarget[tgt.id];
  const next = segs.find(s=>Store.card(s.seg).state==='new');
  const allowance = Scheduler.newAllowance();

  if(!next){ root.appendChild(el('div',{class:'card center-col'},[
    el('div',{class:'big-ar serif',style:'color:var(--green)',text:'✓'}),
    el('div',{class:'muted',text:'Every line in this sūra is in your review cycle.'})]));
    return; }
  if(allowance<=0){ root.appendChild(el('div',{class:'card center-col'},[
    el('div',{class:'big-ar serif',style:'color:var(--gold)',text:'…'}),
    el('div',{class:'muted',text:`You have reached today's new-line target. Consolidate what you have; come back tomorrow, or raise the daily target in settings.`}),
    el('button',{class:'btn',onclick:openSettings},'Adjust daily target')]));
    return; }

  // the line in context: show its page, this line revealed, others dimmed
  const verseLabel = next.verses.map(v=>v).join(', ');
  const card = el('div',{class:'card'},[
    el('div',{class:'row spread'},[
      el('div',{class:'eyebrow',text:`Page ${next.page} · line ${next.line}`}),
      el('span',{class:'pill plain',text:`${allowance} new left today`}),
    ]),
  ]);
  const stage = el('div',{class:'sheet',style:'margin:14px 0'},[el('div',{class:'inner'})]);
  const inner = stage.querySelector('.inner');
  card.appendChild(stage);

  // lock-in state: expanding retrieval — 5 reps, decreasing visibility
  let rep = 0; const REPS=5;
  const ctl = el('div',{});
  card.appendChild(ctl);

  function drawStage(){
    Render.registerFonts().then(()=>{
      clear(inner);
      const pageEl = Render.page(next.page, {
        highlightVerses:new Set(next.verses), dimOthers:true,
        hiddenLines: rep===0? new Set() : new Set([next.line]),
      });
      inner.appendChild(pageEl);
      Render.fit(inner);
      // mark the focus line
      const lineEl = pageEl.querySelector(`.mline[data-line="${next.line}"]`);
      if(lineEl){ lineEl.style.outline='2px solid var(--green)'; lineEl.style.outlineOffset='6px';
        lineEl.style.borderRadius='8px'; }
    });
  }
  function drawCtl(){
    clear(ctl);
    if(rep===0){
      ctl.appendChild(el('div',{class:'sub muted',style:'margin-bottom:12px;font-size:13.5px',
        text:'Read the highlighted line aloud a few times, watching its place on the page. When the shape feels set, begin the lock-in.'}));
      ctl.appendChild(el('button',{class:'btn primary block',onclick:()=>{rep=1;drawStage();drawCtl();}},'Begin lock-in →'));
    } else if(rep<=REPS){
      ctl.appendChild(el('div',{class:'row',style:'gap:8px;margin-bottom:12px'},[
        el('div',{class:'bar',style:'flex:1'},[el('i',{style:`width:${(rep-1)/REPS*100}%`})]),
        el('span',{class:'faint',style:'font:600 12px/1 var(--sans)',text:`rep ${rep}/${REPS}`}),
      ]));
      ctl.appendChild(el('div',{class:'sub muted',style:'margin-bottom:12px;font-size:13.5px',
        text:'Recite the hidden line from memory. Peek only if stuck — each rep leans more on recall.'}));
      ctl.appendChild(el('div',{class:'row',style:'gap:8px'},[
        el('button',{class:'btn',style:'flex:1',onclick:()=>{
          const lineEl = inner.querySelector(`.mline[data-line="${next.line}"]`);
          if(lineEl){ lineEl.classList.add('revealed'); setTimeout(()=>lineEl.classList.remove('revealed'),900); }
        }},'Peek'),
        el('button',{class:'btn primary',style:'flex:1.4',onclick:()=>{ rep++; if(rep>REPS){ drawDone(); } else { drawStage(); drawCtl(); } }},'Got it →'),
      ]));
    }
  }
  function drawDone(){
    clear(ctl);
    Render.registerFonts().then(()=>{ clear(inner);
      const pageEl = Render.page(next.page,{highlightVerses:new Set(next.verses),dimOthers:true});
      inner.appendChild(pageEl); Render.fit(inner); });
    ctl.appendChild(el('div',{class:'sub',style:'margin-bottom:12px;font-size:14px;color:var(--green);font-weight:600',
      text:'Locked in. Add this line to your review cycle?'}));
    ctl.appendChild(el('div',{class:'row',style:'gap:8px'},[
      el('button',{class:'btn',style:'flex:1',onclick:()=>{ rep=1; drawStage(); drawCtl(); }},'More reps'),
      el('button',{class:'btn primary',style:'flex:1.6',onclick:()=>{
        Scheduler.grade(next.seg, 3);   // Good — enters sabqī (daily) then FSRS
        toast('Line added to review · sabqī');
        Memorize();
      }},'Mark learned ✓'),
    ]));
  }
  drawStage(); drawCtl();
  root.appendChild(card);

  // queue preview
  const remaining = segs.filter(s=>Store.card(s.seg).state==='new').length;
  root.appendChild(el('div',{class:'faint',style:'text-align:center;margin-top:14px;font-size:12.5px',
    text:`${remaining} lines remain in ${tgt.short}. New lines join a 7-day daily review (sabqī) before spacing out.`}));
}

/* ===========================================================================
   REVIEW  (FSRS due queue — line recall + self-grade)
   =========================================================================== */
let reviewQueue=[], reviewIdx=0, reviewStats=null;
function startReview(targetId, customSegs){
  const q = customSegs || Scheduler.queues(targetId).due;
  if(!q.length){ toast('Nothing due'); return; }
  reviewQueue = q.slice(); reviewIdx=0; reviewStats={again:0,hard:0,good:0,easy:0,n:q.length};
  openOverlay(); drawReview();
}
function drawReview(){
  const o = $('#overlay-body'); clear(o);
  if(reviewIdx>=reviewQueue.length){ return reviewSummary(); }
  const seg = reviewQueue[reviewIdx];
  const s = Model.segIndex[seg.seg]||seg;
  const t = Model.targets.find(x=>x.id===s.target);
  o.appendChild(el('div',{class:'row spread',style:'margin-bottom:6px'},[
    el('div',{class:'eyebrow',text:`${t?t.short:''} · review`}),
    el('span',{class:'faint',style:'font:600 13px/1 var(--sans)',text:`${reviewIdx+1} / ${reviewQueue.length}`}),
  ]));
  o.appendChild(el('div',{class:'bar',style:'margin-bottom:16px'},[el('i',{style:`width:${reviewIdx/reviewQueue.length*100}%`})]));

  const sheet = el('div',{class:'sheet'},[el('div',{class:'inner'})]);
  const inner = sheet.querySelector('.inner');
  o.appendChild(sheet);

  // cue: preceding line faint; target line veiled
  const page = QDATA.pages[s.page];
  const prev = page.lines.find(l=>l.n===s.line-1);
  Render.registerFonts().then(()=>{
    clear(inner);
    if(prev && prev.words.some(w=>w.t==='word')){
      const pe = Render.words(prev.words); pe.style.opacity='.32'; inner.appendChild(pe);
    }
    const cur = page.lines.find(l=>l.n===s.line);
    const ce = Render.words(cur.words); ce.classList.add('veil'); ce.dataset.line=s.line;
    inner.appendChild(ce);
  });
  sheet.appendChild(el('div',{class:'pagefoot',text:`Page ${s.page} · line ${s.line}${s.verses?' · '+s.verses[0]:''}`}));

  const ctl = el('div',{style:'margin-top:16px'});
  o.appendChild(ctl);
  ctl.appendChild(el('div',{class:'sub muted',style:'text-align:center;margin-bottom:12px;font-size:13.5px',
    text:'Recite this line from the cue above, then reveal to check.'}));
  ctl.appendChild(el('button',{class:'btn primary block lg',onclick:()=>{
    inner.querySelector('.veil')?.classList.add('revealed'); showGrades(ctl,seg);
  }},'Reveal'));
}
function showGrades(ctl,seg){
  clear(ctl);
  const defs=[['again','Again',1,'< 1d'],['hard','Hard',2,''],['good','Good',3,''],['easy','Easy',4,'']];
  const grid=el('div',{class:'grades'});
  defs.forEach(([cls,label,g])=>{
    const c=Store.card(seg.seg);
    const ivl = g===1?1:FSRS.interval(Store.getSettings().retention, /*preview*/ Math.max(c.S|| FSRS.initS(3), FSRS.initS(g)));
    grid.appendChild(el('button',{class:'grade '+cls,onclick:()=>{
      const r=Scheduler.grade(seg.seg,g); reviewStats[cls]++; reviewIdx++; drawReview();
    }},[ el('div',{class:'g',text:label}),
        el('div',{class:'i',text: g===1?'soon':`${r2(ivl)}`}) ]));
  });
  ctl.appendChild(el('div',{class:'sub muted',style:'text-align:center;margin-bottom:10px;font-size:13px',text:'How was your recall?'}));
  ctl.appendChild(grid);
}
function r2(d){ if(d<1)return '<1d'; if(d<30)return d+'d'; if(d<365)return Math.round(d/30)+'mo'; return (d/365).toFixed(1)+'y'; }
function reviewSummary(){
  const o=$('#overlay-body'); clear(o);
  const s=reviewStats;
  o.appendChild(el('div',{class:'center-col'},[
    el('div',{class:'big-ar serif',style:'color:var(--green)',text:'أحسنت'}),
    el('h2',{class:'serif',text:`${s.n} lines reviewed`}),
    el('div',{class:'stats',style:'width:100%;margin-top:8px'},[
      el('div',{class:'stat'},[el('div',{class:'n',text:String(s.good+s.easy)}),el('div',{class:'l',text:'Solid'})]),
      el('div',{class:'stat'},[el('div',{class:'n',text:String(s.hard)}),el('div',{class:'l',text:'Shaky'})]),
      el('div',{class:'stat'},[el('div',{class:'n',text:String(s.again)}),el('div',{class:'l',text:'Relearn'})]),
    ]),
    el('button',{class:'btn primary block',style:'margin-top:8px',onclick:()=>{closeOverlay();go('today');}},'Done'),
  ]));
}

/* ===========================================================================
   DRILLS  (positional · verse↔number · mutashābihāt)
   =========================================================================== */
function Drills(){
  const root=$('#sc-drills'); clear(root);
  root.appendChild(el('div',{class:'shead'},[el('div',{},[
    el('div',{class:'eyebrow',text:'Drills'}), el('h1',{class:'serif',text:'Sharpen recall'})])]));
  root.appendChild(targetSwitch(id=>{State.target=id;Drills();}));

  const items=[
    ['Continue from here','A random spot in the sūra — recite what comes next, then reveal to check.','seq',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 3l14 9-14 9z"/></svg>'],
    ['Verse → number','See a verse, name its āyah number.','v2n',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h10M4 17h7"/></svg>'],
    ['Number → verse','Given an āyah number, pick the verse that opens it.','n2v',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 7l5-3 5 3v6l-5 3-5-3z"/><path d="M12 22v-9"/></svg>'],
    ['Mutashābihāt','Train the near-identical passages that confuse the memory.','mut',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/></svg>'],
  ];
  const list=el('div',{class:'card',style:'margin-top:14px'});
  items.forEach(([t,d,key,svg],i)=>{
    list.appendChild(el('button',{class:'lrow',style:'width:100%;text-align:left;background:none;border:0;border-bottom:'+(i<items.length-1?'1px solid var(--line)':'0'),
      onclick:()=>({seq:drillSeq,v2n:drillV2N,n2v:drillN2V,mut:Mutashabihat}[key])()},[
      el('span',{class:'lead'+(key==='mut'?' gold':''),html:svg}),
      el('span',{class:'body'},[el('div',{class:'t',text:t}),el('div',{class:'s',text:d})]),
      el('span',{class:'faint',html:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6"/></svg>'}),
    ]));
  });
  root.appendChild(list);
}

function drillSeq(){
  const verses = Model.versesByTarget[State.target];
  openOverlay();
  function round(){
    const o=$('#overlay-body'); clear(o);
    const i = Math.floor(Math.random()*(verses.length-2));
    const anchor=verses[i], nexts=[verses[i+1], verses[i+2]].filter(Boolean);
    o.appendChild(drillHead('Continue from here', closeOverlay));
    const sheet=el('div',{class:'sheet'},[el('div',{class:'inner'})]); const inner=sheet.querySelector('.inner');
    o.appendChild(sheet);
    Render.registerFonts().then(()=>{ clear(inner);
      inner.appendChild(el('div',{class:'sub faint',style:'text-align:center;margin-bottom:8px;font-size:12px',text:'recite what follows'}));
      const a=Render.verse(anchor); inner.appendChild(a);
      nexts.forEach(n=>{ const v=Render.verse(n,{}); v.classList.add('veil'); v.style.marginTop='.2em'; inner.appendChild(v); });
    });
    const ctl=el('div',{style:'margin-top:16px'}); o.appendChild(ctl);
    ctl.appendChild(el('button',{class:'btn primary block lg',onclick:()=>{
      inner.querySelectorAll('.veil').forEach(v=>v.classList.add('revealed'));
      clear(ctl);
      ctl.appendChild(el('div',{class:'sub muted',style:'text-align:center;margin-bottom:10px;font-size:13px',text:'Did the continuation match?'}));
      ctl.appendChild(el('div',{class:'row',style:'gap:8px'},[
        el('button',{class:'btn',style:'flex:1',onclick:round},'Missed'),
        el('button',{class:'btn primary',style:'flex:1',onclick:round},'Got it → next'),
      ]));
    }},'Reveal continuation'));
  }
  round();
}

function drillV2N(){
  const verses=Model.versesByTarget[State.target];
  openOverlay();
  function round(){
    const o=$('#overlay-body'); clear(o);
    const key=verses[Math.floor(Math.random()*verses.length)];
    const correct=VNUM(key);
    const opts=new Set([correct]);
    while(opts.size<4){ const k=verses[Math.floor(Math.random()*verses.length)]; opts.add(VNUM(k)); }
    const shuffled=[...opts].sort(()=>Math.random()-.5);
    o.appendChild(drillHead('Which āyah number?', closeOverlay));
    const sheet=el('div',{class:'sheet'},[el('div',{class:'inner'})]); const inner=sheet.querySelector('.inner');
    o.appendChild(sheet);
    Render.registerFonts().then(()=>{ clear(inner); inner.appendChild(Render.verse(key)); });
    const grid=el('div',{class:'num-grid',style:'margin-top:16px'}); o.appendChild(grid);
    shuffled.forEach(n=>{ const b=el('button',{class:'num',text:String(n),onclick:()=>{
      if(n===correct){ b.classList.add('correct'); setTimeout(round,650); }
      else { b.classList.add('wrong'); [...grid.children].forEach(c=>{ if(c.textContent==String(correct)) c.classList.add('correct'); }); setTimeout(round,1100); }
    }}); grid.appendChild(b); });
  }
  round();
}

function drillN2V(){
  const verses=Model.versesByTarget[State.target];
  openOverlay();
  function round(){
    const o=$('#overlay-body'); clear(o);
    const key=verses[Math.floor(Math.random()*verses.length)];
    const correct=VNUM(key);
    const opts=new Set([key]);
    while(opts.size<4){ opts.add(verses[Math.floor(Math.random()*verses.length)]); }
    const shuffled=[...opts].sort(()=>Math.random()-.5);
    o.appendChild(drillHead('Find the verse', closeOverlay));
    o.appendChild(el('div',{class:'center-col',style:'padding:14px 0'},[
      el('div',{class:'eyebrow',text:'recall āyah'}),
      el('div',{class:'big-ar serif',style:'font-size:46px;color:var(--green)',text:String(correct)}),
    ]));
    const ch=el('div',{class:'choices'}); o.appendChild(ch);
    Render.registerFonts().then(()=>{
      shuffled.forEach(k=>{
        const btn=el('button',{class:'choice'});
        const v=Render.verse(k); v.style.fontSize='.9em'; btn.appendChild(v);
        btn.addEventListener('click',()=>{
          if(k===key){ btn.classList.add('correct'); setTimeout(round,700); }
          else { btn.classList.add('wrong'); setTimeout(round,1100); }
        });
        ch.appendChild(btn);
      });
    });
  }
  round();
}

function drillHead(title,onClose){
  return el('div',{class:'row spread',style:'margin-bottom:14px'},[
    el('h2',{class:'serif',style:'font-size:19px',text:title}),
    el('button',{class:'iconbtn',onclick:onClose,'aria-label':'Close',
      html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18"/></svg>'}),
  ]);
}

/* ---- Mutashābihāt trainer ---- */
function Mutashabihat(){
  openOverlay();
  const groups = QDATA.mutashabihat;
  const o=$('#overlay-body'); clear(o);
  // filter to current target where possible, else show all
  const tg = State.target==='yasin'?'36':'2';
  const mine = groups.filter(g=>g.src[0].startsWith(tg+':'));
  const show = mine.length?mine:groups;
  o.appendChild(drillHead('Mutashābihāt', closeOverlay));
  o.appendChild(el('div',{class:'sub muted',style:'margin-bottom:14px;font-size:13px',
    text:`${show.length} near-identical passage sets. The shared words are dimmed; the distinguishing words stand in ink.`}));
  Render.registerFonts().then(()=>{
    show.forEach(g=>{
      const all=[...g.src, ...g.matches.flat()];
      const card=el('div',{class:'card',style:'margin-bottom:12px'});
      if(g.label) card.appendChild(el('div',{class:'ar serif',style:'text-align:right;font-size:20px;color:var(--green);margin-bottom:4px',text:g.label}));
      // compute the common word set across the group to dim
      const common = commonWords(all);
      all.forEach((k,i)=>{
        const ws=Model.verseWords(k);
        const row=el('div',{class:'mline center inline-run',style:'margin:.25em 0'});
        ws.forEach(w=>{ const sp=Render.wordSpan(w);
          if(common.has(normW(w.x))) sp.classList.add('dim'); row.appendChild(sp); });
        const wrap=el('div',{class:'row',style:'gap:8px;align-items:baseline;justify-content:flex-end'},[
          row, el('span',{class:'pill plain',style:'flex:none',text:k}),
        ]);
        card.appendChild(wrap);
      });
      if(g.note) card.appendChild(el('div',{class:'s muted',style:'margin-top:8px;font-size:12.5px',text:g.note}));
      o.appendChild(card);
    });
  });
}
function normW(x){ return (x||'').normalize('NFC').replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED\u08F0-\u08F2]/g,'')
  .replace(/[أإآٱى]/g,'ا'); }
function commonWords(keys){
  // words appearing in ALL verses of the group (normalized) → the shared frame
  const sets=keys.map(k=>new Set(Model.verseWords(k).map(w=>normW(w.x))));
  if(!sets.length) return new Set();
  let inter=[...sets[0]];
  sets.slice(1).forEach(s=> inter=inter.filter(w=>s.has(w)));
  return new Set(inter);
}

/* ===========================================================================
   PROGRESS
   =========================================================================== */
function Progress(){
  const root=$('#sc-progress'); clear(root);
  root.appendChild(el('div',{class:'shead'},[
    el('div',{},[el('div',{class:'eyebrow',text:'Progress'}),el('h1',{class:'serif',text:'Your roots'})]),
    el('button',{class:'iconbtn',onclick:openSettings,'aria-label':'Settings',
      html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>'}),
  ]));
  const s=Store.db.streak;
  let known=0,total=0,due=0;
  Model.targets.forEach(t=>{ const segs=Model.segByTarget[t.id]; total+=segs.length;
    known+=segs.filter(x=>Store.card(x.seg).state!=='new').length;
    due+=Scheduler.queues(t.id).due.length; });
  root.appendChild(el('div',{class:'stats'},[
    el('div',{class:'stat'},[el('div',{class:'n accent',text:String(Math.round(100*known/total))+'%'}),el('div',{class:'l',text:'Memorized'})]),
    el('div',{class:'stat'},[el('div',{class:'n',text:String(s.current)}),el('div',{class:'l',text:'Streak'})]),
    el('div',{class:'stat'},[el('div',{class:'n',text:String(s.best)}),el('div',{class:'l',text:'Best'})]),
  ]));

  Model.targets.forEach(t=>{
    const segs=Model.segByTarget[t.id];
    const card=el('div',{class:'card',style:'margin-top:14px'});
    card.appendChild(el('div',{class:'row spread',style:'margin-bottom:12px'},[
      el('div',{class:'row',style:'gap:8px'},[el('h2',{class:'ar serif',style:'font-size:20px',text:t.name_ar}),
        el('span',{class:'pill '+(t.mode==='learn'?'':'gold'),text:t.short})]),
      el('span',{class:'faint',style:'font:600 12px/1 var(--sans)',
        text:`${segs.filter(x=>Store.card(x.seg).state!=='new').length}/${segs.length}`}),
    ]));
    const heat=el('div',{class:'heat'});
    segs.forEach(x=>{ const c=Store.card(x.seg);
      let cls='new';
      if(c.state!=='new'){ const S=c.S||0; cls = S<7?'s1':S<30?'s2':S<120?'s3':'s4'; }
      heat.appendChild(el('div',{class:'cell '+cls,title:`${x.seg} · S=${(c.S||0).toFixed(1)}d`}));
    });
    card.appendChild(heat);
    card.appendChild(el('div',{class:'row',style:'gap:14px;margin-top:12px;justify-content:flex-end'},[
      legend('new','New'),legend('s1','Fresh'),legend('s3','Set'),legend('s4','Firm'),
    ]));
    root.appendChild(card);
  });
  root.appendChild(el('div',{class:'faint',style:'text-align:center;margin-top:14px;font-size:12px',
    text:`Each cell is one muṣḥaf line; colour shows memory stability. Text verified against KFGQPC Uthmānic Ḥafs.`}));
}
function legend(cls,label){ return el('div',{class:'row',style:'gap:5px'},[
  el('span',{class:'cell '+cls,style:'width:12px;height:12px;flex:none'}), el('span',{class:'faint',style:'font:600 11px/1 var(--sans)',text:label})]); }

/* ===========================================================================
   SETTINGS + overlay plumbing
   =========================================================================== */
function openSettings(){
  openOverlay();
  const o=$('#overlay-body'); clear(o);
  const st=Store.getSettings();
  o.appendChild(drillHead('Settings', closeOverlay));
  const dn=el('input',{type:'range',min:1,max:10,step:1,value:st.dailyNew});
  const dnv=el('span',{class:'pill',text:st.dailyNew+' lines'});
  dn.addEventListener('input',()=>{ dnv.textContent=dn.value+' lines'; Store.setSetting('dailyNew',+dn.value); });
  const rt=el('input',{type:'range',min:80,max:97,step:1,value:Math.round(st.retention*100)});
  const rtv=el('span',{class:'pill',text:Math.round(st.retention*100)+'%'});
  rt.addEventListener('input',()=>{ rtv.textContent=rt.value+'%'; Store.setSetting('retention',+rt.value/100); });

  o.appendChild(el('div',{class:'card'},[
    el('label',{class:'field'},[ el('div',{class:'row spread'},[el('span',{text:'New lines per day (sabaq)'}),dnv]), dn,
      el('div',{class:'s faint',style:'font-weight:400',text:'Your daily acquisition target for Juzʼ 2.'})]),
    el('div',{class:'divider'}),
    el('label',{class:'field'},[ el('div',{class:'row spread'},[el('span',{text:'Desired retention'}),rtv]), rt,
      el('div',{class:'s faint',style:'font-weight:400',text:'Higher = more frequent review, safer recall. 92% suits sacred sequential text.'})]),
  ]));

  const themeSel=el('div',{class:'segmented',style:'margin-top:14px'});
  [['system','System'],['light','Light'],['dark','Dark']].forEach(([v,l])=>{
    themeSel.appendChild(el('button',{class:(st.theme===v?'on':''),onclick:()=>{ setTheme(v); openSettings(); }},l));
  });
  o.appendChild(el('div',{class:'card',style:'margin-top:14px'},[
    el('div',{class:'eyebrow',style:'margin-bottom:10px',text:'Appearance'}), themeSel,
  ]));

  o.appendChild(el('div',{class:'card',style:'margin-top:14px'},[
    el('div',{class:'eyebrow',style:'margin-bottom:8px',text:'Data'}),
    el('div',{class:'s muted',style:'margin-bottom:12px;font-size:13px',
      text:'All progress lives on this device only. Nothing is sent anywhere.'}),
    el('button',{class:'btn block',style:'border-color:#c66;color:#b85',onclick:()=>{
      if(confirm('Reset all memorization progress? This cannot be undone.')){ Store.reset(); Store.seedIfNeeded(); closeOverlay(); go('today'); }
    }},'Reset progress'),
  ]));
}
function setTheme(v){ Store.setSetting('theme',v);
  document.documentElement.setAttribute('data-theme', v==='system'?'':v);
  if(v==='system') document.documentElement.removeAttribute('data-theme'); }

function openOverlay(){ $('#overlay').classList.remove('hide'); document.body.style.overflow='hidden'; }
function closeOverlay(){ $('#overlay').classList.add('hide'); document.body.style.overflow=''; }

/* ===========================================================================
   INIT
   =========================================================================== */
let _inited=false;
function init(){
  if(_inited) return; _inited=true;
  Store.seedIfNeeded();
  const th=Store.getSettings().theme; if(th&&th!=='system') document.documentElement.setAttribute('data-theme',th);
  // tab bar
  const tabs=[
    ['today','Today','<path d="M3 9.5 12 3l9 6.5V21H3z"/><path d="M9 21v-7h6v7"/>'],
    ['read','Read','<path d="M3 5h7a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-7a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>'],
    ['memorize','Memorize','<path d="M12 3v18"/><path d="M5 7l7-4 7 4"/><circle cx="12" cy="13" r="4"/>'],
    ['drills','Drills','<path d="M5 3l14 9-14 9z"/>'],
    ['progress','You','<path d="M4 19V9m5 10V5m5 14v-7m5 7V11"/>'],
  ];
  const bar=$('.tabbar .inner');
  tabs.forEach(([s,label,svg])=>{
    bar.appendChild(el('button',{class:'tab',data:{s},onclick:()=>go(s),
      html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span>${label}</span>`}));
  });
  Render.registerFonts();
  // re-fit the muṣḥaf to width on rotate / resize
  window.addEventListener('resize', ()=>{
    document.querySelectorAll('.screen:not(.hide) .sheet .inner').forEach(el=>Render.fit(el));
  });
  go('today');
}
window.RFONTS = (function(){
  const s = new Set();
  if(window.QDATA) for(const p in QDATA.pages){
    const pg = QDATA.pages[p]; if(pg.font) s.add(pg.font);
    pg.lines.forEach(ln => ln.words.forEach(w => { if(w.f) s.add(w.f); }));
  }
  s.delete('QCF4_QBSML'); // registered explicitly by the renderer
  return s.size ? [...s] : ['QCF4_Hafs_01','QCF4_Hafs_02','QCF4_Hafs_03','QCF4_Hafs_34'];
})();
document.addEventListener('DOMContentLoaded', init);
