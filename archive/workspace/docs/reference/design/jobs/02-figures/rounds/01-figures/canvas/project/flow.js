/* Canvas only, never built: the prototype's controller for job 02-figures (Main and Widths).
   Extended from the signed reader's flow.js (job 01-reader, round 02-revise). One state object holds everything a click
   carries between screens: the document, language and version, signed in or out, the open panel, progress, where a
   jump lands, and this job's prototype conditions: images loaded, loading or one missing; reduced motion; and the
   citation target (the product's :target). The boards draw everything as markup; this file only computes props and
   handlers. */
(function () {
  "use strict";
  var RD = window.RD;
  var MG = "maintainer-guide/";
  var FIG = MG + "read-surfaces", SUB = "ml-gently/forgetting", OTHER = MG + "internals";
  var seq = 0;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jump(id, frac) { seq += 1; return { id: id || null, frac: frac || 0, token: seq }; }

  /* A complete scene. Device settings (theme choice, size) are not part of a scene: they are per device. */
  function scene(over) {
    var s = { doc: FIG, lang: "en", ver: null, member: true, chrome: "shown", panel: null, status: "ready",
      prog: clone(RD.progress), jump: jump(null, 0), prompt: false, resumed: false, away: null, verFail: false,
      os: "light", hold: null, sec: null,
      img: "loaded", rm: false, miss: "", target: "", here: "", land: "" };
    for (var k in over) s[k] = over[k];
    if (s.jump && s.jump.id && !("sec" in over)) s.sec = s.jump.id;
    if (s.jump && s.jump.id && !("land" in over)) s.land = s.jump.id;
    return s;
  }

  var PAGES = [
    { key: "figs", name: "Reader · a chapter with figures", reader: true },
    { key: "srcs", name: "Reader · a chapter with sources", reader: true },
    { key: "other", name: "Reader · another chapter", reader: true },
    { key: "book", name: "Book page — another job" },
    { key: "library", name: "Library — another job" },
    { key: "external", name: "External link — outside the canvas" }
  ];

  function away(kind, from, detail) { return { kind: kind, from: from, detail: detail || "" }; }
  var FROM = { doc: FIG, lang: "en", ver: null, member: true, sec: "the-reader" };
  var FROM_SRC = { doc: SUB, lang: "en", ver: null, member: true, sec: "sources-list" };
  function at(id, o) { var x = { jump: jump(id) }; for (var k in o) x[k] = o[k]; return scene(x); }
  function sub(id, o) { var x = { doc: SUB }; for (var k in o) x[k] = o[k]; return id ? at(id, x) : scene(x); }

  var PRESETS = [
    { key: "figtop", page: "figs", label: "Top of chapter", make: function () { return scene({}); } },
    { key: "figcards", page: "figs", label: "Row of two cards", make: function () { return at("two-readers"); } },
    { key: "figtrans", page: "figs", label: "Transparent PNG", make: function () { return at("bff-sketch"); } },
    { key: "figsvg", page: "figs", label: "SVG · UI mock", make: function () { return at("sandbox-mock"); } },
    { key: "figrowdgm", page: "figs", label: "Row with a diagram item", make: function () { return at("handshake"); } },
    { key: "figrow2", page: "figs", label: "Row of two images", make: function () { return at("two-branches"); } },
    { key: "figcol", page: "figs", label: "Column figure · caption and credit", make: function () { return at("reader-desktop"); } },
    { key: "figplain", page: "figs", label: "Plain Markdown image", make: function () { return at("canvas-img-chapter-bar"); } },
    { key: "figtall", page: "figs", label: "Tall portrait · long caption", make: function () { return at("reader-phone"); } },
    { key: "figsmall", page: "figs", label: "Small image", make: function () { return at("language-switch"); } },
    { key: "figwide", page: "figs", label: "Wide figure", make: function () { return at("contents-sheet"); } },
    { key: "figgif", page: "figs", label: "Animated GIF", make: function () { return at("chrome-hides"); } },
    { key: "figgifrm", page: "figs", label: "Animated GIF · reduced motion", make: function () { return at("chrome-hides", { rm: true }); } },
    { key: "figrow3", page: "figs", label: "Row of three · unequal heights", make: function () { return at("column-row"); } },
    { key: "figcards3", page: "figs", label: "Row of three cards", make: function () { return at("house-style-rules"); } },
    { key: "figload", page: "figs", label: "Images loading", make: function () { return at("reader-desktop", { img: "loading" }); } },
    { key: "figloadrm", page: "figs", label: "Images loading · reduced motion", make: function () { return at("reader-desktop", { img: "loading", rm: true }); } },
    { key: "figmiss", page: "figs", label: "An image missing", make: function () { return at("reader-desktop", { miss: "reader-desktop" }); } },
    { key: "figko", page: "figs", label: "한국어 · captions", make: function () { return at("reader-phone", { lang: "ko" }); } },
    { key: "srctop", page: "srcs", label: "Top of chapter", make: function () { return sub(null); } },
    { key: "srccite", page: "srcs", label: "Citations in the text", make: function () { return sub("what-it-predicts"); } },
    { key: "srcchart", page: "srcs", label: "Wide chart · a citation in its caption", make: function () { return sub("recall-curves"); } },
    { key: "srcmatrix", page: "srcs", label: "SVG · 2×2 matrix", make: function () { return sub("review-outcomes"); } },
    { key: "srclist", page: "srcs", label: "Sources list", make: function () { return sub("sources-list"); } },
    { key: "srcfollowed", page: "srcs", label: "After a citation · its source", make: function () { return sub("py-fsrs", { target: "py-fsrs" }); } },
    { key: "srcback", page: "srcs", label: "Back at the citation", make: function () { return sub("cite-py-fsrs-1", { here: "cite-py-fsrs-1" }); } },
    { key: "srcko", page: "srcs", label: "한국어 · sources", make: function () { return sub("sources-list", { lang: "ko" }); } },
    { key: "other", page: "other", label: "Another chapter", make: function () { return scene({ doc: OTHER }); } },
    { key: "abook", page: "book", label: "Book page", make: function () { return scene({ away: away("book", FROM, "The knowledge maintainer guide") }); } },
    { key: "alib", page: "library", label: "Library", make: function () { return scene({ away: away("library", FROM) }); } },
    { key: "aext", page: "external", label: "A source's URL", make: function () { return scene({ doc: SUB, away: away("external", FROM_SRC, "https://github.com/open-spaced-repetition/py-fsrs") }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });

  function pageOf(s) {
    if (s.away) return s.away.kind;
    if (s.doc === FIG) return "figs";
    if (s.doc === SUB) return "srcs";
    return "other";
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }
  function sig(s) {
    var page = pageOf(s);
    if (s.away) return page + "|" + s.away.detail + "|" + (s.away.from ? s.away.from.doc : "");
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.chrome, s.panel || "", s.status, s.prompt, s.resumed,
      s.img, s.rm, s.miss, s.target, s.here, s.land || (s.sec ? "in-text" : "at-top")].join("|");
  }
  function pressedKey(s, keys) {
    var mine = sig(s);
    if (s.preset && keys.indexOf(s.preset) >= 0 && sig(BY[s.preset].make()) === mine) return s.preset;
    for (var i = 0; i < keys.length; i++) if (sig(BY[keys[i]].make()) === mine) return keys[i];
    return null;
  }

  function initial(key, device) {
    var s = BY[key || "figtop"].make();
    s.themeChoice = (device && device.themeChoice) || "system";
    s.size = (device && device.size) || 3;
    s.preset = key || "figtop";
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
        resumed: resumed, verFail: false, sec: id || null, jump: jump(id, 0), away: null, target: "", here: "", land: "" });
    }
    return {
      open: function (key, id) { openDoc(key, { id: id }); },
      lang: function (l) {
        var s = S();
        if (l === s.lang) return;
        var to = landing(s.doc, s.lang, s.ver, s.sec, l, null);
        put({ lang: l, ver: null, panel: null, resumed: false, prompt: false, hold: null, jump: jump(to, 0), sec: to, target: "", here: "", land: "" });
      },
      version: function (n) {
        var s = S();
        var v = n === RD.newest(s.doc, s.lang) ? null : n;
        put({ ver: v, panel: null, resumed: false, prompt: false, hold: null, jump: jump(null, 0), sec: null, target: "", here: "", land: "" });
      },
      theme: function (c) { comp.setState({ themeChoice: c }); },
      size: function (n) { comp.setState({ size: n }); },
      panel: function (name) { put({ panel: name || null }); },
      chrome: function (v) { if (S().chrome !== v) put({ chrome: v }); },
      mark: function (finished) {
        var s = S();
        if (!s.member) { put({ prompt: true }); return; }
        var prog = clone(s.prog);
        if (finished) prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        else prog[s.doc] = { s: "started", pct: 0, at: null, unread: true };
        put({ prog: prog, hold: finished ? null : s.doc });
      },
      end: function () {
        var s = S();
        if (!s.member || s.hold === s.doc || s.status !== "ready") return;
        var st = RD.stateOf(s.prog, s.doc);
        if (st === "finished" || st === "updated") return;
        var prog = clone(s.prog);
        prog[s.doc] = { s: "finished", on: RD.newest(s.doc, "en") };
        comp.setState({ prog: prog });
      },
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
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: f.member, panel: null, chrome: "shown", status: "ready", resumed: false, sec: f.sec, jump: jump(f.sec, 0), land: "" });
      },
      signedIn: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: true, panel: null, chrome: "shown", status: "ready", prompt: false, resumed: false, sec: f.sec, jump: jump(f.sec, 0), land: "" });
      },
      retry: function () {
        var id = (S().loadId || 0) + 1;
        put({ status: "loading", loadId: id });
        setTimeout(function () {
          if (comp.state.loadId === id && comp.state.status === "loading") comp.setState({ status: "ready", jump: jump(null, 0) });
        }, 900);
      },
      prompt: function (v) { put({ prompt: !!v }); },
      fromTop: function () { put({ resumed: false, jump: jump(null, 0), sec: null, land: "" }); },
      dismissResume: function () { if (S().resumed) comp.setState({ resumed: false }); },
      /* A citation or a back link was followed (Prose and SourceList report it through RD.figs.go): the item, or the
         citation, becomes the target, the product's :target. The scroll itself is the reader's own anchor jump. */
      figs: function (o) {
        var t = o.target || "", h = o.here || "";
        put({ target: t, here: h, land: t || h, sec: t || h || S().sec });
      },
      pick: function (key) {
        var s = S(), m = BY[key].make();
        var n = Object.assign({ themeChoice: s.themeChoice, size: s.size }, m);
        n.preset = key;
        n.loadId = (s.loadId || 0) + 1;
        comp.setState(n);
      }
    };
  }

  /* The prototype conditions the figures read (RD.figs), mirrored from the flow state after each render. */
  function mirror(comp) {
    var s = comp.state;
    RD.figs.set({ img: s.img, rm: !!s.rm, miss: s.miss || "", target: s.target || "", here: s.here || "" });
  }
  function own(comp, a) { RD.figs.owner = function (o) { a.figs(o); }; mirror(comp); }

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

  /* The display extras on a reader page: theme and text size, the device settings (never part of a preset). */
  var THEMES = [["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"], ["system", "System"]];
  function display(comp) {
    var s = comp.state;
    return THEMES.map(function (t) {
      return { label: t[1], pressed: s.themeChoice === t[0], pick: function () { comp.setState({ themeChoice: t[0] }); } };
    }).concat([1, 3, 5].map(function (n) {
      return { label: "Size " + n, pressed: s.size === n, pick: function () { comp.setState({ size: n }); } };
    }));
  }

  function bar(comp, a, pageKeys) {
    var s = comp.state, cur = pageOf(s);
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      return {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: !!p.reader, extraLabel: "· display:", extra: p.reader ? display(comp) : [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
    });
  }

  RD.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, readerProps: readerProps, awayProps: awayProps,
    bar: bar, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, jump: jump, display: display,
    mirror: mirror, own: own, FIG: FIG, SUB: SUB };
})();
