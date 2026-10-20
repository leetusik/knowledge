/* Canvas only, never built: the prototype's controller for the legacy reader (Main and Widths), after the signed
   reader's flow.js. One state object holds what a click carries between screens: the document, its language and
   version, signed in or out, the bar shown or hidden, the open sheet, progress, bookmarks and where a restore lands.
   Device settings (theme choice, the device's own light or dark) are not part of a scene. */
(function () {
  "use strict";
  var RD = window.RD, LG = window.LG;
  var TW = "tidewater/datums", OR2 = "orchard-guide/job-model", OR4 = "orchard-guide/pruning", P8 = "lantern-phases/p8";
  var PF = "doc/lantern/plain-files", FERRY = "doc/ferry-board/timetable-feed", ARR = "doc/subway-times/arrival-feed";
  var seq = 0;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /* where a restore lands: by anchor when the document has it, else by fraction (S3) */
  function J(anchor, frac) { seq += 1; return { anchor: anchor || null, frac: frac || 0, token: seq }; }
  function progWith(key, rec) { var p = clone(RD.progress); p[key] = rec; return p; }

  function scene(over) {
    var s = { doc: TW, lang: "en", ver: null, member: true, bar: "shown", panel: null, status: "ready", prog: clone(RD.progress),
      jump: J(null, 0), prompt: null, resumed: false, hold: null, marks: {}, markOnLand: false, away: null, at: "top",
      frac: 0, anchor: null, os: "light" };
    for (var k in over) s[k] = over[k];
    return s;
  }

  var PAGES = [
    { key: "tw", name: "Legacy reader · a chapter in a native book" },
    { key: "book", name: "Legacy reader · an all-legacy book" },
    { key: "loose", name: "Legacy reader · a loose document" },
    { key: "abook", name: "Book page — another job (07-book-page)" },
    { key: "alibrary", name: "Library — another job (06-library)" },
    { key: "areader", name: "Reader — signed (01-reader)" },
    { key: "asignin", name: "Sign in — another surface" },
    { key: "anewtab", name: "A new tab — outside the canvas" },
    { key: "aprint", name: "Print — the original in a new tab" }
  ];

  /* a member reopening a started chapter: the saved record's anchor, else its fraction (S3) */
  function resumeOf(key, over) {
    var p = RD.progress[key] || {}, o = { doc: key, resumed: true, jump: J(p.at, p.frac), at: "text" };
    for (var k in over) o[k] = over[k];
    return o;
  }
  function away(kind, from, detail) { return { kind: kind, from: from, detail: detail || "" }; }
  function fromOf(s) { return { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, anchor: s.anchor, frac: s.frac }; }
  var FROM_TW = { doc: TW, lang: "en", ver: null, member: true, anchor: "the-ladder", frac: 0.38 };

  var PRESETS = [
    { key: "tw-top", page: "tw", label: "Top of chapter", make: function () { return scene({}); } },
    { key: "tw-hidden", page: "tw", label: "Reading · bar hidden", make: function () { return scene({ bar: "hidden", jump: J("conversions"), at: "text" }); } },
    { key: "tw-back", page: "tw", label: "Reading · bar back", make: function () { return scene({ jump: J("conversions"), at: "text" }); } },
    { key: "tw-end", page: "tw", label: "End · finished", make: function () { return scene({ jump: J(null, 1), at: "end" }); } },
    { key: "tw-unread", page: "tw", label: "End · marked unread", make: function () { return scene({ prog: progWith(TW, { s: "started", pct: 0, at: null, unread: true }), hold: TW, jump: J(null, 1), at: "end" }); } },
    { key: "tw-mark", page: "tw", label: "Bookmarked here", make: function () { return scene({ jump: J("the-ladder"), markOnLand: true, at: "text" }); } },
    { key: "tw-list", page: "tw", label: "Chapter list open", make: function () { return scene({ panel: "contents" }); } },
    { key: "tw-display", page: "tw", label: "Display", make: function () { return scene({ panel: "display" }); } },
    { key: "tw-anon", page: "tw", label: "Signed out", make: function () { return scene({ member: false }); } },
    { key: "tw-anonsave", page: "tw", label: "Signed out · Sign in to save", make: function () { return scene({ member: false, prompt: "bookmark", jump: J("the-ladder"), at: "text" }); } },
    { key: "tw-loading", page: "tw", label: "Loading", make: function () { return scene({ status: "loading" }); } },
    { key: "tw-slow", page: "tw", label: "Loading · slow relay", make: function () { return scene({ status: "slow" }); } },
    { key: "tw-missing", page: "tw", label: "File missing", make: function () { return scene({ status: "missing" }); } },
    { key: "tw-failed", page: "tw", label: "Relay failed", make: function () { return scene({ status: "failed" }); } },
    { key: "or-resume", page: "book", label: "Orchard · reopened at saved place", make: function () { return scene(resumeOf(OR2, {})); } },
    { key: "or-list", page: "book", label: "Orchard · chapter list", make: function () { return scene(resumeOf(OR2, { panel: "contents" })); } },
    { key: "or-short", page: "book", label: "Orchard · shorter than the screen", make: function () { return scene({ doc: OR4, prog: progWith(OR4, { s: "finished", on: 1 }), at: "end" }); } },
    { key: "ln-en", page: "book", label: "lantern P8 · English v2", make: function () { return scene({ doc: P8 }); } },
    { key: "ln-limits", page: "book", label: "English v2 · at a section 한국어 lacks", make: function () { return scene({ doc: P8, jump: J("outbox-limits"), at: "text" }); } },
    { key: "ln-ko", page: "book", label: "한국어 v1 · older translation", make: function () { return scene({ doc: P8, lang: "ko" }); } },
    { key: "ln-old", page: "book", label: "English v1 · older version", make: function () { return scene({ doc: P8, ver: 1 }); } },
    { key: "lo-top", page: "loose", label: "Top · v2", make: function () { return scene({ doc: PF }); } },
    { key: "lo-versions", page: "loose", label: "Version history", make: function () { return scene({ doc: PF, panel: "versions" }); } },
    { key: "lo-old", page: "loose", label: "v1 · older version", make: function () { return scene({ doc: PF, ver: 1 }); } },
    { key: "lo-end", page: "loose", label: "End · finished", make: function () { return scene({ doc: PF, prog: progWith(PF, { s: "finished", on: 2 }), jump: J(null, 1), at: "end" }); } },
    { key: "lo-v3", page: "loose", label: "A document at v3 · history", make: function () { return scene({ doc: FERRY, panel: "versions" }); } },
    { key: "lo-ko", page: "loose", label: "English with Korean terms", make: function () { return scene({ doc: ARR }); } },
    { key: "lo-anon", page: "loose", label: "Signed out", make: function () { return scene({ doc: PF, member: false }); } },
    { key: "lo-missing", page: "loose", label: "Not found · no such document", make: function () { return scene({ doc: "doc/lantern/offline-maps", status: "notfound" }); } },
    { key: "lo-private", page: "loose", label: "Not found · a private address", make: function () { return scene({ doc: "doc/harbor-ops/runbook", status: "notfound" }); } },
    { key: "a-book", page: "abook", label: "Book page", make: function () { return scene({ away: away("book", FROM_TW, "") }); } },
    { key: "a-library", page: "alibrary", label: "Library", make: function () { return scene({ away: away("library", FROM_TW, "") }); } },
    { key: "a-reader", page: "areader", label: "A native chapter in the reader", make: function () { return scene({ away: away("reader", FROM_TW, "tidewater/tide-table-api") }); } },
    { key: "a-signin", page: "asignin", label: "Sign in", make: function () { return scene({ member: false, away: away("signin", { doc: TW, lang: "en", ver: null, member: false, anchor: "the-ladder", frac: 0.38 }, "") }); } },
    { key: "a-newtab", page: "anewtab", label: "External link", make: function () { return scene({ away: away("newtab", FROM_TW, "https://tidesandcurrents.noaa.gov/datum_options.html") }); } },
    { key: "a-print", page: "aprint", label: "Print · new tab", make: function () { return scene({ away: away("print", FROM_TW, LG.addr(TW, null, true)) }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });

  function pageOf(s) {
    if (s.away) return "a" + s.away.kind;
    if (/^tidewater\//.test(s.doc)) return "tw";
    var d = RD.docs[s.doc];
    return d && !d.loose && !d.private ? "book" : "loose";
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }
  function marked(s) { return !!(s.markOnLand || (s.marks[s.doc] && s.marks[s.doc].length)); }
  /* What a preset sets, compared without what the frame reports once it lands: reading a chapter turns "none" into
     "started", and a document shorter than the screen (or a landing in its last 5%) finishes it at once, so only "marked
     as unread" is told apart here; where the reader is (top, in the text, the end) decides between presets below.
     A stand-in page has one state, so its one preset is always the pressed one. */
  function progClass(s) { return RD.stateOf(s.prog, s.doc) === "unread" ? "unread" : "open"; }
  function sig(s) {
    var page = pageOf(s);
    if (s.away) return page;
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.bar, s.panel || "", s.status, s.prompt || "",
      s.resumed, progClass(s), marked(s)].join("|");
  }
  /* Presets that differ only by where the reader is (top, in the text, the end) are told apart by the place the frame
     reports; when it reports none of theirs (a section that sits in the last 5%), the preset just pressed holds. */
  function pressedKey(s, keys) {
    var mine = sig(s), at = s.status === "ready" ? s.at : "";
    var cands = keys.filter(function (k) { return sig(BY[k].make()) === mine; });
    if (cands.length <= 1) return cands[0] || null;
    var hit = cands.filter(function (k) { var m = BY[k].make(); return (m.status === "ready" ? m.at : "") === at; });
    if (s.preset && hit.indexOf(s.preset) >= 0) return s.preset;
    if (hit.length) return hit[0];
    return s.preset && cands.indexOf(s.preset) >= 0 ? s.preset : null;
  }
  function initial(key, device) {
    var s = BY[key || "tw-top"].make();
    s.progBy = {};
    s.themeChoice = (device && device.themeChoice) || "system";
    s.os = (device && device.os) || "light";
    s.preset = key || "tw-top";
    s.loadId = 0;
    return s;
  }

  /* frame: on the Widths board each of the four frames is its own device, so what its own scrolling records (progress,
     finishing at the end) stays with that frame; a click still moves all four. Without a frame there is one record. */
  function api(comp, frame) {
    function S() { return comp.state; }
    function put(over) { var n = Object.assign({}, over); n.preset = null; comp.setState(n); }
    function progNow() { var s = S(); return frame && s.progBy && s.progBy[frame] ? s.progBy[frame] : s.prog; }
    function setProg(prog, over) {
      var o = over || {};
      if (frame) { var by = Object.assign({}, S().progBy || {}); by[frame] = prog; o.progBy = by; } else o.prog = prog;
      comp.setState(o);
    }
    function arrive(key, lang, ver, member, jump, extra) {
      var n = { doc: key, lang: lang, ver: ver, member: member, panel: null, bar: "shown", status: "ready", prompt: null, hold: null,
        resumed: false, markOnLand: false, away: null, progBy: {}, jump: jump, at: jump.anchor || jump.frac ? "text" : "top", frac: jump.frac || 0, anchor: jump.anchor };
      for (var k in extra) n[k] = extra[k];
      put(n);
    }
    function openDoc(key) {
      var s = S(), d = RD.docs[key];
      if (!d || d.private) { arrive(key, "en", null, s.member, J(null, 0), { status: "notfound" }); return; }
      if (d.format !== "legacy") { put({ away: away("reader", fromOf(s), key), panel: null }); return; }
      var lang = d.variants[s.lang] ? s.lang : "en";
      var p = s.prog[key], jump = J(null, 0), resumed = false;
      if (s.member && p && p.s === "started" && !p.unread && (p.at || p.frac)) { jump = J(p.at, p.frac); resumed = true; }
      arrive(key, lang, null, s.member, jump, { resumed: resumed });
    }
    return {
      open: openDoc,
      /* a link inside the framed document: the bridge's navigate message for a same-app path, a new tab for http(s) */
      link: function (to) {
        var s = S();
        if (/^https:\/\//.test(to)) { put({ away: away("newtab", fromOf(s), to), panel: null }); return; }
        var key = LG.route(to);
        if (key) openDoc(key);
        else arrive(to, "en", null, s.member, J(null, 0), { status: "notfound" });
      },
      lang: function (l) {
        var s = S();
        if (l === s.lang) return;
        var to = LG.landing(s.doc, s.lang, s.ver, s.anchor, l, null);
        arrive(s.doc, l, null, s.member, to ? J(to, s.frac) : J(null, s.frac), {});
      },
      version: function (n) {
        var s = S();
        arrive(s.doc, s.lang, n === RD.newest(s.doc, s.lang) ? null : n, s.member, J(null, 0), {});
      },
      theme: function (c) { comp.setState({ themeChoice: c }); },
      device: function (c, os) { comp.setState({ themeChoice: c, os: os }); },
      panel: function (name) { put({ panel: name || null }); },
      bar: function (v) { if (S().bar !== v) put({ bar: v }); },
      /* Mark as finished / Mark as unread: the signed reader's rule (S3). Signed out, Mark as finished asks to sign in. */
      mark: function (finished) {
        var s = S();
        if (!s.member) { put({ prompt: "finish" }); return; }
        var prog = clone(s.prog);
        if (finished) prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        else prog[s.doc] = { s: "started", pct: 0, at: null, unread: true };
        put({ prog: prog, progBy: {}, hold: finished ? null : s.doc });
      },
      /* Bookmark this position: a position bookmark at the current fraction; one within ±2% is removed instead. */
      bookmark: function (frac) {
        var s = S();
        if (!s.member) { put({ prompt: "bookmark" }); return; }
        var marks = clone(s.marks), list = marks[s.doc] || [];
        var near = list.filter(function (f) { return Math.abs(f - frac) <= 0.02; });
        marks[s.doc] = near.length ? list.filter(function (f) { return Math.abs(f - frac) > 0.02; }) : list.concat([frac]);
        put({ marks: marks, markOnLand: false });
      },
      /* the restore placed a preset's bookmark (canvas only) */
      placeMark: function (frac) {
        var s = S(), marks = clone(s.marks);
        marks[s.doc] = (marks[s.doc] || []).concat([frac]);
        comp.setState({ marks: marks });
      },
      /* the bridge reported the end in view (≥ 95%): it finishes, unless held after Mark as unread, or an older version */
      end: function () {
        var s = S();
        if (!s.member || s.hold === s.doc || s.status !== "ready" || s.ver) return;
        var st = RD.stateOf(progNow(), s.doc);
        if (st === "finished" || st === "updated") return;
        var prog = clone(progNow());
        prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        setProg(prog);
      },
      endLeft: function () { var s = S(); if (s.hold && s.hold === s.doc) comp.setState({ hold: null }); },
      /* a scroll message: { fraction, anchor } */
      reading: function (r) {
        var s = S();
        var over = { frac: r.frac, anchor: r.anchor, at: r.frac >= 0.95 ? "end" : r.frac < 0.005 ? "top" : "text" };
        if (s.member && !s.ver && s.hold !== s.doc && s.status === "ready") {
          var p = progNow()[s.doc];
          if (!p || p.s !== "finished") {
            var prog = clone(progNow()), cur = prog[s.doc] || { s: "started", pct: 0 };
            cur.s = "started";
            cur.pct = Math.max(cur.pct || 0, Math.round(r.frac * 100));
            cur.at = r.anchor; cur.frac = r.frac;
            delete cur.unread;
            prog[s.doc] = cur;
            setProg(prog, over);
            return;
          }
        }
        comp.setState(over);
      },
      away: function (kind, detail) { var s = S(); put({ away: away(kind, fromOf(s), detail || ""), panel: null }); },
      print: function () { var s = S(); put({ away: away("print", fromOf(s), LG.addr(s.doc, s.ver, true, s.lang)), panel: null }); },
      back: function () {
        var s = S(), f = (s.away && s.away.from) || FROM_TW;
        arrive(f.doc, f.lang, f.ver, f.member, J(f.anchor, f.frac), {});
      },
      signedIn: function () {
        var s = S(), f = (s.away && s.away.from) || FROM_TW;
        arrive(f.doc, f.lang, f.ver, true, J(f.anchor, f.frac), {});
      },
      retry: function () {
        var id = (S().loadId || 0) + 1;
        put({ status: "loading", loadId: id });
        setTimeout(function () {
          if (comp.state.loadId === id && comp.state.status === "loading") comp.setState({ status: "ready", jump: J(null, 0) });
        }, 900);
      },
      prompt: function (v) { put({ prompt: v || null }); },
      fromTop: function () { put({ resumed: false, jump: J(null, 0), at: "top" }); },
      dismissResume: function () { if (S().resumed) comp.setState({ resumed: false }); },
      pick: function (key) {
        var s = S(), m = BY[key].make();
        var n = Object.assign({ themeChoice: s.themeChoice, os: s.os }, m);
        n.os = s.os;
        n.preset = key;
        n.progBy = {};
        n.loadId = (s.loadId || 0) + 1;
        comp.setState(n);
      }
    };
  }

  function legacyProps(comp, a, frame) {
    var s = comp.state;
    var prog = frame && s.progBy && s.progBy[frame] ? s.progBy[frame] : s.prog;
    return {
      doc: s.doc, lang: s.lang, ver: s.ver, theme: themeOf(s), themeChoice: s.themeChoice, os: s.os, member: s.member,
      bar: s.bar, panel: s.panel, status: s.status, prog: prog, jump: s.jump, prompt: s.prompt, resumed: s.resumed,
      hold: s.hold, marks: s.marks[s.doc] || [], markOnLand: s.markOnLand,
      onOpen: a.open, onLink: a.link, onLang: a.lang, onVersion: a.version, onTheme: a.theme, onPanel: a.panel, onBar: a.bar,
      onMark: a.mark, onBookmark: a.bookmark, onPlaceMark: a.placeMark, onEnd: a.end, onEndLeft: a.endLeft,
      onReading: a.reading, onAway: a.away, onPrint: a.print, onRetry: a.retry, onPrompt: a.prompt, onFromTop: a.fromTop,
      onDismissResume: a.dismissResume
    };
  }

  /* What a stand-in for another job's screen says. */
  function awayProps(comp, a) {
    var s = comp.state, w = s.away, f = w.from || FROM_TW;
    var t = RD.titleOf(f.doc, f.lang).text;
    var place = f.frac ? Math.round(f.frac * 100) + "% through" : "the top";
    var o = { kind: w.kind, onBack: a.back, onContinue: a.signedIn, where: t + " · " + place, detail: w.detail, legacyTitle: "", back: "" };
    var loose = (RD.ctx(f.doc) || { loose: true }).loose;
    o.back = loose ? "Back to the document" : "Back to the chapter";
    if (w.kind === "book") o.detail = (RD.ctx(f.doc) || {}).bookTitle || "";
    if (w.kind === "reader") { var c = RD.ctx(w.detail) || {}; o.detail = "Chapter " + c.n + " · " + RD.titleOf(w.detail, "en").text; }
    o.items = w.kind === "library" ? libraryRows(s, a) : [];
    return o;
  }
  /* Canvas only: what the library (06-library) would open in the legacy reader, one row per document. */
  function libraryRows(s, a) {
    function word(key) {
      var st = RD.stateOf(s.prog, key);
      if (!s.member) return "";
      return st === "started" ? " · Started" : st === "finished" || st === "updated" ? " · Finished" : "";
    }
    function chap(key) { var c = RD.ctx(key); return c.bookTitle + " · Chapter " + c.n + " of " + c.total + word(key); }
    function loose(key, what) { var d = RD.docs[key]; return "Loose document · " + d.project + " · " + what + word(key); }
    return [
      [OR2, chap(OR2)],
      [P8, chap(P8) + " · English and 한국어"],
      [PF, loose(PF, "v" + RD.newest(PF, "en") + ", with its history")],
      [FERRY, loose(FERRY, "v" + RD.newest(FERRY, "en"))],
      [ARR, loose(ARR, "English with Korean terms")]
    ].map(function (x) {
      var t = RD.titleOf(x[0], "en");
      return { key: x[0], title: t.text, lang: t.lang, meta: x[1], open: function () { a.open(x[0]); } };
    });
  }

  function bar(comp, a, pageKeys, extra) {
    var s = comp.state, cur = pageOf(s);
    var TH = [["light", "light", "Light"], ["dark", "light", "Dark"], ["sepia", "light", "Sepia"], ["system", "light", "System (device light)"], ["system", "dark", "System (device dark)"]];
    var ex = extra === false ? [] : TH.map(function (t) {
      var pressed = s.themeChoice === t[0] && (t[0] !== "system" || s.os === t[1]);
      return { label: t[2], pressed: pressed, pick: function () { a.device(t[0], t[0] === "system" ? t[1] : s.os); } };
    });
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      var reading = p.key === "tw" || p.key === "book" || p.key === "loose";
      return {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: reading && ex.length > 0, extraLabel: "· theme:", extra: reading ? ex : [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
    });
  }

  LG.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, legacyProps: legacyProps, awayProps: awayProps,
    bar: bar, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, J: J };
})();
