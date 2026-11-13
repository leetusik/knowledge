/* Canvas only, never built: the legacy reader's sample library and helpers. It extends the signed reader's data
   (reader.js, copied unchanged) with the legacy books and documents this job draws, and turns legacydocs.js's lines
   into blocks the LegacyDoc board draws as markup. In the product the document is a sandboxed iframe the parent cannot
   read: the parent knows only the metadata (title, versions, languages, address) and the bridge's messages. */
(function () {
  "use strict";
  var RD = window.RD, LG = (window.LG = window.LG || {});
  var HOST = "[host]";

  /* ---------- the line format → blocks ---------- */
  function runs(s) {
    var out = [], re = /«([^»]+)»|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g, last = 0, m;
    function text(v) { if (v) out.push({ v: v, isText: true, isCode: false, isB: false, isA: false, href: "", to: "" }); }
    while ((m = re.exec(s))) {
      text(s.slice(last, m.index));
      if (m[1] !== undefined) out.push({ v: m[1], isText: false, isCode: true, isB: false, isA: false, href: "", to: "" });
      else if (m[2] !== undefined) out.push({ v: m[2], isText: false, isCode: false, isB: true, isA: false, href: "", to: "" });
      else {
        var to = m[4];
        out.push({ v: m[3], isText: false, isCode: false, isB: false, isA: true, to: to, href: to.charAt(0) === "#" ? to : "#top",
          kind: to.charAt(0) === "#" ? "anchor" : /^https:\/\//.test(to) ? "ext" : "app" });
      }
      last = re.lastIndex;
    }
    text(s.slice(last));
    return out;
  }
  function flags(k) {
    var f = { k: k };
    ["h1", "meta", "h2", "h3", "p", "ul", "box", "code", "art", "table", "quiz", "sources"].forEach(function (x) {
      f["is" + x.charAt(0).toUpperCase() + x.slice(1)] = x === k;
    });
    return f;
  }
  LG.parse = function (lines) {
    var out = [], i = 0, cur = null;
    function push(b) { out.push(b); cur = null; return b; }
    while (i < lines.length) {
      var l = lines[i];
      var h = /^(#{1,3}) (.*?)(?: \{#([\w-]+)\})?$/.exec(l);
      if (/^:::(code|art)/.test(l)) {
        var head = l.slice(3).split(" "), kind = head[0], body = [];
        i++;
        while (i < lines.length && lines[i] !== ":::") { body.push(lines[i]); i++; }
        var b = flags(kind);
        b.lang = head[1] || ""; b.title = head.slice(2).join(" "); b.hasTitle = !!b.title;
        b.text = body.join("\n"); b.cols = body.reduce(function (n, x) { return Math.max(n, x.length); }, 0);
        push(b);
      } else if (h) {
        var hb = flags(h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3");
        hb.text = h[2]; hb.id = h[3] || ""; hb.runs = runs(h[2]);
        push(hb);
      } else if (/^:: /.test(l)) {
        var mb = flags("meta"); mb.text = l.slice(3); push(mb);
      } else if (/^- /.test(l)) {
        if (!cur || !cur.isUl) { cur = flags("ul"); cur.items = []; out.push(cur); }
        cur.items.push({ runs: runs(l.slice(2)) });
      } else if (/^> /.test(l)) {
        var bb = flags("box"); bb.runs = runs(l.slice(2)); push(bb);
      } else if (/^\|/.test(l)) {
        if (!cur || !cur.isTable) { cur = flags("table"); cur.head = null; cur.rows = []; out.push(cur); }
        var cells = l.replace(/^\||\|$/g, "").split("|");
        if (/^-+$/.test(cells[0])) { i++; continue; }
        if (!cur.head) cur.head = cells.map(function (c) { return { runs: runs(c) }; });
        else cur.rows.push({ cells: cells.map(function (c) { return { runs: runs(c) }; }) });
      } else if (/^\?\? /.test(l)) {
        if (!cur || !cur.isQuiz) { cur = flags("quiz"); cur.items = []; out.push(cur); }
        var parts = l.slice(3).split(" | ");
        cur.items.push({ id: parts[0], q: parts[1], options: [], ok: "", bad: "" });
      } else if (/^\?[-+=!] /.test(l)) {
        var it = cur.items[cur.items.length - 1], t = l.slice(3);
        if (l.charAt(1) === "=") it.ok = t;
        else if (l.charAt(1) === "!") it.bad = t;
        else it.options.push({ id: it.id + "-" + it.options.length, text: t, right: l.charAt(1) === "+" });
      } else if (/^@@ /.test(l)) {
        if (!cur || !cur.isSources) { cur = flags("sources"); cur.items = []; out.push(cur); }
        var sp = l.slice(3).split(" | ");
        cur.items.push({ title: sp[0], url: sp[1], to: sp[1], pub: sp[2] || "" });
      } else if (l.trim()) {
        var pb = flags("p"); pb.runs = runs(l); push(pb);
      }
      i++;
    }
    return out;
  };
  var cache = {};
  LG.blocks = function (body) {
    if (!cache[body]) cache[body] = LG.src[body] ? LG.parse(LG.src[body]) : [];
    return cache[body];
  };
  /* The ids in document order: what the bridge reports as anchors (the nearest preceding id). */
  LG.ids = function (body) {
    return LG.blocks(body).filter(function (b) { return b.id; }).map(function (b) { return b.id; });
  };

  /* ---------- the sample library: legacy books and documents ---------- */
  function variant(newest, versions, from) {
    var v = { newest: newest, versions: {} };
    if (from) v.from = from;
    versions.forEach(function (x) { v.versions[x[0]] = { title: x[1], date: x[2], src: "", body: x[3] }; });
    return v;
  }
  /* Tidewater's chapter 7: already legacy in the signed reader's data; this gives it its metadata. Self-darkening. */
  var tw = RD.docs["tidewater/datums"];
  tw.variants = { en: variant(1, [[1, tw.title, "3 Oct 2026", "datums-en-1"]]) };
  tw.look = "auto";

  RD.books["orchard-guide"] = { title: "The orchard maintainer guide", project: "orchard", slug: "maintainer-guide",
    chapters: ["orchard-guide/overview", "orchard-guide/job-model", "orchard-guide/harvester", "orchard-guide/pruning"] };
  [["overview", "Orchard in one page: what it schedules and why", "orchard-1"],
   ["job-model", "Seeds, trees and harvests: the job model", "orchard-2"],
   ["harvester", "The harvester: collecting results without losing any", "orchard-3"],
   ["pruning", "Pruning: retention, cleanup and the nightly sweep", "orchard-4"]].forEach(function (c, i) {
    RD.docs["orchard-guide/" + c[0]] = { book: "orchard-guide", key: c[0], n: i + 1, format: "legacy", look: "light",
      variants: { en: variant(1, [[1, c[1], "21 Jul 2026", c[2]]]) } };
  });

  RD.books["lantern-phases"] = { title: "lantern, phase by phase", project: "lantern", slug: "phases",
    chapters: ["lantern-phases/p8", "lantern-phases/p9", "lantern-phases/p17-p18", "lantern-phases/p24"] };
  RD.docs["lantern-phases/p8"] = { book: "lantern-phases", key: "p8", n: 1, format: "legacy", look: "light",
    variants: {
      en: variant(2, [[2, "P8: Offline edits and the outbox", "14 Sep 2026", "p8-en-2"], [1, "P8: Offline edits and the outbox", "2 Aug 2026", "p8-en-1"]]),
      ko: variant(1, [[1, "P8: 오프라인 편집과 아웃박스", "20 Aug 2026", "p8-ko-1"]], { lang: "en", v: 1 })
    } };
  [["p9", "P9: Search that works offline", "p9-en-1"],
   ["p17-p18", "P17–P18: Sharing a notebook, and the permissions it needed", "p17-en-1"],
   ["p24", "P24: Moving attachments out of the notes", "p24-en-1"]].forEach(function (c, i) {
    RD.docs["lantern-phases/" + c[0]] = { book: "lantern-phases", key: c[0], n: i + 2, format: "legacy", look: "light",
      variants: { en: variant(1, [[1, c[1], "2 Aug 2026", c[2]]]) } };
  });

  RD.docs["doc/lantern/plain-files"] = { loose: true, project: "lantern", key: "plain-files", format: "legacy", look: "light",
    variants: { en: variant(2, [[2, "Why lantern keeps notes as plain files", "12 Sep 2026", "plain-files-2"], [1, "Why lantern keeps notes as plain files", "30 Jun 2026", "plain-files-1"]]) } };
  RD.docs["doc/ferry-board/timetable-feed"] = { loose: true, project: "ferry-board", key: "timetable-feed", format: "legacy", look: "light",
    variants: { en: variant(3, [[3, "Ferry board, part 2: reading the timetable feed", "8 Oct 2026", "ferry-3"], [2, "Ferry board, part 2: reading the timetable feed", "19 Sep 2026", "ferry-2"], [1, "Ferry board, part 2: reading the timetable feed", "2 Sep 2026", "ferry-1"]]) } };
  RD.docs["doc/subway-times/arrival-feed"] = { loose: true, project: "subway-times", key: "arrival-feed", format: "legacy", look: "auto",
    variants: { en: variant(1, [[1, "How the arrival board reads the Seoul 지하철 feed", "11 Sep 2026", "arrivals-en-1"]]) } };
  /* A private document: its address reads exactly as a missing one (404, never 403). */
  RD.docs["doc/harbor-ops/runbook"] = { loose: true, project: "harbor-ops", key: "runbook", private: true };

  /* Reading state: Tidewater 1–10 finished (the signed reader's); orchard's chapter 1 finished, chapter 2 started. */
  RD.progress["orchard-guide/overview"] = { s: "finished", on: 1 };
  /* The reader left chapter 2 at the start of its "Trees" section, 29% through on their phone. The bridge's fraction depends
     on the layout, so the same section opens a few points further on a wider screen; the furthest point kept is the
     larger of the two, so a screen's pill, chapter bar and Contents row agree. */
  RD.progress["orchard-guide/job-model"] = { s: "started", pct: 29, at: "trees", frac: 0.29 };

  /* ---------- addresses ---------- */
  LG.HOST = HOST;
  LG.path = function (key) {
    var d = RD.docs[key];
    if (!d) return "/@quillwork/" + key;
    if (d.loose) return "/@quillwork/" + d.project + "/" + d.key;
    var b = RD.books[d.book];
    return "/@quillwork/" + (b ? b.project : d.book) + "/books/" + ((b && b.slug) || d.book) + "/" + d.key;
  };
  /* The page's address; the raw relay is the same path plus /raw, or /versions/{v}/raw for an older version. */
  /* A language other than the original adds ?lang=, as the reader's addresses do; each language keeps its own chain. */
  LG.addr = function (key, ver, raw, lang) {
    var p = LG.path(key), L = lang || "en", newest = RD.newest(key, L), old = ver && ver !== newest;
    var q = L !== "en" ? "lang=" + L : "";
    if (raw) return HOST + p + (old ? "/versions/" + ver : "") + "/raw" + (q ? "?" + q : "");
    if (old) q = (q ? q + "&" : "") + "v=" + ver;
    return HOST + p + (q ? "?" + q : "");
  };
  /* A same-app path from inside a framed document → the doc it routes to (the parent validates it). */
  LG.route = function (path) {
    var hit = null;
    Object.keys(RD.docs).forEach(function (k) { if (!hit && !RD.docs[k].private && LG.path(k) === path) hit = k; });
    return hit;
  };
  LG.isLegacy = function (key) { var d = RD.docs[key]; return !!(d && d.format === "legacy"); };
  /* The variant being read: its body, look and metadata, or null (missing or private: not found). */
  LG.read = function (key, lang, ver) {
    var d = RD.docs[key];
    if (!d || d.private || d.format !== "legacy" || !d.variants) return null;
    var r = RD.read(key, lang, ver);
    var va = d.variants[r.lang], rec = va.versions[r.version];
    var stale = !!(r.from && RD.newest(key, r.from.lang) > r.from.v);
    return { r: r, body: rec.body, look: d.look || "light", stale: stale,
      srcLang: r.from ? r.from.lang : "", srcFrom: r.from ? r.from.v : 0, srcNewest: r.from ? RD.newest(key, r.from.lang) : 0 };
  };
  /* The KO/EN switch keeps the place: the same id if the other language has it, else the nearest preceding id that it
     has, else the fraction. */
  LG.landing = function (key, fromLang, fromVer, anchor, toLang, toVer) {
    var a = LG.read(key, fromLang, fromVer), b = LG.read(key, toLang, toVer);
    if (!a || !b || !anchor) return null;
    var have = {}, ids = LG.ids(a.body), i = ids.indexOf(anchor);
    LG.ids(b.body).forEach(function (x) { have[x] = true; });
    for (; i >= 0; i--) if (have[ids[i]]) return ids[i];
    return null;
  };
})();
