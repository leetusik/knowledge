/* Canvas only, never built: the prototype's controller for the library flow (Main and Widths).
   One state object holds everything a click carries between screens: the page, who is looking, the data and the
   reading state, the grouping, the folded rail, which lists are unfolded, the clear's phase, and where a stand-in
   came from. The boards draw everything as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var LIB = window.LIB;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* A complete scene. The theme is per device, so it is not part of a scene. */
  function scene(over) {
    var s = { page: "library", viewer: "member", data: "today", prog: "default", group: "project", status: "ready",
      pub: "ok", clear: "rest", folded: false, expanded: {}, due: null, away: null };
    for (var k in over) s[k] = over[k];
    return s;
  }
  function away(kind, detail, from, backLabel) { return { kind: kind, detail: detail || {}, from: from, backLabel: backLabel || "" }; }
  var LIB_SCENE = scene({});
  var PUB_ANON = scene({ page: "public", viewer: "anon" });
  var PUB_VISITOR = scene({ page: "public", viewer: "visitor" });
  var PUB_MEMBER0 = scene({ page: "public", viewer: "member", pub: "nothing" });
  var MG2 = { kind: "chapter", title: "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts", book: "The knowledge maintainer guide",
    project: "knowledge", n: 2, total: 5, section: "The write path", pct: 38, lang: "en" };

  /* Each page belongs to one flow board or to both: "main" is the member's library (Main, Widths), "public" is
     /@quillwork (PublicLibrary, PublicWidths). A board's bar lists only its own flow's pages, and only the page on
     screen shows its presets; the page changes only by clicking the prototype. */
  var PAGES = [
    { key: "library", name: "Library · /library", theme: true, foot: true, flows: ["main"] },
    { key: "public", name: "Public library · /@quillwork", theme: true, flows: ["public"] },
    { key: "book", name: "Book page — another job", flows: ["main"] },
    { key: "bookPublic", name: "Book page, public view — another job", flows: ["public"] },
    { key: "reader", name: "Reader — signed", flows: ["main", "public"] },
    { key: "legacy", name: "Legacy reader — another job", flows: ["main", "public"] },
    { key: "review", name: "Review — another job", flows: ["main", "public"] },
    { key: "console", name: "Console — unchanged", flows: ["main", "public"] },
    { key: "signin", name: "Sign in — another surface", flows: ["public"] },
    { key: "signout", name: "Sign out — another surface", flows: ["main", "public"] },
    { key: "landing", name: "Home — unchanged", flows: ["public"] },
    { key: "ownlib", name: "Library — Larkspur", flows: ["public"] },
    { key: "mylib", name: "Library — drawn on board 01", flows: ["public"] }
  ];

  function P(key, page, label, over, extra) { var p = { key: key, page: page, label: label, over: over }; for (var k in extra || {}) p[k] = extra[k]; return p; }
  var PRESETS = [
    P("lp", "library", "By project · today", {}),
    P("ls0", "library", "By subject · no subjects yet", { group: "subject" }),
    P("ls", "library", "By subject · with subjects", { group: "subject", data: "subjects" }),
    P("c1", "library", "Continue · one item", { prog: "one" }),
    P("cko", "library", "Continue · 한국어 first", { prog: "ko" }),
    P("cnext", "library", "Continue · just finished a chapter", { prog: "next" }),
    P("none", "library", "Opened nothing yet", { prog: "none" }),
    P("all", "library", "Everything finished", { prog: "all" }),
    P("long", "library", "Long and many", { data: "long", prog: "long" }),
    P("longall", "library", "Long · by subject, all 26 shown", { data: "long", prog: "long", group: "subject", expanded: { "s:-": true } }),
    P("fold", "library", "Rail folded", { folded: true }),
    P("due0", "library", "Nothing due in Review", { due: 0 }),
    P("due99", "library", "Over 99 due in Review", { due: 140 }),
    P("loading", "library", "Loading", { status: "loading" }),
    P("failed", "library", "Failed to load", { status: "failed" }),
    P("empty", "library", "Empty library", { data: "empty", prog: "none" }),
    P("cc", "library", "Clear all · confirming", { clear: "confirm" }),
    P("cg", "library", "Clear all · clearing", { clear: "clearing" }),
    P("cd", "library", "Clear all · cleared", { clear: "cleared", prog: "none" }),
    P("cf", "library", "Clear all · failed", { clear: "failed" }),
    P("pa", "public", "Signed out", { page: "public", viewer: "anon" }),
    P("pv", "public", "Signed in · not a member", { page: "public", viewer: "visitor" }),
    P("pm0", "public", "Member · nothing public yet", { page: "public", viewer: "member", pub: "nothing" }),
    P("pn", "public", "Nothing public · 404", { page: "public", viewer: "anon", pub: "nothing" }),
    P("pu", "public", "Unknown org · 404", { page: "public", viewer: "anon", pub: "unknown" }),
    P("pp", "public", "Private project's address · 404", { page: "public", viewer: "anon", pub: "private" }),
    P("pvn", "public", "Signed in · 404", { page: "public", viewer: "visitor", pub: "unknown" }),
    P("pl", "public", "Loading", { page: "public", viewer: "anon", status: "loading" }),
    P("pf", "public", "Failed to load", { page: "public", viewer: "anon", status: "failed" }),
    P("abook", "book", "Book page", { away: away("book", { title: "The knowledge maintainer guide", project: "knowledge", slug: "maintainer-guide" }, LIB_SCENE, "Back to the library") }, { flow: "main" }),
    P("areader", "reader", "Reader at the saved place", { away: away("reader", MG2, LIB_SCENE, "Back to the library") }, { flow: "main" }),
    P("alegacy", "legacy", "Legacy chapter", { away: away("legacy", { kind: "chapter", title: "How orchard schedules a harvest run", book: "The orchard maintainer guide", project: "orchard", n: 2, total: 4 }, LIB_SCENE, "Back to the library") }, { flow: "main" }),
    P("areview", "review", "Review", { away: away("review", {}, LIB_SCENE, "Back to the library") }, { flow: "main" }),
    P("aconsole", "console", "Dashboard", { away: away("console", { name: "Dashboard" }, LIB_SCENE, "Back to the library") }, { flow: "main" }),
    P("asignout", "signout", "Sign out", { away: away("signout", {}, LIB_SCENE, "Back, still signed in") }, { flow: "main" }),
    P("abookp", "bookPublic", "Book page, public view", { page: "public", viewer: "anon", away: away("bookPublic", { title: "The knowledge maintainer guide", project: "knowledge", slug: "maintainer-guide" }, PUB_ANON, "Back to Quillwork’s library") }, { flow: "public" }),
    P("preader", "reader", "A public document", { page: "public", viewer: "anon", away: away("reader", { kind: "doc", title: "SQLite's write-ahead log, in practice", project: "field-notes", anon: true }, PUB_ANON, "Back to Quillwork’s library") }, { flow: "public" }),
    P("plegacy", "legacy", "A public legacy document", { page: "public", viewer: "anon", away: away("legacy", { kind: "doc", title: "Why lantern keeps its phases in plain files", project: "lantern" }, PUB_ANON, "Back to Quillwork’s library") }, { flow: "public" }),
    P("preview", "review", "Review", { page: "public", viewer: "visitor", away: away("review", {}, PUB_VISITOR, "Back to Quillwork’s library") }, { flow: "public" }),
    P("pconsole", "console", "Dashboard", { page: "public", viewer: "visitor", away: away("console", { name: "Dashboard" }, PUB_VISITOR, "Back to Quillwork’s library") }, { flow: "public" }),
    P("psignout", "signout", "Sign out", { page: "public", viewer: "visitor", away: away("signout", {}, PUB_VISITOR, "Back, still signed in") }, { flow: "public" }),
    P("asignin", "signin", "Sign in", { page: "public", viewer: "anon", away: away("signin", {}, PUB_ANON, "Back, still signed out") }, { flow: "public" }),
    P("alanding", "landing", "Home", { page: "public", viewer: "anon", away: away("landing", {}, PUB_ANON, "Back to Quillwork’s library") }, { flow: "public" }),
    P("aownlib", "ownlib", "Larkspur's library", { page: "public", viewer: "visitor", away: away("ownlib", {}, PUB_VISITOR, "Back to Quillwork’s library") }, { flow: "public" }),
    P("amylib", "mylib", "Mira's library", { page: "public", viewer: "member", pub: "nothing", away: away("mylib", {}, PUB_MEMBER0, "Back to Quillwork’s library") }, { flow: "public" })
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });
  function make(key) { return scene(clone(BY[key].over)); }

  function pageOf(s) { return s.away ? s.away.kind : s.page; }
  /* The same detail compares equal whatever order its keys were written in, and an empty value is no value. */
  function stable(o) {
    if (!o || typeof o !== "object") return JSON.stringify(o);
    return "{" + Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null && o[k] !== "" && o[k] !== 0 && o[k] !== false; })
      .sort().map(function (k) { return k + ":" + stable(o[k]); }).join(",") + "}";
  }
  function sig(s) {
    if (s.away) return ["away", s.away.kind, stable(s.away.detail), s.away.from ? s.away.from.page + "/" + s.away.from.viewer : ""].join("|");
    var exp = Object.keys(s.expanded || {}).filter(function (k) { return s.expanded[k]; }).sort().join(",");
    var due = s.due === null || s.due === undefined ? "d" : String(s.due);
    if (s.page === "public") {
      var signed = s.viewer !== "anon";
      return ["public", s.viewer, s.pub, s.status, signed ? s.folded : "", signed ? due : "", exp].join("|");
    }
    return ["library", s.data, s.prog, s.group, s.status, s.clear, s.folded, due, exp].join("|");
  }
  function pressedKey(s, keys) {
    var mine = sig(s);
    if (s.preset && keys.indexOf(s.preset) >= 0 && sig(make(s.preset)) === mine) return s.preset;
    for (var i = 0; i < keys.length; i++) if (sig(make(keys[i])) === mine) return keys[i];
    return null;
  }

  function initial(key, theme) {
    var s = make(key || "lp");
    s.theme = theme || "light";
    s.preset = key || "lp";
    s.loadId = 0; s.sendId = 0;
    s.scroll = { tok: 0, to: "top" };
    return s;
  }
  function snapshot(s) {
    var keep = {};
    ["page", "viewer", "data", "prog", "group", "status", "pub", "clear", "folded", "expanded", "due"].forEach(function (k) { keep[k] = clone(s[k] === undefined ? null : s[k]); });
    if (keep.clear === "clearing") keep.clear = "rest";
    return keep;
  }

  function flowOf(comp) { return comp.flow === "public" ? "public" : "main"; }
  function presetsOf(flow, page) {
    return PRESETS.filter(function (x) { return x.page === page && (!x.flow || x.flow === flow); }).map(function (x) { return x.key; });
  }

  function api(comp) {
    function S() { return comp.state; }
    function put(over, to) {
      var n = Object.assign({}, over);
      n.preset = null;
      if (to !== undefined) n.scroll = { tok: (S().scroll ? S().scroll.tok : 0) + 1, to: to };
      comp.setState(n);
    }
    function y() { return comp.scrollPos ? comp.scrollPos() : 0; }
    var a = {
      pick: function (key) {
        var s = S(), n = make(key), p = BY[key];
        n.theme = s.theme;
        n.preset = key;
        n.loadId = (s.loadId || 0) + 1;
        n.sendId = (s.sendId || 0) + 1;
        n.scroll = { tok: (s.scroll ? s.scroll.tok : 0) + 1, to: "top" };
        comp.setState(n);
      },
      theme: function (t) { comp.setState({ theme: t }); },
      go: function (kind, detail) {
        var s = S();
        /* On the member's flow the library is this board's own page; on the public flow it is drawn on board 01, so a
           member who goes there from /@quillwork lands on a stand-in that says so. */
        if (kind === "library" && flowOf(comp) === "main") { put(Object.assign(snapshot(LIB_SCENE), { away: null }), "top"); return; }
        if (kind === "library") kind = "mylib";
        var from = snapshot(s);
        from.y = y();
        var back = kind === "signin" ? "Back, still signed out" : kind === "signout" ? "Back, still signed in"
          : s.page === "public" ? "Back to Quillwork’s library" : "Back to the library";
        put({ away: away(kind, detail || {}, from, back), sendId: (s.sendId || 0) + 1 }, "top");
      },
      back: function () {
        var s = S(), f = s.away && s.away.from;
        if (!f) return;
        var n = Object.assign({}, snapshot(f), { away: null });
        put(n, Array.isArray(f.y) ? f.y : "top");
      },
      primary: function () {
        var s = S();
        if (!s.away || s.away.kind !== "signin") return;
        var f = snapshot(s.away.from || PUB_ANON);
        f.viewer = "visitor";
        put(Object.assign(f, { away: null }), "top");
      },
      group: function (g) { var s = S(); if (g !== s.group) put({ group: g, expanded: {} }); },
      fold: function () { put({ folded: !S().folded }); },
      more: function (key) { var e = clone(S().expanded || {}); e[key] = !e[key]; put({ expanded: e }); },
      clear: function (step) {
        var s = S();
        if (step === "start") put({ clear: "confirm" });
        else if (step === "cancel") put({ clear: "rest" });
        else if (step === "confirm") {
          if (s.clear === "clearing") return;
          var id = (s.sendId || 0) + 1;
          put({ clear: "clearing", sendId: id });
          setTimeout(function () {
            if (comp.state.sendId === id && comp.state.clear === "clearing") comp.setState({ clear: "cleared", prog: "none", preset: null });
          }, 1400);
        }
      },
      retry: function () {
        var id = (S().loadId || 0) + 1;
        put({ status: "loading", loadId: id });
        setTimeout(function () {
          if (comp.state.loadId === id && comp.state.status === "loading") comp.setState({ status: "ready", preset: null });
        }, 900);
      }
    };
    return a;
  }

  function libraryProps(comp, a) {
    var s = comp.state;
    return {
      route: s.page === "public" ? "public" : "library", viewer: s.viewer, theme: s.theme, data: s.data, prog: s.prog, group: s.group,
      status: s.status, pub: s.pub, clear: s.clear, folded: s.folded, expanded: s.expanded, due: s.due,
      onGo: a.go, onGroup: a.group, onFold: a.fold, onMore: a.more, onClear: a.clear, onRetry: a.retry
    };
  }
  function awayProps(comp, a) {
    var w = comp.state.away || away("book", {}, LIB_SCENE, "");
    return { kind: w.kind, detail: w.detail, backLabel: w.backLabel, onBack: a.back, onPrimary: a.primary };
  }

  var THEMES = [["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"]];
  function themeRow(comp, a) {
    return THEMES.map(function (t) { return { label: t[1], pressed: comp.state.theme === t[0], pick: function () { a.theme(t[0]); } }; });
  }
  /* Every page of this board's flow has its group in one grid cell; the others are hidden, so the bar keeps the
     tallest page's height, and only the page on screen shows its presets. */
  /* The clear sits at the foot of /library and a preset never scrolls (a scroll moves the sticky topbar), so while
     the clear is in any phase but rest the library's group says where to look. The note is always laid out and only
     its visibility changes, so the bar never changes height. */
  function bar(comp, a) {
    var s = comp.state, cur = pageOf(s), flow = flowOf(comp);
    return PAGES.filter(function (p) { return p.flows.indexOf(flow) >= 0; }).map(function (p) {
      var keys = presetsOf(flow, p.key);
      var on = p.key === cur ? pressedKey(s, keys) : null;
      var footOn = !!p.foot && p.key === cur && s.clear && s.clear !== "rest";
      return {
        key: p.key, name: p.name, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1,
        foot: !!p.foot, footCls: footOn ? "pb-note pb-foot" : "pb-note pb-foot is-hidden",
        footHidden: footOn ? "false" : "true",
        hasExtra: !!p.theme, extraLabel: "· theme:", extra: p.theme ? themeRow(comp, a) : [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
    });
  }
  /* Where the page (Main) or each frame (Widths) is scrolled; a preset or a stand-in opens at the top, and Back returns to
     the same place. A preset never scrolls the page for you: the clear's presets leave it at the top, the clear at the foot. */
  function boxes(root) {
    var st = root ? root.querySelectorAll(".lib-stage") : [];
    return st.length ? Array.prototype.slice.call(st) : [document.scrollingElement || document.documentElement];
  }
  function scrollPos(root) { return boxes(root).map(function (b) { return b.scrollTop; }); }
  function applyScroll(root, sc) {
    if (!sc || sc.to === "keep") return;
    var t0 = Date.now();
    function run() {
      var bx = boxes(root);
      bx.forEach(function (b, i) { b.scrollTop = Array.isArray(sc.to) ? (sc.to[i] || 0) : 0; });
      if (Array.isArray(sc.to) && Date.now() - t0 < 600) {
        var short = bx.some(function (b, i) { return Math.abs(b.scrollTop - (sc.to[i] || 0)) > 2; });
        if (short) requestAnimationFrame(run);
      }
    }
    requestAnimationFrame(run);
  }

  LIB.flow = { scrollPos: scrollPos, applyScroll: applyScroll, PAGES: PAGES, PRESETS: PRESETS, BY: BY, scene: scene, initial: initial, api: api, libraryProps: libraryProps,
    awayProps: awayProps, bar: bar, pageOf: pageOf, pressedKey: pressedKey, sig: sig };
})();
