/* Canvas only, never built: the prototype's controller for the reader flow (Main and Widths).
   Job 03-diagrams: copied from the signed reader (01-reader/02-revise) and changed only so it reaches this job's
   blocks: the chapter page's presets jump to the diagrams (the reader's own presets stay on the signed canvas), a
   preset's jump target is part of its signature, and the bar carries text size and theme.
   One state object holds everything a click carries between screens: the document, language and
   version, the device settings, signed in or out, the open panel, progress and where a jump lands.
   The boards draw everything as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var RD = window.RD;
  var MG = "maintainer-guide/", TW = "tidewater/", WAL = "doc/field-notes/sqlite-wal", MDN = "doc/field-notes/wal-files";
  var INT = MG + "internals";
  var SP = "specimens/";
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
    { key: "chapter", name: "Reader · diagrams in a chapter" },
    { key: "loose", name: "Reader · a loose document" },
    { key: "book", name: "Book page — another job" },
    { key: "library", name: "Library — another job" },
    { key: "signin", name: "Sign in — another surface" },
    { key: "legacy", name: "Legacy reader — another job" },
    { key: "external", name: "External link — outside the canvas" }
  ];

  function away(kind, from, detail) { return { kind: kind, from: from, detail: detail || "" }; }
  var FROM = { doc: INT, lang: "en", ver: null, member: true, sec: "the-write-path" };

  function at(doc, id, over) { var o = { doc: doc, jump: jump(id) }; for (var k in over || {}) o[k] = over[k]; return function () { return scene(o); }; }
  var PRESETS = [
    { key: "sample", page: "chapter", label: "Sample diagram · EN v2", make: at(INT, "two-planes") },
    { key: "sample1", page: "chapter", label: "Sample · EN v1", make: at(INT, "two-planes", { ver: 1 }) },
    { key: "sampleko", page: "chapter", label: "Sample · 한국어 v1", make: at(INT, "two-planes", { lang: "ko" }) },
    { key: "nocap", page: "chapter", label: "No caption", make: at(SP + "state-sequence", "chapter-states") },
    { key: "pipeline", page: "chapter", label: "Flow · pipeline in lanes", make: at(SP + "flow", "pipeline") },
    { key: "loop", page: "chapter", label: "Flow · a loop", make: at(SP + "flow", "loop") },
    { key: "layers", page: "chapter", label: "Flow · layers and shapes", make: at(SP + "flow", "layers") },
    { key: "tables", page: "chapter", label: "Flow · tables", make: at(SP + "flow", "tables") },
    { key: "auto", page: "chapter", label: "Flow · no node placed", make: at(SP + "flow", "auto") },
    { key: "longlab", page: "chapter", label: "Flow · long labels", make: at(SP + "flow", "long") },
    { key: "states", page: "chapter", label: "State · start, end, to itself", make: at(SP + "state-sequence", "card-states") },
    { key: "bridge", page: "chapter", label: "Sequence · notes, to itself", make: at(SP + "state-sequence", "bridge") },
    { key: "six", page: "chapter", label: "Sequence · six actors, replies", make: at(SP + "state-sequence", "six-actors") },
    { key: "stack", page: "chapter", label: "Stack", make: at(SP + "stack-timeline", "stack") },
    { key: "nested", page: "chapter", label: "Stack · nested", make: at(SP + "stack-timeline", "nested") },
    { key: "timeline", page: "chapter", label: "Timeline", make: at(SP + "stack-timeline", "timeline") },
    { key: "bar", page: "chapter", label: "Chart · bar", make: at(SP + "charts", "survey") },
    { key: "grouped", page: "chapter", label: "Chart · grouped bars", make: at(SP + "charts", "grouped") },
    { key: "line", page: "chapter", label: "Chart · lines", make: at(SP + "charts", "line") },
    { key: "interval", page: "chapter", label: "Chart · interval", make: at(SP + "charts", "interval") },
    { key: "neg", page: "chapter", label: "Chart · below zero", make: at(SP + "charts", "negative") },
    { key: "longcats", page: "chapter", label: "Chart · long labels", make: at(SP + "charts", "long-cats") },
    { key: "points", page: "chapter", label: "Chart · 200 points", make: at(SP + "charts", "points") },
    { key: "korean", page: "chapter", label: "한국어 labels", make: at(SP + "korean", null, { lang: "ko" }) },
    { key: "map", page: "chapter", label: "Near the limits · 60 nodes", make: at(SP + "limits", "limits-map") },
    { key: "lanes", page: "chapter", label: "Near the limits · 12 lanes", make: at(SP + "limits", "limits-lanes") },
    { key: "tones", page: "chapter", label: "Every tone", make: at(SP + "tones", null) },
    { key: "wtop", page: "loose", label: "Top of document", make: function () { return scene({ doc: WAL }); } },
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
  /* A chapter's progress and whether the chrome is showing are not part of a preset's place on this bar: reading writes
     them by itself the moment a preset lands (the scroll report writes "started", an end in view writes "finished", and
     a frame that scrolls hides its chrome), and no preset here sets either. */
  /* many: the board shows one state in several frames at once (Widths), each reporting its own reading place, so where
     the reader is in the text is not one value there; the jump target still tells the presets apart */
  function sig(s, many) {
    var page = pageOf(s);
    if (s.away) return page + "|" + s.away.detail + "|" + (s.away.from ? s.away.from.doc : "");
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.panel || "", s.status, s.prompt,
      s.resumed, s.verFail, s.os, s.os === "dark" ? s.themeChoice : "",
      many ? "" : s.sec ? "in-text" : "at-top", (s.jump && s.jump.id) || ""].join("|");
  }
  function pressedKey(s, keys, many) {
    var mine = sig(s, many);
    if (s.preset && keys.indexOf(s.preset) >= 0 && sig(Object.assign({}, BY[s.preset].make(), { themeChoice: s.themeChoice }), many) === mine) return s.preset;
    for (var i = 0; i < keys.length; i++) {
      var p = BY[keys[i]];
      if (sig(Object.assign({}, p.make(), { themeChoice: p.key === "osdark" ? "system" : s.themeChoice }), many) === mine) return p.key;
    }
    return null;
  }

  function initial(key, device) {
    var s = BY[key || "sample"].make();
    s.themeChoice = s.themeChoice || (device && device.themeChoice) || "system";
    s.size = (device && device.size) || 3;
    s.preset = key || "sample";
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
        var n = Object.assign({ themeChoice: s.themeChoice, size: s.size }, m);
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

  /* Text size and theme are the device's (never part of a scene); the bar reaches them too, so sizes 1, 3 and 5 and
     the three themes are one press away. */
  var SIZES = [[1, "Size 1"], [3, "Size 3"], [5, "Size 5"]], THEMES = [["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"], ["system", "System"]];
  function device(comp) {
    var s = comp.state;
    return SIZES.map(function (z) { return { label: z[1], pressed: s.size === z[0], pick: function () { comp.setState({ size: z[0] }); } }; })
      .concat(THEMES.map(function (t) { return { label: t[1], pressed: s.themeChoice === t[0], pick: function () { comp.setState({ themeChoice: t[0] }); } }; }));
  }
  function bar(comp, a, pageKeys) {
    var s = comp.state, cur = pageOf(s);
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      return {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: p.key === "chapter", extraLabel: "· text size and theme:", extra: p.key === "chapter" ? device(comp) : [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
    });
  }

  RD.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, readerProps: readerProps, awayProps: awayProps,
    bar: bar, device: device, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, jump: jump };
})();
