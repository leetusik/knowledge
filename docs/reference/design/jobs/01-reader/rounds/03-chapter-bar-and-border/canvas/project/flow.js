/* Canvas only, never built: the prototype's controller for the reader flow (Main and Widths).
   One state object holds everything a click carries between screens: the document, language and
   version, the device settings, signed in or out, the open panel, progress and where a jump lands.
   The boards draw everything as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var RD = window.RD;
  var MG = "maintainer-guide/", TW = "tidewater/", WAL = "doc/field-notes/sqlite-wal", MDN = "doc/field-notes/wal-files";
  var INT = MG + "internals";
  var seq = 0;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jump(id, frac) { seq += 1; return { id: id || null, frac: frac || 0, token: seq }; }
  function progWith(key, rec) { var p = clone(RD.progress); p[key] = rec; return p; }

  /* A complete scene. Device settings (theme choice, size) are not part of a scene: they are per device. */
  function scene(over) {
    var s = { doc: INT, lang: "en", ver: null, member: true, chrome: "shown", panel: null, status: "ready",
      prog: clone(RD.progress), jump: jump(null, 0), prompt: false, resumed: false, away: null, verFail: false,
      os: "light", hold: null, sec: null };
    for (var k in over) s[k] = over[k];
    /* a scene that lands in the text is "in the text" from the start, so its preset reads pressed */
    if (s.jump && s.jump.id && !("sec" in over)) s.sec = s.jump.id;
    return s;
  }

  var PAGES = [
    { key: "chapter", name: "Reader · a chapter" },
    { key: "loose", name: "Reader · a loose document" },
    { key: "book", name: "Book page — another job" },
    { key: "library", name: "Library — another job" },
    { key: "signin", name: "Sign in — another surface" },
    { key: "legacy", name: "Legacy reader — another job" },
    { key: "external", name: "External link — outside the canvas" }
  ];

  function away(kind, from, detail) { return { kind: kind, from: from, detail: detail || "" }; }
  var FROM = { doc: INT, lang: "en", ver: null, member: true, sec: "the-write-path" };

  var PRESETS = [
    { key: "top", page: "chapter", label: "Top of chapter", make: function () { return scene({}); } },
    { key: "resume", page: "chapter", label: "Reopened at saved section", make: function () { return scene({ resumed: true, jump: jump("the-write-path") }); } },
    { key: "hidden", page: "chapter", label: "Reading · chrome hidden", make: function () { return scene({ chrome: "hidden", jump: jump("contracts") }); } },
    { key: "back", page: "chapter", label: "Reading · chrome back", make: function () { return scene({ jump: jump("contracts") }); } },
    { key: "list", page: "chapter", label: "Chapter list open", make: function () { return scene({ panel: "contents", jump: jump("the-write-path") }); } },
    { key: "display", page: "chapter", label: "Display settings", make: function () { return scene({ panel: "display" }); } },
    { key: "versions", page: "chapter", label: "Version history", make: function () { return scene({ panel: "versions" }); } },
    { key: "verfail", page: "chapter", label: "Version history · failed", make: function () { return scene({ panel: "versions", verFail: true }); } },
    { key: "endfin", page: "chapter", label: "End · finished", make: function () { return scene({ prog: progWith(INT, { s: "finished", on: 2 }), jump: jump("chapter-end") }); } },
    { key: "endunread", page: "chapter", label: "End · marked unread", make: function () { return scene({ prog: progWith(INT, { s: "started", pct: 0, unread: true, at: null }), hold: INT, jump: jump("chapter-end") }); } },
    { key: "last", page: "chapter", label: "Last chapter · end", make: function () { return scene({ doc: MG + "why", prog: progWith(MG + "why", { s: "finished", on: 3 }), jump: jump("chapter-end") }); } },
    { key: "nosummary", page: "chapter", label: "No summary", make: function () { return scene({ doc: MG + "read-surfaces" }); } },
    { key: "onesection", page: "chapter", label: "One section · no contents", make: function () { return scene({ doc: MG + "shipping" }); } },
    { key: "long", page: "chapter", label: "20-chapter book · list", make: function () { return scene({ doc: TW + "storm-surge", panel: "contents" }); } },
    { key: "ko", page: "chapter", label: "한국어 · older translation", make: function () { return scene({ lang: "ko" }); } },
    { key: "old", page: "chapter", label: "Older version · v1", make: function () { return scene({ ver: 1 }); } },
    { key: "anon", page: "chapter", label: "Signed out", make: function () { return scene({ member: false }); } },
    { key: "anonsave", page: "chapter", label: "Signed out · Sign in to save", make: function () { return scene({ member: false, prompt: true, jump: jump("chapter-end") }); } },
    { key: "osdark", page: "chapter", label: "Device in dark mode · System", make: function () { return scene({ os: "dark", themeChoice: "system" }); } },
    { key: "loading", page: "chapter", label: "Loading", make: function () { return scene({ status: "loading" }); } },
    { key: "notfound", page: "chapter", label: "Not found", make: function () { return scene({ status: "notfound" }); } },
    { key: "failed", page: "chapter", label: "Failed to load", make: function () { return scene({ status: "failed" }); } },
    { key: "wtop", page: "loose", label: "Top of document", make: function () { return scene({ doc: WAL }); } },
    { key: "wresume", page: "loose", label: "Reopened at saved section", make: function () { return scene({ doc: WAL, resumed: true, jump: jump("checkpoints") }); } },
    { key: "wend", page: "loose", label: "End of document", make: function () { return scene({ doc: WAL, prog: progWith(WAL, { s: "finished", on: 2 }), jump: jump("chapter-end") }); } },
    { key: "wanon", page: "loose", label: "Signed out", make: function () { return scene({ doc: WAL, member: false }); } },
    { key: "mdart", page: "loose", label: "Plain Markdown · ASCII drawing", make: function () { return scene({ doc: MDN, jump: jump("the-three-files") }); } },
    { key: "abook", page: "book", label: "Book page", make: function () { return scene({ away: away("book", FROM, "The knowledge maintainer guide") }); } },
    { key: "alib", page: "library", label: "Library", make: function () { return scene({ away: away("library", FROM) }); } },
    { key: "asign", page: "signin", label: "Sign in", make: function () { return scene({ member: false, away: away("signin", { doc: INT, lang: "en", ver: null, member: false, sec: "the-write-path" }) }); } },
    { key: "alegacy", page: "legacy", label: "Legacy chapter", make: function () { return scene({ doc: TW + "storm-surge", away: away("legacy", { doc: TW + "storm-surge", lang: "en", ver: null, member: true, sec: null }, TW + "datums") }); } },
    { key: "aext", page: "external", label: "External link", make: function () { return scene({ away: away("external", FROM, "https://www.sqlite.org/wal.html") }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });

  function pageOf(s) {
    if (s.away) return s.away.kind;
    var d = RD.docs[s.doc];
    return d && d.loose ? "loose" : "chapter";
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }
  function sig(s) {
    var page = pageOf(s);
    if (s.away) return page + "|" + s.away.detail + "|" + (s.away.from ? s.away.from.doc : "");
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.chrome, s.panel || "", s.status, s.prompt,
      s.resumed, s.verFail, RD.stateOf(s.prog, s.doc), s.os, s.os === "dark" ? s.themeChoice : "",
      s.sec ? "in-text" : "at-top"].join("|");
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
    s.win = (device && device.win) || null;
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

  function api(comp) {
    function S() { return comp.state; }
    function put(over) { var n = Object.assign({}, over); n.preset = null; comp.setState(n); }
    function openDoc(key, opts) {
      var s = S(), d = RD.docs[key];
      if (!d) return;
      if (d.format === "legacy") {
        put({ away: away("legacy", { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec }, key), panel: null });
        return;
      }
      var lang = d.variants && d.variants[s.lang] ? s.lang : "en";
      var p = s.prog[key];
      var id = opts && opts.id, resumed = false;
      if (!id && s.member && p && p.s === "started" && p.at && !p.unread) { id = p.at; resumed = true; }
      put({ doc: key, lang: lang, ver: null, panel: null, chrome: "shown", status: "ready", prompt: false, hold: null,
        resumed: resumed, verFail: false, sec: id || null, jump: jump(id, 0), away: null });
    }
    return {
      open: function (key, id) { openDoc(key, { id: id }); },
      lang: function (l) {
        var s = S();
        if (l === s.lang) return;
        var to = landing(s.doc, s.lang, s.ver, s.sec, l, null);
        put({ lang: l, ver: null, panel: null, resumed: false, prompt: false, hold: null, jump: jump(to, 0), sec: to });
      },
      version: function (n) {
        var s = S();
        var v = n === RD.newest(s.doc, s.lang) ? null : n;
        put({ ver: v, panel: null, resumed: false, prompt: false, hold: null, jump: jump(null, 0), sec: null });
      },
      theme: function (c) { comp.setState({ themeChoice: c }); },
      size: function (n) { comp.setState({ size: n }); },
      panel: function (name) { put({ panel: name || null }); },
      chrome: function (v) { if (S().chrome !== v) put({ chrome: v }); },
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
        var over = { sec: r.sec };
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
        put({ away: away(kind, { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec }, detail || ""), panel: null });
      },
      back: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: f.member, panel: null, chrome: "shown", status: "ready", resumed: false, sec: f.sec, jump: jump(f.sec, 0) });
      },
      signedIn: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: true, panel: null, chrome: "shown", status: "ready", prompt: false, resumed: false, sec: f.sec, jump: jump(f.sec, 0) });
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
        var n = Object.assign({ themeChoice: s.themeChoice, size: s.size, win: s.win }, m);
        n.preset = key;
        n.loadId = (s.loadId || 0) + 1;
        comp.setState(n);
      }
    };
  }

  /* The Reader's props, from the flow state. */
  function readerProps(comp, a) {
    var s = comp.state;
    return {
      doc: s.doc, lang: s.lang, ver: s.ver, theme: themeOf(s), themeChoice: s.themeChoice, os: s.os, size: s.size,
      member: s.member, chrome: s.chrome, panel: s.panel, status: s.status, prog: s.prog, jump: s.jump, prompt: s.prompt,
      resumed: s.resumed, verFail: s.verFail, hold: s.hold,
      onOpen: a.open, onLang: a.lang, onVersion: a.version, onTheme: a.theme, onSize: a.size, onPanel: a.panel,
      onChrome: a.chrome, onMark: a.mark, onEnd: a.end, onEndLeft: a.endLeft, onReading: a.reading, onAway: a.away, onRetry: a.retry,
      onPrompt: a.prompt, onFromTop: a.fromTop, onDismissResume: a.dismissResume
    };
  }

  /* What a stand-in for another job's screen says. */
  function awayProps(comp, a) {
    var s = comp.state, w = s.away, f = w.from || FROM;
    var t = RD.titleOf(f.doc, f.lang).text, sec = null;
    var r = RD.read(f.doc, f.lang, f.ver);
    if (r && f.sec) r.sections.forEach(function (x) { if (x.id === f.sec) sec = x.text; });
    var where = sec ? t + " · " + sec : t;
    var o = { kind: w.kind, onBack: a.back, onContinue: a.signedIn, where: where, title: t, detail: w.detail, legacyTitle: "" };
    if (w.kind === "legacy") o.legacyTitle = RD.titleOf(w.detail, "en").text;
    if (w.kind === "book") o.detail = w.detail || (RD.ctx(f.doc) || {}).bookTitle || "";
    return o;
  }

  /* Round 03: the window a page is drawn in, a device setting like the theme (canvas only). Text is the root font
     size, as the browser's text zoom sets it; the reader's bars answer to their container's width in rem. */
  var WINDOWS = [
    { key: "fill", label: "Fills the window", w: 0, text: 100 },
    { key: "p390", label: "Phone 390", w: 390, text: 100 },
    { key: "p390t150", label: "Phone 390 · text 150%", w: 390, text: 150 },
    { key: "p390t200", label: "Phone 390 · text 200%", w: 390, text: 200 },
    { key: "p320", label: "Phone 320", w: 320, text: 100 }
  ];
  var WIN_BY = {};
  WINDOWS.forEach(function (w) { WIN_BY[w.key] = w; });

  /* extraFor(pageKey) may add one row of device presets to a page's group (round 03: the window row). */
  function bar(comp, a, pageKeys, extraFor) {
    var s = comp.state, cur = pageOf(s);
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      var g = {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: false, extraLabel: "", extra: [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
      var x = extraFor ? extraFor(p.key) : null;
      if (x) { g.hasExtra = true; g.extraLabel = x.label; g.extra = x.items; }
      return g;
    });
  }

  RD.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, readerProps: readerProps, awayProps: awayProps,
    bar: bar, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, jump: jump, WINDOWS: WINDOWS, WIN_BY: WIN_BY };
})();
