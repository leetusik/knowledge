/* Canvas only, never built: the prototype's controller for the reader flow (Main and Widths). Job 04-quiz copies the
   signed reader's file and adds the quiz: its state in the scene (qz, hist, qsign, qseq), its presets, the quiz action
   and the bundle the reader passes down to the block. The reader's own presets are left out of this canvas's bar.
   One state object holds everything a click carries between screens: the document, language and
   version, the device settings, signed in or out, the open panel, progress and where a jump lands.
   The boards draw everything as markup; this file only computes props and handlers. */
(function () {
  "use strict";
  var RD = window.RD;
  var MG = "maintainer-guide/", TW = "tidewater/", WAL = "doc/field-notes/sqlite-wal", MDN = "doc/field-notes/wal-files";
  var MONEY = "doc/money-notes/compound-interest";
  var INT = MG + "internals";
  var seq = 0;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function jump(id, frac) { seq += 1; return { id: id || null, frac: frac || 0, token: seq }; }
  function progWith(key, rec) { var p = clone(RD.progress); p[key] = rec; return p; }

  /* A complete scene. Device settings (theme choice, size) are not part of a scene: they are per device. */
  function scene(over) {
    var s = { doc: INT, lang: "en", ver: null, member: true, chrome: "shown", panel: null, status: "ready",
      prog: clone(RD.progress), jump: jump(null, 0), prompt: false, resumed: false, away: null, verFail: false,
      os: "light", hold: null, sec: null, qz: {}, hist: [], qsign: { at: null, closed: false }, qseq: 0 };
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
  var FROM = { doc: INT, lang: "en", ver: null, member: true, sec: "contracts", at: "check" };

  /* A preset is a scene plus the clicks that lead to it, played through the same quiz rules the block uses. */
  var HIST = function (k) { return clone((RD.quizHist || {})[k] || []); };
  function play(over, steps, outcome) {
    var sc = scene(over);
    var view = RD.quiz.viewOf(sc.doc, sc.lang, sc.ver, sc.member), block = RD.quiz.block(sc.doc, sc.lang, sc.ver);
    var b = { qz: sc.qz, hist: sc.hist, sign: sc.qsign, seq: sc.qseq };
    (steps || []).forEach(function (st) {
      var r = RD.quiz.dispatch(b, view, block, st[0], st[1], sc.member);
      b = r.bundle;
      if (r.send) b = RD.quiz.land(b, r.send, outcome || "saved");
    });
    sc.qz = b.qz; sc.hist = b.hist; sc.qsign = b.sign; sc.qseq = b.seq;
    return sc;
  }
  function T(v) { return { t: "type", n: T.n++, v: v }; }
  function typed(vals) { T.n = 1; return vals.map(function (v) { return ["write-path", T(v)]; }); }
  var Q = "check--";
  var PRESETS = [
    { key: "qopen", page: "chapter", label: "Quiz · unanswered", make: function () { return scene({ jump: jump("check") }); } },
    { key: "qsr", page: "chapter", label: "Single · right", make: function () { return play({ jump: jump("check") }, [["read-column", { t: "pick", opt: "b" }]]); } },
    { key: "qsw", page: "chapter", label: "Single · wrong", make: function () { return play({ jump: jump("check") }, [["read-column", { t: "pick", opt: "a" }]]); } },
    { key: "qmsel", page: "chapter", label: "Multi · selecting", make: function () { return play({ jump: jump(Q + "two-planes") }, [["two-planes", { t: "toggle", opt: "a" }]]); } },
    { key: "qmempty", page: "chapter", label: "Multi · Check with nothing chosen", make: function () { return play({ jump: jump(Q + "two-planes") }, [["two-planes", { t: "check" }]]); } },
    { key: "qmpart", page: "chapter", label: "Multi · partly right", make: function () { return play({ jump: jump(Q + "two-planes") }, [["two-planes", { t: "toggle", opt: "a" }], ["two-planes", { t: "toggle", opt: "b" }], ["two-planes", { t: "check" }]]); } },
    { key: "qmright", page: "chapter", label: "Multi · right", make: function () { return play({ jump: jump(Q + "two-planes") }, [["two-planes", { t: "toggle", opt: "a" }], ["two-planes", { t: "toggle", opt: "c" }], ["two-planes", { t: "check" }]]); } },
    { key: "qrrev", page: "chapter", label: "Recall · answer shown", make: function () { return play({ jump: jump(Q + "projection") }, [["projection", { t: "reveal" }]]); } },
    { key: "qrgot", page: "chapter", label: "Recall · got it", make: function () { return play({ jump: jump(Q + "projection") }, [["projection", { t: "reveal" }], ["projection", { t: "self", v: "got" }]]); } },
    { key: "qrmiss", page: "chapter", label: "Recall · missed it", make: function () { return play({ jump: jump(Q + "projection") }, [["projection", { t: "reveal" }], ["projection", { t: "self", v: "missed" }]]); } },
    { key: "qctyped", page: "chapter", label: "Cloze · typed, not checked", make: function () { return play({ jump: jump(Q + "write-path") }, typed([" Write Lock ", "sqlite", "GIT", "postgres"])); } },
    { key: "qcright", page: "chapter", label: "Cloze · right (case, spaces, alternative)", make: function () { return play({ jump: jump(Q + "write-path") }, typed([" Write Lock ", "sqlite", "GIT", "postgres"]).concat([["write-path", { t: "check" }]])); } },
    { key: "qcpart", page: "chapter", label: "Cloze · partly right", make: function () { return play({ jump: jump(Q + "write-path") }, typed(["write lock", "sqlite3", "git", ""]).concat([["write-path", { t: "check" }]])); } },
    { key: "qretry", page: "chapter", label: "Second attempt, after Try again", make: function () { return play({ jump: jump("check") }, [["read-column", { t: "pick", opt: "a" }], ["read-column", { t: "retry" }], ["read-column", { t: "pick", opt: "b" }]]); } },
    { key: "qfail", page: "chapter", label: "Answer not saved", make: function () { return play({ jump: jump("check") }, [["read-column", { t: "pick", opt: "b" }]], "failed"); } },
    { key: "qret", page: "chapter", label: "On return · saved answers", make: function () { return scene({ hist: HIST("internals"), jump: jump("check") }); } },
    { key: "qko", page: "chapter", label: "한국어 · saved English answers", make: function () { return scene({ lang: "ko", hist: HIST("internals"), jump: jump("check") }); } },
    { key: "qkocl", page: "chapter", label: "한국어 · cloze, Korean answer", make: function () { T.n = 1; return play({ lang: "ko", jump: jump(Q + "write-path") }, [["write-path", T("쓰기 잠금".normalize("NFD"))], ["write-path", T("SQLite")], ["write-path", T("git")], ["write-path", T("Postgres")], ["write-path", { t: "check" }]]); } },
    { key: "qanon", page: "chapter", label: "Signed out · unanswered", make: function () { return scene({ member: false, hist: HIST("internals"), jump: jump("check") }); } },
    { key: "qanonsave", page: "chapter", label: "Signed out · answered, Sign in to save", make: function () { return play({ member: false, hist: HIST("internals"), jump: jump("check") }, [["read-column", { t: "pick", opt: "b" }]]); } },
    { key: "qanonnot", page: "chapter", label: "Signed out · after Not now", make: function () { return play({ member: false, hist: HIST("internals"), jump: jump("check") }, [["read-column", { t: "pick", opt: "b" }], ["read-column", { t: "signclose" }], ["publish-in-lock", { t: "pick", opt: "c" }]]); } },
    { key: "qone", page: "chapter", label: "One question · untitled", make: function () { return scene({ doc: MG + "what-it-is", jump: jump("check") }); } },
    { key: "qtwenty", page: "chapter", label: "20 questions · 7 answered", make: function () { return scene({ doc: TW + "harmonic-model", hist: HIST("tidewater"), jump: jump("twenty") }); } },
    { key: "lopen", page: "loose", label: "Quiz in a document", make: function () { return scene({ doc: MONEY, jump: jump("try-it") }); } },
    { key: "lanon", page: "loose", label: "Signed out · Sign in to save", make: function () { return play({ doc: MONEY, member: false, jump: jump("try-it") }, [["more-or-less", { t: "pick", opt: "a" }]]); } },
    { key: "abook", page: "book", label: "Book page", make: function () { return scene({ away: away("book", FROM, "The knowledge maintainer guide") }); } },
    { key: "alib", page: "library", label: "Library", make: function () { return scene({ away: away("library", FROM) }); } },
    { key: "asign", page: "signin", label: "Sign in, from the quiz", make: function () { return scene({ member: false, hist: HIST("internals"), away: away("signin", { doc: INT, lang: "en", ver: null, member: false, sec: "contracts", at: "check--read-column" }) }); } },
    { key: "alegacy", page: "legacy", label: "Legacy chapter, from a quiz link", make: function () { return scene({ doc: TW + "harmonic-model", away: away("legacy", { doc: TW + "harmonic-model", lang: "en", ver: null, member: true, sec: null, at: "twenty--datum" }, TW + "datums") }); } },
    { key: "aext", page: "external", label: "External link, from a quiz", make: function () { return scene({ doc: TW + "harmonic-model", away: away("external", { doc: TW + "harmonic-model", lang: "en", ver: null, member: true, sec: null, at: "twenty--nodal" }, "https://tidesandcurrents.noaa.gov/harcon.html") }); } }
  ];
  var BY = {};
  PRESETS.forEach(function (p) { BY[p.key] = p; });

  function pageOf(s) {
    if (s.away) return s.away.kind;
    var d = RD.docs[s.doc];
    return d && d.loose ? "loose" : "chapter";
  }
  function themeOf(s) { return s.themeChoice === "system" ? s.os : s.themeChoice; }
  /* What a preset fixes. This canvas's presets are quiz states, so where the page is scrolled to, whether the chrome has
     hidden on scroll, and the chapter's reading state (finished once its end is in view) are left out: reading on from
     where a preset landed keeps it pressed; a click on the quiz, another chapter or language, or signing in does not. */
  function sig(s) {
    var page = pageOf(s);
    if (s.away) return page + "|" + s.away.detail + "|" + (s.away.from ? s.away.from.doc : "");
    return [page, s.doc, s.lang, s.ver || RD.newest(s.doc, s.lang), s.member, s.panel || "", s.status, s.prompt,
      s.resumed, s.verFail, s.os, s.os === "dark" ? s.themeChoice : "", quizSig(s)].join("|");
  }
  /* The quiz's part of a scene: every item's state (without the send ids), the saved attempts and Sign in to save. */
  function quizSig(s) {
    var qz = s.qz || {}, keys = Object.keys(qz).sort();
    var items = keys.map(function (k) {
      var st = qz[k];
      return k + "=" + [st.ph, (st.sel || []).slice().sort().join("+"), (st.blanks || []).map(function (v) { return RD.quiz.norm(v); }).join("+"), st.self, st.empty, st.save === "saving" ? "saved" : st.save, st.later].join("/");
    });
    var sg = s.qsign || {};
    return items.join(";") + "#" + (s.hist || []).length + "#" + (sg.at || "") + (sg.closed ? "x" : "");
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
    var s = BY[key || "qopen"].make();
    s.themeChoice = s.themeChoice || (device && device.themeChoice) || "system";
    s.size = (device && device.size) || 3;
    s.preset = key || "qopen";
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
        resumed: resumed, verFail: false, sec: id || null, jump: jump(id, 0), away: null, qz: {}, qsign: { at: null, closed: false } });
    }
    return {
      open: function (key, id) { openDoc(key, { id: id }); },
      lang: function (l) {
        var s = S();
        if (l === s.lang) return;
        var to = landing(s.doc, s.lang, s.ver, s.sec, l, null);
        put({ lang: l, ver: null, panel: null, resumed: false, prompt: false, hold: null, jump: jump(to, 0), sec: to, qz: {}, qsign: { at: null, closed: false } });
      },
      version: function (n) {
        var s = S();
        var v = n === RD.newest(s.doc, s.lang) ? null : n;
        put({ ver: v, panel: null, resumed: false, prompt: false, hold: null, jump: jump(null, 0), sec: null, qz: {}, qsign: { at: null, closed: false } });
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
      away: function (kind, detail, at) {
        var s = S();
        put({ away: away(kind, { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec, at: at || null }, detail || ""), panel: null });
      },
      back: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: f.member, panel: null, chrome: "shown", status: "ready", resumed: false, sec: f.sec, jump: jump(f.at || f.sec, 0) });
      },
      signedIn: function () {
        var s = S(), f = (s.away && s.away.from) || FROM;
        /* signing in reloads the page: what was answered signed out was never saved, and nothing merges (S3) */
        put({ away: null, doc: f.doc, lang: f.lang, ver: f.ver, member: true, panel: null, chrome: "shown", status: "ready", prompt: false, resumed: false, sec: f.sec, jump: jump(f.at || f.sec, 0), qz: {}, qsign: { at: null, closed: false } });
      },
      retry: function () {
        var id = (S().loadId || 0) + 1;
        put({ status: "loading", loadId: id });
        setTimeout(function () {
          if (comp.state.loadId === id && comp.state.status === "loading") comp.setState({ status: "ready", jump: jump(null, 0) });
        }, 900);
      },
      prompt: function (v) { put({ prompt: !!v }); },
      /* One quiz action from a block (job 04-quiz). A member's attempt is saved in the background: the answer lands only
         on the attempt that started it, so a preset pressed mid-send never receives it. */
      quiz: function (block, itemId, a, qv) {
        var s = S();
        if (!a || a.t === "none") return;
        if (a.t === "signin") {
          put({ away: away("signin", { doc: s.doc, lang: s.lang, ver: s.ver, member: s.member, sec: s.sec, at: block.id + "--" + itemId }, ""), panel: null });
          return;
        }
        var r = RD.quiz.dispatch({ qz: s.qz, hist: s.hist, sign: s.qsign, seq: s.qseq }, qv, block, itemId, a, s.member);
        put({ qz: r.bundle.qz, hist: r.bundle.hist, qsign: r.bundle.sign, qseq: r.bundle.seq });
        if (r.send) {
          /* a preset pressed mid-send starts another scene (pick bumps loadId): the answer is dropped there */
          var send = r.send, load = s.loadId || 0;
          setTimeout(function () {
            if ((comp.state.loadId || 0) !== load) return;
            var n = RD.quiz.land({ qz: comp.state.qz, hist: comp.state.hist }, send, "saved");
            comp.setState({ qz: n.qz, hist: n.hist });
          }, 650);
        }
      },
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
      onPrompt: a.prompt, onFromTop: a.fromTop, onDismissResume: a.dismissResume,
      quiz: { qz: s.qz, hist: s.hist, sign: s.qsign, seq: s.qseq }, onQuiz: a.quiz
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

  var THEMES = [["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"], ["system", "System"]];
  var SIZES = [[1, "Size 1"], [3, "Size 3"], [5, "Size 5"]];
  function extras(comp, a) {
    var s = comp.state;
    return {
      hasExtra: true, extraLabel: "· theme:",
      extra: THEMES.map(function (t) { return { label: t[1], pressed: s.themeChoice === t[0], pick: function () { a.theme(t[0]); } }; }),
      hasExtra2: true, extra2Label: "· text size:",
      extra2: SIZES.map(function (z) { return { label: z[1], pressed: s.size === z[0], pick: function () { a.size(z[0]); } }; })
    };
  }
  function bar(comp, a, pageKeys) {
    var s = comp.state, cur = pageOf(s);
    return PAGES.filter(function (p) { return !pageKeys || pageKeys.indexOf(p.key) >= 0; }).map(function (p) {
      var keys = PRESETS.filter(function (x) { return x.page === p.key; }).map(function (x) { return x.key; });
      var on = p.key === cur ? pressedKey(s, keys) : null;
      var g = {
        key: p.key, name: p.name, off: p.key !== cur, cls: p.key !== cur ? "pb-group is-off" : "pb-group",
        only: keys.length === 1, hasExtra: false, extraLabel: "", extra: [], hasExtra2: false, extra2Label: "", extra2: [],
        presets: keys.map(function (k) { return { key: k, label: BY[k].label, pressed: on === k, pick: function () { a.pick(k); } }; })
      };
      if (p.key === "chapter" || p.key === "loose") Object.assign(g, extras(comp, a));
      return g;
    });
  }

  RD.flow = { PRESETS: PRESETS, PAGES: PAGES, BY: BY, initial: initial, api: api, readerProps: readerProps, awayProps: awayProps,
    bar: bar, extras: extras, pageOf: pageOf, themeOf: themeOf, pressedKey: pressedKey, scene: scene, jump: jump, play: play };
})();
