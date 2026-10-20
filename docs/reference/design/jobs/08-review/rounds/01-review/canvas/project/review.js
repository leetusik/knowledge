/* Canvas only, never built: the review job's data, view models and prototype flow (job 08-review, round 01-review).
   The product schedules on the server (S3: FSRS-6, two ratings, the server's clock) and the page only shows what the
   queue route returns and sends ratings. On the canvas this file plays the server too: a fixed clock (NOW, the quiz
   canvas's), a queue of 14 due cards and 3 new highlights, interval previews per card, and the replies to a rating.
   Quiz cards are the signed quiz's own items (reader.js, RD.quiz) plus an invented quiz in the SQLite document; highlight
   cards are the signed annotations' seed highlights with "Review this" on (annot.js, AN.seed). The reader is invented
   ("Ari Han (invented; no email)") and lives in an invented time zone, Asia/Kolkata (UTC+05:30, no daylight saving). */
(function () {
  "use strict";
  var RD = window.RD, Q = RD.quiz, AN = RD.an;
  var RV = (window.RV = {});
  var NOW = Q.NOW;
  var TZ = { id: "Asia/Kolkata", label: "Asia/Kolkata · India Standard Time, UTC+05:30", off: 330 };
  var DAY = 1440;
  var MG = "maintainer-guide/", INT = MG + "internals", HM = "tidewater/harmonic-model", WAL = "doc/field-notes/sqlite-wal";
  RV.NOW = NOW;
  RV.TZ = TZ;
  RV.reader = "Ari Han (invented; no email)";

  /* ---------- The SQLite document's quiz (invented for this canvas, on the document's own text) ---------- */
  var WALQ = [
    "```quiz #wal-check",
    "title: Check the log",
    "items:",
    "  - id: wal-one",
    "    type: cloze",
    "    text: \"In WAL mode the database file is left alone: new pages are appended to a separate {{log|write-ahead log|WAL}}.\"",
    "    explain: \"Readers then choose which version of a page to read, so a reader never waits for the writer.\"",
    "  - id: wal-three",
    "    type: cloze",
    "    text: \"A {{checkpoint}} copies committed pages back into the database file. By default one runs when the log passes {{1000|1,000|a thousand}} {{pages}}.\"",
    "    explain: \"The setting counts pages, not bytes: `PRAGMA wal_autocheckpoint = 1000;`.\"",
    "  - id: wal-long",
    "    type: choice",
    "    prompt: \"A service runs `PRAGMA journal_mode = WAL;` and leaves `wal_autocheckpoint` at its default. A week later its `app.db-wal` file is 6 GB and still growing. What is the most likely cause?\"",
    "    options:",
    "      - id: a",
    "        text: \"`wal_autocheckpoint` counts bytes, so its default of 1000 is far too small to ever run\"",
    "      - id: b",
    "        text: \"A read transaction that never ends, so no checkpoint can get past it\"",
    "      - id: c",
    "        text: \"WAL mode never checkpoints on its own; someone has to run `PRAGMA wal_checkpoint` by hand\"",
    "      - id: d",
    "        text: \"Too many writers at once, each appending to a log of its own\"",
    "      - id: e",
    "        text: \"The database sits on a network drive, where checkpoints are switched off\"",
    "      - id: f",
    "        text: \"`journal_mode` went back to rollback after a restart, and the old log was never removed\"",
    "    answer: [b]",
    "    explain: \"A checkpoint copies committed pages back into the database file, but it cannot copy past a reader that started before it: that reader may still need the old pages. One forgotten read transaction (a cursor left open in a connection pool, a long export, a debugger stopped at a breakpoint) holds the log open, and every write after it lands in the log. The other answers are each wrong on a fact: `wal_autocheckpoint` counts pages, not bytes, and it runs on its own; a database has one log however many connections write to it; and `journal_mode = WAL` is stored in the database file, so it outlives a restart. Find the long reader and end it. The next checkpoint then catches up, and `PRAGMA wal_checkpoint(TRUNCATE)` shrinks the file back.\"",
    "  - id: wal-why",
    "    type: recall",
    "    prompt: \"Why can one forgotten read transaction make the log grow without limit?\"",
    "    answer: \"A checkpoint copies committed pages back into the database file, but it cannot pass a reader that started before it, because that reader may still need the old pages. While the reader stays open, every new write is appended to the log and none of it can be copied back, so the log only grows. End the reader and the next checkpoint catches up.\"",
    "    explain: \"The document's warning, in its own words: one forgotten read transaction lets the log grow without limit.\"",
    "```"
  ].join("\n");
  var W2 = RD.docs[WAL].variants.en.versions[2];
  if (W2.src.indexOf("```quiz") < 0) W2.src = W2.src.replace(/\s*$/, "\n\n" + WALQ + "\n");

  /* ---------- Time: the reader's own clock (Asia/Kolkata), the review day from 04:00 ---------- */
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function local(iso) {
    var t = new Date(new Date(iso).getTime() + TZ.off * 60000);
    return { y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(iso) { var l = local(iso); return pad(l.h) + ":" + pad(l.mi); }
  /* "today at 15:10", "tomorrow at 07:15", or "on 23 Oct at 07:15" — in the reader's time zone, by the review day */
  function when(iso) {
    var a = local(NOW), b = local(iso);
    var da = Date.UTC(a.y, a.mo, a.d), db = Date.UTC(b.y, b.mo, b.d), dd = Math.round((db - da) / 86400000);
    if (dd === 0) return "today at " + hhmm(iso);
    if (dd === 1) return "tomorrow at " + hhmm(iso);
    return "on " + b.d + " " + MON[b.mo] + " at " + hhmm(iso);
  }
  RV.when = when;
  RV.day = { start: "2026-10-19T22:30:00Z", end: "2026-10-20T22:30:00Z", time_zone: TZ.id, starts_at: "04:00" };
  RV.nextDue = "2026-10-21T01:45:00Z";

  /* Open question 4, drawn: an interval reads as "in 10 minutes", "in 1 day", "in 23 days", "in 3 months", "in 1.3 years".
     Under an hour: minutes. Under a day: hours. Under 60 days: days. Under a year: whole months (days ÷ 30.4).
     From a year: years, one decimal, ".0" dropped. */
  function ivl(min) {
    if (min < 60) return min + (min === 1 ? " minute" : " minutes");
    if (min < DAY) { var h = Math.round(min / 60); return h + (h === 1 ? " hour" : " hours"); }
    var d = Math.round(min / DAY);
    if (d < 60) return d + (d === 1 ? " day" : " days");
    if (d < 365) { var m = Math.round(d / 30.4); return m + (m === 1 ? " month" : " months"); }
    var y = Math.round(d / 365 * 10) / 10;
    return String(y).replace(/\.0$/, "") + (y === 1 ? " year" : " years");
  }
  RV.ivl = ivl;
  RV.DAY = DAY;

  /* ---------- The cards (S3 card shape; previews in minutes) ---------- */
  function qc(id, doc, block, item, o) {
    return Object.assign({ id: id, kind: "quiz", source: "quiz", doc: doc, block: block, item: item, state: "review", reps: 3, lapses: 0, again: 10, good: 4 * DAY }, o || {});
  }
  function hc(id, an, o) {
    return Object.assign({ id: id, kind: "hl", source: "highlight", an: an, state: "review", reps: 3, lapses: 0, again: 10, good: 4 * DAY }, o || {});
  }
  var DEFS = [
    qc("rc-read-column", INT, "check", "read-column", { state: "relearning", reps: 5, lapses: 1, due: "2026-10-18T13:10:00Z", overdue: "due 2 days ago", good: 2 * DAY }),
    qc("tw-stored", HM, "twenty", "stored", { reps: 2, due: "2026-10-19T02:10:00Z", good: 11 * DAY }),
    qc("wal-one", WAL, "wal-check", "wal-one", { reps: 2, due: "2026-10-19T05:30:00Z", good: 6 * DAY }),
    hc("hl-a2", "a2", { due: "2026-10-19T11:00:00Z", good: 23 * DAY }),
    qc("rc-projection", INT, "check", "projection", { reps: 2, due: "2026-10-19T17:45:00Z", good: 4 * DAY }),
    qc("wal-three", WAL, "wal-check", "wal-three", { reps: 3, due: "2026-10-19T23:10:00Z", good: 12 * DAY }),
    qc("tw-spring", HM, "twenty", "spring-tides", { reps: 2, due: "2026-10-20T01:00:00Z", good: 6 * DAY }),
    qc("rc-two-planes", INT, "check", "two-planes", { state: "new", reps: 0, reset: true, due: "2026-10-20T03:20:00Z", good: 2 * DAY }),
    hc("hl-k3", "k3", { reps: 3, due: "2026-10-20T04:15:00Z", good: 34 * DAY }),
    qc("rc-publish", INT, "check", "publish-in-lock", { reps: 6, lapses: 1, due: "2026-10-20T06:00:00Z", good: 91 * DAY }),
    qc("wal-long", WAL, "wal-check", "wal-long", { reps: 2, due: "2026-10-20T07:30:00Z", good: 9 * DAY }),
    hc("hl-s1", "s1", { reps: 5, due: "2026-10-20T08:40:00Z", good: 61 * DAY }),
    qc("wal-why", WAL, "wal-check", "wal-why", { reps: 2, due: "2026-10-20T09:00:00Z", good: 5 * DAY }),
    qc("tw-how-many", HM, "twenty", "how-many", { state: "learning", reps: 1, today: true, due: "2026-10-20T09:40:00Z", good: 1 * DAY }),
    hc("hl-a3", "a3", { state: "new", reps: 0, isNew: true, good: 2 * DAY }),
    hc("hl-a7", "a7", { state: "new", reps: 0, isNew: true, good: 2 * DAY }),
    hc("hl-a8", "a8", { state: "new", reps: 0, isNew: true, good: 2 * DAY })
  ];
  var BY = {};
  DEFS.forEach(function (d) { BY[d.id] = d; });
  RV.DEFS = DEFS;
  RV.BY = BY;
  var DEFAULT_Q = DEFS.map(function (d) { return d.id; });
  var DRIFT = "This question changed since your last review, so its card starts over. Your history is kept.";
  RV.DRIFT = DRIFT;

  /* The signed annotations' seed (AN.seed), read once. */
  var SEED = AN.seed("default");
  function anOf(id) { return SEED.hl.filter(function (a) { return a.id === id; })[0] || null; }
  function secOf(a) {
    var r = RD.read(a.doc, a.lang, a.ver);
    if (!r) return { text: "", lang: a.lang };
    var S = AN.layout(r.blocks, true).secs[a.block_id];
    return { text: S ? AN.secLabel(S) : "", lang: r.lang };
  }
  RV.anOf = anOf;

  /* ---------- Quiz items ---------- */
  var BLK = {};
  function blockOf(doc, lang, id) {
    var k = doc + "|" + lang + "|" + id;
    if (!BLK[k]) BLK[k] = Q.block(doc, lang, null, id);
    return BLK[k];
  }
  function langFor(d, langs) {
    var want = (langs && langs[d.doc]) || "en";
    var r = RD.read(d.doc, want, null);
    return r ? r.lang : "en";
  }
  function itemOf(d, lang) {
    var b = blockOf(d.doc, lang, d.block);
    return b ? b.items.filter(function (x) { return x.id === d.item; })[0] || null : null;
  }
  RV.itemOf = function (id, langs) { var d = BY[id]; return itemOf(d, langFor(d, langs)); };
  function freshSt(id) { var st = Q.fresh(); if (BY[id] && BY[id].reset) st.note = DRIFT; return st; }
  RV.freshSt = freshSt;

  /* In-chapter links point at the reader (the chapter is not on this page): every link stays on the canvas. */
  function fixRuns(rs) {
    return (rs || []).map(function (r) { return r && (r.isLink || r.isExt) ? Object.assign({}, r, { href: "#top" }) : r; });
  }
  function parts(s) { return RD.koParts(s || "", true); }

  /* The card's own ids, so any number of cards can share a document (Components boards). */
  function idsFor(it, uid) {
    var p = uid + "-";
    it.promptId = p + "q";
    if (it.options) it.options = it.options.map(function (o, i) {
      var b = p + "o" + i;
      return Object.assign({}, o, { runs: fixRuns(o.runs), keyId: b + "k", textId: b + "t", tagId: b + "g", labelledby: b + "k " + b + "t" + (o.tag ? " " + b + "g" : "") });
    });
    if (it.isRecall) it.answerId = p + "a";
    if (it.segs) it.segs = it.segs.map(function (s) { return s.isBlank ? Object.assign({}, s, { inputId: p + "b" + s.n }) : Object.assign({}, s, { runs: fixRuns(s.runs) }); });
    it.prompt = fixRuns(it.prompt);
    it.explain = fixRuns(it.explain);
    if (it.answer) it.answer = fixRuns(it.answer);
    return it;
  }

  /* ---------- One card's view model ----------
     o: { st, langs, ov (state overrides after Again), pending: {rating}, failed: {rating}, busy, uid,
          act(a, el), rate(r, el), retry(el), suspend(el), open(el), link(to) } */
  function rateWord(kind, r) {
    if (kind === "hl") return r === "good" ? "Got it" : "Show sooner";
    return r === "good" ? "I got it" : "I missed it";
  }
  function tagFor(d) {
    if (d.isNew) return "New";
    if (d.reset) return "Starts over";
    if (d.state === "relearning") return "Relearning" + (d.overdue ? " · " + d.overdue : "");
    if (d.state === "learning") return "Learning" + (d.today ? " · added today" : "");
    return "";
  }
  function cardModel(id, o) {
    o = o || {};
    var d = Object.assign({}, BY[id], o.ov || {});
    var uid = o.uid || "rv";
    var pend = o.pending || null, fail = o.failed || null, busy = !!pend;
    var call = function (fn, arg) { return function (e) { if (e && e.preventDefault) e.preventDefault(); if (fn) fn(arg, e && e.currentTarget); }; };
    var m = { id: d.id, domId: uid + "-card", headId: uid + "-kind", isQuiz: d.kind === "quiz", isHl: d.kind === "hl" };
    var tag = tagFor(d);
    m.tag = tag;
    m.hasTag = !!tag;
    var docKey, lang, ctx, st = null, it = null;
    if (m.isQuiz) {
      lang = langFor(d, o.langs);
      docKey = d.doc;
      var view = Q.viewOf(d.doc, lang, null, false);
      var block = blockOf(d.doc, view.lang, d.block);
      var key = Q.keyOf(view, block.id, d.item);
      st = o.st || freshSt(d.id);
      var bundle = { qz: {}, hist: [], sign: { at: null, closed: true }, seq: 0 };
      bundle.qz[key] = st;
      var v = Q.view(block, { view: view, bundle: bundle, act: function (iid, a, el) { if (iid === d.item && o.act && !busy) o.act(a, el); } });
      it = idsFor(Object.assign({}, v.items.filter(function (x) { return x.id === d.item; })[0]), uid);
      m.it = it;
      m.kindLabel = "Question";
      m.isChoice = !!it.isChoice; m.isRecall = !!it.isRecall; m.isCloze = !!it.isCloze;
      m.quizName = block.title;
      m.qn = it.n;
      m.qtotal = block.items.length;
      m.lang = view.lang;
    } else {
      var a = anOf(d.an);
      docKey = a.doc;
      lang = a.lang;
      var sec = secOf(a);
      m.kindLabel = "Highlight";
      m.hl = {
        quote: a.quote.exact, qLang: a.lang, markCls: "an-m" + (a.note ? " an-m--note" : ""),
        sec: sec.text, secLang: sec.lang, hasNote: !!a.note, note: a.note || "", noteLang: AN.langOf(a.note, a.lang)
      };
      m.lang = a.lang;
    }
    m.kindLabel = m.isQuiz ? "Question" : m.kindLabel;
    ctx = RD.ctx(docKey) || { loose: true };
    var t = RD.titleOf(docKey, lang);
    var LANGN = { en: "English", ko: "한국어" };
    m.src = ctx.loose ? (ctx.project + " · Document") : (ctx.bookTitle + " · Chapter " + ctx.n + " of " + ctx.total);
    m.srcLang = lang !== "en" ? LANGN[lang] : "";
    m.hasSrcLang = lang !== "en";
    /* the way back into the chapter (open question 8: on the back, never giving the answer away; a highlight has no back) */
    var back = m.isHl || (st && st.ph !== "open");
    m.where = {
      label: ctx.loose ? "From the document" : "From the chapter",
      title: t.text, titleLang: t.lang,
      place: m.isQuiz ? (m.quizName ? "Quiz “" + m.quizName + "” · question " + m.qn + " of " + m.qtotal : "Quiz · question " + m.qn + " of " + m.qtotal) : "Section “" + m.hl.sec + "”",
      placeParts: parts(m.isQuiz ? (m.quizName ? "Quiz “" + m.quizName + "” · question " + m.qn + " of " + m.qtotal : "Quiz · question " + m.qn + " of " + m.qtotal) : "Section “" + m.hl.sec + "”"),
      link: m.isQuiz ? "Open at this question →" : "Open at this highlight →",
      linkCls: "rd-linkbtn rv-where__link" + (back ? "" : " is-off"),
      linkHidden: back ? undefined : "true",
      linkTab: back ? undefined : "-1",
      onOpen: call(o.open),
      onSuspend: call(o.suspend),
      suspendOff: busy ? true : undefined
    };
    m.foot = footModel(d, m, it, st, o);
    m.linkClick = function (e) {
      var to = e.currentTarget.getAttribute("data-to");
      e.preventDefault();
      if (o.link) o.link(to, e.currentTarget);
    };
    m.busy = busy ? "true" : undefined;
    return m;
  }

  /* The foot: what happened, said in words, beside the rating. Every sentence the status can show is stacked in one
     cell and every action label in one button or layer (the quiz's own rule), so rating, saving and failing move
     nothing. */
  function footModel(d, m, it, st, o) {
    var pend = o.pending || null, fail = o.failed || null, busy = !!pend;
    var call = function (fn, arg) { return function (e) { if (e && e.preventDefault) e.preventDefault(); if (fn && !busy) fn(arg, e && e.currentTarget); }; };
    var NOTSAVED = "Not saved · check your connection";
    var f = { isMain: false, isPair: false, cells: [], live: "" };
    function cell(on, word, wordCls, sub) {
      return { cls: "qz-st" + (on ? "" : " is-off"), hidden: on ? undefined : "true", word: word, wordCls: wordCls, sub: sub, hasSub: !!sub, subParts: parts(sub) };
    }
    if (m.isQuiz && !m.isRecall) {
      /* choice and cloze: graded as the quiz grades, then Next rates it (right → Good, wrong → Again) */
      var graded = st.ph === "graded";
      var cur = (it.status || []).filter(function (c) { return c.cls.indexOf("is-off") < 0; })[0] || null;
      var ok = graded && !!st.correct;
      var word = cur ? cur.word : "", wcls = cur ? cur.wordCls : "qz-st__word";
      var rateSub = "Next rates it " + (ok ? "Good · in " + ivl(d.good) : "Again · in " + ivl(d.again));
      var k = !graded ? (st.empty ? "empty" : "none") : fail ? "fail" : ok ? "ok" : "bad";
      var emptySub = it.isCloze ? "Fill in at least one blank first." : "Choose at least one answer first.";
      var badWord = graded && !ok ? word : (it.isCloze && (it.segs || []).filter(function (s) { return s.isBlank; }).length > 1 ? "Incorrect · 2 of 3 blanks right" : it.isMulti ? "Incorrect · partly right" : "Incorrect");
      f.cells = [
        cell(k === "none", "", "qz-st__word", ""),
        cell(k === "empty", "Nothing to check yet", "qz-st__word", emptySub),
        cell(k === "ok", "Correct", "qz-st__word qz-st__word--ok", "Next rates it Good · in " + ivl(d.good)),
        cell(k === "bad", badWord, "qz-st__word qz-st__word--bad", "Next rates it Again · in " + ivl(d.again)),
        cell(k === "fail", word || "Correct", wcls, NOTSAVED)
      ];
      f.isMain = true;
      var open = !graded;
      var phase = busy ? "saving" : fail ? "retry" : graded ? "next" : "check";
      /* the four labels sit stacked in one cell (.qz-swap), so the button keeps the widest one's width */
      f.lab = { check: phase === "check" ? "" : "is-off", next: phase === "next" ? "" : "is-off", saving: phase === "saving" ? "" : "is-off", retry: phase === "retry" ? "" : "is-off" };
      f.mainCls = "rd-btn qz-act rv-main " + (open ? "rd-btn--secondary" : "rd-btn--primary");
      /* single choice grades on tap, so before that there is nothing to press: the button keeps its place, unseen */
      var hideMain = open && it.isSingle;
      f.mainLayer = "qz-acts__layer" + (hideMain ? " is-off" : "");
      f.mainHidden = hideMain ? "true" : undefined;
      f.mainBusy = busy ? "true" : undefined;
      f.mainDisabled = busy || hideMain ? true : undefined;
      f.mainRole = phase === "retry" ? "retry" : "main";
      f.onMain = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (busy) return;
        var el = e && e.currentTarget;
        if (fail) { if (o.retry) o.retry(el); return; }
        if (!graded) { if (o.act) o.act({ t: "check" }, el); return; }
        if (o.rate) o.rate(ok ? "good" : "again", el);
      };
      f.live = busy ? "Saving…" : fail ? NOTSAVED : graded ? word + ". " + rateSub : k === "empty" ? "Nothing to check yet. " + emptySub : "";
      f.show = true;
      return f;
    }
    /* recall (after the answer is shown) and highlights: two ratings, each with its interval preview */
    var ask = m.isRecall ? "Did you get it?" : "Did it stay with you?";
    var chosen = (pend && pend.rating) || (fail && fail.rating) || null;
    var chosenWord = chosen ? (m.isRecall ? (chosen === "good" ? "Got it" : "Missed it") : rateWord("hl", chosen)) : "";
    var chosenCls = "qz-st__word" + (chosen ? (chosen === "good" ? " qz-st__word--ok" : " qz-st__word--bad") : "");
    f.cells = [cell(!fail, ask, "qz-st__word", ""), cell(!!fail, chosenWord || "Got it", chosenCls, NOTSAVED)];
    f.isPair = true;
    f.pair = ["good", "again"].map(function (r) {
      var mine = chosen === r && busy;
      return {
        r: r, word: rateWord(m.isHl ? "hl" : "quiz", r), sub: (r === "good" ? "Good · in " + ivl(d.good) : "Again · in " + ivl(d.again)),
        wordCls: mine ? "is-off" : "", savCls: mine ? "" : "is-off",
        busy: mine ? "true" : undefined, off: busy ? true : undefined,
        onClick: call(function (x, el) {
          if (m.isRecall && o.act) o.act({ t: "self", v: r === "good" ? "got" : "missed" }, el);
          if (o.rate) o.rate(r, el);
        })
      };
    });
    f.pairLayer = "qz-acts__layer rv-pair" + (fail ? " is-off" : "");
    f.pairHidden = fail ? "true" : undefined;
    f.retryLayer = "qz-acts__layer" + (fail ? "" : " is-off");
    f.retryHidden = fail ? undefined : "true";
    f.onRetry = function (e) { if (e && e.preventDefault) e.preventDefault(); if (o.retry) o.retry(e && e.currentTarget); };
    f.live = busy ? "Saving…" : fail ? NOTSAVED : "";
    f.show = m.isHl || (st && st.ph !== "open") || !!pend || !!fail;
    return f;
  }
  RV.cardModel = cardModel;

  /* ---------- The queue header ---------- */
  var BOOKS = [
    { key: "maintainer-guide", title: "The knowledge maintainer guide", sub: "knowledge · book" },
    { key: "tidewater", title: "Tidewater, from the inside", sub: "tidewater · book" },
    { key: "field-notes", title: "field-notes", sub: "Documents not in a book" }
  ];
  function bookOf(id) {
    var d = BY[id], doc = d.kind === "quiz" ? d.doc : anOf(d.an).doc;
    var c = RD.ctx(doc) || {};
    return c.loose ? c.project : c.bookKey;
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function byBook(s) {
    if (s.big) return [{ b: BOOKS[0], due: 96, nw: 3 }, { b: BOOKS[1], due: 63, nw: 0 }, { b: BOOKS[2], due: 41, nw: 0 }];
    var out = BOOKS.map(function (b) { return { b: b, due: 0, nw: 0 }; });
    /* every card still due today, the ones a daily limit holds for tomorrow included: S3's due is "due by the end of
       today", so the rows add up to the header's counts in every state */
    (s.queue || []).concat(s.heldQ || []).forEach(function (id) {
      var k = bookOf(id), row = out.filter(function (x) { return x.b.key === k; })[0];
      if (!row) return;
      var d = Object.assign({}, BY[id], (s.ov || {})[id] || {});
      if (d.isNew) row.nw += 1; else row.due += 1;
    });
    return out.filter(function (r) { return r.due || r.nw; });
  }
  function headModel(s, a) {
    var c = s.counts, ready = s.status === "ready" && s.member;
    var rows = byBook(s).map(function (r) {
      var bits = [];
      if (r.due) bits.push(r.due + " due");
      if (r.nw) bits.push(plural(r.nw, "new highlight", "new highlights"));
      return { title: r.b.title, sub: r.b.sub, counts: bits.join(" · ") };
    });
    var sv = s.saved;
    var held = (s.heldQ || []).length > 0;
    var booksNote = "The queue mixes every book, in the order the cards fell due.";
    if (held && s.end === "limit") booksNote = "You reached today’s limit of " + plural(s.set.max, "review", "reviews") + ", so these wait for tomorrow.";
    else if (held && s.end === "limitNew") booksNote = s.set.maxNew > 0 ? "You reached today’s limit of " + plural(s.set.maxNew, "new highlight", "new highlights") + ", so these wait for tomorrow." : "New highlights are paused, so these wait.";
    else if (held) booksNote += " New highlights past today’s limit wait for tomorrow.";
    return {
      booksNote: booksNote,
      due: c.due, newH: c.newH, done: c.done, newWord: c.newH === 1 ? "new highlight" : "new highlights",
      countCls: "rv-count" + (ready ? "" : " is-off"), countHidden: ready ? undefined : "true",
      isLoading: s.status === "loading",
      open: !!s.bybook && ready, openAttr: s.bybook && ready ? "true" : "false",
      bookOff: ready ? undefined : true,
      onBooks: function (e) { if (e && e.preventDefault) e.preventDefault(); if (a && a.bybook) a.bybook(); },
      books: rows, hasBooks: rows.length > 0, noBooks: rows.length === 0,
      savedCls: "rv-saved" + (sv && ready ? "" : " is-off"),
      savedWord: sv ? sv.word : "Saved", savedRest: sv ? sv.rest : "",
      progStyle: "width: " + (c.done + c.due + c.newH ? Math.round(c.done / (c.done + c.due + c.newH) * 100) : 0) + "%"
    };
  }
  RV.headModel = headModel;

  /* ---------- The queue's other states: done for today, a daily limit, empty, loading, failed ---------- */
  function endModel(s, a) {
    var c = s.counts;
    var call = function (fn) { return function (e) { if (e && e.preventDefault) e.preventDefault(); if (a && a[fn]) a[fn](e && e.currentTarget); }; };
    var e = { kind: s.status !== "ready" ? s.status : endKind(s) };
    e.isLoading = e.kind === "loading";
    e.isFailed = e.kind === "failed";
    e.isDone = e.kind === "done" || e.kind === "limit" || e.kind === "limitNew";
    e.isEmpty = e.kind === "empty";
    var cards = plural(c.done, "card", "cards");
    if (e.kind === "done") {
      e.mark = "Done for today";
      e.title = "That’s every card due today.";
      e.body = "You reviewed " + cards + " today. The next card is due " + when(RV.nextDue) + ", your time.";
    } else if (e.kind === "limit") {
      /* the cards a limit holds are still due today, so the header's counts are the held numbers */
      var bits = [];
      if (c.due) bits.push(plural(c.due, "more card", "more cards"));
      if (c.newH) bits.push(plural(c.newH, "new highlight", "new highlights"));
      var one = c.due + c.newH === 1;
      e.mark = "Done for today";
      e.title = "You reached today’s limit of " + plural(s.set.max, "review", "reviews") + ".";
      e.body = bits.join(" and ") + (one ? " is due, and it waits" : " are due, and they wait") + " for tomorrow. Your next review day starts at 04:00.";
    } else if (e.kind === "limitNew") {
      e.mark = "Done for today";
      if (s.set.maxNew > 0) {
        e.title = "Your reviews are done, and so are today’s " + plural(s.set.maxNew, "new highlight", "new highlights") + ".";
        e.body = plural(c.newH, "more new highlight waits", "more new highlights wait") + " for tomorrow. Your next review day starts at 04:00.";
      } else {
        e.title = "Your reviews are done. New highlights are paused.";
        e.body = plural(c.newH, "new highlight waits", "new highlights wait") + ". They join your reviews when New highlights a day is above 0.";
      }
    }
    e.isLimit = e.kind === "limit" || e.kind === "limitNew";
    e.next = { label: "Continue reading", title: "Storm surge: when the model is wrong", lede: "Tidewater, from the inside · Chapter 11 of 20 · 46% read", go: "Continue reading →" };
    e.onContinue = call("cont");
    e.onSettings = call("openSettings");
    e.onLibrary = call("library");
    e.onRetry = call("reload");
    return e;
  }
  function endKind(s) {
    if (s.queue && s.queue.length) return "card";
    return s.end || "done";
  }
  RV.endModel = endModel;
  RV.endKind = endKind;

  /* ---------- Review settings (S3 PATCH /app/reader/profile) ---------- */
  var ZONES = [
    ["Asia/Kolkata", "Asia/Kolkata · UTC+05:30"],
    ["Asia/Seoul", "Asia/Seoul · UTC+09:00"],
    ["Europe/London", "Europe/London · UTC+01:00"],
    ["America/New_York", "America/New_York · UTC−04:00"],
    ["UTC", "UTC"]
  ];
  function intIn(v, lo, hi) { var t = String(v == null ? "" : v).trim(); return /^\d+$/.test(t) && Number(t) >= lo && Number(t) <= hi; }
  function settingsModel(s, a) {
    var dr = s.sdraft || { tz: s.set.tz, max: String(s.set.max), maxNew: String(s.set.maxNew) };
    var shown = s.sphase === "invalid" || s.sphase === "failed" || s.sphase === "saving";
    var maxBad = shown && !intIn(dr.max, 1, 999), newBad = shown && !intIn(dr.maxNew, 0, 999);
    var saving = s.sphase === "saving", failed = s.sphase === "failed";
    var call = function (fn) { return function (e) { if (e && e.preventDefault) e.preventDefault(); if (a && a[fn]) a[fn](e && e.currentTarget); }; };
    var field = function (k) { return function (e) { if (a && a.field) a.field(k, e.target.value); }; };
    return {
      tz: dr.tz, zones: ZONES.map(function (z) { return { v: z[0], label: z[1] }; }),
      max: dr.max, maxNew: dr.maxNew,
      maxInvalid: maxBad ? "true" : undefined, newInvalid: newBad ? "true" : undefined,
      maxCls: "an-ed__field an-ed__field--line rv-num" + (maxBad ? " is-bad" : ""),
      newCls: "an-ed__field an-ed__field--line rv-num" + (newBad ? " is-bad" : ""),
      maxErrCls: "rv-err" + (maxBad ? "" : " is-off"), newErrCls: "rv-err" + (newBad ? "" : " is-off"),
      maxHintCls: "rv-hint" + (maxBad ? " is-off" : ""), newHintCls: "rv-hint" + (newBad ? " is-off" : ""),
      maxDesc: "rv-max-hint" + (maxBad ? " rv-max-err" : ""), newDesc: "rv-new-hint" + (newBad ? " rv-new-err" : ""),
      failCls: "rv-set__fail" + (failed ? "" : " is-off"), failHidden: failed ? undefined : "true",
      lab: { save: !saving && !failed ? "" : "is-off", saving: saving ? "" : "is-off", retry: failed ? "" : "is-off" },
      busy: saving ? "true" : undefined, off: saving ? true : undefined,
      onTz: field("tz"), onMax: field("max"), onMaxNew: field("maxNew"),
      onSave: call("saveSettings"), onCancel: call("closePanel")
    };
  }
  RV.settingsModel = settingsModel;
  RV.intIn = intIn;

  /* ---------- The flow: one state for the whole prototype ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function base() {
    return {
      page: "review", member: true, status: "ready",
      queue: DEFAULT_Q.slice(), counts: { due: 14, newH: 3, done: 6 }, ov: {}, st: {}, langs: {},
      pending: null, failed: null, saved: null, toast: null, bybook: false, panel: null,
      set: { tz: "Asia/Kolkata", max: 200, maxNew: 20 }, sdraft: null, sphase: "edit", sfail: false,
      end: null, heldQ: [], newDone: 0, big: false, hold: false, away: null, seq: 0,
      themeChoice: "system", os: "light", size: 3
    };
  }
  function defOf(s, id) { return Object.assign({}, BY[id], (s.ov || {})[id] || {}); }
  /* The daily limits (S3: max_reviews_per_day, new_highlights_per_day), as the server applies them: once today's
     reviews reach the limit every card left is held for tomorrow; a never-reviewed highlight joins only while today's
     new-highlight allowance lasts. Held cards stay due (and in the counts); raising a limit in Settings lets them back. */
  function applyLimits(n) {
    if (n.end === "empty") return;
    var all = n.queue.concat(n.heldQ || []), q = [], held = [];
    if (n.counts.done >= n.set.max) held = all;
    else {
      var room = Math.max(0, n.set.maxNew - n.newDone);
      all.forEach(function (id) {
        if (!defOf(n, id).isNew) q.push(id);
        else if (room > 0) { q.push(id); room -= 1; }
        else held.push(id);
      });
    }
    n.queue = q;
    n.heldQ = held;
    if (!q.length && held.length) n.end = n.counts.done >= n.set.max ? "limit" : "limitNew";
    else if (n.end === "limit" || n.end === "limitNew") n.end = null;
  }
  /* A rating's reply (S3: {card, counts}): the counts move, the card leaves or, rated Again, comes back today. */
  function applyRating(n, id, r) {
    var d = defOf(n, id);
    n.counts.done += 1;
    var wasNew = !!d.isNew;
    if (wasNew) { n.newDone += 1; n.counts.newH -= 1; if (r === "again") n.counts.due += 1; }
    else if (r === "good") n.counts.due -= 1;
    if (n.queue[0] === id) n.queue.shift(); else n.queue = n.queue.filter(function (x) { return x !== id; });
    delete n.st[id];
    var ivlText = ivl(r === "good" ? d.good : d.again);
    if (r === "again") {
      n.queue.push(id);
      n.ov[id] = { state: d.state === "review" || d.state === "relearning" ? "relearning" : "learning", isNew: false, reset: false, overdue: "", today: false, good: 1 * DAY, again: 10 };
    }
    n.saved = { word: "Saved", rest: (r === "good" ? "Good" : "Again") + " · next review in " + ivlText };
    if (!n.queue.length && n.big) n.queue = DEFAULT_Q.slice();
    applyLimits(n);
  }
  function advanceTo(n, id) {
    var guard = 0;
    while (n.queue.length && n.queue[0] !== id && guard < 40) { applyRating(n, n.queue[0], "good"); guard += 1; }
  }
  function grade(n, id, actions) {
    var d = BY[id], item = itemOf(d, langFor(d, n.langs)), st = n.st[id] || freshSt(id);
    actions.forEach(function (a) { st = Q.reduce(item, st, a).st; });
    n.st[id] = st;
  }

  var PRESETS = [];
  function P(key, label, fn) { PRESETS.push({ key: key, label: label, page: "review", fn: fn }); }
  P("due", "Cards due", function () {});
  P("c-right", "Choice · right", function (n) { grade(n, "rc-read-column", [{ t: "pick", opt: "b" }]); });
  P("c-wrong", "Choice · wrong", function (n) { grade(n, "rc-read-column", [{ t: "pick", opt: "a" }]); });
  P("multi", "Select all · partly right", function (n) { advanceTo(n, "tw-stored"); grade(n, "tw-stored", [{ t: "toggle", opt: "a" }, { t: "toggle", opt: "c" }, { t: "check" }]); });
  P("cloze1", "Cloze · one blank", function (n) { advanceTo(n, "wal-one"); });
  P("cloze3", "Cloze · three blanks, wrong", function (n) { advanceTo(n, "wal-three"); grade(n, "wal-three", [{ t: "type", n: 1, v: "checkpoint" }, { t: "type", n: 2, v: "100" }, { t: "type", n: 3, v: "bytes" }, { t: "check" }]); });
  P("recall", "Recall · prompt", function (n) { advanceTo(n, "rc-projection"); });
  P("recall-long", "Recall · long answer", function (n) { advanceTo(n, "wal-why"); grade(n, "wal-why", [{ t: "reveal" }]); });
  P("hl-note", "Highlight · with note", function (n) { advanceTo(n, "hl-a2"); });
  P("hl-ko", "Highlight · 한국어", function (n) { advanceTo(n, "hl-k3"); });
  P("hl-none", "Highlight · new, no note", function (n) { advanceTo(n, "hl-a3"); });
  P("hl-long", "Highlight · long note", function (n) { advanceTo(n, "hl-a7"); });
  P("six", "Six options", function (n) { advanceTo(n, "tw-spring"); });
  P("reset", "Changed question", function (n) { advanceTo(n, "rc-two-planes"); });
  P("long", "Long card · document", function (n) { advanceTo(n, "wal-long"); grade(n, "wal-long", [{ t: "pick", opt: "a" }]); });
  P("ko", "Quiz card in 한국어", function (n) { n.langs[INT] = "ko"; });
  P("today", "Card made today", function (n) { advanceTo(n, "tw-how-many"); });
  P("saved", "Saved, next card", function (n) { applyRating(n, "rc-read-column", "good"); });
  P("saving", "Rating · saving", function (n) { advanceTo(n, "rc-projection"); grade(n, "rc-projection", [{ t: "reveal" }, { t: "self", v: "got" }]); n.pending = { card: "rc-projection", rating: "good", rid: 0, reviewId: "rv-rc-projection-0" }; n.hold = true; });
  P("failed", "Rating · failed", function (n) { advanceTo(n, "rc-projection"); grade(n, "rc-projection", [{ t: "reveal" }, { t: "self", v: "got" }]); n.failed = { card: "rc-projection", rating: "good", reviewId: "rv-rc-projection-0" }; });
  P("suspended", "Suspended", function (n) { n.queue.shift(); n.counts.due -= 1; n.toast = { card: "rc-read-column", wasNew: false, isHl: false, st: null }; });
  P("one", "One card left", function (n) { n.queue = ["tw-how-many"]; n.counts = { due: 1, newH: 0, done: 22 }; n.saved = { word: "Saved", rest: "Good · next review in 9 days" }; });
  P("many", "200 due", function (n) { n.counts = { due: 200, newH: 3, done: 6 }; n.big = true; });
  P("bybook", "By book open", function (n) { n.bybook = true; });
  P("settings", "Settings open", function (n) { n.panel = "settings"; });
  P("settings-fail", "Settings · not saved", function (n) { n.panel = "settings"; n.sdraft = { tz: "Asia/Kolkata", max: "150", maxNew: "20" }; n.sphase = "failed"; });
  P("display", "Display open", function (n) { n.panel = "display"; });
  P("loading", "Loading", function (n) { n.status = "loading"; });
  P("lfail", "Failed to load", function (n) { n.status = "failed"; });
  P("done", "Done for today", function (n) { n.queue = []; n.counts = { due: 0, newH: 0, done: 23 }; n.saved = { word: "Saved", rest: "Good · next review in 2 days" }; });
  P("limit", "Limit · 200 reviews", function (n) { n.counts = { due: 14, newH: 3, done: 200 }; n.saved = { word: "Saved", rest: "Good · next review in 6 days" }; applyLimits(n); });
  P("limitnew", "Limit · new highlights", function (n) { n.queue = n.queue.filter(function (id) { return BY[id].isNew; }); n.counts = { due: 0, newH: 3, done: 31 }; n.newDone = 20; n.saved = { word: "Saved", rest: "Good · next review in 2 days" }; applyLimits(n); });
  P("empty", "No cards yet", function (n) { n.queue = []; n.counts = { due: 0, newH: 0, done: 0 }; n.end = "empty"; });
  P("out", "Signed out", function (n) { n.member = false; });
  var PBY = {};
  PRESETS.forEach(function (p) { PBY[p.key] = p; });

  var PAGES = [
    { key: "review", name: "Review · /review" },
    { key: "reader", name: "Reader stand-in · 01-reader" },
    { key: "library", name: "Library stand-in · 06-library" }
  ];
  /* What a preset fixes, so the pressed preset is the one matching what is on screen (theme and size are their own rows). */
  function sig(s) {
    var q = s.queue || [];
    var st = {};
    q.forEach(function (id) { if (s.st[id]) st[id] = s.st[id]; });
    return JSON.stringify([s.page, s.member, s.status, q, s.counts, s.ov, st, s.langs, s.pending ? [s.pending.card, s.pending.rating, s.hold] : null,
      s.failed ? [s.failed.card, s.failed.rating] : null, s.saved, s.toast ? s.toast.card : null, s.bybook, s.panel, s.sphase, s.sdraft, s.end, s.heldQ, s.newDone, s.set, s.big]);
  }
  var SIGS = {};
  function presetState(key, keep) {
    var n = base();
    PBY[key].fn(n);
    if (keep) { n.themeChoice = keep.themeChoice; n.os = keep.os; n.size = keep.size; }
    return n;
  }
  function sigOf(key) { if (!SIGS[key]) SIGS[key] = sig(presetState(key)); return SIGS[key]; }
  function pressedKey(s) {
    if (s.page !== "review") return null;
    var cur = sig(s), hit = null;
    PRESETS.forEach(function (p) { if (!hit && sigOf(p.key) === cur) hit = p.key; });
    return hit;
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }

  /* The focus after a click: where the next step is (Next after grading, the answer after Show answer, the next card
     after a save). Kept until the board that holds the clicked control renders it. */
  RV.focus = null;
  RV.want = function (origin, sel) { RV.focus = { origin: origin || null, sel: sel, at: Date.now() }; };
  RV.flush = function (root) {
    var f = RV.focus;
    if (!f || !root || Date.now() - f.at > 3000) return;
    if (f.origin && f.origin.isConnected && !root.contains(f.origin)) return;
    var el = root.querySelector(f.sel);
    if (el && el.offsetParent !== null) { RV.focus = null; el.focus({ preventScroll: true }); }
  };

  function api(comp) {
    var timers = [];
    function up(fn) { comp.setState(function (s) { var n = clone(s); fn(n); return n; }); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    var a = {};
    a.pick = function (key) {
      var s = comp.state;
      var n = presetState(key, s);
      n.seq = s.seq + 1;
      comp.setState(n);
    };
    a.act = function (act, el) {
      var s = comp.state;
      if (act.t === "none" || s.page !== "review" || s.pending || !s.queue.length) return;
      var id = s.queue[0], d = BY[id];
      if (d.kind !== "quiz") return;
      var item = itemOf(d, langFor(d, s.langs));
      var st = s.st[id] || freshSt(id);
      var r = Q.reduce(item, st, act);
      up(function (n) { n.st[id] = r.st; });
      if (r.graded && act.t !== "self") RV.want(el, '[data-rv-main="1"]');
      else if (act.t === "reveal") RV.want(el, "[data-qz-answer]");
    };
    a.rate = function (r, el) {
      var s = comp.state;
      if (s.pending || !s.queue.length) return;
      var id = s.queue[0], rid = s.seq + 1;
      var reviewId = s.failed && s.failed.card === id && s.failed.rating === r ? s.failed.reviewId : "rv-" + id + "-" + rid;
      var item = BY[id].kind === "quiz" ? itemOf(BY[id], langFor(BY[id], s.langs)) : null;
      up(function (n) {
        if (item && item.isRecall && (!n.st[id] || n.st[id].ph === "revealed")) n.st[id] = Q.reduce(item, n.st[id] || freshSt(id), { t: "self", v: r === "good" ? "got" : "missed" }).st;
        n.seq = rid; n.pending = { card: id, rating: r, rid: rid, reviewId: reviewId }; n.failed = null; n.toast = null; n.hold = false;
      });
      later(function () { a.land(rid, el); }, 900);
    };
    /* a send's answer lands only on the rating that started it (a preset pressed mid-send drops it) */
    a.land = function (rid, el) {
      var s = comp.state;
      if (!s.pending || s.pending.rid !== rid || s.hold) return;
      up(function (n) {
        if (!n.pending || n.pending.rid !== rid) return;
        var p = n.pending;
        n.pending = null;
        applyRating(n, p.card, p.rating);
      });
      RV.want(el, "[data-rv-card]");
    };
    a.retry = function (el) {
      var s = comp.state;
      if (!s.failed) return;
      a.rate(s.failed.rating, el);
    };
    a.suspend = function (el) {
      var s = comp.state;
      if (s.pending || !s.queue.length) return;
      up(function (n) {
        var id = n.queue.shift(), d = defOf(n, id);
        if (d.isNew) n.counts.newH -= 1; else n.counts.due -= 1;
        n.toast = { card: id, wasNew: !!d.isNew, isHl: d.kind === "hl", st: n.st[id] || null };
        delete n.st[id];
        n.failed = null;
        applyLimits(n);
      });
      RV.want(el, "[data-rv-card], [data-rv-end]");
    };
    a.undo = function (el) {
      up(function (n) {
        var t = n.toast;
        if (!t) return;
        n.queue.unshift(t.card);
        if (t.wasNew) n.counts.newH += 1; else n.counts.due += 1;
        if (t.st) n.st[t.card] = t.st;
        n.toast = null;
        applyLimits(n);
      });
      RV.want(el, "[data-rv-card]");
    };
    a.bybook = function () { up(function (n) { n.bybook = !n.bybook; }); };
    a.panel = function (p) {
      up(function (n) {
        n.panel = n.panel === p ? null : p;
        if (n.panel === "settings") { n.sdraft = { tz: n.set.tz, max: String(n.set.max), maxNew: String(n.set.maxNew) }; n.sphase = "edit"; }
        if (!n.panel) { n.sdraft = null; n.sphase = "edit"; }
      });
    };
    a.closePanel = function () { up(function (n) { n.panel = null; n.sdraft = null; n.sphase = "edit"; }); };
    a.openSettings = function () { a.panel("settings"); };
    a.field = function (k, v) { up(function (n) { n.sdraft = Object.assign({ tz: n.set.tz, max: String(n.set.max), maxNew: String(n.set.maxNew) }, n.sdraft || {}); n.sdraft[k] = v; if (n.sphase === "failed") n.sphase = "invalid"; }); };
    a.saveSettings = function () {
      var s = comp.state, dr = s.sdraft || { tz: s.set.tz, max: String(s.set.max), maxNew: String(s.set.maxNew) };
      if (s.sphase === "saving") return;
      if (!intIn(dr.max, 1, 999) || !intIn(dr.maxNew, 0, 999)) { up(function (n) { n.sphase = "invalid"; }); RV.want(null, '[aria-invalid="true"]'); return; }
      var rid = s.seq + 1;
      up(function (n) { n.seq = rid; n.sphase = "saving"; });
      later(function () {
        var c = comp.state;
        if (c.seq !== rid || c.sphase !== "saving") return;
        up(function (n) {
          var d2 = n.sdraft || dr;
          n.set = { tz: d2.tz, max: Number(d2.max), maxNew: Number(d2.maxNew) };
          n.panel = null; n.sdraft = null; n.sphase = "edit";
          n.saved = { word: "Settings saved", rest: plural(n.set.max, "review", "reviews") + " and " + plural(n.set.maxNew, "new highlight", "new highlights") + " a day" };
          applyLimits(n);
        });
      }, 900);
    };
    a.theme = function (t) { up(function (n) { n.themeChoice = t; }); };
    a.size = function (z) { up(function (n) { n.size = z; }); };
    a.open = function (el) {
      up(function (n) { var id = n.queue[0]; n.away = { kind: "reader", card: id }; n.page = "reader"; n.panel = null; });
    };
    a.link = function (to) {
      up(function (n) { var id = n.queue[0]; n.away = { kind: "reader", card: id, to: to }; n.page = "reader"; n.panel = null; });
    };
    a.cont = function () { up(function (n) { n.away = { kind: "reader", chapter: "tidewater/storm-surge" }; n.page = "reader"; }); };
    a.library = function () { up(function (n) { n.away = { kind: "library" }; n.page = "library"; n.panel = null; }); };
    a.back = function () { up(function (n) { n.away = null; n.page = "review"; }); };
    a.signedIn = function () { var s = comp.state; var n = presetState("due", s); n.seq = s.seq + 1; comp.setState(n); };
    a.reload = function () {
      var rid = comp.state.seq + 1;
      up(function (n) { n.seq = rid; n.status = "loading"; });
      later(function () { var c = comp.state; if (c.seq !== rid || c.status !== "loading") return; up(function (n) { n.status = "ready"; }); }, 900);
    };
    a.stop = function () { timers.forEach(clearTimeout); timers = []; };
    return a;
  }

  /* The Review screen's props from the flow state. */
  function view(s, a) {
    var ready = s.status === "ready";
    var kind = ready ? endKind(s) : s.status;
    var m = {
      theme: themeOf(s), themeChoice: s.themeChoice, os: s.os, size: s.size, panel: s.panel,
      head: headModel(s, a),
      isCard: ready && kind === "card",
      isEnd: !ready || kind !== "card",
      end: endModel(s, a),
      settings: settingsModel(s, a),
      hasToast: !!s.toast,
      toast: s.toast ? (s.toast.isHl ? "Card suspended, and Review this is off on its highlight." : "Card suspended. It leaves your reviews and keeps its history.") : "",
      a: a
    };
    if (m.isCard) {
      var id = s.queue[0];
      m.card = cardModel(id, {
        uid: "rv-" + id, st: s.st[id] || freshSt(id), langs: s.langs, ov: s.ov[id],
        pending: s.pending && s.pending.card === id ? s.pending : null,
        failed: s.failed && s.failed.card === id ? s.failed : null,
        act: a && a.act, rate: a && a.rate, retry: a && a.retry, suspend: a && a.suspend, open: a && a.open, link: a && a.link
      });
    } else m.card = null;
    return m;
  }
  RV.view = view;

  /* What a stand-in for another job's screen says (canvas only). */
  function awayProps(s, a) {
    var w = s.away || { kind: "library" };
    var o = { kind: w.kind === "reader" ? "reader" : "library-review", onBack: a.back, onContinue: a.signedIn, where: "", detail: "", legacyTitle: "", proposal: false };
    if (w.kind === "reader") {
      if (w.chapter) {
        var t = RD.titleOf(w.chapter, "en");
        o.where = t.text + " · where you stopped reading, 46% in";
        o.detail = "Tidewater, from the inside · Chapter 11 of 20";
      } else {
        var m = cardModel(w.card, { st: s.st[w.card], langs: s.langs, ov: s.ov[w.card] });
        o.where = m.where.title + " · " + (m.isQuiz ? "the quiz “" + m.quizName + "”, question " + m.qn : "the highlight in “" + m.hl.sec + "”");
        o.detail = m.src;
        o.proposal = m.isQuiz;
      }
    }
    return o;
  }

  function extras(s, a) {
    var THEMES = [["system", "System"], ["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"]];
    var SIZES = [[1, "Size 1"], [3, "Size 3"], [5, "Size 5"]];
    return {
      hasExtra: true, extraLabel: "· theme:",
      extra: THEMES.map(function (t) { return { label: t[1], pressed: s.themeChoice === t[0], pick: function () { a.theme(t[0]); } }; }),
      hasExtra2: true, extra2Label: "· text size:",
      extra2: SIZES.map(function (z) { return { label: z[1], pressed: s.size === z[0], pick: function () { a.size(z[0]); } }; })
    };
  }
  function bar(s, a, only) {
    var on = pressedKey(s);
    return PAGES.filter(function (p) { return !only || only.indexOf(p.key) >= 0; }).map(function (p) {
      var cur = p.key === s.page;
      var g = { key: p.key, name: p.name, off: !cur, cls: cur ? "pb-group" : "pb-group is-off", only: p.key !== "review",
        hasExtra: false, extraLabel: "", extra: [], hasExtra2: false, extra2Label: "", extra2: [] };
      if (p.key === "review") {
        g.presets = PRESETS.map(function (x) { return { key: x.key, label: x.label, pressed: cur && on === x.key, pick: function () { a.pick(x.key); } }; });
        Object.assign(g, extras(s, a));
      } else {
        g.presets = [{ key: p.key, label: p.key === "reader" ? "Opened from review" : "Opened from review", pressed: cur, pick: function () {} }];
      }
      return g;
    });
  }
  function initial(key, keep) { var n = presetState(key || "due", keep); return n; }

  RV.flow = { PRESETS: PRESETS, PAGES: PAGES, initial: initial, api: api, view: view, awayProps: awayProps, bar: bar, extras: extras,
    pressedKey: pressedKey, themeOf: themeOf, presetState: presetState, applyRating: applyRating, applyLimits: applyLimits, advanceTo: advanceTo, grade: grade, base: base };

  /* ---------- Samples for the Components boards (no flow: every handler is a no-op) ---------- */
  RV.sample = {
    /* spec: { at: card id, acts: [quiz actions], pending: rating, failed: rating, langs, uid } */
    card: function (spec) {
      var n = base();
      if (spec.langs) n.langs = spec.langs;
      if (spec.acts) grade(n, spec.at, spec.acts);
      return cardModel(spec.at, {
        uid: spec.uid || ("s-" + spec.at), st: n.st[spec.at] || freshSt(spec.at), langs: n.langs, ov: spec.ov,
        pending: spec.pending ? { rating: spec.pending } : null, failed: spec.failed ? { rating: spec.failed } : null,
        act: function () {}, rate: function () {}, retry: function () {}, suspend: function () {}, open: function () {}, link: function () {}
      });
    },
    state: function (key) { return presetState(key); },
    head: function (key, mod) { var n = presetState(key); if (mod) mod(n); return headModel(n, { bybook: function () {} }); },
    end: function (key) { return endModel(presetState(key), {}); },
    settings: function (key, mod) { var n = presetState(key || "settings"); if (mod) mod(n); return settingsModel(n, {}); }
  };
})();
