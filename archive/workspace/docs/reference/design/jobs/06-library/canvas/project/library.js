/* Canvas only, never built: the wave's shared sample library and the view model the library's boards draw.
   Every name is invented except the knowledge project and its book's five real titles (the canvas content rule).
   Tidewater's twenty titles are the signed reader's (01-reader/02-revise reader.js). The product reads S1's
   manifests and S3's positions instead; this file only computes the values the markup shows. */
(function () {
  "use strict";

  /* ---------- Hangul runs inside other text get lang="ko" (the reader's rule 6a) ---------- */
  var HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]+(?:[  ]+[ᄀ-ᇿ㄰-㆏가-힯]+)*/g;
  function parts(text, lang) {
    if (lang === "ko") return [{ t: text, lang: "ko" }];
    var out = [], last = 0, m;
    HANGUL.lastIndex = 0;
    while ((m = HANGUL.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), lang: "en" });
      out.push({ t: m[0], lang: "ko" });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: text.slice(last), lang: "en" });
    return out;
  }

  /* ---------- The org, the people ---------- */
  var ORG = { name: "Quillwork", handle: "quillwork" };
  var PEOPLE = {
    member: { name: "Mira Castell", initial: "M", org: "Quillwork" },
    visitor: { name: "Tomas Reyes", initial: "T", org: "Larkspur" }
  };
  var PUBLIC = { knowledge: true, lantern: true, "field-notes": true };
  var EMPTY_PROJECTS = ["kiln", "marrow", "spindle"];

  /* ---------- Books ---------- */
  function ch(key, title, o) { var c = { key: key, title: title, format: "native", newest: 1 }; for (var k in o || {}) c[k] = o[k]; return c; }
  var MG = { id: "knowledge/maintainer-guide", project: "knowledge", slug: "maintainer-guide", title: "The knowledge maintainer guide", kind: "codebase",
    chapters: [
      ch("what-it-is", "Knowledge: What It Is and How It Is Used"),
      ch("internals", "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts", { newest: 2, ko: "지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약" }),
      ch("read-surfaces", "Knowledge's Read Surfaces: Two Front Ends, One Corpus"),
      ch("shipping", "Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates"),
      ch("why", "Why Knowledge Is This Way, and How to Change It", { newest: 3 })
    ] };
  var TWT = ["What Tidewater predicts, and for whom", "The harmonic model in one sitting", "Stations and the station registry",
    "Ingesting gauge readings", "The constituent solver", "Caching predictions by day",
    "Datums: Chart Datum, Mean Sea Level, and the Conversions Between Them", "The public tide-table API", "Rendering a tide table",
    "Time zones and the daylight-saving hour", "Storm surge: when the model is wrong", "Alerts and the threshold service",
    "Backfilling a decade of readings", "Testing against published tables", "Deploying to the harbour edge",
    "Observability: the three dashboards", "Failure stories", "The performance budget", "What we would do differently",
    "Reading guide: how to use this book"];
  var TWK = ["what-it-predicts", "harmonic-model", "stations", "gauge-readings", "constituent-solver", "prediction-cache", "datums",
    "tide-table-api", "rendering-tables", "time-zones", "storm-surge", "alerts", "backfill", "testing", "deploying",
    "observability", "failure-stories", "performance", "differently", "reading-guide"];
  var TW = { id: "tidewater/tidewater", project: "tidewater", slug: "tidewater", title: "Tidewater, from the inside", kind: "codebase",
    chapters: TWK.map(function (k, i) {
      return ch(k, TWT[i], { format: k === "datums" ? "legacy" : "native", newest: k === "time-zones" ? 2 : 1 });
    }) };
  var LANTERN = { id: "lantern/phases", project: "lantern", slug: "phases", title: "lantern, phase by phase", kind: "codebase",
    chapters: [
      ch("p8", "P8: Rendering phase pages from plain files", { format: "legacy", newest: 2, ko: "P8: 평범한 파일에서 페이즈 페이지 그리기" }),
      ch("p9", "P9: The release checklist", { format: "legacy" }),
      ch("p17-p18", "P17 and P18: Search, and then its index", { format: "legacy" }),
      ch("p24", "P24: Moving builds to the edge", { format: "legacy" })
    ] };
  var ORCHARD = { id: "orchard/maintainer-guide", project: "orchard", slug: "maintainer-guide", title: "The orchard maintainer guide", kind: "codebase",
    chapters: [
      ch("at-a-glance", "Orchard at a glance", { format: "legacy" }),
      ch("harvest-runs", "How orchard schedules a harvest run", { format: "legacy" }),
      ch("grading", "The grading pipeline, stage by stage", { format: "legacy" }),
      ch("shipping", "Shipping orchard and keeping it running", { format: "legacy" })
    ] };
  var AI = { id: "ai/how-models-read", project: "ai", slug: "how-models-read", title: "How language models read: from tokens to attention", kind: "subject", subject: "AI",
    chapters: ["Text becomes tokens", "Embeddings: a word as a point in space", "Attention, one head at a time", "Many heads, many layers",
      "What a model cannot see", "Reading model output with care"].map(function (t, i) { return ch("c" + (i + 1), t); }) };
  var ENG = { id: "english/clear-english", project: "english", slug: "clear-english", title: "Clear English for code review", kind: "subject", subject: "English",
    chapters: ["Say what the change does", "Questions that are not orders", "Hedging without vagueness", "Articles in technical prose",
      "Tense in commit messages", "Short sentences, long ideas", "Disagreeing in writing", "A checklist for your next review"].map(function (t, i) { return ch("c" + (i + 1), t); }) };

  /* ---------- Loose documents ---------- */
  function doc(project, slug, title, format, newest, date, sort, o) {
    var d = { id: project + "/" + slug, project: project, slug: slug, title: title, format: format, newest: newest, date: date, sort: sort };
    for (var k in o || {}) d[k] = o[k];
    return d;
  }
  var DOCS = [
    doc("field-notes", "sqlite-wal", "SQLite's write-ahead log, in practice", "native", 2, "9 Oct 2026", 20261009),
    doc("field-notes", "wal-files", "Inside a WAL database: the three files", "md", 1, "14 Mar 2026", 20260314),
    doc("lantern", "release-day", "Release day in lantern: the checklist, explained", "legacy", 2, "2 Sep 2026", 20260902),
    doc("lantern", "plain-files", "Why lantern keeps its phases in plain files", "legacy", 1, "18 Jul 2026", 20260718),
    doc("quayside", "ingest-queue", "Quayside ingest, part one: the queue", "legacy", 1, "11 Jun 2026", 20260611),
    doc("quayside", "ingest-retries", "Quayside ingest, part two: retries and backoff", "legacy", 1, "19 Jun 2026", 20260619),
    doc("quayside", "ingest-dead-letter", "Quayside ingest, part three: the dead-letter shelf", "legacy", 3, "6 Oct 2026", 20261006),
    doc("helpdesk", "honorifics", "Reading 존댓말 and 반말 in support tickets", "legacy", 1, "27 Aug 2026", 20260827)
  ];
  var SUBJECT_DOCS = [
    doc("english", "which-or-that", "“Which” or “that”: restrictive clauses, settled", "native", 1, "2 Oct 2026", 20261002, { subject: "English" }),
    doc("english", "articles-uncountable", "A, the, or nothing: articles with uncountable nouns", "native", 2, "12 Oct 2026", 20261012, { subject: "English" }),
    doc("finance", "bond-prices", "Why bond prices fall when rates rise", "native", 1, "15 Oct 2026", 20261015, { subject: "Finance" })
  ];
  var LONG_TITLES = [
    ["fsync", "What fsync actually promises, on Linux and on macOS", "18 Oct 2026"],
    ["checkpoint-ko", "WAL 체크포인트는 언제 돌려야 할까", "16 Oct 2026"],
    ["page-size", "Choosing a page size for a read-heavy SQLite file", "13 Oct 2026"],
    ["vacuum", "Vacuum, incremental vacuum, and when to run neither", "7 Oct 2026"],
    ["busy-timeouts", "A week of busy timeouts: notes from a shared cache", "29 Sep 2026"],
    ["nightly-copy", "Litestream or a nightly copy: what each one saves", "22 Sep 2026"],
    ["query-plan", "Reading EXPLAIN QUERY PLAN without guessing", "15 Sep 2026"],
    ["covering-indexes", "Covering indexes for the three queries we run most", "8 Sep 2026"],
    ["fts5-size", "Why the FTS5 index grew to twice the table", "30 Aug 2026"],
    ["column-type", "Changing a column's type in SQLite without downtime", "21 Aug 2026"],
    ["strict-tables", "STRICT tables, six months in", "12 Aug 2026"],
    ["json-functions", "The JSON functions, and when a real column is better", "3 Aug 2026"],
    ["pools", "Connection pools for a database that lives in one file", "24 Jul 2026"],
    ["restored-backups", "Backups you have restored at least once", "15 Jul 2026"],
    ["generated-columns", "Generated columns: a small feature with a long tail", "6 Jul 2026"],
    ["prod-sized", "Testing against a copy of production-sized data", "26 Jun 2026"],
    ["upserts", "Upserts, conflict targets and the rows they skip", "17 Jun 2026"],
    ["schema-everywhere", "Shipping a schema change to every device at once", "8 Jun 2026"]
  ];
  var MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  function sortKey(date) { var p = date.split(" "); return Number(p[2]) * 10000 + MONTHS[p[1]] * 100 + Number(p[0]); }
  var LONG_DOCS = LONG_TITLES.map(function (x) { return doc("field-notes", x[0], x[1], "native", 1, x[2], sortKey(x[2]), x[0] === "checkpoint-ko" ? { lang: "ko" } : null); });

  var DATASETS = {
    today: { books: [MG, TW, LANTERN, ORCHARD], docs: DOCS },
    subjects: { books: [MG, TW, LANTERN, ORCHARD, AI, ENG], docs: DOCS.concat(SUBJECT_DOCS) },
    long: { books: [MG, TW, LANTERN, ORCHARD], docs: DOCS.concat(LONG_DOCS) },
    empty: { books: [], docs: [] }
  };

  /* ---------- Reading state: one record per chapter (book id # key) or loose document (doc: id).
     t orders the positions: higher is more recent. ---------- */
  function C(book, key) { return book.id + "#" + key; }
  function D(id) { return "doc:" + id; }
  function base() {
    var p = {};
    p[C(MG, "what-it-is")] = { s: "finished", on: 1, t: 10 };
    p[C(MG, "internals")] = { s: "started", pct: 38, at: "The write path", atKo: "쓰기 경로", lang: "en", t: 100 };
    p[C(MG, "why")] = { s: "finished", on: 2, t: 20 };
    TWK.slice(0, 10).forEach(function (k, i) { p[C(TW, k)] = { s: "finished", on: 1, t: 30 + i }; });
    p[C(TW, "storm-surge")] = { s: "started", pct: 46, at: "Noticing a surge", t: 90 };
    p[C(TW, "alerts")] = { s: "started", pct: 12, t: 50 };
    LANTERN.chapters.forEach(function (c, i) { p[C(LANTERN, c.key)] = { s: "finished", on: c.newest, t: 5 + i }; });
    p[C(ORCHARD, "at-a-glance")] = { s: "finished", on: 1, t: 60 };
    p[C(ORCHARD, "harvest-runs")] = { s: "started", pct: 60, t: 70 };
    p[D("field-notes/sqlite-wal")] = { s: "started", pct: 20, at: "Checkpoints", t: 80 };
    p[D("field-notes/wal-files")] = { s: "finished", on: 1, t: 15 };
    p[D("quayside/ingest-queue")] = { s: "finished", on: 1, t: 12 };
    p[D("quayside/ingest-dead-letter")] = { s: "finished", on: 2, t: 14 };
    p[D("helpdesk/honorifics")] = { s: "started", pct: 35, t: 65 };
    p[C(AI, "c1")] = { s: "finished", on: 1, t: 3 };
    p[C(AI, "c2")] = { s: "started", pct: 40, t: 4 };
    p[D("english/which-or-that")] = { s: "finished", on: 1, t: 1 };
    p[D("english/articles-uncountable")] = { s: "started", pct: 30, t: 2 };
    return p;
  }
  var PROG = {
    default: base(),
    ko: (function () { var p = base(); p[C(MG, "internals")] = { s: "started", pct: 38, at: "The write path", atKo: "쓰기 경로", lang: "ko", t: 100 }; return p; })(),
    one: (function () { var p = {}; p[C(MG, "what-it-is")] = { s: "finished", on: 1, t: 10 }; p[C(MG, "internals")] = { s: "started", pct: 38, at: "The write path", lang: "en", t: 100 }; return p; })(),
    next: (function () { var p = base(); p[C(MG, "internals")] = { s: "finished", on: 2, t: 100 }; return p; })(),
    long: (function () {
      var p = base();
      p[C(MG, "shipping")] = { s: "started", pct: 12, t: 110 };
      p[D("field-notes/fsync")] = { s: "started", pct: 55, at: "macOS and F_FULLFSYNC", t: 95 };
      p[D("helpdesk/honorifics")] = { s: "started", pct: 35, t: 88 };
      return p;
    })(),
    all: (function () {
      var p = {}, t = 1;
      [MG, TW, LANTERN, ORCHARD, AI, ENG].forEach(function (b) { b.chapters.forEach(function (c) { p[C(b, c.key)] = { s: "finished", on: c.newest, t: t++ }; }); });
      DOCS.concat(SUBJECT_DOCS, LONG_DOCS).forEach(function (d) { p[D(d.id)] = { s: "finished", on: d.newest, t: t++ }; });
      return p;
    })(),
    none: {},
    visitor: (function () {
      var p = {};
      p[C(MG, "what-it-is")] = { s: "finished", on: 1, t: 10 };
      p[C(MG, "internals")] = { s: "started", pct: 15, at: "Background", t: 20 };
      p[D("field-notes/sqlite-wal")] = { s: "started", pct: 70, at: "What I measured", t: 30 };
      return p;
    })()
  };

  /* ---------- Derived values ---------- */
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function langsOf(book) {
    var ko = book.chapters.some(function (c) { return !!c.ko; });
    return ko ? [{ name: "English", lang: "en", sep: false }, { name: "한국어", lang: "ko", sep: true }] : [];
  }
  function bookStats(book, prog) {
    var done = 0, opened = false, updated = false;
    book.chapters.forEach(function (c) {
      var r = prog[C(book, c.key)];
      if (!r) return;
      opened = true;
      if (r.s === "finished") { done += 1; if (r.on < c.newest) updated = true; }
    });
    return { done: done, total: book.chapters.length, opened: opened, updated: updated,
      allLegacy: book.chapters.every(function (c) { return c.format === "legacy"; }) };
  }
  function sharedSlug(books, book) { return books.filter(function (b) { return b.slug === book.slug; }).length > 1; }

  function bookCard(book, prog, member, showProject) {
    var st = bookStats(book, prog);
    return {
      id: book.id, title: book.title, titleParts: parts(book.title), project: book.project, slug: book.slug,
      showProject: !!showProject, member: !!member,
      total: st.total, done: st.done, opened: st.opened, updated: !!member && st.updated, allLegacy: st.allLegacy,
      langs: langsOf(book)
    };
  }
  function docRow(d, prog, member, showProject) {
    var r = member ? prog[D(d.id)] : null;
    return {
      id: d.id, title: d.title, titleParts: parts(d.title, d.lang), lang: d.lang || "en", project: d.project,
      showProject: !!showProject, member: !!member,
      state: r ? r.s : "none", pct: r && r.pct ? r.pct : 0,
      updated: !!(r && r.s === "finished" && r.on < d.newest),
      legacy: d.format === "legacy", format: d.format, date: d.date, section: r && r.at ? r.at : ""
    };
  }

  /* Continue reading: the most recent positions, one per book and per loose document. A started chapter or document
     resumes at its place; a book whose most recent chapter is finished offers its next unfinished chapter; a finished
     book or document leaves. */
  function continueItems(ds, prog, limit) {
    var units = Object.keys(prog).map(function (u) { return { u: u, r: prog[u] }; }).sort(function (a, b) { return b.r.t - a.r.t; });
    var seen = {}, out = [];
    units.forEach(function (x) {
      if (out.length >= limit) return;
      if (x.u.indexOf("doc:") === 0) {
        var id = x.u.slice(4), d = ds.docs.filter(function (y) { return y.id === id; })[0];
        if (!d || seen[x.u] || x.r.s !== "started") { seen[x.u] = true; return; }
        seen[x.u] = true;
        out.push({ kind: "doc", next: false, legacy: d.format === "legacy", format: d.format, project: d.project, bookTitle: "",
          title: d.title, titleParts: parts(d.title, d.lang), lang: d.lang || "en", langName: "", section: x.r.at || "", pct: x.r.pct || 0,
          n: 0, total: 0, showProject: false, id: d.id, unit: x.u });
        return;
      }
      var bid = x.u.split("#")[0], key = x.u.split("#")[1];
      var book = ds.books.filter(function (b) { return b.id === bid; })[0];
      if (!book || seen[bid]) return;
      seen[bid] = true;
      var idx = -1;
      book.chapters.forEach(function (c, i) { if (c.key === key) idx = i; });
      var target = idx, next = false;
      if (x.r.s === "finished") {
        target = -1;
        for (var i = idx + 1; i < book.chapters.length; i++) { var r2 = prog[C(book, book.chapters[i].key)]; if (!r2 || r2.s !== "finished") { target = i; break; } }
        next = true;
        if (target < 0) return;
      }
      var c = book.chapters[target], rec = next ? null : x.r;
      var ko = !!(rec && rec.lang === "ko" && c.ko);
      var title = ko ? c.ko : c.title;
      out.push({ kind: "chapter", next: next, legacy: c.format === "legacy", format: c.format, project: book.project, bookTitle: book.title,
        bookId: book.id, slug: book.slug, title: title, titleParts: parts(title, ko ? "ko" : "en"), lang: ko ? "ko" : "en", langName: ko ? "한국어" : "",
        section: rec ? (ko ? rec.atKo || "" : rec.at || "") : "", pct: rec ? rec.pct || 0 : 0,
        n: target + 1, total: book.chapters.length, finishedN: idx + 1, showProject: sharedSlug(ds.books, book), id: book.id + "#" + c.key, unit: x.u });
    });
    return out;
  }

  /* The groups: by project (projects with something to read, A to Z) or by subject (subjects A to Z, then the rest). */
  var FOLD_AT = 6, SHOW = 5;
  function makeGroup(key, name, books, docs, prog, member, showProject, expanded, isPublic) {
    books = books.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });
    docs = docs.slice().sort(function (a, b) { return b.sort - a.sort; });
    var open = !!(expanded && expanded[key]);
    var fold = docs.length > FOLD_AT;
    var shown = fold && !open ? docs.slice(0, SHOW) : docs;
    var counts = [];
    if (books.length) counts.push(plural(books.length, "book", "books"));
    if (docs.length) counts.push(plural(docs.length, "document", "documents"));
    return {
      key: key, name: name, count: counts.join(" · "), isPublic: !!isPublic,
      books: books.map(function (b) { return bookCard(b, prog, member, showProject); }),
      hasBooks: books.length > 0,
      docs: shown.map(function (d) { return docRow(d, prog, member, showProject); }),
      hasDocs: docs.length > 0,
      hasMore: fold, moreLabel: open ? "Show fewer" : "Show all " + docs.length + " documents", allLabel: "Show all " + docs.length + " documents", open: open
    };
  }
  function groupsByProject(ds, prog, member, expanded, markPublic) {
    var names = {};
    ds.books.forEach(function (b) { names[b.project] = true; });
    ds.docs.forEach(function (d) { names[d.project] = true; });
    return Object.keys(names).sort().map(function (p) {
      return makeGroup("p:" + p, p, ds.books.filter(function (b) { return b.project === p; }), ds.docs.filter(function (d) { return d.project === p; }),
        prog, member, false, expanded, markPublic && PUBLIC[p]);
    });
  }
  function groupsBySubject(ds, prog, member, expanded) {
    var subs = {};
    ds.books.forEach(function (b) { if (b.subject) subs[b.subject] = true; });
    ds.docs.forEach(function (d) { if (d.subject) subs[d.subject] = true; });
    var out = Object.keys(subs).sort().map(function (s) {
      return makeGroup("s:" + s, s, ds.books.filter(function (b) { return b.subject === s; }), ds.docs.filter(function (d) { return d.subject === s; }),
        prog, member, true, expanded, false);
    });
    var restB = ds.books.filter(function (b) { return !b.subject; }), restD = ds.docs.filter(function (d) { return !d.subject; });
    if (restB.length || restD.length) out.push(makeGroup("s:-", "Without a subject", restB, restD, prog, member, true, expanded, false));
    return { groups: out, none: Object.keys(subs).length === 0 };
  }

  function dueText(n) { return !n ? "" : n > 99 ? "99+" : String(n); }

  /* ---------- The screen's view model ---------- */
  function view(P) {
    var route = P.route === "public" ? "public" : "library";
    var viewer = route === "library" ? "member" : (P.viewer || "anon");
    var signedIn = viewer !== "anon";
    var person = PEOPLE[viewer === "visitor" ? "visitor" : "member"];
    var status = P.status || "ready";
    var dsKey = P.data || "today";
    var ds = DATASETS[dsKey] || DATASETS.today;
    var progKey = route === "public" && viewer === "visitor" ? "visitor" : (P.prog || "default");
    var prog = PROG[progKey] || PROG.default;
    var group = P.group === "subject" ? "subject" : "project";
    var due = P.due === undefined || P.due === null ? (viewer === "visitor" ? 3 : 12) : P.due;
    var vm = {
      route: route, viewer: viewer, signedIn: signedIn, anon: !signedIn,
      orgName: person.org, userName: person.name, initial: person.initial,
      libCurrent: route === "library", due: dueText(due), hasDue: !!dueText(due),
      folded: !!P.folded, status: status, group: group
    };
    if (route === "library") {
      var empty = dsKey === "empty";
      var nb = ds.books.length, nd = ds.docs.length;
      vm.title = "Library";
      vm.sub = plural(nb, "book", "books") + " · " + plural(nd, "document", "documents");
      vm.isEmpty = empty;
      vm.cont = empty ? [] : continueItems(ds, prog, 4);
      if (group === "subject") {
        var bs = groupsBySubject(ds, prog, true, P.expanded);
        vm.groups = bs.groups; vm.noSubjects = bs.none;
      } else {
        vm.groups = groupsByProject(ds, prog, true, P.expanded, true); vm.noSubjects = false;
      }
      vm.emptyProjects = empty ? 0 : EMPTY_PROJECTS.length;
    } else {
      var pub = P.pub || "ok";
      var hasPublic = pub === "ok";
      vm.title = ORG.name;
      vm.handle = "@" + ORG.handle;
      vm.missing = pub === "unknown" || pub === "private" || (pub === "nothing" && viewer !== "member");
      vm.nothingPublic = pub === "nothing" && viewer === "member";
      var pds = { books: hasPublic ? ds.books.filter(function (b) { return PUBLIC[b.project]; }) : [],
        docs: hasPublic ? ds.docs.filter(function (d) { return PUBLIC[d.project]; }) : [] };
      vm.sub = hasPublic ? "Public library · " + plural(pds.books.length, "book", "books") + " · " + plural(pds.docs.length, "document", "documents") : "Public library";
      vm.cont = [];
      vm.groups = groupsByProject(pds, prog, signedIn, P.expanded, false);
      vm.noSubjects = false;
      vm.emptyProjects = 0;
      vm.isEmpty = false;
    }
    return vm;
  }

  window.LIB = {
    ORG: ORG, PEOPLE: PEOPLE, DATASETS: DATASETS, PROG: PROG, BOOKS: { MG: MG, TW: TW, LANTERN: LANTERN, ORCHARD: ORCHARD, AI: AI, ENG: ENG },
    DOCS: DOCS, SUBJECT_DOCS: SUBJECT_DOCS, LONG_DOCS: LONG_DOCS,
    parts: parts, bookCard: bookCard, docRow: docRow, continueItems: continueItems, view: view, plural: plural
  };
})();
