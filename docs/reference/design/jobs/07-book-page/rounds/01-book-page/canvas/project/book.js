/* Canvas only, never built. The book page canvas's sample data (S1's manifest fields and S3's per-reader state for
   one invented org, Quillwork), the view model every board draws from, and the flow's presets and state bar.
   The product reads `GET /app/reader/books/{org}/{project}/{book}` and the manifest; this file stands in for both.
   Every board draws its UI as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var BK = (window.BK = window.BK || {});

  /* ---------- the sample library (S1 fields) ---------- */
  function ver(v, date, from) { var o = { v: v, date: date }; if (from) o.from = from; return o; }
  function nat(title, versions, summary, secs) { return { title: title, format: "native", versions: versions, summary: summary || "", secs: secs || {} }; }
  function leg(title, versions) { return { title: title, format: "legacy", versions: versions, summary: "", secs: {} }; }
  function ch(key, position, variants, source) { return { key: key, position: position, variants: variants, source: source || null }; }
  var AUG = "8 Aug 2026", OCT3 = "3 Oct 2026";

  var TIDE_TITLES = [
    ["what-it-predicts", "What Tidewater predicts, and for whom", "The service, its three kinds of reader, and the one number every one of them wants: the height of the water at a given minute."],
    ["harmonic-model", "The harmonic model in one sitting"],
    ["stations", "Stations and the station registry"],
    ["gauge-readings", "Ingesting gauge readings"],
    ["constituent-solver", "The constituent solver"],
    ["prediction-cache", "Caching predictions by day"],
    ["datums", "Datums: Chart Datum, Mean Sea Level, and the Conversions Between Them"],
    ["tide-table-api", "The public tide-table API"],
    ["rendering-tables", "Rendering a tide table"],
    ["time-zones", "Time zones and the daylight-saving hour"],
    ["storm-surge", "Storm surge: when the model is wrong", "What the harmonic model cannot see, and how Tidewater says so to the people relying on it."],
    ["alerts", "Alerts and the threshold service", "Thresholds per station, and the alert that fires once rather than every six minutes."],
    ["backfill", "Backfilling a decade of readings"],
    ["testing", "Testing against published tables"],
    ["deploying", "Deploying to the harbour edge"],
    ["observability", "Observability: the three dashboards"],
    ["failure-stories", "Failure stories"],
    ["performance", "The performance budget"],
    ["differently", "What we would do differently"],
    ["reading-guide", "Reading guide: how to use this book", "Where to start, depending on whether you maintain the service, call its API, or read its tables."]
  ];

  var books = {
    guide: {
      key: "guide", org: "quillwork", project: "knowledge", slug: "maintainer-guide", visibility: "public",
      title: "The knowledge maintainer guide", kind: "codebase", subject: null, description: null,
      chapters: [
        ch("what-it-is", 1, { en: nat("Knowledge: What It Is and How It Is Used", [ver(1, AUG)], "What a document is, who owns it, and the four doors that lead to the same files.") }),
        ch("internals", 2, {
          en: nat("Knowledge System Internals: The Content Plane, the Write Path, and the Contracts", [ver(2, "12 Oct 2026"), ver(1, AUG)],
            "Where a document actually lives, what happens in the milliseconds after an agent publishes one, and which contracts you may extend but must not break.",
            { "the-write-path": "The write path", "the-two-planes": "The two planes" }),
          ko: nat("지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약", [ver(1, "20 Aug 2026", { lang: "en", v: 1 })],
            "문서가 실제로 어디에 사는지, 에이전트가 문서를 발행한 직후 몇 밀리초 동안 무슨 일이 일어나는지, 그리고 확장은 해도 깨뜨려서는 안 되는 계약이 무엇인지 다룹니다.",
            { "the-write-path": "쓰기 경로", "the-two-planes": "두 개의 평면" })
        }),
        ch("read-surfaces", 3, { en: nat("Knowledge's Read Surfaces: Two Front Ends, One Corpus", [ver(1, AUG)], "", { "sealed-cookie": "The sealed cookie" }) }),
        ch("shipping", 4, { en: nat("Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates", [ver(1, AUG)], "How one repository becomes four release channels, and the gates that keep them in step.") }),
        ch("why", 5, { en: nat("Why Knowledge Is This Way, and How to Change It", [ver(3, "14 Oct 2026"), ver(2, "2 Sep 2026"), ver(1, AUG)], "The decisions behind the first four chapters, the roads not taken, and the way to change one safely.") })
      ]
    },
    tidewater: {
      key: "tidewater", org: "quillwork", project: "tidewater", slug: "tidewater", visibility: "public",
      title: "Tidewater, from the inside", kind: "codebase", subject: null,
      description: "How the tide-prediction service turns six-minute gauge readings into the tables harbour offices print, and what to check when it is wrong.",
      chapters: TIDE_TITLES.map(function (t, i) {
        var key = t[0];
        if (key === "datums") return ch(key, i + 1, { en: leg(t[1], [ver(1, OCT3)]) });
        if (key === "time-zones") return ch(key, i + 1, { en: nat(t[1], [ver(2, "10 Oct 2026"), ver(1, OCT3)]) });
        if (key === "storm-surge") return ch(key, i + 1, { en: nat(t[1], [ver(1, OCT3)], t[2], { noticing: "Noticing a surge" }) });
        return ch(key, i + 1, { en: nat(t[1], [ver(1, OCT3)], t[2] || "") });
      })
    },
    lantern: {
      key: "lantern", org: "quillwork", project: "lantern", slug: "phases", visibility: "private",
      title: "lantern, phase by phase", kind: "codebase", subject: null, description: null, shape: "phases",
      chapters: [
        ch("p24", 24, { en: leg("P24: Running checks from three regions", [ver(1, "6 Oct 2026")]) }, { phase: "P24" }),
        ch("p8", 8, {
          en: leg("P8: Probe scheduling without a thundering herd", [ver(2, "2 Sep 2026"), ver(1, "4 Jul 2026")]),
          ko: leg("P8: 몰림 없는 프로브 스케줄링", [ver(1, "11 Jul 2026", { lang: "en", v: 1 })])
        }, { phase: "P8" }),
        ch("p17-p18", 17, { en: leg("P17 and P18: Status pages, then the notices that follow them", [ver(1, "29 Aug 2026")]) }, { phase: "P17" }),
        ch("p9", 9, { en: leg("P9: Incident timelines from raw check results", [ver(1, "18 Jul 2026")]) }, { phase: "P9" })
      ]
    },
    p24: {
      key: "p24", org: "quillwork", project: "lantern", slug: "p24", visibility: "private",
      title: "P24: Running checks from three regions", kind: "codebase", subject: null, description: null, shape: "slices", phase: "P24",
      chapters: [
        ch("s1", 1, { en: nat("A region field on every check", [ver(1, "1 Oct 2026")], "Why every check now records where it ran, and the migration that added the field.") }, { phase: "P24", slice: "P24.S1" }),
        ch("s2", 2, { en: nat("Scheduling one probe per region", [ver(1, "3 Oct 2026")]) }, { phase: "P24", slice: "P24.S2" }),
        ch("s3", 3, { en: nat("Agreeing on down: two regions out of three", [ver(1, "5 Oct 2026")], "", { counting: "Counting the votes" }) }, { phase: "P24", slice: "P24.S3" }),
        ch("f1", 4, { en: nat("Clock skew between regions, and the fix", [ver(1, "7 Oct 2026")]) }, { phase: "P24", slice: "P24.F1" })
      ]
    },
    orchard: {
      key: "orchard", org: "quillwork", project: "orchard", slug: "maintainer-guide", visibility: "public",
      title: "The orchard maintainer guide", kind: "codebase", subject: null, description: null,
      chapters: [
        ch("in-one-page", 1, { en: leg("orchard in one page: what it caches, and why", [ver(1, "14 May 2026")]) }),
        ch("cache-keys", 2, { en: leg("How a cache key is made", [ver(1, "14 May 2026")]) }),
        ch("remote-storage", 3, { en: leg("Remote storage and eviction", [ver(1, "14 May 2026")]) }),
        ch("in-ci", 4, { en: leg("Running orchard in CI", [ver(1, "14 May 2026")]) })
      ]
    },
    /* A subject book, drawn only on the head's Components board: the sample library has no subject book yet. */
    subject: {
      key: "subject", org: "quillwork", project: "english", slug: "phrasal-verbs", visibility: "private",
      title: "Phrasal verbs in technical writing", kind: "subject", subject: "English",
      description: "The forty phrasal verbs that keep turning up in design docs and code review, each in a real sentence.",
      chapters: [ch("set-up", 1, { en: nat("Set up, set out, set off", [ver(1, "16 Oct 2026")]) }), ch("roll-out", 2, { en: nat("Roll out and roll back", [ver(1, "17 Oct 2026")]) })]
    }
  };

  /* ---------- per-reader state (S3): state, percent, the version finished on, language, section, recency ---------- */
  function fin(on, t, lang) { return { s: "finished", on: on, t: t, lang: lang || "en" }; }
  function st(pct, at, t, lang) { return { s: "started", pct: pct, at: at || null, t: t, lang: lang || "en" }; }
  var progs = {
    none: {},
    "g-default": { "what-it-is": fin(1, 1), internals: st(38, "the-write-path", 5), why: fin(2, 3) },
    "g-ko": { "what-it-is": fin(1, 1), internals: st(38, "the-write-path", 5, "ko"), why: fin(2, 3) },
    /* chapter 3 opened last, at 0%: "Started" alone in its row, and Continue reading's "not read far yet" line */
    "g-opened": { "what-it-is": fin(1, 1), internals: st(38, "the-write-path", 5), "read-surfaces": st(0, null, 6), why: fin(2, 3) },
    "g-done": { "what-it-is": fin(1, 1), internals: fin(2, 4), "read-surfaces": fin(1, 5), shipping: fin(1, 6), why: fin(2, 3) },
    "g-all": { "what-it-is": fin(1, 1), internals: fin(2, 2), "read-surfaces": fin(1, 3), shipping: fin(1, 4), why: fin(3, 5) },
    "g-next": { "what-it-is": fin(1, 1), internals: fin(2, 2), "read-surfaces": fin(1, 4) },
    "g-other": { "what-it-is": fin(1, 1), "read-surfaces": st(20, "sealed-cookie", 2) },
    tide: (function () {
      var p = {};
      TIDE_TITLES.slice(0, 10).forEach(function (t, i) { p[t[0]] = fin(1, i + 1); });
      p["storm-surge"] = st(46, "noticing", 30);
      p.alerts = st(12, null, 20);
      return p;
    })(),
    lantern: { p8: fin(2, 1), p9: st(64, null, 2) },
    p24: { s1: fin(1, 1), s2: fin(1, 2), s3: st(22, "counting", 3) }
  };
  /* Bookmarks, highlights and notes in each book (S3 `GET annotations?…&book=`): the count line only. */
  var notes = {
    "guide/member": { n: 33, chapters: 4 }, "guide/other": { n: 2, chapters: 1 }, "tidewater/member": { n: 0, chapters: 0 },
    "lantern/member": { n: 3, chapters: 2 }, "p24/member": { n: 5, chapters: 2 }
  };
  /* Which progress set each book opens with, for a member and for a reader from another org. */
  var DEFAULT_PK = { guide: "g-default", tidewater: "tide", lantern: "lantern", p24: "p24", orchard: "none", subject: "none" };

  BK.books = books;
  BK.progs = progs;
  BK.LANG = { en: "English", ko: "한국어" };

  /* ---------- helpers ---------- */
  function ordered(book) {
    return book.chapters.slice().sort(function (a, b) { return a.position - b.position || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); });
  }
  function langsOf(c) { return Object.keys(c.variants); }
  function newest(c, lang) { var va = c.variants[lang] || c.variants[langsOf(c)[0]]; return va.versions[0].v; }
  function shownLang(c, p) { return p && p.lang && c.variants[p.lang] ? p.lang : langsOf(c)[0]; }
  function stateOf(c, p) {
    if (!p) return "unopened";
    if (p.s === "finished") return (p.on || 1) < newest(c, p.lang || "en") ? "updated" : "finished";
    return "started";
  }
  function count(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function joinWords(xs) { return xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; }
  function stale(c, lang) {
    var va = c.variants[lang], from = va.versions[0].from;
    if (!from || !c.variants[from.lang]) return null;
    var src = newest(c, from.lang);
    return from.v < src ? { lang: from.lang, v: from.v, src: src } : null;
  }
  BK.ordered = ordered;
  BK.count = count;
  BK.pkFor = function (bookKey, viewer) { return viewer === "anon" ? "none" : viewer === "other" ? (bookKey === "guide" ? "g-other" : "none") : DEFAULT_PK[bookKey] || "none"; };
  BK.notesFor = function (bookKey, viewer, pk) {
    if (viewer === "anon" || pk === "none") return null;
    return notes[bookKey + "/" + viewer] || { n: 0, chapters: 0 };
  };
  BK.url = function (book, key, q) {
    return "/@" + book.org + "/" + book.project + "/books/" + book.slug + (key ? "/" + key : "") + (q || "");
  };

  /* One chapter row: the reader's chapter-list words (§11) plus this page's variants line. */
  BK.row = function (book, c, n, prog, member) {
    var p = prog[c.key], L = shownLang(c, p), va = c.variants[L], state = stateOf(c, p);
    var legacy = va.format === "legacy";
    var word = "";
    if (member) word = state === "unopened" ? "Not started" : state === "started" ? (p.pct ? "Started · " + p.pct + "%" : "Started") : "Finished";
    var langs = langsOf(c);
    var multiVer = langs.some(function (l) { return c.variants[l].versions.length > 1; });
    var langLinks = langs.length > 1 ? langs.map(function (l) {
      var s = stale(c, l), x = c.variants[l];
      return { code: l, label: BK.LANG[l] || l, v: x.versions[0].v, stale: !!s, legacy: x.format === "legacy",
        aria: (BK.LANG[l] || l) + ", version " + x.versions[0].v + (s ? ", an older translation" : "") };
    }) : [];
    var groups = langs.map(function (l) {
      var x = c.variants[l], top = x.versions[0].v;
      return { code: l, label: BK.LANG[l] || l, legacy: x.format === "legacy", rows: x.versions.map(function (r) {
        return { v: r.v, date: "Published " + r.date, current: r.v === top, from: r.from ? "Translated from " + (BK.LANG[r.from.lang] || r.from.lang) + " v" + r.from.v : "",
          aria: "View version " + r.v + (langs.length > 1 ? ", " + (BK.LANG[l] || l) : "") };
      }) };
    });
    var single = langs.length === 1 ? c.variants[langs[0]].versions[0] : null;
    return {
      key: c.key, n: n, title: c.title || va.title, lang: L, legacy: legacy, member: !!member, state: state, word: word,
      pct: p && p.pct ? p.pct : 0, section: p && p.at ? (va.secs[p.at] || null) : null,
      updated: !!member && state === "updated", slice: c.source && c.source.slice ? c.source.slice : "",
      langLinks: langLinks, multiLang: langs.length > 1, multiVer: multiVer, hasVars: langs.length > 1 || multiVer,
      single: single ? "v" + single.v + " · " + single.date : "", groups: groups,
      summary: va.summary || ""
    };
  };

  /* The whole page's view model, for one book, one viewer and one progress set. */
  BK.view = function (bookKey, viewer, pk) {
    var book = books[bookKey];
    if (!book) return null;
    var member = viewer !== "anon";
    var prog = member ? (progs[pk] || {}) : {};
    var chs = ordered(book), M = chs.length;
    var rows = chs.map(function (c, i) { return BK.row(book, c, i + 1, prog, member); });
    var done = rows.filter(function (r) { return r.state === "finished" || r.state === "updated"; }).length;
    var touched = rows.filter(function (r) { return r.state !== "unopened"; }).length;
    var publicView = viewer !== "member";
    var head = {
      kindLabel: book.kind === "subject" ? "Subject" : "Codebase",
      place: book.kind === "subject" ? book.subject : (publicView ? "@" + book.org + " / " + book.project : book.project) + (book.subject ? " · " + book.subject : ""),
      title: book.title, description: book.description || "", hasDesc: !!book.description,
      member: member, done: done, total: M,
      progress: done + " of " + M + " finished", pct: M ? Math.round((done / M) * 100) : 0
    };
    /* This book's Continue reading: S3's pointer, the most recently updated position among its chapters. */
    var last = null;
    chs.forEach(function (c, i) { var p = prog[c.key]; if (p && (!last || p.t > last.p.t)) last = { c: c, i: i, p: p }; });
    var cont;
    function startAt(i, kind) {
      var r = rows[i];
      return { kind: kind, n: r.n, total: M, title: r.title, lang: r.lang, legacy: r.legacy, key: r.key, section: null, pct: 0, summary: r.summary };
    }
    if (!member || !last) cont = startAt(0, "start");
    else if (done === M) {
      var upd = rows.filter(function (r) { return r.updated; });
      cont = { kind: "finished", total: M, updated: upd.map(function (r) { return r.n; }), key: upd.length ? upd[0].key : rows[0].key,
        n: upd.length ? upd[0].n : 1, lang: upd.length ? upd[0].lang : rows[0].lang, legacy: upd.length ? upd[0].legacy : rows[0].legacy };
    } else if (last.p.s === "started") {
      var r = rows[last.i];
      cont = { kind: "continue", n: r.n, total: M, title: r.title, lang: r.lang, legacy: r.legacy, key: r.key, section: r.section, pct: r.pct, summary: "" };
    } else {
      /* the pointer sits on a finished chapter: the next one not finished, after it, else the first one not finished */
      var j = -1;
      for (var k = last.i + 1; k < M; k++) if (rows[k].state === "unopened" || rows[k].state === "started") { j = k; break; }
      if (j < 0) for (k = 0; k < M; k++) if (rows[k].state === "unopened" || rows[k].state === "started") { j = k; break; }
      cont = startAt(j, "next");
      cont.after = rows[last.i].n;
    }
    var shapeNote = book.shape === "phases" ? "One chapter for each phase that was explained, in phase order."
      : book.shape === "slices" ? "One chapter for each slice of " + book.phase + ", in slice order." : "";
    var nt = BK.notesFor(bookKey, viewer, member ? pk : "none");
    var hasData = member && (touched > 0 || (nt && nt.n > 0));
    return {
      book: book, viewer: viewer, member: member, head: head, cont: cont, rows: rows, count: count(M, "chapter", "chapters"),
      shapeNote: shapeNote, hasShape: !!shapeNote,
      notes: nt && touched > 0 ? { n: nt.n, line: nt.n ? count(nt.n, "item", "items") + " in " + count(nt.chapters, "chapter", "chapters") : "Nothing marked yet" } : null,
      data: { has: hasData, chapters: touched, notes: nt ? nt.n : 0 }
    };
  };

  /* The stand-in's text for a click that leaves this page. */
  BK.dest = function (bookKey, key, lang, v, resume, viewer, pk) {
    var book = books[bookKey], c = book.chapters.filter(function (x) { return x.key === key; })[0];
    var prog = viewer === "anon" ? {} : (progs[pk] || {}), p = prog[c.key];
    var L = lang || shownLang(c, p), va = c.variants[L], top = va.versions[0].v, V = v || top;
    var legacy = va.format === "legacy";
    var place = "from the top";
    if (resume && !v && p && p.s === "started" && (p.lang || "en") === L) {
      place = p.at && va.secs[p.at] ? "at “" + va.secs[p.at] + "”, where you stopped" : "at " + p.pct + "%, where you stopped";
    }
    var q = [];
    if (L !== langsOf(c)[0]) q.push("lang=" + L);
    if (v && v !== top) q.push("v=" + v);
    var st8 = stale(c, L);
    var where = (BK.LANG[L] || L) + " · v" + V + (V === top ? " (newest)" : " (an older version)") +
      (st8 && V === top ? " · translated from " + (BK.LANG[st8.lang] || st8.lang) + " v" + st8.v + ", an older translation" : "") + " · " + place;
    return { kind: legacy ? "legacy-book" : "chapter", detail: c.title || va.title, where: where,
      url: BK.url(book, key, q.length ? "?" + q.join("&") : ""), lang: L };
  };

  /* ---------- the flow: one state object, the presets, the state bar ---------- */
  var seq = 0;
  function base(over) {
    /* reveal: the part a preset names, brought into view once the page renders it (canvas only); jump: a preset's id */
    var s = { book: "guide", viewer: "member", pk: "g-default", status: "ready", vers: null, clear: "idle", away: null, from: null, tok: 0, reveal: null, jump: 0 };
    for (var k in over) s[k] = over[k];
    return s;
  }
  var PAGES = [
    { key: "book", name: "Book page" },
    { key: "chapter", name: "Reader — 01-reader, signed" },
    { key: "legacy-book", name: "Legacy reader — 09-legacy-and-print" },
    { key: "notes", name: "Notes in this book — 05-annotations, signed" },
    { key: "library-book", name: "Library — 06-library" },
    { key: "signin-book", name: "Sign in — the existing auth" }
  ];
  var G = { book: "guide", viewer: "member" };
  function g(over) { var o = {}; for (var k in G) o[k] = G[k]; for (var j in over) o[j] = over[j]; return o; }
  function awayAt(kind, from, extra) { var o = { kind: kind }; for (var k in extra || {}) o[k] = extra[k]; return base({ away: o, from: from }); }
  var PRESETS = [
    { key: "g", page: "book", label: "Guide · 2 of 5 finished", make: function () { return base(g({ pk: "g-default" })); } },
    { key: "gko", page: "book", label: "Guide · last read in 한국어", make: function () { return base(g({ pk: "g-ko" })); } },
    { key: "gopen", page: "book", label: "Guide · chapter 3 started at 0%", make: function () { return base(g({ pk: "g-opened" })); } },
    { key: "gvers", page: "book", label: "Guide · chapter 2's versions open", make: function () { return base(g({ pk: "g-default", vers: "internals", reveal: "vers" })); } },
    { key: "gdone", page: "book", label: "Guide · all finished, one Updated", make: function () { return base(g({ pk: "g-done" })); } },
    { key: "gnever", page: "book", label: "Guide · never opened", make: function () { return base(g({ pk: "none" })); } },
    { key: "tide", page: "book", label: "Tidewater · 20 chapters", make: function () { return base({ book: "tidewater", viewer: "member", pk: "tide" }); } },
    { key: "lan", page: "book", label: "lantern · phases book", make: function () { return base({ book: "lantern", viewer: "member", pk: "lantern" }); } },
    { key: "p24", page: "book", label: "lantern · per-slice book p24", make: function () { return base({ book: "p24", viewer: "member", pk: "p24" }); } },
    { key: "orch", page: "book", label: "orchard · all legacy, never opened", make: function () { return base({ book: "orchard", viewer: "member", pk: "none" }); } },
    { key: "cask", page: "book", label: "Clear · confirming", make: function () { return base(g({ pk: "g-default", clear: "confirm", reveal: "clear" })); } },
    { key: "cpend", page: "book", label: "Clear · clearing…", make: function () { return base(g({ pk: "g-default", clear: "pending", reveal: "clear" })); } },
    { key: "cdone", page: "book", label: "Clear · cleared", make: function () { return base(g({ pk: "none", clear: "done", reveal: "clear" })); } },
    { key: "cfail", page: "book", label: "Clear · failed", make: function () { return base(g({ pk: "g-default", clear: "failed", reveal: "clear" })); } },
    { key: "anon", page: "book", label: "Signed out · public book", make: function () { return base({ book: "guide", viewer: "anon", pk: "none" }); } },
    { key: "other", page: "book", label: "Signed in · reader from another org", make: function () { return base({ book: "guide", viewer: "other", pk: "g-other" }); } },
    { key: "priv", page: "book", label: "Signed out · a private book's address", make: function () { return base({ book: "lantern", viewer: "anon", pk: "none", status: "notfound" }); } },
    { key: "load", page: "book", label: "Loading", make: function () { return base(g({ status: "loading" })); } },
    { key: "nf", page: "book", label: "Not found", make: function () { return base({ book: "missing", viewer: "member", pk: "none", status: "notfound" }); } },
    { key: "fail", page: "book", label: "Failed to load", make: function () { return base(g({ status: "failed" })); } },
    /* A stand-in page has one state: whatever the click that opened it carried. Its preset says so and changes
       nothing, so its label never contradicts the screen under it. */
    { key: "achapter", page: "chapter", label: "The chapter you opened", keep: true, make: function () { return awayAt("chapter", base(g({})), BK.dest("guide", "internals", null, null, true, "member", "g-default")); } },
    { key: "alegacy", page: "legacy-book", label: "The chapter you opened", keep: true, make: function () { return awayAt("legacy-book", base({ book: "lantern", viewer: "member", pk: "lantern" }), BK.dest("lantern", "p9", null, null, true, "member", "lantern")); } },
    { key: "anotes", page: "notes", label: "The list you opened", keep: true, make: function () { return awayAt("notes", base(g({})), { detail: "The knowledge maintainer guide", where: "33 items in 4 chapters · 2 approximate · 2 unanchored" }); } },
    { key: "alib", page: "library-book", label: "The library", keep: true, make: function () { return awayAt("library-book", base(g({})), {}); } },
    { key: "asign", page: "signin-book", label: "Sign in", keep: true, make: function () { return awayAt("signin-book", base({ book: "guide", viewer: "anon", pk: "none" }), { detail: "The knowledge maintainer guide" }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });
  function pageOf(s) { return s.away ? s.away.kind : "book"; }
  function sig(s) { return s.away ? "away:" + s.away.kind : [s.book, s.viewer, s.pk, s.status, s.vers || "", s.clear].join("|"); }
  function pressedKey(s, keys) {
    var me = sig(s), hit = null;
    keys.forEach(function (k) { if (!hit && sig(BY[k].make()) === me) hit = k; });
    return hit;
  }

  /* Handlers for one board's state. Each async result (a clear, a retry) carries an id and is dropped when the
     state that started it is gone, so a preset pressed mid-flight never receives it. */
  BK.api = function (comp) {
    function set(o) { comp.setState(o); }
    function cur() { return comp.state; }
    function leave(dest) {
      var s = cur(), from = {};
      for (var k in s) if (k !== "away" && k !== "from") from[k] = s[k];
      from.vers = s.vers; from.clear = s.clear === "done" ? "done" : "idle";
      set({ away: dest, from: from });
    }
    var a = {
      pick: function (key) {
        if (BY[key].keep && pageOf(cur()) === BY[key].page) return;
        seq += 1; var n = BY[key].make(); n.tok = seq; n.jump = seq; set(n);
      },
      back: function () { var f = cur().from || base({}); f.away = null; f.from = null; set(f); },
      open: function (key, lang, v, resume) { var s = cur(); var d = BK.dest(s.book, key, lang, v, resume !== false, s.viewer, s.pk); leave(d); },
      notes: function () {
        var s = cur(), b = books[s.book], nt = BK.notesFor(s.book, s.viewer, s.pk) || { n: 0, chapters: 0 };
        leave({ kind: "notes", detail: b.title, where: nt.n ? count(nt.n, "item", "items") + " in " + count(nt.chapters, "chapter", "chapters") : "the list's empty state: “Nothing marked in this book yet: highlights, notes and bookmarks you make in its chapters gather here.”" });
      },
      library: function () { leave({ kind: "library-book" }); },
      signIn: function () { var s = cur(), b = books[s.book]; leave({ kind: "signin-book", detail: b ? b.title : "this book" }); },
      signedIn: function () {
        var f = cur().from || base({});
        var bk = books[f.book] ? f.book : "guide";
        set(base({ book: bk, viewer: "member", pk: BK.pkFor(bk, "member") }));
      },
      versions: function (key) { var s = cur(); set({ vers: s.vers === key ? null : key }); },
      ask: function () { set({ clear: "confirm" }); },
      cancel: function () { set({ clear: "idle" }); },
      confirm: function () {
        seq += 1; var id = seq;
        set({ clear: "pending", tok: id });
        setTimeout(function () {
          var s = cur();
          if (s.tok !== id || s.clear !== "pending") return;
          set({ clear: "done", pk: "none", vers: null });
        }, 1400);
      },
      retry: function () {
        seq += 1; var id = seq;
        set({ status: "loading", tok: id });
        setTimeout(function () { var s = cur(); if (s.tok !== id || s.status !== "loading") return; set({ status: "ready" }); }, 1100);
      }
    };
    return a;
  };

  BK.initial = function (key) { var s = BY[key || "g"].make(); s.theme = "light"; return s; };

  BK.bar = function (comp, a, themes) {
    var s = comp.state, here = pageOf(s);
    var TH = [["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"]];
    return PAGES.map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === here ? pressedKey(s, keys) : null;
      var isBook = p.key === "book";
      return {
        key: p.key, name: p.name, cls: p.key === here ? "pb-group" : "pb-group is-off", only: keys.length === 1,
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k ? "true" : "false", pick: function () { a.pick(k); } }; }),
        hasExtra: isBook && themes !== false, extraLabel: "· theme:",
        extra: isBook ? TH.map(function (t) { return { label: t[1], pressed: s.theme === t[0] ? "true" : "false", pick: function () { comp.setState({ theme: t[0] }); } }; }) : []
      };
    });
  };

  /* Props for the book page, from one board's state. */
  BK.pageProps = function (comp, a) {
    var s = comp.state;
    return {
      book: s.book, viewer: s.viewer, pk: s.pk, status: s.status, vers: s.vers, clear: s.clear, theme: s.theme || "light", tok: s.tok,
      reveal: s.reveal || "", jump: s.jump || 0,
      onOpen: a.open, onVersions: a.versions, onNotes: a.notes, onLibrary: a.library, onSignIn: a.signIn,
      onAsk: a.ask, onCancel: a.cancel, onConfirm: a.confirm, onRetry: a.retry
    };
  };
  BK.awayProps = function (comp, a) {
    var w = comp.state.away || {};
    return { kind: w.kind, detail: w.detail || "", where: w.where || "", url: w.url || "", onBack: a.back, onContinue: a.signedIn };
  };
  BK.pageOf = pageOf;
  BK.PRESETS = PRESETS;
})();
