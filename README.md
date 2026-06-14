# Rāsikh — رَاسِخ

A personal Qur'an memorization (ḥifẓ) companion. Two targets:

- **Sūrat Yā-Sīn (36:1–83)** — *maintenance* mode (already memorized; keep it firm).
- **Sūrat al-Baqara · Juzʼ 2 (2:142–252)** — *learning* mode.

Deep, not broad: pure reading-and-recall on the real Madinah muṣḥaf. No tafsīr, no audio,
no tajwīd colour-coding, no translation. The sacred text is the hero.

---

## Deploy (it's a PWA — runs offline, installs to your home screen)

It is a build-free static site. Any of these works:

**Easiest — Netlify Drop**
1. Go to <https://app.netlify.com/drop>
2. Drag this whole folder (or the `.zip`) onto the page.
3. Open the URL it gives you **in Safari** (iOS) or Chrome (Android).
4. Share ▸ **Add to Home Screen**. It now opens full-screen and works with no signal.

**Or any static host** — Cloudflare Pages, GitHub Pages, Vercel: upload the folder, open the URL,
Add to Home Screen.

**Or locally** — from inside the folder:
```
python3 -m http.server 8080
```
then open <http://localhost:8080>. (A plain `file://` open won't register the service worker or
load the fonts; serve it over http.)

---

## How it works

**Three streams** (the classical ḥifẓ cycle), scheduled by **FSRS** (modern spaced repetition):

- **Sabaq** — new lines. Acquired on the *Memorize* screen with an expanding-retrieval lock-in
  (each rep leans more on memory). "Mark learned" adds the line to review.
- **Sabqī** — recently-learned lines, reviewed daily for their first week.
- **Manzil** — consolidated lines, spaced out by FSRS. Yā-Sīn starts here.

The **scheduled unit is one muṣḥaf line** — the position of a line on the page is itself a memory
anchor. Desired retention defaults to **92%** (higher than typical flashcards, because the Qur'an
is sacred sequential text); adjustable in Settings.

**Drills**
- *Continue from here* — a random spot; recite what follows, reveal to check.
- *Verse → number* and *Number → verse* — positional recall.
- *Mutashābihāt* — the near-identical passages that trip up huffāẓ, with shared words dimmed and the
  distinguishing words in ink.

Verse numbers are shown while reading, hidden in tests.

---

## Data provenance

- **Rendering**: KFGQPC **QCF4** glyph data — the Madinah muṣḥaf (1441 AH, ʿUthmān Ṭāhā). You only ever
  see authentic muṣḥaf glyphs, in the real 15-line page layout.
- **Text verification**: every one of the 194 target verses was cross-checked, letter by letter,
  against an independent canonical **Uthmānic Ḥafs** edition. All character differences were proven
  non-textual (alef orthography and different Unicode codepoints for the same marks — e.g. sukun,
  tanwīn, hamza seats matched in exact counts). **Zero differing consonants or words.**
- **Mutashābihāt**: 14 verified in-corpus groups (a community dataset filtered to the corpus, plus
  muṣḥaf-verified curated sets).

All progress is stored **on your device only** (localStorage). Nothing is sent anywhere.

---

## Known next steps (v2)

- *Write-it / trace* mode (Mauritanian lawḥ method — writing roughly doubles retention).
- Phrase-level mutashābihāt (e.g. the «كَذَٰلِكَ يُبَيِّنُ ٱللَّهُ …» family) with word-span anchoring.
- Optional export/backup of progress.

Built to be moved into version control (Claude Code) for ongoing iteration.
