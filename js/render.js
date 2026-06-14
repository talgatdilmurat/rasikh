/* ============================================================================
   Rāsikh — renderer
   Faithful QCF4 (KFGQPC Madinah 1441 AH) glyph rendering. Each line is a
   centered flex row of glyph spans; full lines are equal-width by the font's
   design, so centering reproduces the muṣḥaf's edge-to-edge justification.
   ========================================================================== */

const Render = (() => {
  let fontsReady = null;
  const FONT_DIR = 'fonts';

  function registerFonts(){
    if(fontsReady) return fontsReady;
    const list = (window.RFONTS || ['QCF4_Hafs_01','QCF4_Hafs_02','QCF4_Hafs_03','QCF4_Hafs_34']);
    const D = window.RFONT_DATA || null;   // inlined base64 data: URLs (single-file build)
    const srcFor = name => D && D[name] ? `url(${D[name]})` : `url(${FONT_DIR}/${name}_W.woff2)`;
    const faces = [];
    list.forEach(name => {
      const ff = new FontFace(name, srcFor(name));
      faces.push(ff.load().then(f => document.fonts.add(f)).catch(()=>{}));
    });
    const bsmlSrc = D && D['QCF4_QBSML'] ? `url(${D['QCF4_QBSML']})` : `url(${FONT_DIR}/QCF4_QBSML.woff2)`;
    const bsml = new FontFace('QCF4_QBSML', bsmlSrc);
    faces.push(bsml.load().then(f => document.fonts.add(f)).catch(()=>{}));
    fontsReady = Promise.all(faces);
    return fontsReady;
  }

  function wordSpan(w){
    const s = document.createElement('span');
    s.className = `w t-${w.t}`;
    s.textContent = w.c;
    s.style.fontFamily = `'${w.f}'`;
    if(w.v) s.dataset.v = w.v;
    if(w.p!=null) s.dataset.p = w.p;
    if(w.x) s.dataset.x = w.x;
    return s;
  }

  // Render one muṣḥaf page into a container element.
  // opts: { highlightVerses:Set, dimOthers:bool, onWordTap:fn, hiddenLines:Set, surahName:bool }
  function page(pageNum, opts={}){
    const data = QDATA.pages[pageNum];
    const wrap = document.createElement('div');
    wrap.className = 'mushaf-page';
    wrap.dataset.page = pageNum;
    if(!data){ wrap.textContent = 'page not bundled'; return wrap; }

    data.lines.forEach(ln => {
      const row = document.createElement('div');
      row.className = 'mline' + (ln.center ? ' center' : '');
      row.dataset.line = ln.n;
      ln.words.forEach(w => {
        const sp = wordSpan(w);
        // highlighting / dimming for focus
        if(opts.highlightVerses && w.v){
          if(opts.highlightVerses.has(w.v)) sp.classList.add('hl');
          else if(opts.dimOthers) sp.classList.add('dim');
        }
        if(opts.onWordTap && w.t==='word'){
          sp.classList.add('tap');
          sp.addEventListener('click', () => opts.onWordTap(w, sp));
        }
        row.appendChild(sp);
      });
      if(opts.hiddenLines && opts.hiddenLines.has(ln.n)) row.classList.add('hidden-line');
      wrap.appendChild(row);
    });
    return wrap;
  }

  // Render an arbitrary list of word objects inline (e.g. a single verse, or a run).
  function words(wordList, opts={}){
    const row = document.createElement('div');
    row.className = 'mline center inline-run';
    wordList.forEach(w => {
      const sp = wordSpan(w);
      if(opts.onWordTap && w.t==='word'){ sp.classList.add('tap'); sp.addEventListener('click',()=>opts.onWordTap(w,sp)); }
      row.appendChild(sp);
    });
    return row;
  }

  // Render a verse by key (glyphs), optionally hiding the words for recall.
  function verse(key, opts={}){
    const ws = Model.verseWords(key);
    const el = words(ws, opts);
    el.dataset.v = key;
    if(opts.hidden) el.classList.add('veil');
    return el;
  }

  // Verse-end marker glyph for a key (the circled number), if present in data.
  function endMarker(key){
    const idx = QDATA.verseIndex[key]; if(!idx) return null;
    const page = QDATA.pages[idx.page];
    for(const li of idx.lines){
      const ln = page.lines.find(l=>l.n===li.line);
      const m = ln.words.find(w => w.t==='end' && w.v===key);
      if(m) return wordSpan(m);
    }
    return null;
  }

  // ---- hide / peek / reveal (operate on rendered nodes, use app.css classes) ----
  // Veil a whole line or verse element (words -> transparent + dashed rule).
  function veil(el){ el.classList.add(el.classList.contains('mline')?'hidden-line':'veil'); el.classList.remove('revealed'); }
  function reveal(el){ el.classList.add('revealed'); }
  function unveil(el){ el.classList.remove('hidden-line','veil','revealed'); }

  // Hold-to-peek on each word inside a container.
  function enablePeek(container){
    container.querySelectorAll('.w.t-word, .w.t-end').forEach(sp => {
      sp.classList.add('tap');
      sp.addEventListener('pointerdown', e => {
        e.preventDefault();
        sp.classList.add('peek');
        const up = () => { sp.classList.remove('peek');
          window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); };
        window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
      });
    });
  }

  // Progressive reveal: dim every word, then reveal one at a time.
  function dimAll(container){ container.querySelectorAll('.w.t-word').forEach(s=>s.classList.add('dim')); }
  function revealNextWord(container){
    const next = container.querySelector('.w.t-word.dim');
    if(next){ next.classList.remove('dim'); return next; }
    return null;
  }
  function revealAllWords(container){ container.querySelectorAll('.w.dim').forEach(s=>s.classList.remove('dim')); }

  return { registerFonts, page, words, verse, endMarker, wordSpan,
           veil, reveal, unveil, enablePeek, dimAll, revealNextWord, revealAllWords };
})();
