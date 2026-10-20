/* Canvas only, never built: the prototype's controller for the reader flow (Main and Widths).
   One state object holds everything a click carries between screens: the document, language and
   version, the device settings, signed in or out, the open panel, progress and where a jump lands.
   Job 05-annotations adds the reader's marks (ann), the selection being made (sel), the open popover (pop),
   the undo line (toast), the sign-in prompt (save), the book's list (view, filter) and a label being edited.
   The boards draw everything as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var RD = window.RD, AN = RD.an;
  var MG = "maintainer-guide/", TW = "tidewater/", WAL = "doc/field-notes/sqlite-wal", MDN = "doc/field-notes/wal-files";
  var INT = MG + "internals";
  var seq = 0;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jump(id, frac) { seq += 1; return { id: id || null, frac: frac || 0, token: seq }; }
  function jumpMark(id) { seq += 1; return { id: null, frac: 0, mark: id, token: seq }; }
  function progWith(key, rec) { var p = clone(RD.progress); p[key] = rec; return p; }

  /* A complete scene. Device settings (theme choice, size) are not part of a scene: they are per device. */
  function scene(over) {
    var s = { doc: INT, lang: "en", ver: null, member: true, chrome: "shown", panel: null, status: "ready",
      prog: clone(RD.progress), jump: jump(null, 0), prompt: false, resumed: false, away: null, verFail: false,
      os: "light", hold: null, sec: null,
      ann: AN.seed("default"), sel: null, pop: null, toast: null, save: null, active: null, editLabel: null,
      view: "reader", filter: "all", bookScroll: 0, legacyBm: false,
      /* round 02: the highlight holding keyboard focus (annotations 10), and where the book's list was opened from (book-page 7) */
      kf: null, bookFrom: "chapter" };
    for (var k in over) s[k] = over[k];
    /* a scene that lands in the text is "in the text" from the start, so its preset reads pressed */
    if (s.jump && (s.jump.id || s.jump.mark || s.jump.frac) && !("sec" in over)) s.sec = s.jump.id || "in-text";
    return s;
  }

  /* A selection, as the reader makes it: the passage's quote found in its section. */
  function selOf(doc, lang, sec, exact, o) {
    var r = RD.read(doc, lang), lay = AN.layout(r.blocks, r.doc.format !== "md"), S = lay.secs[sec];
    var s = S.text.indexOf(exact), e = o && o.toEnd ? S.text.length : s + exact.length;
    return { id: "sel-" + sec + "-" + s, doc: r.key, lang: lang, ver: null, mode: "passage", sec: sec, s: s, e: e, clipped: !!(o && o.toEnd), key: "",
      quote: AN.quoteAt(S.text, s, e) };
  }
  function secOfText(doc, lang, exact) {
    var r = RD.read(doc, lang), lay = AN.layout(r.blocks, true), out = null;
    lay.order.forEach(function (id) { if (!out && lay.secs[id].text.indexOf(exact) >= 0) out = id; });
    return out;
  }
  function keyOfText(doc, lang, exact) {
    var r = RD.read(doc, lang), lay = AN.layout(r.blocks, r.doc.format !== "md"), out = "";
    lay.conts.forEach(function (c) { if (!out && c.text.indexOf(exact) >= 0) out = c.key; });
    return out;
  }
  function withLabel(ann, id, label) { ann.bm.forEach(function (b) { if (b.id === id) b.label = label; }); return ann; }

  var PAGES = [
    { key: "chapter", name: "Reader · a chapter" },
    { key: "loose", name: "Reader · a plain Markdown document" },
    { key: "booknotes", name: "Notes in this book" },
    { key: "book", name: "Book page — another job" },
    { key: "library", name: "Library — another job" },
    { key: "signin", name: "Sign in — another surface" },
    { key: "legacy", name: "Legacy chapter — legacy-and-print draws the reader" },
    { key: "external", name: "External link — outside the canvas" }
  ];

  function away(kind, from, detail) { return { kind: kind, from: from, detail: detail || "" }; }
  var FROM = { doc: INT, lang: "en", ver: null, member: true, sec: "the-write-path" };

  var PRESETS = [
    /* reading with marks */
    { key: "top", page: "chapter", label: "Top of chapter", make: function () { return scene({}); } },
    { key: "marked", page: "chapter", label: "Marks in the text", make: function () { return scene({ jump: jump("the-write-path") }); } },
    { key: "marks2", page: "chapter", label: "A highlighted link", make: function () { return scene({ jump: jump("contracts") }); } },
    { key: "heavy", page: "chapter", label: "30 marks in one chapter", make: function () { return scene({ ann: AN.seed("heavy"), jump: jump("the-write-path") }); } },
    { key: "bmplace", page: "chapter", label: "In a bookmarked section", make: function () { return scene({ jump: jump("two-deployments") }); } },
    { key: "hidden", page: "chapter", label: "Reading · chrome hidden", make: function () { return scene({ chrome: "hidden", jump: jump("contracts") }); } },
    /* selecting */
    { key: "sel", page: "chapter", label: "Selecting a passage", make: function () { var s = selOf(INT, "en", "the-two-planes", "The content plane holds documents, the search index and version rows"); return scene({ sel: s, jump: jumpMark("pending") }); } },
    { key: "selcross", page: "chapter", label: "Selection crosses a section", make: function () { var s = selOf(INT, "en", "the-publish-worker", "Submit tasks from outside the critical section", { toEnd: true }); return scene({ sel: s, jump: jumpMark("pending") }); } },
    { key: "selcode", page: "chapter", label: "Selecting code", make: function () { var sec = secOfText(INT, "en", "docker compose restart api"); return scene({ sel: selOf(INT, "en", sec, "docker compose restart api"), jump: jumpMark("pending") }); } },
    { key: "selhead", page: "chapter", label: "Selecting a heading", make: function () { return scene({ sel: { id: "sel-h", doc: INT, lang: "en", ver: null, mode: "block", sec: "why-a-queue", s: 0, e: 0, clipped: false, key: "", quote: null }, jump: jump("the-publish-worker") }); } },
    { key: "seltitle", page: "chapter", label: "Selecting the title", make: function () { return scene({ sel: { id: "sel-t", doc: INT, lang: "en", ver: null, mode: "refuse", sec: "", s: 0, e: 0, clipped: false, key: "__title", quote: null } }); } },
    /* a highlight's popover */
    { key: "pop", page: "chapter", label: "Highlight with a note", make: function () { return scene({ pop: { type: "hl", id: "a2" }, jump: jumpMark("a2") }); } },
    { key: "poplong", page: "chapter", label: "Long note · review on", make: function () { return scene({ pop: { type: "hl", id: "a7" }, jump: jumpMark("a7") }); } },
    { key: "note", page: "chapter", label: "Writing a note", make: function () { return scene({ pop: { type: "hl", id: "a1", edit: true }, jump: jumpMark("a1") }); } },
    { key: "noteedit", page: "chapter", label: "Editing a note", make: function () { return scene({ pop: { type: "hl", id: "a13", edit: true }, jump: jumpMark("a13") }); } },
    /* round 02 (annotations 10, option a): a highlight without a note, reached by Tab, then opened with Enter */
    { key: "kbfocus", page: "chapter", label: "Keyboard · focus on a highlight", make: function () { return scene({ kf: { id: "a3", token: jump().token }, jump: jumpMark("a3") }); } },
    { key: "kbpop", page: "chapter", label: "Keyboard · popover opened with Enter", make: function () { return scene({ pop: { type: "hl", id: "a3", kbd: true }, kf: { id: "a3", token: jump().token }, jump: jumpMark("a3") }); } },
    { key: "overlap", page: "chapter", label: "Two highlights overlap", make: function () { return scene({ pop: { type: "choose", ids: ["a5", "a6"] }, jump: jumpMark("a6") }); } },
    { key: "deleted", page: "chapter", label: "Deleted · undo", make: function () {
      var ann = AN.seed("default"); ann.hl = ann.hl.filter(function (a) { return a.id !== "a3"; }); ann.name = "less-a3";
      return scene({ ann: ann, toast: { id: "t-preset", text: "Highlight deleted, and its review card with it.", undo: { list: "hl", item: AN.seed("default").hl.filter(function (a) { return a.id === "a3"; })[0], at: 2 } }, jump: jump("the-one-idea") }); } },
    /* notes on a section, and the markers */
    { key: "bnote", page: "chapter", label: "Note on a section", make: function () { return scene({ pop: { type: "bnote", id: "b1", sec: "two-planes" }, jump: jump("two-planes") }); } },
    { key: "bnotenew", page: "chapter", label: "New note on a section", make: function () { return scene({ pop: { type: "bnew", sec: "the-publish-worker" }, jump: jump("the-publish-worker") }); } },
    { key: "changed", page: "chapter", label: "Text changed", make: function () { return scene({ pop: { type: "changed", sec: "the-write-path" }, jump: jump("the-write-path") }); } },
    { key: "other", page: "chapter", label: "1 highlight in 한국어", make: function () { return scene({ pop: { type: "other", sec: "the-one-idea" }, jump: jump("the-one-idea") }); } },
    { key: "bm", page: "chapter", label: "Bookmark · label", make: function () { return scene({ pop: { type: "bm", id: "m2", sec: "two-deployments" }, jump: jump("two-deployments") }); } },
    /* the Notes sheet */
    { key: "notes", page: "chapter", label: "Notes", make: function () { return scene({ panel: "notes", jump: jump("the-write-path") }); } },
    { key: "notes30", page: "chapter", label: "Notes · 30 in a chapter", make: function () { return scene({ ann: AN.seed("heavy"), panel: "notes", jump: jump("the-write-path") }); } },
    { key: "notesempty", page: "chapter", label: "Notes · nothing yet", make: function () { return scene({ ann: AN.seed("empty"), panel: "notes" }); } },
    { key: "label", page: "chapter", label: "Notes · writing a label", make: function () { return scene({ panel: "notes", editLabel: "m1", jump: jump("the-write-path") }); } },
    { key: "list", page: "chapter", label: "Contents · switch to Notes", make: function () { return scene({ panel: "contents", jump: jump("the-write-path") }); } },
    /* languages and versions */
    { key: "ko", page: "chapter", label: "한국어 · its own highlights", make: function () { return scene({ lang: "ko", jump: jump("the-write-path") }); } },
    { key: "popko", page: "chapter", label: "한국어 · a highlight's note", make: function () { return scene({ lang: "ko", pop: { type: "hl", id: "k1" }, jump: jumpMark("k1") }); } },
    { key: "old", page: "chapter", label: "Older version · v1", make: function () { return scene({ ver: 1, jump: jump("the-write-path") }); } },
    /* another book: its Contents lists a legacy chapter ("Datums", Original layout), which opens the legacy stand-in */
    { key: "tw", page: "chapter", label: "Another book · Contents, with a legacy chapter", make: function () { return scene({ doc: TW + "storm-surge", panel: "contents" }); } },
    /* signed out */
    { key: "anon", page: "chapter", label: "Signed out", make: function () { return scene({ member: false, jump: jump("the-two-planes") }); } },
    { key: "anonsel", page: "chapter", label: "Signed out · Highlight", make: function () { var s = selOf(INT, "en", "the-two-planes", "The content plane holds documents, the search index and version rows"); return scene({ member: false, sel: s, save: { what: "highlights and notes", at: "float" }, jump: jumpMark("pending") }); } },
    { key: "anonbm", page: "chapter", label: "Signed out · Bookmark", make: function () { return scene({ member: false, save: { what: "bookmarks", at: "slot" }, jump: jump("two-deployments") }); } },
    /* the plain Markdown document */
    { key: "mdtop", page: "loose", label: "Top of document", make: function () { return scene({ doc: MDN }); } },
    { key: "mdmid", page: "loose", label: "At a bookmarked position", make: function () { return scene({ doc: MDN, jump: jump(null, 0.46) }); } },
    { key: "mdsel", page: "loose", label: "Selecting text", make: function () { return scene({ doc: MDN, sel: { id: "sel-md", doc: MDN, lang: "en", ver: null, mode: "none", sec: "", s: 0, e: 0, clipped: false, key: keyOfText(MDN, "en", "The log only ever grows at its end"), quote: null }, jump: jump("the-three-files") }); } },
    { key: "mdnotes", page: "loose", label: "Notes", make: function () { return scene({ doc: MDN, panel: "notes" }); } },
    { key: "mdanon", page: "loose", label: "Signed out · Bookmark", make: function () { return scene({ doc: MDN, member: false, save: { what: "bookmarks", at: "slot" }, jump: jump(null, 0.3) }); } },
    /* the book's list */
    { key: "book", page: "booknotes", label: "All", make: function () { return scene({ view: "booknotes" }); } },
    /* round 02 (book-page 7): opened from the book page's "Notes in this book →", so its back link reads "Back to the book" */
    { key: "bookfrom", page: "booknotes", label: "Opened from the book page", make: function () { return scene({ view: "booknotes", bookFrom: "book" }); } },
    { key: "bookbm", page: "booknotes", label: "Bookmarks only", make: function () { return scene({ view: "booknotes", filter: "bm" }); } },
    { key: "booklabel", page: "booknotes", label: "Writing a label", make: function () { return scene({ view: "booknotes", filter: "bm", editLabel: "m4" }); } },
    { key: "bookmany", page: "booknotes", label: "100 items", make: function () { return scene({ view: "booknotes", ann: AN.seed("many") }); } },
    { key: "bookempty", page: "booknotes", label: "Nothing yet", make: function () { return scene({ view: "booknotes", ann: AN.seed("empty") }); } },
    /* other jobs' screens */
    { key: "abook", page: "book", label: "Book page", make: function () { return scene({ away: away("book", FROM, "The knowledge maintainer guide") }); } },
    { key: "alib", page: "library", label: "Library", make: function () { return scene({ away: away("library", FROM) }); } },
    { key: "asign", page: "signin", label: "Sign in", make: function () { return scene({ member: false, away: away("signin", { doc: INT, lang: "en", ver: null, member: false, sec: "the-write-path" }) }); } },
    { key: "alegacy", page: "legacy", label: "Legacy chapter · Bookmark", make: function () { return scene({ doc: TW + "storm-surge", away: away("legacy", { doc: TW + "storm-surge", lang: "en", ver: null, member: true, sec: null }, TW + "datums") }); } },
    { key: "alegacyon", page: "legacy", label: "Legacy chapter · Bookmarked", make: function () { return scene({ doc: TW + "storm-surge", legacyBm: true, away: away("legacy", { doc: TW + "storm-surge", lang: "en", ver: null, member: true, sec: null }, TW + "datums") }); } },
    { key: "aext", page: "external", label: "External link", make: function () { return scene({ away: away("external", FROM, "https://www.sqlite.org/wal.html") }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });

  function pageOf(s) {
    if (s.away) return s.away.kind;
    if (s.view === "booknotes") return "booknotes";
    var d = RD.docs[s.doc];
    return d && d.loose ? "loose" : "chapter";
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }
  /* What the bar compares. A document's progress is the signed reader's state, never one of this bar's axes (departure 2):
     the reader starts a document on its first reading report, and finishes a chapter when its end comes into view, so a
     preset that lands near the end (or in a tall frame on 03) would otherwise stop reading pressed as soon as it lands. */
  function sig(s) {
    var page = pageOf(s);
    if (s.away) return page + "|" + s.away.detail + "|" + (s.away.from ? s.away.from.doc : "") + "|" + (s.legacyBm ? 1 : 0);
    var a = s.ann || {}, p = s.pop;
    var an = [a.name + ":" + (a.rev || 1), s.sel ? [s.sel.mode, s.sel.sec, s.sel.s, s.sel.e, s.sel.key].join(":") : "",
      p ? [p.type, p.id || p.sec || (p.ids || []).join(","), p.edit ? 1 : 0].join(":") : "", s.toast ? "toast" : "", s.save ? s.save.at : "",
      s.editLabel || "", s.kf ? "kf:" + s.kf.id : ""].join("/");
    if (page === "booknotes") return [page, an, s.filter, s.bookFrom || "chapter"].join("|");
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.chrome, s.panel || "", s.status, s.prompt,
      s.resumed, s.verFail, s.os, s.os === "dark" ? s.themeChoice : "",
      s.sec ? "in-text" : "at-top", an].join("|");
  }
  function pressedKey(s, keys) {
    var mine = sig(s);
    if (s.preset && keys.indexOf(s.preset) >= 0 && sig(Object.assign({}, BY[s.preset].make(), { themeChoice: s.themeChoice })) === mine) return s.preset;
    for (var i = 0; i < keys.length; i++) {
      var p = BY[keys[i]];
      if (sig(Object.assign({}, p.make(), { themeChoice: p.key === "osdark" ? "system" : s.themeChoice })) === mine) return p.key;
    }
    return null;
  }

  function initial(key, device) {
    var s = BY[key || "top"].make();
    s.themeChoice = s.themeChoice || (device && device.themeChoice) || "system";
    s.size = (device && device.size) || 3;
    s.preset = key || "top";
    s.loadId = 0;
    return s;
  }

  /* Map the reader's section to the nearest section that exists in another variant or version. */
  function landing(fromDoc, fromLang, fromVer, sec, toLang, toVer) {
    if (!sec) return null;
    var a = RD.read(fromDoc, fromLang, fromVer), b = RD.read(fromDoc, toLang, toVer);
    if (!a || !b) return null;
    var have = {};
    b.sections.forEach(function (x) { have[x.id] = true; });
    var ids = a.sections.map(function (x) { return x.id; });
    var i = ids.indexOf(sec);
    for (; i >= 0; i--) if (have[ids[i]]) return ids[i];
    return null;
  }

  /* what the annotation layer clears when the reader moves on */
  var CLEAR = { sel: null, pop: null, save: null, active: null, editLabel: null, kf: null };

  function api(comp) {
    function S() { return comp.state; }
    function put(over) { var n = Object.assign({}, over); n.preset = null; comp.setState(n); }
    function openDoc(key, opts) {
      var s = S(), d = RD.docs[key];
      if (!d) return;
      if (d.format === "legacy") {
        put(Object.assign({ away: away("legacy", { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec }, key), panel: null }, CLEAR));
        return;
      }
      var lang = d.variants && d.variants[s.lang] ? s.lang : "en";
      var p = s.prog[key];
      var id = opts && opts.id, resumed = false;
      if (!id && s.member && p && p.s === "started" && p.at && !p.unread) { id = p.at; resumed = true; }
      put(Object.assign({ doc: key, lang: lang, ver: null, panel: null, chrome: "shown", status: "ready", prompt: false, hold: null,
        resumed: resumed, verFail: false, sec: id || null, jump: jump(id, 0), away: null, view: "reader" }, CLEAR));
    }

    /* ---------- the annotation layer ---------- */
    var done = {}, nid = 0, tseq = 0, settle = 0;
    function A() { return S().ann; }
    function edit(fn) { var a = clone(A()); fn(a); a.rev = (A().rev || 1) + 1; a.name = A().name; return a; }
    function find(id) {
      var a = A();
      return a.hl.filter(function (x) { return x.id === id; })[0] || a.bm.filter(function (x) { return x.id === id; })[0] || null;
    }
    function verNow() { var s = S(); return s.ver || RD.newest(s.doc, s.lang); }
    function toast(text, undo) {
      tseq += 1;
      var id = "t" + tseq;
      setTimeout(function () { if (comp.state.toast && comp.state.toast.id === id) comp.setState({ toast: null }); }, 10000);
      return { id: id, text: text, undo: undo };
    }
    /* Deleting takes what hangs on the mark with it: its note, and its review card (the card's history goes too). */
    function delText(x) {
      if (x.kind === "bm") return "Bookmark removed.";
      if (x.kind === "bnote") return "Note deleted.";
      var card = !!(x.review || x.card);
      if (card && x.note) return "Highlight, note and review card deleted.";
      if (card) return "Highlight deleted, and its review card with it.";
      if (x.note) return "Highlight and its note deleted.";
      return "Highlight deleted.";
    }
    function remove(id) {
      var x = find(id);
      if (!x) return;
      var list = x.kind === "bm" ? "bm" : "hl", at = A()[list].map(function (y) { return y.id; }).indexOf(id);
      var ann = edit(function (a) { a[list] = a[list].filter(function (y) { return y.id !== id; }); });
      put({ ann: ann, pop: null, active: null, editLabel: null, kf: null, toast: toast(delText(x), { list: list, item: x, at: at }) });
    }
    var an = {
      select: function (sel) { put({ sel: sel, pop: null, save: null, active: null }); },
      clear: function () { put(Object.assign({}, CLEAR)); },
      highlight: function (selId) {
        var s = S(), sel = s.sel;
        if (!sel || sel.id !== selId || sel.mode !== "passage" || done[selId]) return;
        if (!s.member) { put({ save: { what: "highlights and notes", at: "float" } }); return; }
        done[selId] = true;
        nid += 1;
        var id = "n" + nid;
        var ann = edit(function (a) { a.hl.push({ id: id, kind: "hl", doc: sel.doc, lang: sel.lang, ver: verNow(), block_id: sel.sec, quote: sel.quote, note: "", review: false }); });
        put({ ann: ann, sel: null, pop: { type: "hl", id: id }, active: null, save: null });
      },
      noteSel: function (selId) {
        var s = S(), sel = s.sel;
        if (!sel || sel.id !== selId || sel.mode !== "passage") return;
        if (!s.member) { put({ save: { what: "highlights and notes", at: "float" } }); return; }
        nid += 1;
        put({ pop: { type: "new", n: nid } });
      },
      blockNote: function (sec, from) {
        var s = S();
        if (!sec) return;
        if (!s.member) { put({ save: { what: "highlights and notes", at: from === "place" ? "slot" : "float" } }); return; }
        var have = A().hl.filter(function (a) { return a.kind === "bnote" && a.doc === s.doc && a.lang === s.lang && a.block_id === sec; })[0];
        nid += 1;
        var o = { sel: null, save: null, active: null, pop: have ? { type: "bnote", id: have.id, sec: sec, n: nid } : { type: "bnew", sec: sec, n: nid } };
        /* from the place bar the note opens under its section's heading, so the reader sees what it is about */
        if (from === "place") o.jump = jump(sec);
        put(o);
      },
      /* o (round 02): { kbd, kf } when Enter or Space on a highlight's stop opened it; focus comes back to that stop */
      marks: function (ids, o) {
        var kb = !!(o && o.kbd), kf = o && o.kf ? { id: o.kf } : S().kf;
        if (ids.length > 1) { put({ sel: null, save: null, pop: { type: "choose", ids: ids, kbd: kb }, active: null, kf: kf }); return; }
        var x = find(ids[0]);
        if (!x) return;
        put({ sel: null, save: null, active: null, editLabel: null, kf: kf, pop: x.kind === "bnote" ? { type: "bnote", id: x.id, sec: x.block_id } : { type: "hl", id: x.id, kbd: kb } });
      },
      kfocus: function (id) { var c = S().kf; if ((c && c.id) === (id || undefined) || (!c && !id)) return; put({ kf: id ? { id: id } : null }); },
      /* a marker under a block or in the margin: "open:<id>", "changed:<section>", "other:<section>", "bm:<id>" */
      marker: function (k) {
        var i = String(k || "").indexOf(":"), kind = k.slice(0, i), v = k.slice(i + 1);
        if (kind === "open") an.marks([v]);
        else if (kind === "changed" || kind === "other") put({ sel: null, save: null, active: null, pop: { type: kind, sec: v } });
        else if (kind === "bm") { var b = find(v); put({ sel: null, save: null, active: null, editLabel: null, pop: { type: "bm", id: v, sec: b && b.block_id } }); }
      },
      closePop: function () {
        var p = S().pop;
        if (p && p.type === "new") { put({ pop: null }); return; }
        put({ pop: null, active: null, editLabel: null });
      },
      editNote: function () { var p = S().pop; if (!p) return; nid += 1; put({ pop: Object.assign({}, p, { edit: true, n: nid }) }); },
      cancelEdit: function () {
        var p = S().pop;
        if (!p) return;
        if (p.type === "new" || p.type === "bnew") { put({ pop: null }); return; }
        put({ pop: Object.assign({}, p, { edit: false }) });
      },
      saveNote: function (text) {
        var s = S(), p = s.pop, t = String(text || "").replace(/^\s+|\s+$/g, "");
        if (!p) return;
        if (p.type === "new") {
          var sel = s.sel;
          if (!sel) { put({ pop: null }); return; }
          nid += 1;
          var id = "n" + nid;
          var ann = edit(function (a) { a.hl.push({ id: id, kind: "hl", doc: sel.doc, lang: sel.lang, ver: verNow(), block_id: sel.sec, quote: sel.quote, note: t, review: false }); });
          done[sel.id] = true;
          put({ ann: ann, sel: null, pop: { type: "hl", id: id } });
        } else if (p.type === "bnew") {
          if (!t) { put({ pop: null }); return; }
          nid += 1;
          var bid = "bn" + nid;
          put({ ann: edit(function (a) { a.hl.push({ id: bid, kind: "bnote", doc: s.doc, lang: s.lang, ver: verNow(), block_id: p.sec, note: t }); }), pop: { type: "bnote", id: bid, sec: p.sec } });
        } else if (p.type === "bnote" && !t) remove(p.id);
        else put({ ann: edit(function (a) { a.hl.forEach(function (x) { if (x.id === p.id) x.note = t; }); }), pop: Object.assign({}, p, { edit: false }) });
      },
      deleteNote: function () {
        var p = S().pop;
        if (!p) return;
        if (p.type === "bnote") { remove(p.id); return; }
        var x = find(p.id);
        put({ ann: edit(function (a) { a.hl.forEach(function (y) { if (y.id === p.id) y.note = ""; }); }), pop: Object.assign({}, p, { edit: false }),
          toast: x && x.note ? toast("Note deleted.", { list: "note", id: p.id, note: x.note }) : S().toast });
      },
      /* Review this: on makes (or resumes) the card; off pauses it and keeps its history (Q7). */
      review: function () {
        var p = S().pop;
        if (!p) return;
        put({ ann: edit(function (a) { a.hl.forEach(function (x) { if (x.id === p.id) { x.review = !x.review; x.card = x.review ? "active" : "suspended"; } }); }) });
      },
      del: function (id) { if (id) remove(id); },
      undo: function () {
        var t = S().toast;
        if (!t || !t.undo) return;
        var u = t.undo;
        var ann = edit(function (a) {
          if (u.list === "note") a.hl.forEach(function (x) { if (x.id === u.id) x.note = u.note; });
          else a[u.list].splice(Math.min(u.at, a[u.list].length), 0, u.item);
        });
        put({ ann: ann, toast: null });
      },
      bookmark: function (sec, from) {
        var s = S();
        if (!sec) return;
        if (!s.member) { put({ save: { what: "bookmarks", at: from === "place" ? "slot" : "float" } }); return; }
        var have = A().bm.filter(function (b) { return b.doc === s.doc && b.block_id === sec && !b.pos && !b.approx; })[0];
        if (have) { remove(have.id); return; }
        nid += 1;
        var id = "bm" + nid;
        put({ ann: edit(function (a) { a.bm.push({ id: id, kind: "bm", doc: s.doc, lang: s.lang, block_id: sec, label: "", snippet: "" }); }) });
      },
      bookmarkPos: function (pos, from) {
        var s = S();
        if (!s.member) { put({ save: { what: "bookmarks", at: from === "place" ? "slot" : "float" } }); return; }
        var have = A().bm.filter(function (b) { return b.doc === s.doc && b.pos && Math.abs((b.frac || 0) - pos.frac) <= 0.02; })[0];
        if (have) { remove(have.id); return; }
        nid += 1;
        var id = "pos" + nid;
        put({ ann: edit(function (a) { a.bm.push({ id: id, kind: "bm", doc: s.doc, lang: s.lang, block_id: null, label: "", pos: true, frac: pos.frac, snippet: pos.snippet }); }) });
      },
      label: function (id) { nid += 1; var p = S().pop; put({ editLabel: id, pop: p && p.type === "bm" ? Object.assign({}, p, { n: nid }) : p }); },
      saveLabel: function (id, text) {
        var t = String(text || "").replace(/^\s+|\s+$/g, "").slice(0, 120);
        put({ ann: edit(function (a) { withLabel(a, id, t); }), editLabel: null });
      },
      cancelLabel: function () { put({ editLabel: null }); },
      /* from the Notes sheet: go to the mark's place */
      go: function (it) {
        var s = S();
        if (!it) return;
        if (it.status === "other") { an.readIn(it.lang, it.sec); return; }
        var o = { panel: null, sel: null, save: null, editLabel: null, pop: null, active: null, view: "reader" };
        if (it.kind === "hl" && it.status === "anchored") { o.jump = jumpMark(it.id); o.active = it.id; o.sec = it.sec; }
        else if (it.status === "block") { o.jump = jump(it.sec); o.sec = it.sec; o.pop = { type: "changed", sec: it.sec }; }
        else if (it.approx || it.pos) { o.jump = jump(null, it.frac); o.sec = "in-text"; }
        else { o.jump = jump(it.sec); o.sec = it.sec; }
        put(o);
      },
      readIn: function (l, sec) {
        var s = S();
        var r = RD.read(s.doc, l);
        if (!r) return;
        var to = r.sections.some(function (x) { return x.id === sec; }) ? sec : landing(s.doc, s.lang, s.ver, sec, l, null);
        put(Object.assign({ lang: l, ver: null, panel: null, resumed: false, prompt: false, hold: null, jump: jump(to, 0), sec: to, view: "reader" }, CLEAR));
      },
      readVer: function (n, sec) {
        var s = S();
        var v = n === RD.newest(s.doc, s.lang) ? null : n;
        put(Object.assign({ ver: v, panel: null, resumed: false, prompt: false, hold: null, jump: jump(sec, 0), sec: sec || null }, CLEAR));
      },
      openBook: function () { seq += 1; put(Object.assign({ view: "booknotes", panel: null, filter: "all", bookScroll: seq, bookFrom: "chapter" }, CLEAR)); },
      /* round 02 (book-page 7): the book page's "Notes in this book →" (on its stand-in) opens the same list */
      bookFromBook: function () { seq += 1; put(Object.assign({ view: "booknotes", away: null, panel: null, filter: "all", bookScroll: seq, bookFrom: "book" }, CLEAR)); },
      closeBook: function () {
        var s = S();
        /* opened from the book page: "Back to the book" returns there (its stand-in; 07-book-page draws the page) */
        if (s.bookFrom === "book") {
          put(Object.assign({ view: "reader", panel: null, away: away("book", { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec && s.sec !== "in-text" ? s.sec : null },
            (RD.ctx(s.doc) || {}).bookTitle || "") }, CLEAR));
          return;
        }
        put(Object.assign({ view: "reader", panel: null, jump: s.sec && s.sec !== "in-text" ? jump(s.sec) : jump(null, 0) }, CLEAR));
      },
      /* from the book's list: open the chapter in the mark's language, at the mark */
      bookGo: function (it) {
        var s = S();
        var o = Object.assign({ view: "reader", doc: it.chapterKey, lang: it.lang, ver: null, panel: null, chrome: "shown", status: "ready", prompt: false, hold: null, resumed: false, away: null }, CLEAR);
        if (it.kind === "hl" && it.status === "anchored") { o.jump = jumpMark(it.id); o.active = it.id; o.sec = it.sec; }
        else if (it.approx || it.pos) { o.jump = jump(null, it.frac); o.sec = "in-text"; }
        else if (it.status === "block") { o.jump = jump(it.sec); o.sec = it.sec; o.pop = { type: "changed", sec: it.sec }; }
        else { o.jump = jump(it.sec); o.sec = it.sec; }
        put(o);
      },
      filter: function (f) { put({ filter: f, editLabel: null }); },
      dismissSave: function () { put({ save: null, sel: null }); },
      legacyBm: function (on) { put({ legacyBm: !!on }); }
    };

    var a = {
      open: function (key, id) { openDoc(key, { id: id }); },
      lang: function (l) {
        var s = S();
        if (l === s.lang) return;
        var to = landing(s.doc, s.lang, s.ver, s.sec, l, null);
        put(Object.assign({ lang: l, ver: null, panel: null, resumed: false, prompt: false, hold: null, jump: jump(to, 0), sec: to }, CLEAR));
      },
      version: function (n) {
        var s = S();
        var v = n === RD.newest(s.doc, s.lang) ? null : n;
        put(Object.assign({ ver: v, panel: null, resumed: false, prompt: false, hold: null, jump: jump(null, 0), sec: null }, CLEAR));
      },
      theme: function (c) { comp.setState({ themeChoice: c }); },
      size: function (n) { comp.setState({ size: n }); },
      panel: function (name) { put(Object.assign({ panel: name || null }, CLEAR)); },
      /* a preset's landing scrolls the page, and on 03 four frames settle at once (fonts, the margin, scroll anchoring); a
         scroll the landing itself causes is not the reader scrolling, so it never hides the chrome */
      chrome: function (v) { if (Date.now() < settle) return; if (S().chrome !== v) put({ chrome: v }); },
      /* Mark as finished sets finished. Mark as unread resets the chapter: started, furthest-read 0 (the server's
         max_fraction), and no saved place, so it reopens at the top. The press is made at the end, so the chapter is
         then held: reaching the end does not finish it, and no reading is counted, until the reader has left the end. */
      mark: function (finished) {
        var s = S();
        if (!s.member) { put({ prompt: true }); return; }
        var prog = clone(s.prog);
        if (finished) prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        else prog[s.doc] = { s: "started", pct: 0, at: null, unread: true };
        put({ prog: prog, hold: finished ? null : s.doc });
      },
      /* The end came into view: it finishes the chapter (round 01's rule), unless it is held or already finished. */
      end: function () {
        var s = S();
        if (!s.member || s.hold === s.doc || s.status !== "ready") return;
        var st = RD.stateOf(s.prog, s.doc);
        if (st === "finished" || st === "updated") return;
        var prog = clone(s.prog);
        prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        comp.setState({ prog: prog });
      },
      /* The end left the view (the reader went back into the chapter): a hold from Mark as unread lifts. */
      endLeft: function () {
        var s = S();
        if (s.hold && s.hold === s.doc) comp.setState({ hold: null });
      },
      reading: function (r) {
        var s = S();
        var over = { sec: r.sec || (r.pct > 2 ? "in-text" : null) };
        if (s.member && !s.ver && s.hold !== s.doc) {
          var p = s.prog[s.doc];
          if (!p || p.s !== "finished") {
            var prog = clone(s.prog), cur = prog[s.doc] || { s: "started", pct: 0 };
            cur.s = "started";
            cur.pct = Math.max(cur.pct || 0, r.pct);
            cur.at = r.sec;
            delete cur.unread;
            prog[s.doc] = cur;
            over.prog = prog;
          }
        }
        comp.setState(over);
      },
      away: function (kind, detail) {
        var s = S();
        put(Object.assign({ away: away(kind, { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec }, detail || ""), panel: null }, CLEAR));
      },
      back: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put(Object.assign({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: f.member, panel: null, chrome: "shown", status: "ready", resumed: false, sec: f.sec, jump: jump(f.sec, 0), view: "reader" }, CLEAR));
      },
      signedIn: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put(Object.assign({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: true, panel: null, chrome: "shown", status: "ready", prompt: false, resumed: false, sec: f.sec, jump: jump(f.sec, 0), view: "reader" }, CLEAR));
      },
      retry: function () {
        var id = (S().loadId || 0) + 1;
        put({ status: "loading", loadId: id });
        setTimeout(function () {
          if (comp.state.loadId === id && comp.state.status === "loading") comp.setState({ status: "ready", jump: jump(null, 0) });
        }, 900);
      },
      prompt: function (v) { put({ prompt: !!v }); },
      fromTop: function () { put({ resumed: false, jump: jump(null, 0), sec: null }); },
      dismissResume: function () { if (S().resumed) comp.setState({ resumed: false }); },
      pick: function (key) {
        var s = S(), m = BY[key].make();
        var n = Object.assign({ themeChoice: s.themeChoice, size: s.size }, m);
        n.preset = key;
        n.loadId = (s.loadId || 0) + 1;
        settle = Date.now() + 1500;
        n.toast = m.toast ? Object.assign({}, m.toast) : null;
        comp.setState(n);
      },
      an: an
    };
    return a;
  }

  /* The Reader's props, from the flow state. */
  function readerProps(comp, a) {
    var s = comp.state;
    var empty = { rev: 1, name: "signed-out", hl: [], bm: [] };
    return {
      doc: s.doc, lang: s.lang, ver: s.ver, theme: themeOf(s), themeChoice: s.themeChoice, os: s.os, size: s.size,
      member: s.member, chrome: s.chrome, panel: s.panel, status: s.status, prog: s.prog, jump: s.jump, prompt: s.prompt,
      resumed: s.resumed, verFail: s.verFail, hold: s.hold,
      onOpen: a.open, onLang: a.lang, onVersion: a.version, onTheme: a.theme, onSize: a.size, onPanel: a.panel,
      onChrome: a.chrome, onMark: a.mark, onEnd: a.end, onEndLeft: a.endLeft, onReading: a.reading, onAway: a.away, onRetry: a.retry,
      onPrompt: a.prompt, onFromTop: a.fromTop, onDismissResume: a.dismissResume,
      an: { ann: s.member ? s.ann : (comp.emptyAnn = comp.emptyAnn || empty), sel: s.sel, pop: s.pop, toast: s.toast, save: s.save, active: s.active,
        editLabel: s.editLabel, kf: s.kf, act: a.an }
    };
  }

  /* The book's list, from the flow state. */
  function bookProps(comp, a) {
    var s = comp.state;
    return { ann: s.ann, filter: s.filter, editLabel: s.editLabel, theme: themeOf(s), size: s.size, scrollToken: s.bookScroll, from: s.bookFrom || "chapter",
      toast: s.toast ? s.toast.text : "", onUndo: a.an.undo,
      onBack: a.an.closeBook, onLogo: function () { a.away("library"); }, onGo: a.an.bookGo, onDelete: function (it) { a.an.del(it.id); },
      onLabel: function (it) { a.an.label(it.id); }, onSaveLabel: function (it, t) { a.an.saveLabel(it.id, t); }, onCancelLabel: a.an.cancelLabel,
      onFilter: a.an.filter };
  }

  /* What a stand-in for another job's screen says. */
  function awayProps(comp, a) {
    var s = comp.state, w = s.away, f = w.from || FROM;
    var t = RD.titleOf(f.doc, f.lang).text, sec = null;
    var r = RD.read(f.doc, f.lang, f.ver);
    if (r && f.sec) r.sections.forEach(function (x) { if (x.id === f.sec) sec = x.text; });
    var where = sec ? t + " · " + sec : t;
    var o = { kind: w.kind, onBack: a.back, onContinue: a.signedIn, where: where, title: t, detail: w.detail, legacyTitle: "",
      legacyBm: !!s.legacyBm, member: s.member, onLegacyBm: a.an.legacyBm, onSignIn: function () { a.away("signin"); }, onBookNotes: a.an.bookFromBook };
    if (w.kind === "legacy") o.legacyTitle = RD.titleOf(w.detail, "en").text;
    if (w.kind === "book") o.detail = w.detail || (RD.ctx(f.doc) || {}).bookTitle || "";
    return o;
  }

  function bar(comp, a, pageKeys) {
    var s = comp.state, cur = pageOf(s);
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      return {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: false, extraLabel: "", extra: [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
    });
  }

  RD.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, readerProps: readerProps, awayProps: awayProps, bookProps: bookProps,
    bar: bar, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, jump: jump, jumpMark: jumpMark };
})();
