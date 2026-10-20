/* The reader canvas's sample data and a small native-markdown reader. (Job 04-quiz adds the `quiz` fence, RD.quiz and
   the quiz data below; everything else is the signed reader's file, unchanged.)
   Canvas only: the product parses on the server (remark + the native plugin) and never in the
   browser. This file turns the sample chapters into plain block data; every board draws that
   data as markup. */
(function () {
  "use strict";
  var RD = (window.RD = window.RD || {});
  var cache = {};

  /* ---------- references ---------- */
  function resolve(to) {
    if (!to) return { kind: "missing" };
    if (to.charAt(0) === "#") return { kind: "anchor", id: to.slice(1) };
    if (to.indexOf("chapter:") === 0) {
      var rest = to.slice(8), hash = "", q = rest.indexOf("#");
      if (q >= 0) { hash = rest.slice(q + 1); rest = rest.slice(0, q); }
      rest = rest.split("?")[0];
      var d = RD.docs && RD.docs[rest];
      return d && !d.private ? { kind: "chapter", doc: rest, id: hash } : { kind: "missing" };
    }
    if (to.indexOf("doc:") === 0) {
      var key = "doc/" + to.slice(4);
      var dd = RD.docs && RD.docs[key];
      return dd && !dd.private ? { kind: "doc", doc: key } : { kind: "missing" };
    }
    if (/^https:\/\//.test(to)) return { kind: "ext", url: to, host: to.replace(/^https:\/\//, "").replace(/\/$/, "") };
    return { kind: "missing" };
  }

  /* ---------- Hangul runs inside other-language text ----------
     A run is one Hangul word, or several joined only by spaces: "지식 시스템의 내부" is one run. Punctuation and Latin
     around it stay outside. Inside text whose language is not Korean, each run renders as <span lang="ko">, so the
     :lang(ko) rules keep it whole (keep-all). Never inside code. */
  var HANGUL_RUN = /\p{Script=Hangul}+(?:[ \u00A0]+\p{Script=Hangul}+)*/gu;
  function koParts(text, wrap) {
    var s = String(text == null ? "" : text), out = [], last = 0, m;
    function plain(v) { if (v) out.push({ v: v, isKo: false, isPlain: true }); }
    if (wrap) {
      HANGUL_RUN.lastIndex = 0;
      while ((m = HANGUL_RUN.exec(s))) { plain(s.slice(last, m.index)); out.push({ v: m[0], isKo: true, isPlain: false }); last = m.index + m[0].length; }
    }
    plain(s.slice(last));
    if (!out.length) out.push({ v: "", isKo: false, isPlain: true });
    return out;
  }

  /* ---------- inline runs ---------- */
  function run(kind, v, extra, wrap) {
    var r = { v: v, kind: kind, isText: kind === "text", isKo: kind === "ko", isEm: kind === "em", isStrong: kind === "strong", isDel: kind === "del",
      isCode: kind === "code", isLink: kind === "link", isExt: kind === "ext", isMissing: kind === "missing", to: "", href: "#top" };
    r.parts = kind === "code" ? [{ v: v, isKo: false, isPlain: true }] : koParts(v, wrap);
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }
  /* wrap: true when the surrounding text is not Korean (Hangul runs then get lang="ko") */
  function inline(s, wrap) {
    var out = [], buf = "", i = 0, m;
    function flush() {
      if (!buf) return;
      koParts(buf, wrap).forEach(function (p) { out.push(run(p.isKo ? "ko" : "text", p.v)); });
      buf = "";
    }
    while (i < s.length) {
      var rest = s.slice(i);
      if ((m = /^`([^`]+)`/.exec(rest))) { flush(); out.push(run("code", m[1])); i += m[0].length; continue; }
      if ((m = /^\*\*([^*]+)\*\*/.exec(rest))) { flush(); out.push(run("strong", m[1], null, wrap)); i += m[0].length; continue; }
      if ((m = /^~~([^~]+)~~/.exec(rest))) { flush(); out.push(run("del", m[1], null, wrap)); i += m[0].length; continue; }
      if ((m = /^\*([^*\s][^*]*)\*/.exec(rest))) { flush(); out.push(run("em", m[1], null, wrap)); i += m[0].length; continue; }
      if ((m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest))) {
        flush();
        var ref = resolve(m[2]);
        if (ref.kind === "missing") out.push(run("missing", m[1], null, wrap));
        else if (ref.kind === "ext") out.push(run("ext", m[1], { to: m[2], host: ref.host }, wrap));
        else out.push(run("link", m[1], { to: m[2], href: ref.kind === "anchor" ? "#" + ref.id : "#top" }, wrap));
        i += m[0].length; continue;
      }
      buf += s.charAt(i); i++;
    }
    flush();
    return out;
  }

  /* ---------- code tokens ---------- */
  var PY = "def return for in if elif else with as import from class global None True False not and or try except finally raise while pass lambda yield is async await".split(" ");
  var SH = "if then fi for do done in export".split(" ");
  var SQL = "PRAGMA SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE BEGIN COMMIT".split(" ");
  function tokenLine(line, lang, st) {
    var out = [], i = 0, m;
    function push(c, v) {
      var last = out[out.length - 1];
      if (last && last.c === c) last.v += v; else out.push({ c: c, v: v });
    }
    if (lang === "text" || !lang) { out.push({ c: "", v: line }); return out; }
    if (st.tq) {
      var j = line.indexOf(st.tq);
      if (j < 0) { push("t-st", line); return out; }
      push("t-st", line.slice(0, j + 3)); i = j + 3; st.tq = null;
    }
    var kws = lang === "python" ? PY : lang === "sql" ? SQL : SH;
    var first = true;
    while (i < line.length) {
      var rest = line.slice(i);
      if (lang === "sql" && (m = /^--.*/.exec(rest))) { push("t-cm", m[0]); break; }
      if (lang !== "sql" && (m = /^#.*/.exec(rest)) && (lang !== "bash" || i === 0 || /\s/.test(line.charAt(i - 1)))) { push("t-cm", m[0]); break; }
      if (lang === "python" && (m = /^("""|''')/.exec(rest))) {
        var q = m[1], k = rest.indexOf(q, 3);
        if (k < 0) { push("t-st", rest); st.tq = q; break; }
        push("t-st", rest.slice(0, k + 3)); i += k + 3; continue;
      }
      if ((m = /^[rfb]?("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/.exec(rest))) { push("t-st", m[0]); i += m[0].length; first = false; continue; }
      if ((m = /^\d+(\.\d+)?/.exec(rest)) && !/[\w.]/.test(line.charAt(i - 1) || "")) { push("t-nu", m[0]); i += m[0].length; first = false; continue; }
      if ((m = /^[A-Za-z_][\w.-]*/.exec(rest)) && lang === "bash") {
        var w = m[0];
        push(kws.indexOf(w) >= 0 ? "t-kw" : first ? "t-fn" : "", w); i += w.length; first = false; continue;
      }
      if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
        var word = m[0], after = rest.slice(word.length);
        push(kws.indexOf(word) >= 0 ? "t-kw" : /^\s*\(/.test(after) ? "t-fn" : "", word); i += word.length; continue;
      }
      if (lang === "bash" && rest.charAt(0) === "$" && i === 0) { push("t-cm", "$"); i++; continue; }
      push("", rest.charAt(0)); i++;
    }
    return out;
  }
  function codeLines(text, lang) {
    var st = {};
    return text.split("\n").map(function (l) { return { toks: tokenLine(l, lang, st) }; });
  }

  /* ---------- blocks ---------- */
  var FENCE = /^(```|~~~)\s*([\w-]*)\s*(?:#([\w-]+))?\s*(?:title="([^"]*)")?\s*$/;
  var HEAD = /^(#{2,4})\s+(.*?)(?:\s+\{#([\w-]+)\})?\s*$/;
  var LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  function isStart(l) { return FENCE.test(l) || HEAD.test(l) || /^>/.test(l) || /^\|/.test(l) || LIST.test(l) || /^---\s*$/.test(l); }

  function parseList(lines, o) {
    var root = { ordered: /^\s*\d+\./.test(lines[0]), items: [] }, cur = null;
    lines.forEach(function (l) {
      var m = LIST.exec(l);
      if (!m) { if (cur) { var tgt = cur.sub ? cur.sub.items[cur.sub.items.length - 1] : cur; tgt.text += " " + l.trim(); } return; }
      var deep = m[1].length >= 2, item = { text: m[3], sub: null };
      if (!deep || !cur) { cur = item; root.items.push(item); }
      else { if (!cur.sub) cur.sub = { ordered: /\d/.test(m[2]), items: [] }; cur.sub.items.push(item); }
    });
    function fin(list) {
      return { ordered: list.ordered, items: list.items.map(function (it) {
        var sub = it.sub ? fin(it.sub) : null;
        return { runs: inline(it.text, o.wrap), sub: sub, hasSub: !!sub, subOrdered: !!(sub && sub.ordered), subUnordered: !!(sub && !sub.ordered) };
      }) };
    }
    return fin(root);
  }

  function splitRow(l) {
    var s = l.trim().replace(/^\|/, "").replace(/\|$/, "");
    return s.split("|").map(function (c) { return c.trim(); });
  }

  /* A diagram block's body is YAML; the canvas reads only the top-level kind, title and caption (its text). */
  function yamlTop(body) {
    var o = {};
    body.forEach(function (l) {
      var m = /^([A-Za-z_]\w*):\s*(.*)$/.exec(l);
      if (!m) return;
      var v = m[2].trim();
      if (/^".*"$/.test(v)) v = v.slice(1, -1).replace(/\\"/g, '"');
      o[m[1]] = v;
    });
    return o;
  }

  /* ---------- the quiz block (job 04-quiz) ----------
     A `quiz` fence's body is YAML (S2): title?, items[{id, type, ...}]. The canvas reads it with a small YAML subset
     (maps, lists of maps, flow lists, quoted scalars); the product parses it on the server. */
  function yamlParse(lines) {
    var toks = [];
    lines.forEach(function (raw) {
      if (!raw.trim() || /^\s*#/.test(raw)) return;
      var ind = /^ */.exec(raw)[0].length;
      toks.push({ ind: ind, s: raw.slice(ind) });
    });
    var i = 0;
    function scalar(v) {
      v = String(v).trim();
      if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(",").map(function (x) { return scalar(x); }).filter(function (x) { return x !== ""; });
      if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
      return v;
    }
    function isItem(t) { return /^-( |$)/.test(t.s); }
    function block(ind) { return isItem(toks[i]) ? list(ind) : map(ind); }
    function map(ind) {
      var o = {};
      while (i < toks.length && toks[i].ind === ind && !isItem(toks[i])) {
        var m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(toks[i].s);
        i++;
        if (!m) continue;
        if (m[2] === "") o[m[1]] = i < toks.length && toks[i].ind > ind ? block(toks[i].ind) : null;
        else o[m[1]] = scalar(m[2]);
      }
      return o;
    }
    function list(ind) {
      var a = [];
      while (i < toks.length && toks[i].ind === ind && isItem(toks[i])) {
        var rest = toks[i].s.replace(/^-\s?/, "");
        if (/^[A-Za-z_][\w-]*:/.test(rest)) { toks[i] = { ind: ind + 2, s: rest }; a.push(map(ind + 2)); }
        else { i++; a.push(scalar(rest)); }
      }
      return a;
    }
    return toks.length ? block(toks[0].ind) : {};
  }
  var KEYS = "ABCDEF";
  function quizBlock(body, id, o) {
    var y = yamlParse(body) || {};
    var items = (y.items || []).map(function (it, idx) {
      var type = it.type, b = { id: it.id, type: type, n: idx + 1, isChoice: type === "choice", isRecall: type === "recall", isCloze: type === "cloze" };
      b.explain = inline(it.explain || "", o.wrap);
      b.hasExplain = !!it.explain;
      if (type === "choice") {
        b.answer = [].concat(it.answer || []);
        b.multi = b.answer.length > 1;
        b.prompt = inline(it.prompt || "", o.wrap);
        b.options = (it.options || []).map(function (op, j) { return { id: op.id, key: KEYS.charAt(j), runs: inline(op.text || "", o.wrap) }; });
      } else if (type === "recall") {
        b.prompt = inline(it.prompt || "", o.wrap);
        b.answerRuns = inline(it.answer || "", o.wrap);
      } else if (type === "cloze") {
        var src = it.text || "", re = /\{\{([^}]+)\}\}/g, last = 0, m, n = 0, segs = [];
        /* The characters that touch a blank's end (a comma, a full stop, a Korean particle) stay on its line: they ride in
           the blank's no-wrap group, so a line never starts with "," or "에". */
        var glue = function (seg, text) {
          var t = /^[^\s`*_\[\]~{}<>]+/.exec(text);
          if (seg && seg.isBlank && t) { seg.tail = t[0]; return text.slice(t[0].length); }
          return text;
        };
        while ((m = re.exec(src))) {
          var before = glue(segs[segs.length - 1], src.slice(last, m.index));
          if (before) segs.push({ isText: true, isBlank: false, runs: inline(before, o.wrap) });
          n += 1;
          segs.push({ isText: false, isBlank: true, n: n, accepted: m[1].split("|").map(function (x) { return x.trim(); }) });
          last = m.index + m[0].length;
        }
        var rest = glue(segs[segs.length - 1], src.slice(last));
        if (rest) segs.push({ isText: true, isBlank: false, runs: inline(rest, o.wrap) });
        b.segs = segs;
        b.blanks = n;
        b.accepted = segs.filter(function (s) { return s.isBlank; }).map(function (s) { return s.accepted; });
      }
      return b;
    });
    return { k: "quiz", isQuiz: true, id: id || "quiz", title: y.title || "", titleParts: koParts(y.title || "", o.wrap), hasTitle: !!y.title,
      items: items, count: items.length };
  }

  /* o: { wrap: wrap Hangul runs (the text is not Korean), native: typed fences and {#id} are live (plain md: inactive) } */
  function parseBlocks(src, o) {
    o = o || { wrap: true, native: true };
    var lines = src.replace(/\r/g, "").split("\n"), out = [], i = 0, n = lines.length;
    while (i < n) {
      var l = lines[i], m;
      if (!l.trim()) { i++; continue; }
      if ((m = FENCE.exec(l))) {
        var body = [], close = m[1]; i++;
        while (i < n && lines[i].trim() !== close) { body.push(lines[i]); i++; }
        i++;
        var lang = m[2] || "", art = lang === "text";
        if (lang === "quiz" && o.native) {
          out.push(quizBlock(body, m[3], o));
          continue;
        }
        if (lang === "diagram" && o.native) {
          var y = yamlTop(body);
          out.push({ k: "diagram", isDiagram: true, id: m[3] || "", kind: y.kind || "flow", title: y.title || "",
            titleParts: koParts(y.title || "", o.wrap), caption: inline(y.caption || "", o.wrap), hasCaption: !!y.caption });
          continue;
        }
        out.push({ k: "code", isCode: true, lang: lang, langLabel: lang || "", title: m[4] || "", hasTitle: !!m[4], art: art,
          lines: codeLines(body.join("\n"), lang) });
        continue;
      }
      if ((m = HEAD.exec(l))) {
        var lv = m[1].length, htext = o.native || !m[3] ? m[2] : m[2] + " {#" + m[3] + "}";
        out.push({ k: "h", isH2: lv === 2, isH3: lv === 3, isH4: lv === 4, level: lv, text: htext, parts: koParts(htext, o.wrap),
          id: (o.native && m[3]) || slug(htext) });
        i++; continue;
      }
      if (/^---\s*$/.test(l)) { out.push({ k: "hr", isHr: true }); i++; continue; }
      if (/^>/.test(l)) {
        var inner = [];
        while (i < n && /^>/.test(lines[i])) { inner.push(lines[i].replace(/^>\s?/, "")); i++; }
        var c = /^\[!(\w+)\]([-+]?)\s*(.*)$/.exec(inner[0] || "");
        if (c) {
          var type = c[1].toUpperCase();
          if (["NOTE", "IMPORTANT", "WARNING", "CAUTION", "SKIP", "DEFINITION"].indexOf(type) < 0) type = "NOTE";
          var cb = parseBlocks(inner.slice(1).join("\n"), o);
          out.push({ k: "callout", isCallout: true, type: type, typeWord: type.charAt(0) + type.slice(1).toLowerCase(),
            tone: type.toLowerCase(), title: c[3] || "", titleParts: koParts(c[3] || "", o.wrap), hasTitle: !!c[3], collapsed: c[2] === "-", body: cb });
        } else {
          out.push({ k: "quote", isQuote: true, body: parseBlocks(inner.join("\n"), o) });
        }
        continue;
      }
      if (/^\|/.test(l)) {
        var rows = [];
        while (i < n && /^\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        var head = rows[0], aligns = (rows[1] || []).map(function (a) {
          return /^:-+:$/.test(a) ? "c" : /-+:$/.test(a) ? "r" : "l";
        });
        var data = rows.slice(2);
        var cell = function (txt, j) { var a = aligns[j] || "l"; return { runs: inline(txt, o.wrap), cls: a === "r" ? "is-r" : a === "c" ? "is-c" : "" }; };
        out.push({ k: "table", isTable: true, cols: head.length, wide: head.length > 5, long: data.length > 12,
          head: head.map(function (h, j) { return { v: h, parts: koParts(h, o.wrap), cls: aligns[j] === "r" ? "is-r" : aligns[j] === "c" ? "is-c" : "" }; }),
          rows: data.map(function (r) { return { cells: r.map(cell) }; }), rowCount: data.length });
        continue;
      }
      if (LIST.test(l)) {
        var ls = [];
        while (i < n && lines[i].trim() && (LIST.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) { ls.push(lines[i]); i++; }
        var list = parseList(ls, o);
        out.push({ k: "list", isUl: !list.ordered, isOl: list.ordered, items: list.items });
        continue;
      }
      var para = [];
      while (i < n && lines[i].trim() && !(para.length && isStart(lines[i]))) { para.push(lines[i].trim()); i++; }
      out.push({ k: "p", isP: true, runs: inline(para.join(" "), o.wrap) });
    }
    return out;
  }

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "s"; }

  /* lang: the text's language (Hangul runs are wrapped unless it is "ko"); format: "native" (default) or "md" */
  RD.parse = function (src, lang, format) {
    var o = { wrap: (lang || "en") !== "ko", native: (format || "native") === "native" };
    var key = (o.wrap ? "w" : "k") + (o.native ? "n" : "m") + "|" + src;
    if (!cache[key]) cache[key] = parseBlocks(src, o);
    return cache[key];
  };
  RD.koParts = koParts;
  RD.toc = function (blocks) {
    var out = [];
    blocks.forEach(function (b) {
      if (b.k !== "h") return;
      if (b.level === 2) out.push({ id: b.id, text: b.text, subs: [] });
      else if (b.level === 3 && out.length) out[out.length - 1].subs.push({ id: b.id, text: b.text });
    });
    out.forEach(function (e) { e.hasSubs = e.subs.length > 0; e.href = "#" + e.id; e.subs.forEach(function (s) { s.href = "#" + s.id; }); });
    return out;
  };
  RD.sections = function (blocks) {
    return blocks.filter(function (b) { return b.k === "h" && b.level <= 3; }).map(function (b) { return { id: b.id, text: b.text }; });
  };
  RD.resolve = resolve;
  RD.yaml = yamlParse;
  RD.inline = inline;
  RD.codeLines = codeLines;


  /* ---------- book context, chapter states and list rows (the canvas's stand-in for the API) ---------- */
  RD.ctx = function (key) {
    var d = RD.docs[key];
    if (!d) return null;
    if (d.loose) return { loose: true, project: d.project, total: 0, n: 0 };
    var b = RD.books[d.book];
    if (!b) return { loose: true, project: d.book, total: 0, n: 0 };
    var i = b.chapters.indexOf(key);
    return { loose: false, bookKey: d.book, bookTitle: b.title, project: b.project, chapters: b.chapters, n: i + 1, total: b.chapters.length,
      prev: i > 0 ? b.chapters[i - 1] : null, next: i < b.chapters.length - 1 ? b.chapters[i + 1] : null };
  };
  RD.newest = function (key, lang) {
    var d = RD.docs[key];
    if (!d || !d.variants) return 1;
    return (d.variants[lang] || d.variants.en).newest;
  };
  /* none | started | unread | finished | updated (finished on a version older than the newest) */
  RD.stateOf = function (prog, key) {
    var p = prog && prog[key];
    if (!p) return "none";
    if (p.s === "finished") return (p.on || 1) < RD.newest(key, "en") ? "updated" : "finished";
    if (p.unread) return "unread";
    return "started";
  };
  /* Display titles never break at the hyphen of a compound ("write-ahead"): a WORD JOINER (U+2060) after each hyphen
     between two letters removes that break; overflow-wrap still breaks a compound wider than the column. */
  RD.display = function (t) { return String(t || "").replace(/(\p{L})-(?=\p{L})/gu, "$1-\u2060"); };
  RD.titleOf = function (key, lang) {
    var d = RD.docs[key];
    if (!d) return { text: "", lang: "en" };
    if (!d.variants) return { text: d.title, lang: "en" };
    var L = d.variants[lang] ? lang : "en";
    var va = d.variants[L];
    return { text: va.versions[va.newest].title, lang: L };
  };
  RD.rows = function (bookKey, cur, prog, member, lang) {
    return RD.books[bookKey].chapters.map(function (k) {
      var d = RD.docs[k], t = RD.titleOf(k, lang), p = (prog && prog[k]) || {};
      return { key: k, n: d.n, title: t.text, lang: t.lang, isCurrent: k === cur, isLegacy: d.format === "legacy",
        member: !!member, st: RD.stateOf(prog, k), pct: p.pct || 0, on: p.on || 0 };
    });
  };
  RD.finishedCount = function (bookKey, prog) {
    return RD.books[bookKey].chapters.filter(function (k) { var s = RD.stateOf(prog, k); return s === "finished" || s === "updated"; }).length;
  };

  /* A doc's variant at a version: title, summary, date, blocks and the facts the chrome needs. */
  RD.read = function (docKey, lang, v) {
    var d = RD.docs[docKey];
    if (!d || d.private || !d.variants) return null;
    var langs = Object.keys(d.variants);
    var L = d.variants[lang] ? lang : langs[0];
    var va = d.variants[L];
    var ver = v && va.versions[v] ? Number(v) : va.newest;
    var rec = va.versions[ver];
    var blocks = RD.parse(rec.src, L, d.format);
    return {
      doc: d, key: docKey, lang: L, langs: langs, version: ver, newest: va.newest, isOld: ver < va.newest,
      title: rec.title, summary: rec.summary || "", date: rec.date, blocks: blocks, toc: RD.toc(blocks), sections: RD.sections(blocks),
      from: va.from || null, versions: Object.keys(va.versions).map(Number).sort(function (a, b) { return b - a; }).map(function (n) {
        return { n: n, date: va.versions[n].date, from: va.versions[n].from || (va.from && n === 1 ? va.from : null) };
      })
    };
  };
})();

(function () {
  var d = {"books":{"maintainer-guide":{"title":"The knowledge maintainer guide","project":"knowledge","chapters":["maintainer-guide/what-it-is","maintainer-guide/internals","maintainer-guide/read-surfaces","maintainer-guide/shipping","maintainer-guide/why"]},"tidewater":{"title":"Tidewater, from the inside","project":"tidewater","chapters":["tidewater/what-it-predicts","tidewater/harmonic-model","tidewater/stations","tidewater/gauge-readings","tidewater/constituent-solver","tidewater/prediction-cache","tidewater/datums","tidewater/tide-table-api","tidewater/rendering-tables","tidewater/time-zones","tidewater/storm-surge","tidewater/alerts","tidewater/backfill","tidewater/testing","tidewater/deploying","tidewater/observability","tidewater/failure-stories","tidewater/performance","tidewater/differently","tidewater/reading-guide"]}},"docs":{"maintainer-guide/what-it-is":{"book":"maintainer-guide","key":"what-it-is","n":1,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"8 Aug 2026","title":"Knowledge: What It Is and How It Is Used","summary":"What a document is, who owns it, and the four doors that lead to the same files.","src":"## Background {#background}\n\nknowledge is a hosted library for the documents coding agents write about a codebase. An agent explains a change, publishes the explanation, and the people who own the code read it on the web or ask for it over MCP.\n\n### What a document is here {#what-a-document-is}\n\nA document is one file: a title, a date, tags, a body in markdown or HTML, and a version that only goes up. It belongs to a project, and the project belongs to an org.\n\n## One corpus, four doors {#four-doors}\n\nThe same files are reached four ways, and each door has its own contract:\n\n- the **write door**, the `/explain` skill an agent runs;\n- the **setup door**, which connects a repository or scaffolds a new one;\n- the **terminal door**, the CLI's agent contract;\n- the **agent door**, the MCP server.\n\n## Private by default, public on purpose {#private-by-default}\n\nEvery document starts private to its org. Publishing a project makes its documents readable by anyone with the link, and nothing else changes: the files, the versions and the search stay where they were."}}}}},"maintainer-guide/internals":{"book":"maintainer-guide","key":"internals","n":2,"format":"native","variants":{"en":{"newest":2,"versions":{"2":{"date":"12 Oct 2026","title":"Knowledge System Internals: The Content Plane, the Write Path, and the Contracts","summary":"Where a document actually lives, what happens in the milliseconds after an agent publishes one, and which contracts you may extend but must not break.","src":"## Background {#background}\n\nPhysically, this is a small system: one FastAPI process, one SQLite file, one Postgres database and a git repository. What makes it worth a chapter is **one decision made early and honoured everywhere since**. Everything below is downstream of it, so it is worth meeting before any code.\n\n> [!IMPORTANT] The one idea, before anything else\n> The files under `docs/` are the truth. The SQLite database is a *projection* of them that you are allowed to delete.\n\n### The two planes {#the-two-planes}\n\nThe process runs two planes at once, and knowing which one you are looking at is the first skill to acquire. The content plane holds documents, the search index and version rows; the accounts plane holds users, orgs, projects, keys and sessions.\n\n```diagram #two-planes\nkind: flow\ntitle: One FastAPI process, two planes\ncaption: \"The content plane is rebuilt from the files under `docs/` by `reindex()`. The accounts plane keeps users, orgs, keys and sessions in Postgres, and its checks run before the write lock.\"\ndirection: right\ngroups:\n  - {id: process, label: \"one FastAPI process, one uvicorn worker\", nodes: [content, accounts]}\nnodes:\n  - {id: content, label: Content plane, sub: \"SQLite · FTS5 · WAL · rebuilt from docs/\"}\n  - {id: accounts, label: Accounts plane, sub: \"Postgres · SQLAlchemy · Alembic\"}\n  - {id: files, label: \"docs/<project>/<date>-<slug>.md\", shape: store}\nedges:\n  - {from: files, to: content, label: \"reindex()\"}\n  - {from: accounts, to: files, label: \"async dependency, runs before the write lock\", style: dashed}\n```\n\n> [!NOTE]\n> With `DATABASE_URL` unset, the accounts plane is never created and every route behaves exactly like the single-token deployment. That dormancy is what lets a self-hosted copy run from the same code.\n\n### Two deployments, one codebase {#two-deployments}\n\nThere is no hosted fork and no production mode. The whole difference between a laptop and the hosted service is a handful of flags, each defaulting to the local behaviour:\n\n| Flag | Default | Type | Local install | Hosted | Read path | Write path | Since |\n|---|---|---|---|---|---|---|---|\n| `KB_REQUIRE_READ_AUTH` | false | bool | off | on | bearer required | unchanged | P12 |\n| `KB_GIT_PUSH` | false | bool | off | on | unchanged | push after 201 | P14 |\n| `KB_GIT_TIMEOUT_S` | 60 | seconds | 60 | 60 | unchanged | caps every git call | P24 |\n| `DATABASE_URL` | unset | URL | unset | set | org slugs | project rows | P18 |\n| `KB_DATA_DIR` | data/ | path | data/ | /srv/kb/data | SQLite file | SQLite file | P01 |\n| `KB_EMBED` | auto | enum | off | auto | vector fusion | embed after 201 | P20 |\n\n> [!SKIP] Skip this if you have run a self-hosted copy\n> The table reads as a compatibility contract: every local install keeps the old behaviour by doing nothing, and a hosted-only capability cannot leak into a local install by accident.\n\n## The one idea {#the-one-idea}\n\n> [!IMPORTANT]\n> Disk is canonical; the database is a projection. Every column must be recoverable from the file alone.\n\nThat sounds like a slogan until you try it. Do this on a running system and nothing is lost:\n\n```bash\n$ rm data/kb.sqlite3          # delete the entire content database\n$ docker compose restart api  # boot runs a full reindex()\n```\n\nThe database is re-derived from the files. Nothing was backed up and nothing was restored, because nothing durable was in there to begin with. The rebuild itself is short enough to read in one sitting:\n\n```python title=\"server/reindex.py\"\ndef reindex(root: Path) -> ReindexReport:\n    \"\"\"Re-derive every row from the files under ``root``. Safe to run at any time.\"\"\"\n    seen = set()\n    for path in sorted(root.rglob(\"*.md\")) + sorted(root.rglob(\"*.html\")):\n        doc = read_document(path)          # frontmatter, body and format\n        upsert_document(doc, tenant=tenant_for(path))\n        seen.add(doc.rel_path)\n    removed = delete_rows_not_in(seen)\n    return ReindexReport(indexed=len(seen), removed=removed)\n```\n\n> [!DEFINITION]- Primer\n> A **projection** is data you can always compute again from a source of truth. Three tests tell you whether a table is one:\n> - deleting it loses nothing that a rebuild cannot restore;\n> - no request writes to it that the files do not also record;\n> - a rebuild from an empty database produces the same rows, byte for byte.\n\n### What reindex recovers {#what-reindex-recovers}\n\nFollow one document through the rebuild and you can see where each field comes back from:\n\n- the title, date, tags and related links, from the file's frontmatter;\n- the project and slug, from the file's path:\n  - `docs/<project>/<date>-<slug>.<ext>` for the default org;\n  - `tenants/<uuid>/<project>/…` for every other org;\n- the format, from the extension;\n- the version, from the `version:` line, where no line means version 1.\n\nTenant isolation is encoded in the path, not only in the database. ~~A tenant column alone would do~~ A tenant column that lived only in SQLite would be wiped on the next boot, and isolation would quietly evaporate with it.\n\n## The write path {#the-write-path}\n\n> [!IMPORTANT] Answer first, then go to the network\n> Everything the caller waits for is local disk and SQLite. Every remote round trip sits behind the response.\n\nA write used to do network work before answering. Since P24 the response sits in the middle of the sequence, and that boundary is load-bearing:\n\n1. Validate the inputs and take the write lock.\n2. Write the file:\n   1. archive the current body, on a versioned re-publish only;\n   2. write `docs/<project>/<date>-<slug>.md` with byte-exact frontmatter;\n   3. add the Recent line to `docs/index.md`.\n3. Upsert the database row. The document is durably saved here.\n4. Make a scoped git commit, staging only the touched paths.\n5. Answer `201`, then hand the push and the embedding to the publish worker.\n\nMeasured on a laptop disk, the steps before the response stay small; the commit dominates:\n\n| Step | p50 (ms) | p95 (ms) | Share |\n|:---|---:|---:|---:|\n| Validate the inputs | 0.4 | 1.1 | 2% |\n| Archive the current body | 1.8 | 4.6 | 8% |\n| Write the file | 2.2 | 6.9 | 10% |\n| Update the index page | 1.1 | 3.0 | 5% |\n| Upsert the row | 3.5 | 9.8 | 16% |\n| Scoped git commit | 12.7 | 31.4 | 59% |\n| Total before 201 | 21.7 | 56.8 | 100% |\n\n> [!WARNING] Never scale workers\n> The write lock is a plain `threading.Lock` in one process. A second worker would not see it, so two writers could interleave a file and its row. Keep the server at one worker:\n> - one uvicorn worker, always;\n> - concurrency for readers comes from SQLite's WAL mode, for free.\n>\n> ```bash\n> uvicorn server.main:app --workers 1\n> ```\n\n> [!CAUTION]\n> A lost or timed-out write response is not evidence of failure. Read the document back once, then retry at most once. Blind retrying is how a duplicate, or an unwanted v2, is born.\n\nThe worker logs what it could not do and keeps going. Its one log line is long on purpose, because the container log is the operator's only surface:\n\n```python title=\"server/publish.py\"\nexcept BaseException as exc:  # the worker must never die\n    _LOG.warning(\"publish task %s failed after the response; the document stays saved and republishes on the next successful push (pending=%d): %r\", name, _PENDING, exc)\n```\n\n### The publish worker {#the-publish-worker}\n\nThe worker is one daemon thread, started lazily on the first submit. Submitting does exactly one thing: it puts the task on a queue and returns.\n\n> [!WARNING]\n> A publish task takes the same write lock, because a rebase moves the working tree. Submit tasks from outside the critical section, or the worker deadlocks the moment it runs.\n\n#### Why a queue, and not the framework's background tasks, when ordering against the metering middleware is subtle {#why-a-queue}\n\nBackground tasks would also run after the handler, but their ordering against the metering middleware depends on the stack. A queue makes \"the response never waits\" a property of the code rather than of the framework. When a bug comes from a subtle ordering guarantee, do not fix it with a different subtle ordering guarantee.\n\n## Contracts {#contracts}\n\n> The version history lives on disk too. A history feature that stored bodies only in SQLite would be erased by the next boot reindex — never build one.\n\nEverything in this chapter so far bends around [the write path](#the-write-path). The decisions it forced are collected in [Why Knowledge Is This Way, and How to Change It](chapter:maintainer-guide/why), and the database side is explained in [SQLite's write-ahead log, in practice](doc:field-notes/sqlite-wal) and in [SQLite's own notes on WAL](https://www.sqlite.org/wal.html). Recovery from a lost disk is in [the backup runbook](doc:ops/backup-runbook), and the plan for outgrowing one disk is in [the sharding draft](chapter:private-notes/sharding).\n\nEvery route names its gate and the plane it touches. Extend the table; never change a row's gate:\n\n| Route | Method | Gate | Plane |\n|---|---|---|---|\n| `/api/health` | GET | none | neither |\n| `/api/documents` | GET | read | content |\n| `/api/documents` | POST | write key | content |\n| `/api/documents/{id}` | GET | read | content |\n| `/api/documents/{id}` | DELETE | member | content |\n| `/api/documents/{id}/raw` | GET | read | content |\n| `/api/documents/{id}/versions` | GET | read | content |\n| `/api/documents/{id}/versions/{v}` | GET | read | content |\n| `/api/search` | GET | read | content |\n| `/api/projects` | GET | member | accounts |\n| `/api/projects` | POST | member | accounts |\n| `/api/projects/{name}` | GET | read | both |\n| `/api/books` | GET | read | content |\n| `/api/books/{book}` | GET | read | content |\n| `/api/books/{book}/chapters/{key}` | GET | read | content |\n| `/api/assets/{sha256}` | GET | read | content |\n| `/api/reader/positions` | GET | member | accounts |\n| `/api/reader/positions/{doc}` | PUT | member | accounts |\n| `/api/reader/bookmarks` | GET | member | accounts |\n| `/api/reader/bookmarks` | POST | member | accounts |\n| `/api/reader/annotations` | GET | member | accounts |\n| `/api/reader/annotations` | POST | member | accounts |\n| `/api/reader/quiz-attempts` | POST | member | accounts |\n| `/api/review/due` | GET | member | accounts |\n| `/api/review/cards/{id}` | POST | member | accounts |\n| `/api/keys` | GET | owner | accounts |\n| `/api/keys` | POST | owner | accounts |\n| `/api/keys/{id}` | DELETE | owner | accounts |\n| `/api/orgs/{slug}` | GET | none | accounts |\n| `/api/usage` | GET | owner | accounts |\n| `/api/graph` | GET | member | content |\n| `/api/auth/session` | GET | session | accounts |\n| `/api/auth/session` | DELETE | session | accounts |\n| `/mcp` | POST | read key | both |\n\n> [!CAUTION] Two credentials that must never be conflated\n> The write key publishes; the read key only reads. A client that holds one must never be handed the other to \"make it work\".\n\n> [!NOTE] Where the contracts are written down\n> The agent-facing contract is `mcp-server/CONTRACT.md`; the HTTP one is the route table above. Both are versioned with the code.\n\n> [!SKIP]\n> The next paragraphs recap the first chapter's ownership model. Skip them if you read it recently.\n\n> [!DEFINITION] Gate\n> The check a route runs before it does anything else: none, read, member, owner, session, or a key.\n\n> [!DEFINITION]\n> A **plane** is a store with its own rules for writing: the content plane is rebuilt from files, the accounts plane is migrated and backed up.\n\n---\n\nIn the Korean edition this chapter is called 지식 시스템의 내부, and the write path is 쓰기 경로; the code keeps its English names in both, so a search for `reindex` finds the same lines in either language.\n\n## What changed since v1 {#what-changed}\n\n- The write path now answers before it pushes; v1 described the old order.\n- The route table gained the reader's seven routes.\n- The flags table gained `KB_EMBED`."},"1":{"date":"8 Aug 2026","title":"Knowledge System Internals: The Content Plane, the Write Path, and the Contracts","summary":"Where a document actually lives, what happens in the milliseconds after an agent publishes one, and which contracts you may extend but must not break.","src":"## Background {#background}\n\nPhysically, this is a small system: one FastAPI process, one SQLite file, one Postgres database and a git repository. What makes it worth a chapter is **one decision made early and honoured everywhere since**. Everything below is downstream of it, so it is worth meeting before any code.\n\n> [!IMPORTANT] The one idea, before anything else\n> The files under `docs/` are the truth. The SQLite database is a *projection* of them that you are allowed to delete.\n\n### The two planes {#the-two-planes}\n\nThe process runs two planes at once, and knowing which one you are looking at is the first skill to acquire. The content plane holds documents, the search index and version rows; the accounts plane holds users, orgs, projects, keys and sessions.\n\n```diagram #two-planes\nkind: flow\ntitle: One FastAPI process, two planes\ncaption: \"The content plane is rebuilt from the files under `docs/` by `reindex()`. The accounts plane keeps users, orgs, keys and sessions in Postgres, and its checks run before the write lock.\"\ndirection: right\ngroups:\n  - {id: process, label: \"one FastAPI process, one uvicorn worker\", nodes: [content, accounts]}\nnodes:\n  - {id: content, label: Content plane, sub: \"SQLite · FTS5 · WAL · rebuilt from docs/\"}\n  - {id: accounts, label: Accounts plane, sub: \"Postgres · SQLAlchemy · Alembic\"}\n  - {id: files, label: \"docs/<project>/<date>-<slug>.md\", shape: store}\nedges:\n  - {from: files, to: content, label: \"reindex()\"}\n  - {from: accounts, to: files, label: \"async dependency, runs before the write lock\", style: dashed}\n```\n\n> [!NOTE]\n> With `DATABASE_URL` unset, the accounts plane is never created and every route behaves exactly like the single-token deployment. That dormancy is what lets a self-hosted copy run from the same code.\n\n### Two deployments, one codebase {#two-deployments}\n\nThere is no hosted fork and no production mode. The whole difference between a laptop and the hosted service is a handful of flags, each defaulting to the local behaviour:\n\n| Flag | Default | Type | Local install | Hosted | Read path | Write path | Since |\n|---|---|---|---|---|---|---|---|\n| `KB_REQUIRE_READ_AUTH` | false | bool | off | on | bearer required | unchanged | P12 |\n| `KB_GIT_PUSH` | false | bool | off | on | unchanged | push after 201 | P14 |\n| `KB_GIT_TIMEOUT_S` | 60 | seconds | 60 | 60 | unchanged | caps every git call | P24 |\n| `DATABASE_URL` | unset | URL | unset | set | org slugs | project rows | P18 |\n| `KB_DATA_DIR` | data/ | path | data/ | /srv/kb/data | SQLite file | SQLite file | P01 |\n\n> [!SKIP] Skip this if you have run a self-hosted copy\n> The table reads as a compatibility contract: every local install keeps the old behaviour by doing nothing, and a hosted-only capability cannot leak into a local install by accident.\n\n## The one idea {#the-one-idea}\n\n> [!IMPORTANT]\n> Disk is canonical; the database is a projection. Every column must be recoverable from the file alone.\n\nThat sounds like a slogan until you try it. Do this on a running system and nothing is lost:\n\n```bash\n$ rm data/kb.sqlite3          # delete the entire content database\n$ docker compose restart api  # boot runs a full reindex()\n```\n\nThe database is re-derived from the files. Nothing was backed up and nothing was restored, because nothing durable was in there to begin with. The rebuild itself is short enough to read in one sitting:\n\n```python title=\"server/reindex.py\"\ndef reindex(root: Path) -> ReindexReport:\n    \"\"\"Re-derive every row from the files under ``root``. Safe to run at any time.\"\"\"\n    seen = set()\n    for path in sorted(root.rglob(\"*.md\")) + sorted(root.rglob(\"*.html\")):\n        doc = read_document(path)          # frontmatter, body and format\n        upsert_document(doc, tenant=tenant_for(path))\n        seen.add(doc.rel_path)\n    removed = delete_rows_not_in(seen)\n    return ReindexReport(indexed=len(seen), removed=removed)\n```\n\n> [!DEFINITION]- Primer\n> A **projection** is data you can always compute again from a source of truth. Three tests tell you whether a table is one:\n> - deleting it loses nothing that a rebuild cannot restore;\n> - no request writes to it that the files do not also record;\n> - a rebuild from an empty database produces the same rows, byte for byte.\n\n### What reindex recovers {#what-reindex-recovers}\n\nFollow one document through the rebuild and you can see where each field comes back from:\n\n- the title, date, tags and related links, from the file's frontmatter;\n- the project and slug, from the file's path:\n  - `docs/<project>/<date>-<slug>.<ext>` for the default org;\n  - `tenants/<uuid>/<project>/…` for every other org;\n- the format, from the extension;\n- the version, from the `version:` line, where no line means version 1.\n\nTenant isolation is encoded in the path, not only in the database. ~~A tenant column alone would do~~ A tenant column that lived only in SQLite would be wiped on the next boot, and isolation would quietly evaporate with it.\n\n## The write path {#the-write-path}\n\n> [!IMPORTANT] One sequence, one lock\n> Everything happens under the write lock, in order, and the caller hears back when the sequence ends.\n\nA write does its work in one sequence, under one lock, and answers when the sequence ends:\n\n1. Validate the inputs and take the write lock.\n2. Write the file:\n   1. archive the current body, on a versioned re-publish only;\n   2. write `docs/<project>/<date>-<slug>.md` with byte-exact frontmatter;\n   3. add the Recent line to `docs/index.md`.\n3. Upsert the database row. The document is durably saved here.\n4. Make a scoped git commit, staging only the touched paths.\n5. Push, embed, then answer `201`.\n\nMeasured on a laptop disk, the steps before the response stay small; the commit dominates:\n\n| Step | p50 (ms) | p95 (ms) | Share |\n|:---|---:|---:|---:|\n| Validate the inputs | 0.4 | 1.1 | 2% |\n| Archive the current body | 1.8 | 4.6 | 8% |\n| Write the file | 2.2 | 6.9 | 10% |\n| Update the index page | 1.1 | 3.0 | 5% |\n| Upsert the row | 3.5 | 9.8 | 16% |\n| Scoped git commit | 12.7 | 31.4 | 59% |\n| Total before 201 | 21.7 | 56.8 | 100% |\n\n> [!WARNING] Never scale workers\n> The write lock is a plain `threading.Lock` in one process. A second worker would not see it, so two writers could interleave a file and its row. Keep the server at one worker:\n> - one uvicorn worker, always;\n> - concurrency for readers comes from SQLite's WAL mode, for free.\n>\n> ```bash\n> uvicorn server.main:app --workers 1\n> ```\n\n> [!CAUTION]\n> A lost or timed-out write response is not evidence of failure. Read the document back once, then retry at most once. Blind retrying is how a duplicate, or an unwanted v2, is born.\n\nThe worker logs what it could not do and keeps going. Its one log line is long on purpose, because the container log is the operator's only surface:\n\n```python title=\"server/publish.py\"\nexcept BaseException as exc:  # the worker must never die\n    _LOG.warning(\"publish task %s failed after the response; the document stays saved and republishes on the next successful push (pending=%d): %r\", name, _PENDING, exc)\n```\n\n### The publish worker {#the-publish-worker}\n\nThe worker is one daemon thread, started lazily on the first submit. Submitting does exactly one thing: it puts the task on a queue and returns.\n\n> [!WARNING]\n> A publish task takes the same write lock, because a rebase moves the working tree. Submit tasks from outside the critical section, or the worker deadlocks the moment it runs.\n\n#### Why a queue, and not the framework's background tasks, when ordering against the metering middleware is subtle {#why-a-queue}\n\nBackground tasks would also run after the handler, but their ordering against the metering middleware depends on the stack. A queue makes \"the response never waits\" a property of the code rather than of the framework. When a bug comes from a subtle ordering guarantee, do not fix it with a different subtle ordering guarantee.\n\n## Contracts {#contracts}\n\n> The version history lives on disk too. A history feature that stored bodies only in SQLite would be erased by the next boot reindex — never build one.\n\nEverything in this chapter so far bends around [the write path](#the-write-path). The decisions it forced are collected in [Why Knowledge Is This Way, and How to Change It](chapter:maintainer-guide/why), and the database side is explained in [SQLite's write-ahead log, in practice](doc:field-notes/sqlite-wal) and in [SQLite's own notes on WAL](https://www.sqlite.org/wal.html). Recovery from a lost disk is in [the backup runbook](doc:ops/backup-runbook), and the plan for outgrowing one disk is in [the sharding draft](chapter:private-notes/sharding).\n\nEvery route names its gate and the plane it touches. Extend the table; never change a row's gate:\n\n| Route | Method | Gate | Plane |\n|---|---|---|---|\n| `/api/health` | GET | none | neither |\n| `/api/documents` | GET | read | content |\n| `/api/documents` | POST | write key | content |\n| `/api/documents/{id}` | GET | read | content |\n| `/api/documents/{id}` | DELETE | member | content |\n| `/api/documents/{id}/raw` | GET | read | content |\n| `/api/documents/{id}/versions` | GET | read | content |\n| `/api/documents/{id}/versions/{v}` | GET | read | content |\n| `/api/search` | GET | read | content |\n| `/api/projects` | GET | member | accounts |\n| `/api/projects` | POST | member | accounts |\n| `/api/projects/{name}` | GET | read | both |\n| `/api/books` | GET | read | content |\n| `/api/books/{book}` | GET | read | content |\n| `/api/books/{book}/chapters/{key}` | GET | read | content |\n| `/api/assets/{sha256}` | GET | read | content |\n| `/api/review/due` | GET | member | accounts |\n| `/api/review/cards/{id}` | POST | member | accounts |\n| `/api/keys` | GET | owner | accounts |\n| `/api/keys` | POST | owner | accounts |\n| `/api/keys/{id}` | DELETE | owner | accounts |\n| `/api/orgs/{slug}` | GET | none | accounts |\n| `/api/usage` | GET | owner | accounts |\n| `/api/graph` | GET | member | content |\n| `/api/auth/session` | GET | session | accounts |\n| `/api/auth/session` | DELETE | session | accounts |\n| `/mcp` | POST | read key | both |\n\n> [!CAUTION] Two credentials that must never be conflated\n> The write key publishes; the read key only reads. A client that holds one must never be handed the other to \"make it work\".\n\n> [!NOTE] Where the contracts are written down\n> The agent-facing contract is `mcp-server/CONTRACT.md`; the HTTP one is the route table above. Both are versioned with the code.\n\n> [!SKIP]\n> The next paragraphs recap the first chapter's ownership model. Skip them if you read it recently.\n\n> [!DEFINITION] Gate\n> The check a route runs before it does anything else: none, read, member, owner, session, or a key.\n\n> [!DEFINITION]\n> A **plane** is a store with its own rules for writing: the content plane is rebuilt from files, the accounts plane is migrated and backed up.\n\n---\n\nIn the Korean edition this chapter is called 지식 시스템의 내부, and the write path is 쓰기 경로; the code keeps its English names in both, so a search for `reindex` finds the same lines in either language."}}},"ko":{"newest":1,"from":{"lang":"en","v":1},"versions":{"1":{"date":"20 Aug 2026","title":"지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약","summary":"문서가 실제로 어디에 사는지, 에이전트가 문서를 발행한 직후 몇 밀리초 동안 무슨 일이 일어나는지, 그리고 확장은 해도 깨뜨려서는 안 되는 계약이 무엇인지 다룹니다.","src":"## 배경 {#background}\n\n물리적으로 이 시스템은 작습니다. FastAPI 프로세스 하나, SQLite 파일 하나, Postgres 데이터베이스 하나, 그리고 git 저장소 하나입니다. 그런데도 한 장(章)을 쓸 만한 이유는 **초기에 내린 결정 하나를 지금까지 모든 곳에서 지켜 왔기 때문**입니다. 아래의 모든 내용이 그 결정에서 나오므로, 코드보다 먼저 만나 두는 편이 좋습니다.\n\n> [!IMPORTANT] 무엇보다 먼저, 핵심 아이디어\n> `docs/` 아래의 파일이 진실입니다. SQLite 데이터베이스는 그 파일들의 *투영*이며, 지워도 됩니다.\n\n### 두 개의 평면 {#the-two-planes}\n\n프로세스는 두 개의 평면을 동시에 돌립니다. 지금 보고 있는 것이 어느 평면인지 알아보는 것이 가장 먼저 익혀야 할 기술입니다. 콘텐츠 평면은 문서, 검색 색인, 버전 행을 담고, 계정 평면은 사용자, 조직, 프로젝트, 키, 세션을 담습니다.\n\n```diagram #two-planes\nkind: flow\ntitle: FastAPI 프로세스 하나, 평면 둘\ncaption: \"콘텐츠 평면은 `reindex()`가 `docs/` 아래의 파일에서 다시 만듭니다. 계정 평면은 사용자, 조직, 키, 세션을 Postgres에 두며, 그 확인은 쓰기 잠금보다 먼저 실행됩니다.\"\ndirection: right\ngroups:\n  - {id: process, label: \"FastAPI 프로세스 하나, uvicorn 워커 하나\", nodes: [content, accounts]}\nnodes:\n  - {id: content, label: 콘텐츠 평면, sub: \"SQLite · FTS5 · WAL · docs/에서 다시 만듦\"}\n  - {id: accounts, label: 계정 평면, sub: \"Postgres · SQLAlchemy · Alembic\"}\n  - {id: files, label: \"docs/<project>/<date>-<slug>.md\", shape: store}\nedges:\n  - {from: files, to: content, label: \"reindex()\"}\n  - {from: accounts, to: files, label: \"비동기 의존성, 쓰기 잠금 전에 실행\", style: dashed}\n```\n\n> [!NOTE]\n> `DATABASE_URL`이 비어 있으면 계정 평면은 만들어지지 않고, 모든 경로가 단일 토큰 배포와 똑같이 동작합니다. 이 휴면 상태 덕분에 직접 호스팅한 사본도 같은 코드로 돌아갑니다.\n\n### 하나의 코드베이스, 두 가지 배포 {#two-deployments}\n\n호스팅용 포크도, 운영 모드도 없습니다. 노트북과 호스팅 서비스의 차이는 몇 개의 플래그뿐이고, 모든 플래그의 기본값은 로컬 동작입니다.\n\n| 플래그 | 기본값 | 형식 | 로컬 설치 | 호스팅 | 읽기 경로 | 쓰기 경로 | 도입 |\n|---|---|---|---|---|---|---|---|\n| `KB_REQUIRE_READ_AUTH` | false | bool | 꺼짐 | 켜짐 | 베어러 필요 | 변화 없음 | P12 |\n| `KB_GIT_PUSH` | false | bool | 꺼짐 | 켜짐 | 변화 없음 | 201 뒤 푸시 | P14 |\n| `KB_GIT_TIMEOUT_S` | 60 | 초 | 60 | 60 | 변화 없음 | 모든 git 호출 제한 | P24 |\n| `DATABASE_URL` | 없음 | URL | 없음 | 있음 | 조직 슬러그 | 프로젝트 행 | P18 |\n| `KB_DATA_DIR` | data/ | 경로 | data/ | /srv/kb/data | SQLite 파일 | SQLite 파일 | P01 |\n\n> [!SKIP] 직접 호스팅해 본 적이 있다면 건너뛰세요\n> 이 표는 호환성 계약으로 읽힙니다. 로컬 설치는 아무것도 하지 않아도 예전 동작을 유지하고, 호스팅 전용 기능이 실수로 로컬에 새어 들어갈 수 없습니다.\n\n## 핵심 아이디어 {#the-one-idea}\n\n> [!IMPORTANT]\n> 디스크가 정본이고 데이터베이스는 투영입니다. 모든 열은 파일만으로 다시 만들 수 있어야 합니다.\n\n구호처럼 들리지만 직접 해 보면 다릅니다. 실행 중인 시스템에서 이렇게 해도 잃는 것이 없습니다.\n\n```bash\n$ rm data/kb.sqlite3          # delete the entire content database\n$ docker compose restart api  # boot runs a full reindex()\n```\n\n데이터베이스는 파일에서 다시 만들어집니다. 백업한 것도, 복원한 것도 없습니다. 애초에 그 안에 지켜야 할 것이 없었기 때문입니다. 재구축 코드는 한 번에 읽을 수 있을 만큼 짧습니다.\n\n```python title=\"server/reindex.py\"\ndef reindex(root: Path) -> ReindexReport:\n    \"\"\"Re-derive every row from the files under ``root``. Safe to run at any time.\"\"\"\n    seen = set()\n    for path in sorted(root.rglob(\"*.md\")) + sorted(root.rglob(\"*.html\")):\n        doc = read_document(path)          # frontmatter, body and format\n        upsert_document(doc, tenant=tenant_for(path))\n        seen.add(doc.rel_path)\n    removed = delete_rows_not_in(seen)\n    return ReindexReport(indexed=len(seen), removed=removed)\n```\n\n> [!DEFINITION]- 기초 개념\n> **투영**은 진실의 원천에서 언제든 다시 계산할 수 있는 데이터입니다. 어떤 표가 투영인지는 세 가지로 확인합니다.\n> - 지워도 재구축으로 되살릴 수 없는 것을 잃지 않는다.\n> - 파일이 기록하지 않는 내용을 어떤 요청도 거기에 쓰지 않는다.\n> - 빈 데이터베이스에서 재구축하면 바이트 단위까지 같은 행이 나온다.\n\n### reindex가 되살리는 것 {#what-reindex-recovers}\n\n문서 하나를 따라 재구축을 지켜보면 각 필드가 어디에서 돌아오는지 보입니다.\n\n- 제목, 날짜, 태그, 관련 링크는 파일의 머리말에서;\n- 프로젝트와 슬러그는 파일 경로에서:\n  - 기본 조직은 `docs/<project>/<date>-<slug>.<ext>`;\n  - 그 밖의 조직은 `tenants/<uuid>/<project>/…`;\n- 형식은 확장자에서;\n- 버전은 `version:` 줄에서. 줄이 없으면 버전 1입니다.\n\n조직 격리는 데이터베이스만이 아니라 경로에 새겨져 있습니다. ~~조직 열 하나면 충분하다~~ SQLite에만 있는 조직 열은 다음 부팅 때 지워지고, 격리도 조용히 함께 사라집니다.\n\n## 쓰기 경로 {#the-write-path}\n\n> [!IMPORTANT] 하나의 순서, 하나의 잠금\n> 모든 일은 쓰기 잠금 아래에서 순서대로 일어나고, 호출자는 그 순서가 끝난 뒤에 응답을 받습니다.\n\n쓰기는 하나의 순서로, 하나의 잠금 아래에서 일하고, 그 순서가 끝나면 응답합니다.\n\n1. 입력을 검증하고 쓰기 잠금을 잡습니다.\n2. 파일을 씁니다.\n   1. 버전을 올리는 재발행일 때만 현재 본문을 보관합니다.\n   2. 바이트 단위로 정확한 머리말과 함께 `docs/<project>/<date>-<slug>.md`를 씁니다.\n   3. `docs/index.md`에 최근 항목을 추가합니다.\n3. 데이터베이스 행을 갱신합니다. 문서는 여기서 영구히 저장됩니다.\n4. 건드린 경로만 스테이징해 범위가 좁은 git 커밋을 만듭니다.\n5. 푸시하고, 임베딩한 뒤 `201`로 응답합니다.\n\n노트북 디스크에서 재면 응답 전 단계들은 작고, 커밋이 대부분을 차지합니다.\n\n| 단계 | p50 (ms) | p95 (ms) | 비중 |\n|:---|---:|---:|---:|\n| 입력 검증 | 0.4 | 1.1 | 2% |\n| 현재 본문 보관 | 1.8 | 4.6 | 8% |\n| 파일 쓰기 | 2.2 | 6.9 | 10% |\n| 색인 페이지 갱신 | 1.1 | 3.0 | 5% |\n| 행 갱신 | 3.5 | 9.8 | 16% |\n| 범위가 좁은 git 커밋 | 12.7 | 31.4 | 59% |\n| 201 전 합계 | 21.7 | 56.8 | 100% |\n\n> [!WARNING] 워커 수를 늘리지 마세요\n> 쓰기 잠금은 한 프로세스 안의 평범한 `threading.Lock`입니다. 두 번째 워커는 이 잠금을 보지 못하므로, 두 작성자가 파일과 행을 뒤섞을 수 있습니다. 서버는 워커 하나로 유지합니다.\n> - uvicorn 워커는 언제나 하나;\n> - 읽기 동시성은 SQLite의 WAL 모드가 공짜로 줍니다.\n>\n> ```bash\n> uvicorn server.main:app --workers 1\n> ```\n\n> [!CAUTION]\n> 쓰기 응답이 사라지거나 시간 초과가 났다고 해서 실패한 것은 아닙니다. 문서를 한 번 다시 읽어 보고, 재시도는 많아야 한 번만 하세요. 무작정 재시도하면 중복이나 원치 않는 v2가 생깁니다.\n\n워커는 하지 못한 일을 로그에 남기고 계속 갑니다. 컨테이너 로그가 운영자가 보는 유일한 화면이라서, 그 로그 한 줄은 일부러 깁니다.\n\n```python title=\"server/publish.py\"\nexcept BaseException as exc:  # the worker must never die\n    _LOG.warning(\"publish task %s failed after the response; the document stays saved and republishes on the next successful push (pending=%d): %r\", name, _PENDING, exc)\n```\n\n### 발행 워커 {#the-publish-worker}\n\n워커는 데몬 스레드 하나이며, 첫 제출 때 느긋하게 시작됩니다. 제출은 딱 한 가지 일만 합니다. 작업을 큐에 넣고 바로 돌아옵니다.\n\n> [!WARNING]\n> 발행 작업도 같은 쓰기 잠금을 잡습니다. 리베이스가 작업 트리를 바꾸기 때문입니다. 작업은 임계 구역 밖에서 제출하세요. 그렇지 않으면 워커가 도는 순간 교착 상태에 빠집니다.\n\n#### 계량 미들웨어와의 순서가 미묘할 때, 프레임워크의 백그라운드 작업이 아니라 큐를 쓰는 이유 {#why-a-queue}\n\n백그라운드 작업도 핸들러 뒤에 돌지만, 계량 미들웨어와의 순서는 스택에 달려 있습니다. 큐를 쓰면 \"응답은 기다리지 않는다\"가 프레임워크가 아닌 코드의 성질이 됩니다. 미묘한 순서 보장에서 생긴 버그를 또 다른 미묘한 순서 보장으로 고치지 마세요.\n\n## 계약 {#contracts}\n\n> 버전 기록도 디스크에 삽니다. 본문을 SQLite에만 저장하는 기록 기능은 다음 부팅 때의 reindex로 지워집니다. 절대 만들지 마세요.\n\n이 장의 모든 내용은 [쓰기 경로](#the-write-path)를 중심으로 휘어 있습니다. 그 결정들은 [Why Knowledge Is This Way, and How to Change It](chapter:maintainer-guide/why)에 모여 있고, 데이터베이스 쪽 이야기는 [SQLite's write-ahead log, in practice](doc:field-notes/sqlite-wal)와 [SQLite 공식 WAL 문서](https://www.sqlite.org/wal.html)에 있습니다. 디스크를 잃었을 때의 복구 방법은 [백업 런북](doc:ops/backup-runbook)에, 디스크 하나로 부족해질 때의 계획은 [샤딩 초안](chapter:private-notes/sharding)에 있습니다.\n\n모든 경로는 자신의 관문과 건드리는 평면을 밝힙니다. 표는 늘려도 되지만, 어떤 행의 관문도 바꾸지 마세요.\n\n| 경로 | 메서드 | 관문 | 평면 |\n|---|---|---|---|\n| `/api/health` | GET | 없음 | 없음 |\n| `/api/documents` | GET | 읽기 | 콘텐츠 |\n| `/api/documents` | POST | 쓰기 키 | 콘텐츠 |\n| `/api/documents/{id}` | GET | 읽기 | 콘텐츠 |\n| `/api/documents/{id}` | DELETE | 멤버 | 콘텐츠 |\n| `/api/documents/{id}/raw` | GET | 읽기 | 콘텐츠 |\n| `/api/documents/{id}/versions` | GET | 읽기 | 콘텐츠 |\n| `/api/documents/{id}/versions/{v}` | GET | 읽기 | 콘텐츠 |\n| `/api/search` | GET | 읽기 | 콘텐츠 |\n| `/api/projects` | GET | 멤버 | 계정 |\n| `/api/projects` | POST | 멤버 | 계정 |\n| `/api/projects/{name}` | GET | 읽기 | 둘 다 |\n| `/api/books` | GET | 읽기 | 콘텐츠 |\n| `/api/books/{book}` | GET | 읽기 | 콘텐츠 |\n| `/api/books/{book}/chapters/{key}` | GET | 읽기 | 콘텐츠 |\n| `/api/assets/{sha256}` | GET | 읽기 | 콘텐츠 |\n| `/api/review/due` | GET | 멤버 | 계정 |\n| `/api/review/cards/{id}` | POST | 멤버 | 계정 |\n| `/api/keys` | GET | 소유자 | 계정 |\n| `/api/keys` | POST | 소유자 | 계정 |\n| `/api/keys/{id}` | DELETE | 소유자 | 계정 |\n| `/api/orgs/{slug}` | GET | 없음 | 계정 |\n| `/api/usage` | GET | 소유자 | 계정 |\n| `/api/graph` | GET | 멤버 | 콘텐츠 |\n| `/api/auth/session` | GET | 세션 | 계정 |\n| `/api/auth/session` | DELETE | 세션 | 계정 |\n| `/mcp` | POST | 읽기 키 | 둘 다 |\n\n> [!CAUTION] 절대 혼동하면 안 되는 두 자격 증명\n> 쓰기 키는 발행하고, 읽기 키는 읽기만 합니다. 둘 중 하나를 가진 클라이언트에게 \"되게 하려고\" 다른 하나를 건네지 마세요.\n\n> [!NOTE] 계약이 적힌 곳\n> 에이전트용 계약은 `mcp-server/CONTRACT.md`, HTTP 계약은 위의 경로 표입니다. 둘 다 코드와 함께 버전이 매겨집니다.\n\n> [!SKIP]\n> 다음 문단들은 첫 장의 소유권 모델을 요약합니다. 최근에 읽었다면 건너뛰세요.\n\n> [!DEFINITION] 관문\n> 경로가 다른 일을 하기 전에 먼저 하는 검사입니다. 없음, 읽기, 멤버, 소유자, 세션, 또는 키.\n\n> [!DEFINITION]\n> **평면**은 쓰기 규칙을 따로 가진 저장소입니다. 콘텐츠 평면은 파일에서 다시 만들고, 계정 평면은 마이그레이션하고 백업합니다.\n\n---\n\n영어판에서 이 장의 이름은 Knowledge System Internals이고, 쓰기 경로는 the write path입니다. 코드는 두 언어 모두에서 영어 이름을 그대로 쓰므로, `reindex`를 검색하면 어느 언어에서든 같은 줄이 나옵니다.","from":{"lang":"en","v":1}}}}}},"maintainer-guide/read-surfaces":{"book":"maintainer-guide","key":"read-surfaces","n":3,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"8 Aug 2026","title":"Knowledge's Read Surfaces: Two Front Ends, One Corpus","summary":"","src":"## Background {#background}\n\nknowledge has two front ends over one corpus: the public reading site and the console. They look alike on purpose and share nothing at run time except the API.\n\n## The public site never calls the API directly {#never-calls}\n\nEvery request from the browser goes through the web app's own server, which holds the session and adds the credentials. The browser never sees a token, so a leaked page can never leak a key.\n\n### The sealed cookie {#sealed-cookie}\n\nThe session lives in one sealed cookie. The server opens it, calls the API with the key it finds, and answers the page.\n\n## Rendering untrusted HTML that still runs {#untrusted-html}\n\nAn HTML explainer is written by an agent, so the site treats it as untrusted: it is served from a sandboxed frame that may run its own scripts but may not reach the page around it."}}}}},"maintainer-guide/shipping":{"book":"maintainer-guide","key":"shipping","n":4,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"8 Aug 2026","title":"Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates","summary":"How one repository becomes four release channels, and the gates that keep them in step.","src":"## Four channels, one repository {#four-channels}\n\nknowledge ships four ways from one repository, and each channel reads the same tagged commit:\n\n- the plugin, which installs the skills and the CLI;\n- the scaffold, a snapshot of the self-hosted layout;\n- the container images for the hosted service;\n- the MCP server's package.\n\n### The scaffold is a snapshot {#scaffold-snapshot}\n\nThe scaffold is copied, not linked, so a self-hosted copy never changes under its owner. A parity gate checks that every file the scaffold names still exists in the repository before a release goes out.\n\n### Deploy order is not arbitrary {#deploy-order}\n\nThe API goes first, then the web app, then the MCP server. Each new version reads the old one's responses, so a half-finished deploy still answers every request."}}}}},"maintainer-guide/why":{"book":"maintainer-guide","key":"why","n":5,"format":"native","variants":{"en":{"newest":3,"versions":{"3":{"date":"14 Oct 2026","title":"Why Knowledge Is This Way, and How to Change It","summary":"The decisions behind the first four chapters, the roads not taken, and the way to change one safely.","src":"## Background {#background}\n\nThe first four chapters describe what the system does. This one keeps the reasons: the roads not taken, and how to change a decision without breaking the readers who depend on it.\n\n> [!IMPORTANT] A decision log's value is in the road not taken\n> Write down what you rejected and why. The next maintainer will propose it again.\n\n## The honest inventory {#honest-inventory}\n\nThree choices still carry known costs: one writer, a SQLite content plane, and HTML explainers that cannot be measured from outside their frame. Each is the right call at today's size, and each has a written trigger for revisiting it.\n\n## How to change something {#how-to-change}\n\nOpen a phase, state the intent in your own words, and let the decomposition slice cut the work. A change that touches a contract carries its own version note, and the change log below records it.\n\n## What changed since v2 {#what-changed}\n\n- The inventory names the trigger for leaving SQLite.\n- The workflow section follows the current phase model."},"2":{"date":"2 Sep 2026","title":"Why Knowledge Is This Way, and How to Change It","summary":"The decisions behind the first four chapters, the roads not taken, and the way to change one safely.","src":"## Background {#background}\n\nThe first four chapters describe what the system does. This one keeps the reasons: the roads not taken, and how to change a decision without breaking the readers who depend on it.\n\n> [!IMPORTANT] A decision log's value is in the road not taken\n> Write down what you rejected and why. The next maintainer will propose it again.\n\n## The honest inventory {#honest-inventory}\n\nSome choices still carry known costs: one writer, a SQLite content plane, and HTML explainers that cannot be measured from outside their frame. Each is the right call at today's size, and each has a written trigger for revisiting it.\n\n## How to change something {#how-to-change}\n\nOpen a phase, state the intent in your own words, and let the decomposition slice cut the work. A change that touches a contract carries its own version note, and the change log below records it."},"1":{"date":"8 Aug 2026","title":"Why Knowledge Is This Way, and How to Change It","summary":"The decisions behind the first four chapters, the roads not taken, and the way to change one safely.","src":"## Background {#background}\n\nThe first four chapters describe what the system does. This one keeps the reasons: the roads not taken, and how to change a decision without breaking the readers who depend on it.\n\n> [!IMPORTANT] A decision log's value is in the road not taken\n> Write down what you rejected and why. The next maintainer will propose it again.\n\n## The honest inventory {#honest-inventory}\n\nSome choices still carry known costs: one writer, a SQLite content plane, and HTML explainers that cannot be measured from outside their frame. Each is the right call at today's size, and each has a written trigger for revisiting it.\n\n## How to change something {#how-to-change}\n\nOpen a phase, state the intent in your own words, and let the decomposition slice cut the work. A change that touches a contract carries its own version note, and the change log below records it."}}}}},"tidewater/what-it-predicts":{"book":"tidewater","key":"what-it-predicts","n":1,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"What Tidewater predicts, and for whom","summary":"The service, its three kinds of reader, and the one number every one of them wants: the height of the water at a given minute.","src":"Tidewater answers one question many times a second: how high will the water be at this harbour, at this minute? Pilots, marina staff and a handful of research groups ask it, and each wants the answer in a different shape.\n\nThis book follows that answer from a gauge on a pier to a line in a printed tide table."}}}}},"tidewater/harmonic-model":{"book":"tidewater","key":"harmonic-model","n":2,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"The harmonic model in one sitting","summary":"Why a tide is a sum of waves, and how thirty-seven of them describe most harbours.","src":"A tide is not one wave but many, each driven by a regular motion of the moon or the sun. Tidewater stores each harbour as a list of those waves, called constituents, with an amplitude and a phase for each.\n\nAdd the waves for a minute and you have that minute's prediction. Everything else in the codebase exists to get those numbers right."}}}}},"tidewater/stations":{"book":"tidewater","key":"stations","n":3,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Stations and the station registry","summary":"The registry that names every harbour, and why its identifiers never change.","src":"Every prediction belongs to a station. The registry gives each station a short code, a position and the datum its heights are measured from.\n\nCodes are never reused. A station that moves gets a new code, so an old table always means what it meant."}}}}},"tidewater/gauge-readings":{"book":"tidewater","key":"gauge-readings","n":4,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Ingesting gauge readings","summary":"How six-minute readings arrive, and what happens to the ones that arrive late.","src":"Gauges report every six minutes. The ingest worker accepts readings in any order and files each under the minute it describes, not the minute it arrived.\n\nLate readings are normal. A reading that arrives a day late still improves tomorrow's solve."}}}}},"tidewater/constituent-solver":{"book":"tidewater","key":"constituent-solver","n":5,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"The constituent solver","summary":"Fitting amplitudes and phases to a year of readings, and the checks that stop a bad fit from shipping.","src":"Once a month the solver fits each station's constituents to the last year of readings. A fit ships only if it predicts the held-back final month within the station's tolerance.\n\nA rejected fit keeps the previous month's numbers and pages the maintainer."}}}}},"tidewater/prediction-cache":{"book":"tidewater","key":"prediction-cache","n":6,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Caching predictions by day","summary":"Why the cache key is a station and a calendar day, and never a time range.","src":"Predictions are cheap to compute but asked for constantly, so Tidewater caches one day per station.\n\nA range query is answered by joining days. The cache never stores a range, so two overlapping questions never disagree."}}}}},"tidewater/datums":{"book":"tidewater","key":"datums","n":7,"format":"legacy","title":"Datums: Chart Datum, Mean Sea Level, and the Conversions Between Them"},"tidewater/tide-table-api":{"book":"tidewater","key":"tide-table-api","n":8,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"The public tide-table API","summary":"Four endpoints, one rate limit, and the error every client eventually meets.","src":"The public API has four endpoints: stations, predictions, extremes and the printable table. All four answer in the station's local time unless the client asks for UTC.\n\nThe error clients meet most is asking for a station by its old code. The API answers with the station's new code rather than a bare 404."}}}}},"tidewater/rendering-tables":{"book":"tidewater","key":"rendering-tables","n":9,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Rendering a tide table","summary":"From a day of predictions to a printed page of highs and lows.","src":"A tide table lists each day's high and low waters. The renderer finds the extremes in the day's predictions and rounds each to the minute and the centimetre.\n\nThe printed table is the product most people see, so its layout is fixed and tested against a published reference."}}}}},"tidewater/time-zones":{"book":"tidewater","key":"time-zones","n":10,"format":"native","variants":{"en":{"newest":2,"versions":{"2":{"date":"10 Oct 2026","title":"Time zones and the daylight-saving hour","summary":"The hour that happens twice in autumn, and how the table shows it.","src":"Twice a year a harbour's clock jumps. In spring an hour of predictions has no local time; in autumn an hour happens twice.\n\nThe table prints both autumn hours with their offsets, so a pilot never has to guess which one a low water belongs to."},"1":{"date":"3 Oct 2026","title":"Time zones and the daylight-saving hour","summary":"The hour that happens twice in autumn, and how the table shows it.","src":"Twice a year a harbour's clock jumps. In spring an hour of predictions has no local time; in autumn an hour happens twice.\n\nThe table prints both autumn hours with their offsets, so a pilot never has to guess which one a low water belongs to."}}}}},"tidewater/storm-surge":{"book":"tidewater","key":"storm-surge","n":11,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Storm surge: when the model is wrong","summary":"What the harmonic model cannot see, and how Tidewater says so to the people relying on it.","src":"## What the model cannot see {#cannot-see}\n\nThe harmonic model knows the moon and the sun. It does not know the weather, and a storm can lift the sea a metre above the prediction.\n\n## Noticing a surge {#noticing}\n\nTidewater cannot forecast surge, but it can notice it. When readings run far above the prediction, the station is flagged and every answer for it carries the flag.\n\n## Saying so {#saying-so}\n\nA flagged answer says three things in words: that the water is running high, by how much, and since when. It never hides the prediction; it puts the reading beside it."}}}}},"tidewater/alerts":{"book":"tidewater","key":"alerts","n":12,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Alerts and the threshold service","summary":"Thresholds per station, and the alert that fires once rather than every six minutes.","src":"Harbour masters set thresholds per station. The threshold service compares each new reading with them and raises an alert when the water crosses one.\n\nAn alert fires once per crossing, then waits for the water to fall back before it can fire again."}}}}},"tidewater/backfill":{"book":"tidewater","key":"backfill","n":13,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Backfilling a decade of readings","summary":"Loading ten years of history without stopping the live ingest.","src":"New stations arrive with years of paper records. The backfill job loads them in yearly batches at low priority, beside the live ingest.\n\nEach batch is checked against the gauge's own published monthly means before it is accepted."}}}}},"tidewater/testing":{"book":"tidewater","key":"testing","n":14,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Testing against published tables","summary":"The reference tables every release must reproduce, to the minute.","src":"Every release must reproduce a set of published tables to the minute and the centimetre. The test suite carries those tables as fixtures.\n\nA failing station blocks the release, even when only one low water is a minute out."}}}}},"tidewater/deploying":{"book":"tidewater","key":"deploying","n":15,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Deploying to the harbour edge","summary":"Small boxes in harbour offices, and why they keep working when the network does not.","src":"Some harbours run a copy of Tidewater on a small box in the harbour office. The box keeps a year of predictions so it can answer when the network is down.\n\nEdge boxes update once a day and never in the middle of a tide change."}}}}},"tidewater/observability":{"book":"tidewater","key":"observability","n":16,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Observability: the three dashboards","summary":"Ingest lag, solver health and answer latency, and the one number each dashboard leads with.","src":"Three dashboards cover the service: ingest lag, solver health and answer latency. Each leads with one number and keeps the rest below the fold.\n\nIngest lag is the one the on-call maintainer opens first."}}}}},"tidewater/failure-stories":{"book":"tidewater","key":"failure-stories","n":17,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Failure stories","summary":"Four incidents, told in order, and the change each one left behind.","src":"Four incidents shaped the codebase more than any plan did. Each is told here with its timeline and the change it left behind.\n\nThe first was a silent datum change at one station that shifted every height by eleven centimetres."}}}}},"tidewater/performance":{"book":"tidewater","key":"performance","n":18,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"The performance budget","summary":"Where the milliseconds go in an answer, and the budget each step must keep.","src":"An answer must leave in under fifty milliseconds. The budget splits that across the cache lookup, the join and the rendering.\n\nA change that spends more than its step's share needs a note explaining what it buys."}}}}},"tidewater/differently":{"book":"tidewater","key":"differently","n":19,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"What we would do differently","summary":"The decisions that aged badly, and the ones that aged better than expected.","src":"Two decisions aged badly: storing heights in feet at the first stations, and caching ranges before caching days.\n\nOne aged better than anyone expected: never reusing a station code."}}}}},"tidewater/reading-guide":{"book":"tidewater","key":"reading-guide","n":20,"format":"native","variants":{"en":{"newest":1,"versions":{"1":{"date":"3 Oct 2026","title":"Reading guide: how to use this book","summary":"Where to start, depending on whether you maintain the service, call its API, or want to know how tides are predicted.","src":"If you maintain the service, read chapters 1 to 6 in order, then 15 to 17. If you call the API, chapters 8 to 10 are enough.\n\nIf you want to know how tides are predicted, read chapter 2 and stop there; the rest is plumbing."}}}}},"doc/field-notes/sqlite-wal":{"loose":true,"project":"field-notes","key":"sqlite-wal","format":"native","variants":{"en":{"newest":2,"versions":{"2":{"date":"9 Oct 2026","title":"SQLite's write-ahead log, in practice","summary":"What changes when a database switches to WAL mode, the one setting worth tuning, and the reader that can quietly grow the log.","src":"## What the log changes {#what-changes}\n\nIn rollback mode, a write copies the old page aside and then overwrites the database file. In WAL mode the database file is left alone: new pages are appended to a separate log, and readers decide which version of a page to read.\n\nThe practical effect is that **readers never wait for the writer**, and the writer never waits for readers.\n\n## Checkpoints {#checkpoints}\n\nThe log cannot grow for ever. A checkpoint copies committed pages back into the database file; by default one runs when the log passes a thousand pages.\n\n```sql\nPRAGMA journal_mode = WAL;\nPRAGMA wal_autocheckpoint = 1000;  -- pages, not bytes\n```\n\n> [!WARNING] A long reader holds the log open\n> A checkpoint cannot pass a reader that started before it. One forgotten read transaction lets the log grow without limit.\n\n## What I measured {#measured}\n\n| Workload | Rollback (ops/s) | WAL (ops/s) |\n|:---|---:|---:|\n| Reads only | 41,200 | 42,900 |\n| One writer, four readers | 3,100 | 11,800 |\n| Writes only | 2,450 | 2,720 |"},"1":{"date":"21 Sep 2026","title":"SQLite's write-ahead log, in practice","summary":"What changes when a database switches to WAL mode, and the one setting worth tuning.","src":"## What the log changes {#what-changes}\n\nIn rollback mode, a write copies the old page aside and then overwrites the database file. In WAL mode the database file is left alone: new pages are appended to a separate log, and readers decide which version of a page to read.\n\nThe practical effect is that **readers never wait for the writer**, and the writer never waits for readers.\n\n## Checkpoints {#checkpoints}\n\nThe log cannot grow for ever. A checkpoint copies committed pages back into the database file; by default one runs when the log passes a thousand pages.\n\n```sql\nPRAGMA journal_mode = WAL;\nPRAGMA wal_autocheckpoint = 1000;  -- pages, not bytes\n```\n\n> [!WARNING] A long reader holds the log open\n> A checkpoint cannot pass a reader that started before it. One forgotten read transaction lets the log grow without limit."}}}}},"private-notes/sharding":{"book":"private-notes","key":"sharding","n":1,"private":true},"doc/field-notes/wal-files":{"loose":true,"project":"field-notes","key":"wal-files","format":"md","variants":{"en":{"newest":1,"versions":{"1":{"title":"Inside a WAL database: the three files","date":"14 Mar 2026","summary":"An old note on what sits on disk in WAL mode, and what a reader and a checkpoint do with it.","src":"An old note, kept in plain Markdown. The settings worth changing are in [SQLite's write-ahead log, in practice](doc:field-notes/sqlite-wal).\n\n## The three files\n\nA database in WAL mode is three files on disk: the database itself, the log beside it, and a small shared-memory index that readers use to find the newest copy of a page.\n\n```text\n+-- app.db-wal: the log, appended to on every commit ------------------------+\n|                                                                            |\n|  header    frame 1          frame 2          frame 3          ...          |\n|  32 B      24 B + a page    24 B + a page    24 B + a page                 |\n|                                                                            |\n+-------------+--------------------------------------------------------------+\n              |                                                       ^       \n              | a checkpoint copies            readers ask the index  |       \n              | committed pages back           which frame holds the  |       \n              v into the database              newest copy of a page  |       \n+-- app.db: the database ------------+    +-- app.db-shm: the index --+------+\n|  page 1   page 2   page 3   ...    |    |  page -> newest frame            |\n+------------------------------------+    +----------------------------------+\n```\n\nThe log only ever grows at its end. A page changed twice is in the log twice, and the index points at the later copy.\n\n## What a reader does\n\n1. When its transaction starts, it notes the last committed frame in the log.\n2. For each page it needs, it asks the index whether the log holds a copy of that page up to that frame.\n3. If it does, it reads the page from the log. If not, it reads it from the database file.\n\n## What a checkpoint does\n\nA checkpoint walks the log from the start and copies each committed page back into the database file. It stops at the oldest frame a running reader still needs, which is why one long reader keeps the log growing."}}}}}},"progress":{"maintainer-guide/what-it-is":{"s":"finished","on":1},"maintainer-guide/internals":{"s":"started","pct":38,"at":"the-write-path"},"maintainer-guide/why":{"s":"finished","on":2},"tidewater/what-it-predicts":{"s":"finished","on":1},"tidewater/harmonic-model":{"s":"finished","on":1},"tidewater/stations":{"s":"finished","on":1},"tidewater/gauge-readings":{"s":"finished","on":1},"tidewater/constituent-solver":{"s":"finished","on":1},"tidewater/prediction-cache":{"s":"finished","on":1},"tidewater/datums":{"s":"finished","on":1},"tidewater/tide-table-api":{"s":"finished","on":1},"tidewater/rendering-tables":{"s":"finished","on":1},"tidewater/time-zones":{"s":"finished","on":1},"tidewater/storm-surge":{"s":"started","pct":46,"at":"noticing"},"tidewater/alerts":{"s":"started","pct":12,"at":null},"doc/field-notes/sqlite-wal":{"s":"started","pct":20,"at":"checkpoints"}}};
  window.RD.books = d.books;
  window.RD.docs = d.docs;
  window.RD.progress = d.progress;
})();

/* ---------- RD.quiz (job 04-quiz, canvas only): grading, an item's states and the block's view model ----------
   The product grades in the quiz's client island (S2) with the same rules; this file is the canvas's copy of them.
   An item's state: { ph: "open" | "revealed" | "graded", sel: [option ids], blanks: [strings], self: "got" | "missed" | null,
   empty: the last Check had nothing to check, correct, save: null | "saving" | "saved" | "failed", later: an earlier
   attempt exists (review keeps that one), origin: "live" | "saved", note, prov }. */
(function () {
  "use strict";
  var RD = window.RD;
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var LANGN = { en: "English", ko: "한국어" };
  var NOW = "2026-10-20T09:30:00Z";
  var LONGSUB = "Saved · review keeps your first answer";
  function day(iso) { var d = new Date(iso); return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  /* S2: typed answers compare after trimming whitespace, case-folding and NFC normalization */
  function norm(s) { return String(s == null ? "" : s).normalize("NFC").trim().toUpperCase().toLowerCase().normalize("NFC"); }
  function sameSet(a, b) {
    a = (a || []).slice().sort(); b = (b || []).slice().sort();
    return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fresh() { return { ph: "open", sel: [], blanks: [], self: null, empty: false, correct: null, save: null, later: false, origin: "live", note: "", prov: "" }; }

  function grade(item, st) {
    if (item.isChoice) {
      var sel = st.sel || [], right = sel.filter(function (x) { return item.answer.indexOf(x) >= 0; });
      var ok = sameSet(sel, item.answer);
      return { correct: ok, partly: !ok && item.multi && right.length > 0, rightCount: right.length };
    }
    if (item.isCloze) {
      var oks = item.accepted.map(function (acc, i) {
        var v = norm((st.blanks || [])[i]);
        return v !== "" && acc.some(function (a) { return norm(a) === v; });
      });
      var n = oks.filter(Boolean).length;
      return { correct: n === item.blanks, oks: oks, rightCount: n, partly: n > 0 && n < item.blanks };
    }
    if (item.isRecall) return { correct: st.self === "got" };
    return { correct: false };
  }
  function isEmpty(item, st) {
    if (item.isChoice) return !(st.sel || []).length;
    if (item.isCloze) return !(st.blanks || []).some(function (v) { return norm(v) !== ""; });
    return false;
  }
  function response(item, st) {
    if (item.isChoice) return { selected: st.sel.slice() };
    if (item.isCloze) return { blanks: item.accepted.map(function (a, i) { return st.blanks[i] || ""; }) };
    return { self_grade: st.self };
  }

  /* One action on one item's state. */
  function reduce(item, st, a) {
    st = clone(st || fresh());
    var graded = false;
    if (a.t === "pick" && item.isChoice && !item.multi && st.ph === "open") { st.sel = [a.opt]; st.ph = "graded"; graded = true; }
    else if (a.t === "toggle" && item.isChoice && item.multi && st.ph === "open") {
      var i = st.sel.indexOf(a.opt);
      if (i >= 0) st.sel.splice(i, 1); else st.sel.push(a.opt);
      st.empty = false;
    } else if (a.t === "type" && item.isCloze && st.ph === "open") { st.blanks[a.n - 1] = a.v; st.empty = false; }
    else if (a.t === "check" && st.ph === "open" && (item.isCloze || (item.isChoice && item.multi))) {
      if (isEmpty(item, st)) st.empty = true;
      else { st.empty = false; st.ph = "graded"; graded = true; }
    } else if (a.t === "reveal" && item.isRecall && st.ph === "open") st.ph = "revealed";
    else if (a.t === "self" && item.isRecall && st.ph === "revealed") { st.self = a.v; st.ph = "graded"; graded = true; }
    else if (a.t === "retry") { var note = st.note; st = fresh(); st.note = note; }
    if (graded) st.correct = grade(item, st).correct;
    st.origin = "live";
    st.prov = "";
    return { st: st, graded: graded };
  }

  function keyOf(view, blockId, itemId) { return [view.doc, view.lang, view.ver, blockId, itemId].join("|"); }
  function attemptsFor(hist, doc, blockId, itemId) {
    return (hist || []).filter(function (a) { return a.doc === doc && a.block_id === blockId && a.item_id === itemId; })
      .sort(function (x, y) { return x.answered_at < y.answered_at ? -1 : x.answered_at > y.answered_at ? 1 : 0; });
  }
  function itemAt(doc, lang, ver, blockId, itemId) {
    var r = RD.read(doc, lang, ver);
    if (!r) return null;
    var b = r.blocks.filter(function (x) { return x.isQuiz && x.id === blockId; })[0];
    return b ? b.items.filter(function (x) { return x.id === itemId; })[0] || null : null;
  }
  /* The shape a saved answer depends on: the type, the option ids and the right answer, the number of blanks (and, in one
     language, what each accepts). A wording change keeps the shape. */
  function shape(it, withText) {
    if (!it) return "none";
    if (it.isChoice) return "choice|" + it.options.map(function (o) { return o.id; }).sort().join(",") + "|" + it.answer.slice().sort().join(",");
    if (it.isCloze) return "cloze|" + it.blanks + (withText ? "|" + it.accepted.map(function (a) { return a.map(norm).sort().join("/"); }).join(",") : "");
    return it.type;
  }
  /* What a member sees of their latest saved attempt on an item when the block opens (S3: the latest attempt shows).
     An attempt made earlier in this canvas session counts as soon as it is sent; a failed send has already left the
     history (settleHist), since it never reached the server. */
  function savedState(view, block, item, hist) {
    var list = attemptsFor(hist, view.doc, block.id, item.id);
    if (!list.length) return null;
    var att = list[list.length - 1], st = fresh();
    var sameLang = att.lang === view.lang;
    var then = itemAt(view.doc, att.lang, att.version, block.id, item.id);
    var where = sameLang ? "v" + att.version : LANGN[att.lang] + " v" + att.version;
    if (item.isCloze && !sameLang) {
      st.note = "You answered this in " + LANGN[att.lang] + " on " + day(att.answered_at) + ". Typed answers stay in their language, so it starts fresh here.";
      return st;
    }
    if (shape(then, sameLang) !== shape(item, sameLang)) {
      st.note = "You answered a different version of this question (" + where + ", " + day(att.answered_at) + "), so it starts fresh here.";
      return st;
    }
    st.ph = "graded";
    st.origin = "saved";
    if (att.response.selected) st.sel = att.response.selected.slice();
    if (att.response.blanks) st.blanks = att.response.blanks.slice();
    if (att.response.self_grade) st.self = att.response.self_grade;
    st.correct = !!att.correct;
    st.prov = "Your answer from " + day(att.answered_at) + (sameLang ? (att.version !== view.ver ? ", on v" + att.version : "") : ", in " + where);
    return st;
  }
  function effective(view, block, item, bundle, member) {
    var live = bundle.qz && bundle.qz[keyOf(view, block.id, item.id)];
    if (live) return live;
    if (member) { var s = savedState(view, block, item, bundle.hist); if (s) return s; }
    return fresh();
  }

  /* Apply one action to the quiz bundle { qz, hist, sign, seq }. Returns the new bundle and, for a member's attempt,
     the send to complete ({ key, id }). Signed out, the first attempt in the view opens Sign in to save under it. */
  function dispatch(bundle, view, block, itemId, a, member) {
    var b = { qz: Object.assign({}, bundle.qz || {}), hist: (bundle.hist || []).slice(), sign: Object.assign({ at: null, closed: false }, bundle.sign || {}), seq: bundle.seq || 0 };
    var key = keyOf(view, block.id, itemId), send = null;
    if (a.t === "signclose") { b.sign.closed = true; return { bundle: b, send: null }; }
    var item = block.items.filter(function (x) { return x.id === itemId; })[0];
    if (!item) return { bundle: b, send: null };
    var r = reduce(item, effective(view, block, item, bundle, member), a);
    var st = r.st;
    if (r.graded) {
      if (member) {
        var before = attemptsFor(b.hist, view.doc, block.id, itemId);
        st.later = before.length > 0;
        b.seq += 1;
        st.save = "saving";
        st.sendId = b.seq;
        b.hist.push({ doc: view.doc, lang: view.lang, version: view.ver, block_id: block.id, item_id: itemId, item_type: item.type,
          response: response(item, st), correct: st.correct, attempt: before.length + 1, answered_at: NOW, session: true, send: b.seq });
        send = { key: key, id: b.seq };
      } else if (!b.sign.at && !b.sign.closed) b.sign.at = key;
    }
    b.qz[key] = st;
    return { bundle: b, send: send };
  }
  /* The history after a send's answer. A failed send never reached the server, so its attempt leaves the history: it
     never comes back on return, and the next attempt that saves is the first, the one review keeps. It lands whatever
     the item shows now (a reader who has moved on still has the attempt saved). */
  function settleHist(hist, send, outcome) {
    if (outcome !== "failed") return hist;
    return (hist || []).filter(function (a) { return a.send !== send.id; });
  }
  /* Whether an earlier attempt on the same item is in the history (review keeps that one). Null when the send is not. */
  function earlier(hist, send) {
    var i = -1;
    (hist || []).forEach(function (a, j) { if (a.send === send.id) i = j; });
    if (i < 0) return null;
    var me = hist[i];
    return hist.slice(0, i).some(function (a) { return a.doc === me.doc && a.block_id === me.block_id && a.item_id === me.item_id; });
  }
  /* A send's answer lands only on the attempt that started it. Pass the history as settleHist left it, so "later" is
     counted from the attempts that reached the server. */
  function settle(bundle, send, outcome) {
    var st = bundle.qz && bundle.qz[send.key];
    if (!st || st.sendId !== send.id || st.save !== "saving") return null;
    var qz = Object.assign({}, bundle.qz), o = outcome || "saved", n = { save: o };
    if (o === "saved" && bundle.hist) { var e = earlier(bundle.hist, send); if (e !== null) n.later = e; }
    qz[send.key] = Object.assign({}, st, n);
    return qz;
  }
  /* The whole bundle after a send's answer: the history first, then the item. */
  function land(bundle, send, outcome) {
    var hist = settleHist(bundle.hist, send, outcome);
    var qz = settle({ qz: bundle.qz, hist: hist }, send, outcome);
    return Object.assign({}, bundle, { hist: hist, qz: qz || bundle.qz });
  }

  /* ---------- the view model ---------- */
  function wordFor(item, st, g) {
    if (item.isRecall) return st.self === "got" ? { k: "got", word: "Got it", cls: "qz-st__word qz-st__word--ok" } : { k: "missed", word: "Missed it", cls: "qz-st__word qz-st__word--bad" };
    if (st.correct) return { k: "ok", word: "Correct", cls: "qz-st__word qz-st__word--ok" };
    var w = "Incorrect";
    if (g.partly && item.isChoice) w = "Incorrect · partly right";
    if (item.isCloze && item.blanks > 1) w = "Incorrect · " + g.rightCount + " of " + item.blanks + " blanks right";
    return { k: "bad", word: w, cls: "qz-st__word qz-st__word--bad" };
  }
  function subFor(st, member) {
    if (st.origin === "saved") return st.prov;
    if (!member) return "";
    if (st.save === "saving") return "Saving…";
    if (st.save === "failed") return "Not saved · check your connection";
    if (st.save === "saved") return st.later ? LONGSUB : "Saved for review";
    return "";
  }
  function parts(s) { return RD.koParts(s || "", true); }

  function itemView(block, item, env, total) {
    var view = env.view, member = !!view.member;
    var key = keyOf(view, block.id, item.id);
    var st = effective(view, block, item, env.bundle, member);
    var g = grade(item, st);
    var graded = st.ph === "graded";
    var domId = block.id + "--" + item.id;
    var act = function (a) { return function (e) { if (e && e.preventDefault && a.t !== "type") e.preventDefault(); env.act(item.id, a, e && e.currentTarget); }; };
    var v = {
      key: key, id: item.id, domId: domId, n: item.n, type: item.type,
      isChoice: !!item.isChoice, isSingle: !!(item.isChoice && !item.multi), isMulti: !!(item.isChoice && item.multi), isRecall: !!item.isRecall, isCloze: !!item.isCloze,
      lang: view.lang, prompt: item.prompt || [], explain: item.explain, hasExplain: !!item.hasExplain,
      isGraded: graded, isOpen: st.ph === "open", isRevealed: st.ph === "revealed",
      note: st.note || "", hasNote: !!st.note, noteParts: parts(st.note),
      promptId: domId + "-q"
    };
    v.hint = item.isRecall ? "Answer it in your head, then show the answer." : item.isCloze
      ? "Fill in the " + (item.blanks > 1 ? "blanks. Capitals and spaces around each answer don't count." : "blank. Capitals and spaces around the answer don't count.")
      : item.multi ? "Select all that apply." : "Choose one answer.";
    /* the grading margin: circled when right, struck through when wrong */
    v.nCls = "qz-n" + (graded ? (st.correct ? " qz-n--ok" : " qz-n--bad") : "");
    v.srLabel = "Question " + item.n + " of " + total + (graded ? (item.isRecall ? (st.self === "got" ? ", got it" : ", missed it") : st.correct ? ", correct" : ", incorrect") : "");

    /* the status cell: every sentence it can show, stacked in one cell, so it never changes height */
    var sub = subFor(st, member);
    var reserve = member ? (st.origin === "saved" ? st.prov : LONGSUB) : "";
    if (sub.length > reserve.length) reserve = sub;
    var cand = [];
    if (item.isRecall) cand = [{ k: "ask", word: "Did you get it?", cls: "qz-st__word" }, { k: "got", word: "Got it", cls: "qz-st__word qz-st__word--ok" }, { k: "missed", word: "Missed it", cls: "qz-st__word qz-st__word--bad" }];
    else if (item.isChoice && !item.multi) cand = [{ k: "ok", word: "Correct", cls: "qz-st__word qz-st__word--ok" }, { k: "bad", word: "Incorrect", cls: "qz-st__word qz-st__word--bad" }];
    else {
      cand = [{ k: "none", word: "", cls: "qz-st__word" },
        { k: "empty", word: "Nothing to check yet", cls: "qz-st__word", sub: item.isCloze ? "Fill in at least one blank first." : "Choose at least one answer first." },
        { k: "ok", word: "Correct", cls: "qz-st__word qz-st__word--ok" },
        { k: "bad", word: item.isCloze && item.blanks > 1 ? "Incorrect · " + Math.max(0, item.blanks - 1) + " of " + item.blanks + " blanks right" : item.multi ? "Incorrect · partly right" : "Incorrect", cls: "qz-st__word qz-st__word--bad" }];
    }
    var curK = "none", curWord = null;
    if (graded) { curWord = wordFor(item, st, g); curK = curWord.k; }
    else if (st.ph === "revealed") curK = "ask";
    else if (st.empty) curK = "empty";
    v.status = cand.map(function (c) {
      var on = c.k === curK || (curWord && c.k === "bad" && curK === "bad");
      var word = on && curWord ? curWord.word : c.word, cls = on && curWord ? curWord.cls : c.cls;
      var s = c.k === "empty" ? c.sub : c.k === "none" || c.k === "ask" ? "" : on ? sub : reserve;
      return { word: word, wordCls: cls, sub: s, hasSub: !!s, subParts: parts(s), cls: "qz-st" + (on ? "" : " is-off"), hidden: on ? undefined : "true" };
    });
    var liveWord = graded ? curWord.word : curK === "empty" ? "Nothing to check yet" : curK === "ask" ? "Answer shown. Did you get it?" : "";
    var liveSub = graded ? sub : curK === "empty" ? cand[1].sub : "";
    v.live = liveWord ? liveWord + (liveSub ? ". " + liveSub : "") : "";

    /* choice */
    if (item.isChoice) {
      var multi = !!item.multi, sel = st.sel || [];
      v.options = item.options.map(function (o) {
        var mine = sel.indexOf(o.id) >= 0, right = item.answer.indexOf(o.id) >= 0;
        var cls = "qz-opt" + (multi ? " qz-opt--multi" : ""), keyCls = "qz-key" + (multi ? " qz-key--sq" : ""), tag = "", tagCls = "qz-tag";
        if (!graded) { if (multi && mine) { cls += " is-sel"; keyCls += " is-sel"; } }
        else {
          cls += " is-done";
          if (mine && right) { cls += " is-ok-mine"; keyCls += " is-ok-mine"; tag = "Your answer · correct"; tagCls += " qz-tag--ok"; }
          else if (mine) { cls += " is-bad-mine"; keyCls += " is-bad-mine"; tag = "Your answer · incorrect"; tagCls += " qz-tag--bad"; }
          else if (right) { cls += " is-ok-other"; keyCls += " is-ok-other"; tag = "Correct answer"; tagCls += " qz-tag--ok"; }
        }
        var oid = domId + "-" + o.id;
        return { id: o.id, key: o.key, runs: o.runs, cls: cls, keyCls: keyCls, tag: tag, hasTag: !!tag, tagCls: tagCls,
          keyId: oid + "-k", textId: oid + "-t", tagId: oid + "-g", labelledby: oid + "-k " + oid + "-t" + (tag ? " " + oid + "-g" : ""),
          role: multi ? "checkbox" : undefined, checked: multi ? (mine ? "true" : "false") : undefined,
          disabled: graded ? "true" : undefined, first: o === item.options[0] ? "1" : undefined,
          pick: graded ? act({ t: "none" }) : act(multi ? { t: "toggle", opt: o.id } : { t: "pick", opt: o.id }) };
      });
      v.optsLabel = "Answers to question " + item.n;
    }
    /* recall */
    if (item.isRecall) {
      v.answer = item.answerRuns;
      v.showAnswer = st.ph !== "open";
      v.cardCls = "qz-card" + (st.ph === "open" ? " qz-card--hidden" : "");
      v.answerId = domId + "-a";
      v.onReveal = act({ t: "reveal" });
      v.onGot = act({ t: "self", v: "got" });
      v.onMissed = act({ t: "self", v: "missed" });
      v.gradeLayer = "qz-acts__layer" + (st.ph === "revealed" ? "" : " is-off");
      v.retryLayer = "qz-acts__layer" + (graded ? "" : " is-off");
      v.gradeHidden = st.ph === "revealed" ? undefined : "true";
      v.retryHidden = graded ? undefined : "true";
    }
    /* cloze */
    if (item.isCloze) {
      var oks = g.oks || [];
      v.segs = item.segs.map(function (s) {
        if (!s.isBlank) return { isText: true, isBlank: false, runs: s.runs };
        var val = (st.blanks || [])[s.n - 1] || "";
        var ok = !!oks[s.n - 1];
        return { isText: false, isBlank: true, runs: [], n: s.n, showN: item.blanks > 1, tail: s.tail || "", hasTail: !!s.tail, value: val, inputId: domId + "-b" + s.n,
          aria: "Blank " + s.n + " of " + item.blanks, readOnly: graded,
          cls: "qz-blank" + (graded ? (ok ? " is-ok" : " is-bad") : ""), first: s.n === 1 ? "1" : undefined,
          onChange: function (e) { env.act(item.id, { t: "type", n: s.n, v: e.target.value }, e.currentTarget); },
          onKey: function (e) { if (e.key === "Enter") { e.preventDefault(); env.act(item.id, { t: "check" }, e.currentTarget); } } };
      });
      v.acc = graded && !st.correct ? item.accepted.map(function (acc, i) {
        if (oks[i]) return null;
        var val = String((st.blanks || [])[i] || "").trim();
        return { n: i + 1, showN: item.blanks > 1, hasWrote: !!val, wrote: val, isEmpty: !val,
          accs: acc.map(function (x, j) { return { v: x, sep: j < acc.length - 1 ? (j === acc.length - 2 ? " or " : ", ") : "" }; }) };
      }).filter(Boolean) : [];
      v.hasAcc = v.acc.length > 0;
      v.accLabel = item.blanks > 1 ? "Accepted answers" : "Accepted answer";
    }
    /* the foot: choice-single shows it once graded; multi and cloze always (Check); recall once revealed */
    v.hasFoot = item.isRecall ? st.ph !== "open" : item.isChoice && !item.multi ? graded : true;
    v.mainRetry = graded;
    v.mainCls = "rd-btn qz-act " + (graded ? "rd-btn--quiet" : "rd-btn--secondary");
    v.checkCls = graded ? "is-off" : "";
    v.retryCls = graded ? "" : "is-off";
    v.onMain = graded ? act({ t: "retry" }) : act({ t: "check" });
    v.onRetry = act({ t: "retry" });
    v.hasResult = graded && (item.hasExplain || (item.isCloze && v.hasAcc)) && !item.isRecall;
    /* Sign in to save, once per view, under the first item a signed-out reader grades */
    var sign = env.bundle.sign || {};
    v.showSave = !member && sign.at === key && !sign.closed;
    v.onSignIn = function (e) { if (e && e.preventDefault) e.preventDefault(); env.act(item.id, { t: "signin" }, e && e.currentTarget); };
    v.onSignClose = function () { env.act(item.id, { t: "signclose" }, null); };
    v.place = view.place || "chapter";
    return v;
  }

  function view(block, env) {
    var total = block.items.length;
    var items = block.items.map(function (it) { return itemView(block, it, env, total); });
    var answered = items.filter(function (x) { return x.isGraded; }).length;
    return {
      id: block.id, title: block.title, titleParts: block.titleParts, hasTitle: !!block.hasTitle,
      label: "Quiz · " + total + (total === 1 ? " question" : " questions"),
      count: answered + " of " + total + " answered", hasCount: total > 1, countCls: "qz__count" + (answered > 0 ? "" : " is-off"),
      countHidden: answered > 0 ? undefined : "true",
      name: block.hasTitle ? "Quiz: " + block.title : "Quiz", titleId: block.id + "--title",
      items: items
    };
  }

  RD.quiz = { norm: norm, grade: grade, reduce: reduce, dispatch: dispatch, settle: settle, settleHist: settleHist, land: land, view: view, keyOf: keyOf, effective: effective,
    fresh: fresh, day: day, NOW: NOW,
    block: function (doc, lang, ver, id) {
      var r = RD.read(doc, lang, ver);
      return r ? r.blocks.filter(function (x) { return x.isQuiz && (!id || x.id === id); })[0] || null : null;
    },
    viewOf: function (doc, lang, ver, member) {
      var r = RD.read(doc, lang, ver), ctx = RD.ctx(doc) || {};
      return r ? { doc: doc, lang: r.lang, ver: r.version, newest: r.newest, member: member === undefined ? true : !!member, place: ctx.loose ? "document" : "chapter" } : null;
    },
    /* Drawn alone (a Components board, a mounted part), the chapter's headings are not on the board: an in-chapter
       link then points at the top, as the reader's own Components boards do. Copies; never touches the parsed block. */
    relink: function relink(o) {
      if (Array.isArray(o)) return o.map(relink);
      if (!o || typeof o !== "object") return o;
      var n = {};
      Object.keys(o).forEach(function (k) { n[k] = relink(o[k]); });
      if (n.isLink && typeof n.href === "string" && n.href.charAt(0) === "#" && n.href !== "#top") n.href = "#top";
      return n;
    },
    /* After a click, focus goes where the next step is (Try again → the first option, blank or Show answer). */
    focus: null,
    want: function (origin, itemDom, sel) { RD.quiz.focus = { origin: origin, item: itemDom, sel: sel, at: Date.now() }; },
    flush: function (root) {
      var f = RD.quiz.focus;
      if (!f || !root || Date.now() - f.at > 3000) return;
      if (f.origin && f.origin.isConnected && !root.contains(f.origin)) return;
      var scope = f.origin && f.origin.closest ? f.origin.closest(".qz") : null;
      var host = scope && root.contains(scope) ? scope : root;
      var el = host.querySelector('[id="' + f.item + '"] ' + f.sel);
      if (el) { RD.quiz.focus = null; el.focus({ preventScroll: true }); }
    }
  };
})();

/* ---------- The quiz data (job 04-quiz, canvas only) ----------
   The maintainer guide's choice questions are its real, public quizzes (origin/main, docs/knowledge/*.html, "Quiz"):
   chapter 2's questions 1, 2, 3 and 5 and chapter 1's question 1. Everything else was written for this canvas: the
   multi-answer, recall and cloze items on the guide's own subjects, their Korean translation (same item and option
   ids), Tidewater's twenty questions (an invented book) and the money-notes document (an invented loose document).
   A signed-in reader's saved attempts follow the S2 payload; the reader is invented and has no email. */
(function () {
  "use strict";
  var RD = window.RD;
  function q(lines) { return lines.join("\n"); }

  var RC = [
    "  - id: read-column",
    "    type: choice",
    "    prompt: \"You are adding a feature that records who last read each document. Storing it as a new column on the SQLite `documents` table is a bad idea. Why?\"",
    "    options:",
    "      - id: a",
    "        text: \"SQLite cannot add columns to an existing table without a full rebuild\"",
    "      - id: b",
    "        text: \"The content database is a projection of the files — anything not re-derivable from disk is lost on the next reindex\"",
    "      - id: c",
    "        text: \"The FTS5 trigger trio would need updating, which is a breaking change\"",
    "      - id: d",
    "        text: \"Read tracking belongs to the usage plane, which forbids new columns\"",
    "    answer: [b]",
    "    explain: \"Reindex rebuilds every row from the files on disk, so a column with no file-derived source is silently wiped on the next boot. This is the same trap the version-history design had to avoid: bodies live in `.versions/` files and the table is derived from them. Durable-but-not-file-derived data belongs in the Postgres accounts plane instead.\""
  ];
  var PL = [
    "  - id: publish-in-lock",
    "    type: choice",
    "    prompt: \"A publish task must be submitted from outside the write lock. What goes wrong if you submit while holding it?\"",
    "    options:",
    "      - id: a",
    "        text: \"The task runs before the response, reintroducing the timeout bug\"",
    "      - id: b",
    "        text: \"The queue rejects the submission and the push is silently dropped\"",
    "      - id: c",
    "        text: \"The task re-takes the same non-reentrant lock, so it deadlocks as soon as the worker runs it\"",
    "      - id: d",
    "        text: \"Two workers start, and concurrent rebases corrupt the working tree\"",
    "    answer: [c]",
    "    explain: \"The push task takes `WRITE_LOCK` itself because a rebase mutates the working tree, and `threading.Lock` is not reentrant. Submitting is only a queue append and never blocks — the deadlock happens later, on the worker thread, which is what makes it an easy mistake to ship.\""
  ];
  var TP = [
    "  - id: two-planes",
    "    type: choice",
    "    prompt: \"Which of these live in the [accounts plane](#the-two-planes), not in the content plane?\"",
    "    options:",
    "      - id: a",
    "        text: \"The org's slug\"",
    "      - id: b",
    "        text: \"A document's body\"",
    "      - id: c",
    "        text: \"API keys\"",
    "      - id: d",
    "        text: \"The full-text search index\"",
    "    answer: [a, c]",
    "    explain: \"Slugs and keys must survive a reindex, so they live in Postgres. A body is a file, and the search index is rebuilt from the files.\""
  ];
  function relPath(withE) {
    return [
      "  - id: rel-path",
      "    type: choice",
      "    prompt: \"An agent re-publishes a markdown document as HTML, passing the existing document's `rel_path` as the version target. What does the API do?\"",
      "    options:",
      "      - id: a",
      "        text: \"Archives the old body and writes the HTML at the same path, changing the extension\"",
      "      - id: b",
      "        text: \"Answers 422 — a version chain cannot change a document's format or project\"",
      "      - id: c",
      "        text: \"Silently creates a second document and returns 201 with a new id\"",
      "      - id: d",
      "        text: \"Answers 409, since a document already exists at that path\""
    ].concat(withE ? ["      - id: e", "        text: \"Converts the HTML to extracted text and stores it as markdown\""] : []).concat([
      "    answer: [b]",
      "    explain: \"Identity is immutable across a version chain, and the 422 says so explicitly (“publish it as a new document instead”). The reason is structural: `rel_path` encodes both the project directory and the file extension, and the archive directory sits beside it — so a format change is not the same document by any definition the storage layer recognizes.\""
    ]);
  }
  var PJ = [
    "  - id: projection",
    "    type: recall",
    "    prompt: \"In one sentence: why is the content database called a *projection*?\"",
    "    answer: \"Every row is derived from the files on disk, so `reindex` can rebuild it at any time; nothing in it is the source of truth.\"",
    "    explain: \"That is why durable data that no file holds, such as who read what, lives in the Postgres accounts plane.\""
  ];
  var WP = [
    "  - id: write-path",
    "    type: cloze",
    "    text: \"A write takes the {{write lock|WRITE_LOCK}}, saves the file, updates the {{SQLite}} index and commits to {{git}}. Org slugs and API keys live elsewhere, in {{PostgreSQL|Postgres}}.\"",
    "    explain: \"The push to the remote comes later, on the [publish worker](#the-publish-worker), which is why the API can answer before it.\""
  ];
  var DM = [
    "  - id: dormant",
    "    type: choice",
    "    prompt: \"An operator sets `DATABASE_URL` to nothing and restarts. What happens?\"",
    "    options:",
    "      - id: a",
    "        text: \"The process fails to boot, since the accounts tables are required\"",
    "      - id: b",
    "        text: \"It boots but every `/api/*` request answers 401 with no way to authenticate\"",
    "      - id: c",
    "        text: \"The accounts engine is never created and `/api/*` behaves as the single-tenant, single-token deployment\"",
    "      - id: d",
    "        text: \"The content plane switches to Postgres and SQLite is retired\"",
    "    answer: [c]",
    "    explain: \"The accounts plane is a lazy singleton: unset `DATABASE_URL` means no engine is ever created and the content plane behaves byte-for-byte like the pre-multi-tenant deployment, gated by a legacy regression suite. This dormancy is what makes the open-core scaffold possible — a self-hoster runs the same code as the SaaS with one variable unset.\""
  ];
  var EN_V2 = q(["```quiz #check", "title: Check what stuck", "items:"].concat(RC, PL, TP, relPath(true), PJ, WP, DM, ["```"]));
  var EN_V1 = q(["```quiz #check", "title: Check what stuck", "items:"].concat(RC, PL, relPath(false), PJ, WP, ["```"]));
  var KO_V1 = q([
    "```quiz #check",
    "title: 배운 것 확인하기",
    "items:",
    "  - id: read-column",
    "    type: choice",
    "    prompt: \"각 문서를 마지막으로 읽은 사람을 기록하는 기능을 추가하려고 합니다. 이를 SQLite `documents` 테이블의 새 열로 저장하는 것은 나쁜 생각입니다. 왜일까요?\"",
    "    options:",
    "      - id: a",
    "        text: \"SQLite는 테이블을 통째로 다시 만들지 않고는 기존 테이블에 열을 추가할 수 없다\"",
    "      - id: b",
    "        text: \"콘텐츠 데이터베이스는 파일의 투영이다. 디스크에서 다시 만들 수 없는 것은 다음 재색인 때 사라진다\"",
    "      - id: c",
    "        text: \"FTS5 트리거 세 개를 고쳐야 하고, 이는 호환을 깨는 변경이다\"",
    "      - id: d",
    "        text: \"읽기 기록은 사용량 평면에 속하고, 그 평면은 새 열을 금지한다\"",
    "    answer: [b]",
    "    explain: \"재색인은 디스크의 파일에서 모든 행을 다시 만들기 때문에, 파일에서 나오지 않는 열은 다음 부팅 때 조용히 지워집니다. 버전 기록 설계가 피해야 했던 것도 같은 함정입니다. 본문은 `.versions/` 파일에 있고 표는 그 파일에서 만들어집니다. 파일에서 나오지 않지만 오래 남아야 하는 데이터는 Postgres 계정 평면에 둡니다.\"",
    "  - id: publish-in-lock",
    "    type: choice",
    "    prompt: \"발행 작업은 쓰기 잠금 밖에서 제출해야 합니다. 잠금을 쥔 채 제출하면 무엇이 잘못될까요?\"",
    "    options:",
    "      - id: a",
    "        text: \"작업이 응답보다 먼저 실행되어 시간 초과 버그가 다시 생긴다\"",
    "      - id: b",
    "        text: \"큐가 제출을 거부하고 푸시가 조용히 사라진다\"",
    "      - id: c",
    "        text: \"작업이 재진입할 수 없는 같은 잠금을 다시 잡으려 해서, 워커가 실행하는 순간 교착 상태에 빠진다\"",
    "      - id: d",
    "        text: \"워커 두 개가 시작되고, 동시에 일어난 리베이스가 작업 트리를 망가뜨린다\"",
    "    answer: [c]",
    "    explain: \"푸시 작업은 리베이스가 작업 트리를 바꾸기 때문에 스스로 `WRITE_LOCK`을 잡고, `threading.Lock`은 재진입할 수 없습니다. 제출은 큐에 넣기만 하고 막히지 않으므로, 교착은 나중에 워커 스레드에서 일어납니다. 그래서 놓치기 쉬운 실수입니다.\"",
    "  - id: rel-path",
    "    type: choice",
    "    prompt: \"에이전트가 마크다운 문서를 HTML로 다시 발행하면서, 기존 문서의 `rel_path`를 버전 대상으로 넘깁니다. API는 어떻게 할까요?\"",
    "    options:",
    "      - id: a",
    "        text: \"이전 본문을 보관하고, 확장자를 바꿔 같은 경로에 HTML을 쓴다\"",
    "      - id: b",
    "        text: \"422로 답한다. 버전 체인은 문서의 형식이나 프로젝트를 바꿀 수 없다\"",
    "      - id: c",
    "        text: \"조용히 두 번째 문서를 만들고 새 id와 함께 201을 돌려준다\"",
    "      - id: d",
    "        text: \"그 경로에 이미 문서가 있으므로 409로 답한다\"",
    "    answer: [b]",
    "    explain: \"버전 체인 동안 문서의 정체성은 바뀌지 않으며, 422 응답이 이를 분명히 말합니다(“새 문서로 발행하세요”). `rel_path`에는 프로젝트 디렉터리와 파일 확장자가 함께 들어 있고 보관 디렉터리가 그 옆에 있으므로, 형식이 바뀌면 저장 계층이 아는 어떤 정의로도 같은 문서가 아닙니다.\"",
    "  - id: projection",
    "    type: recall",
    "    prompt: \"한 문장으로: 콘텐츠 데이터베이스를 왜 *투영*이라고 부를까요?\"",
    "    answer: \"모든 행이 디스크의 파일에서 나오므로 `reindex`가 언제든 다시 만들 수 있고, 그 안의 어떤 것도 원본이 아니기 때문입니다.\"",
    "    explain: \"그래서 누가 무엇을 읽었는지처럼 어떤 파일에도 없는 오래 남을 데이터는 Postgres 계정 평면에 둡니다.\"",
    "  - id: write-path",
    "    type: cloze",
    "    text: \"쓰기는 {{쓰기 잠금|WRITE_LOCK}}을 잡고, 파일을 저장하고, {{SQLite}} 색인을 갱신하고, {{git}}에 커밋합니다. 조직 슬러그와 API 키는 다른 곳, {{PostgreSQL|Postgres}}에 있습니다.\"",
    "    explain: \"원격 저장소로의 푸시는 나중에 발행 워커에서 일어납니다. 그래서 API가 푸시보다 먼저 답할 수 있습니다.\"",
    "```"
  ]);
  var ONE = q([
    "```quiz #check",
    "items:",
    "  - id: explain-new-project",
    "    type: choice",
    "    prompt: \"A user runs `/knowledge:explain` inside a repo called `payments-api`, but has never created a project by that name. What happens?\"",
    "    options:",
    "      - id: a",
    "        text: \"The save fails with a 404 until the project is created in the web app\"",
    "      - id: b",
    "        text: \"The document is filed under the org's `default` project instead\"",
    "      - id: c",
    "        text: \"The project is created on the spot and the document is filed under it, privately\"",
    "      - id: d",
    "        text: \"The agent is prompted to pick an existing project before it can save\"",
    "    answer: [c]",
    "    explain: \"Projects are get-or-create by name (P18) — no client flow has a “create a project” step. The skill sends the repo's directory name as the project, and a project that does not exist is created. It is private by default (P19), including when implicitly created — that default is exactly what stops an implicit project from leaking.\"",
    "```"
  ]);
  /* Tidewater (an invented book): twenty questions on the harmonic model, with two options and six, multi-answer,
     recall and a five-blank cloze. */
  function ch(id, prompt, opts, ans, explain) {
    var L = ["  - id: " + id, "    type: choice", "    prompt: \"" + prompt + "\"", "    options:"];
    opts.forEach(function (o, i) { L.push("      - id: " + "abcdef".charAt(i)); L.push("        text: \"" + o + "\""); });
    L.push("    answer: [" + ans + "]");
    if (explain) L.push("    explain: \"" + explain + "\"");
    return L;
  }
  function rc(id, prompt, answer, explain) {
    var L = ["  - id: " + id, "    type: recall", "    prompt: \"" + prompt + "\"", "    answer: \"" + answer + "\""];
    if (explain) L.push("    explain: \"" + explain + "\"");
    return L;
  }
  var TW = q(["```quiz #twenty", "title: Twenty questions on the model", "items:"].concat(
    ch("sum-of-waves", "Tidewater predicts a harbour's tide as one wave, or as many?", ["One wave, scaled to the harbour", "Many waves, added together"], "b",
      "Each constituent is a wave with its own period, amplitude and phase; a prediction is their sum."),
    ch("m2-period", "What is the period of M2, the principal lunar semidiurnal constituent?", ["12.00 hours", "12.42 hours", "23.93 hours", "24.84 hours"], "b",
      "M2 follows the moon, whose day is about 24 hours 50 minutes, so its two highs come 12.42 hours apart."),
    rc("s2-period", "Which constituent has a period of exactly 12 hours, and why exactly?", "S2, the principal solar semidiurnal constituent: it follows the sun, and the solar day is 24 hours by definition."),
    ch("spring-tides", "When do spring tides happen?", ["In spring, from March to May", "At new moon and full moon", "At the quarter moons", "When the moon is closest to the earth", "Twice a year, at the equinoxes", "Whenever M2 and K1 peak together"], "b",
      "Spring tides have nothing to do with the season: at new and full moon the sun and the moon pull in line, so M2 and S2 add up. At the quarter moons they work against each other, and the tides are neap."),
    ch("stored", "What does Tidewater store for each constituent at a harbour?", ["An amplitude", "A phase", "A period", "The harbour's datum"], "a, b",
      "Amplitude and phase are measured per harbour. A constituent's period is the same everywhere, so it lives in the code; the datum belongs to the harbour as a whole."),
    ["  - id: predict-a-minute", "    type: cloze",
      "    text: \"To predict one minute, Tidewater takes each {{constituent}}, works out its {{phase|phase angle}} at that minute from its {{speed|angular speed}}, multiplies the cosine by its {{amplitude}}, and adds them all to the {{mean sea level|mean level|MSL}}.\"",
      "    explain: \"Written out, h(t) = Z₀ + Σ A cos(ωt − φ), one term per constituent.\""],
    ch("diurnal", "K1 and O1 are diurnal constituents. How many highs does each bring in a day?", ["One", "Two", "Four", "None; they only shift the timing"], "a",
      "Diurnal means daily: one high and one low per cycle, about 23.93 hours for K1 and 25.82 hours for O1."),
    ch("how-many", "How many constituents does Tidewater use for most harbours?", ["4", "8", "37", "128"], "c",
      "Thirty-seven covers most harbours; a few shallow estuaries need more, for the overtides shallow water makes."),
    rc("mixed-tide", "What is a mixed tide?", "Two highs a day of clearly different heights: the diurnal constituents are strong enough to make one high taller than the other."),
    ch("phase-meaning", "In a harbour's harmonic table, what does a constituent's phase say?", ["How tall that wave is there", "How late that wave peaks there, behind its astronomical cause", "Which day of the month it starts", "Its period, in degrees"], "b",
      "The phase, or epoch, is the lag in degrees between the astronomical pull and that wave's peak at the harbour."),
    ch("amplitude-units", "Are amplitudes stored in metres, or as fractions of the mean range?", ["Metres", "Fractions of the mean range"], "a",
      "Metres, at the harbour, so a prediction adds them up without a conversion."),
    ch("nodal", "Why do the lunar constituents get a small correction each year?", ["The plane of the moon's orbit turns over an 18.6-year cycle", "Leap years shift the calendar", "Harbours silt up", "Gauges drift"], "a",
      "As the moon's nodes regress over 18.61 years, the lunar constituents grow and shrink a little; the nodal factors f and u correct for it. [NOAA's harmonic constituents](https://tidesandcurrents.noaa.gov/harcon.html) list them per station."),
    ch("bigger-tides", "Which of these make tides larger than usual?", ["Spring tides", "The moon at perigee", "Neap tides", "The moon at apogee", "A first-quarter moon"], "a, b",
      "Spring tides add M2 and S2, and at perigee the moon is nearest and pulls hardest. Neap tides, apogee and the quarter moons all make tides smaller."),
    rc("overtides", "Why do shallow estuaries need overtides such as M4?", "In shallow water the tide slows in its troughs and steepens, which adds waves at multiples of the main frequencies; M4 runs at twice M2's speed."),
    ch("fit", "How does Tidewater get a new harbour's amplitudes and phases?", ["A least-squares fit to at least a year of gauge readings", "It copies them from the nearest harbour", "It reads them from a global model", "It averages the first week of readings"], "a",
      "The fit finds the amplitude and phase of each constituent that best explain the readings; a year is long enough to separate constituents whose speeds are close."),
    ch("datum", "Predictions are printed as heights above which level?", ["Mean sea level", "Chart datum", "The gauge's zero", "The harbour wall"], "b",
      "Tide tables give heights above chart datum, so a printed height is the water you gain over the charted depth; [the datums chapter](chapter:tidewater/datums) covers the conversion."),
    ch("step", "At what step does Tidewater precompute predictions?", ["Every second", "Every minute", "Every hour", "Only at highs and lows"], "b",
      "A minute is fine enough for a tide table, and coarse enough to cache a year ahead."),
    ch("cached", "Is a prediction worked out again each time a reader asks for it?", ["Yes, every time", "No, it comes from the prediction cache"], "b",
      "It is served from [the prediction cache](chapter:tidewater/prediction-cache), filled a year ahead."),
    ch("residual", "A storm surge shows up in the residual. What is the residual?", ["Observed height minus predicted height", "Predicted height minus chart datum", "The highest astronomical tide", "The gauge's error"], "a",
      "Whatever the astronomical tide does not explain is left in the residual: surges, river flow and the gauge's own noise."),
    rc("surge", "Why can't the harmonic model predict a storm surge?", "A surge is driven by wind and air pressure, not by the moon and the sun, so it has no constant period to add as a wave."),
    ["```"]));
  var MONEY = [
    "## The rule of 72 {#rule-of-72}",
    "",
    "Divide 72 by the yearly rate in percent and you get, roughly, the years it takes money to double. At 6% that is 72 ÷ 6 = 12 years; the exact answer is 11.9.",
    "",
    "## Monthly compounding {#monthly}",
    "",
    "A rate of 6% a year paid monthly is 0.5% a month. Twelve months of 0.5% give 1.005¹² = 1.0617, so the effective yearly rate is 6.17%, not 6%.",
    "",
    "```quiz #try-it",
    "title: Try it",
    "items:",
    "  - id: double-at-8",
    "    type: cloze",
    "    text: \"At 8% a year, the rule of {{72|seventy-two}} says money doubles in about {{9|nine}} years.\"",
    "  - id: monthly-worth-more",
    "    type: recall",
    "    prompt: \"Why is 6% paid monthly worth more than 6% paid once a year?\"",
    "    answer: \"Each month's interest earns interest in the months after it: 1.005¹² = 1.0617, an effective 6.17% a year.\"",
    "    explain: \"The same idea, at a daily step, is in [my notes on rates](doc:money-notes/rates).\"",
    "  - id: more-or-less",
    "    type: choice",
    "    prompt: \"Is 1.06¹² more or less than 2?\"",
    "    options:",
    "      - id: a",
    "        text: \"More\"",
    "      - id: b",
    "        text: \"Less\"",
    "    answer: [a]",
    "    explain: \"1.06¹² = 2.012, so at 6% money doubles in just under 12 years, as the rule of 72 says.\"",
    "  - id: under-ten",
    "    type: choice",
    "    prompt: \"Which yearly rates double money in under ten years?\"",
    "    options:",
    "      - id: a",
    "        text: \"5%\"",
    "      - id: b",
    "        text: \"6%\"",
    "      - id: c",
    "        text: \"8%\"",
    "      - id: d",
    "        text: \"10%\"",
    "    answer: [c, d]",
    "    explain: \"72 ÷ 8 = 9 and 72 ÷ 10 = 7.2; at 6% it takes 12 years and at 5% about 14.\"",
    "```"
  ].join("\n");

  var I = RD.docs["maintainer-guide/internals"].variants;
  var v2 = I.en.versions[2], v1 = I.en.versions[1], k1 = I.ko.versions[1];
  var cut = "## What changed since v1 {#what-changed}";
  if (v2.src.indexOf(cut) >= 0 && v2.src.indexOf("```quiz") < 0) v2.src = v2.src.replace(cut, EN_V2 + "\n\n" + cut);
  if (v1.src.indexOf("```quiz") < 0) v1.src = v1.src.replace(/\s*$/, "\n\n" + EN_V1 + "\n");
  if (k1.src.indexOf("```quiz") < 0) k1.src = k1.src.replace(/\s*$/, "\n\n" + KO_V1 + "\n");
  var W1 = RD.docs["maintainer-guide/what-it-is"].variants.en.versions[1];
  if (W1.src.indexOf("```quiz") < 0) W1.src = W1.src.replace(/\s*$/, "\n\n" + ONE + "\n");
  var H1 = RD.docs["tidewater/harmonic-model"].variants.en.versions[1];
  if (H1.src.indexOf("```quiz") < 0) H1.src = H1.src.replace(/\s*$/, "\n\n" + TW + "\n");
  RD.docs["doc/money-notes/compound-interest"] = { loose: true, project: "money-notes", format: "native", variants: { en: { newest: 1, versions: { 1: {
    title: "Compound interest, worked by hand", date: "15 Oct 2026",
    summary: "The rule of 72, and why a rate paid monthly is worth a little more than the same rate paid once a year.",
    src: MONEY } } } } };

  /* A signed-in reader's saved attempts (S2 payload: response, correct, attempt, version, answered_at). */
  var MG = "maintainer-guide/internals";
  function A(doc, lang, ver, block, item, type, resp, ok, n, at) {
    return { doc: doc, lang: lang, version: ver, block_id: block, item_id: item, item_type: type, response: resp, correct: ok, attempt: n, answered_at: at };
  }
  RD.quizHist = {
    reader: "Ari Han (invented; no email)",
    internals: [
      A(MG, "en", 1, "check", "read-column", "choice", { selected: ["a"] }, false, 1, "2026-08-09T18:20:00Z"),
      A(MG, "en", 2, "check", "read-column", "choice", { selected: ["b"] }, true, 2, "2026-10-12T19:04:00Z"),
      A(MG, "en", 1, "check", "publish-in-lock", "choice", { selected: ["a"] }, false, 1, "2026-08-09T18:22:00Z"),
      A(MG, "en", 1, "check", "rel-path", "choice", { selected: ["d"] }, false, 1, "2026-08-09T18:23:00Z"),
      A(MG, "en", 2, "check", "projection", "recall", { self_grade: "missed" }, false, 1, "2026-10-12T19:06:00Z"),
      A(MG, "en", 2, "check", "write-path", "cloze", { blanks: ["write lock", "sqlite", " Git ", "Postgress"] }, false, 1, "2026-10-12T19:08:00Z")
    ],
    tidewater: [
      A("tidewater/harmonic-model", "en", 1, "twenty", "sum-of-waves", "choice", { selected: ["b"] }, true, 1, "2026-10-14T07:41:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "m2-period", "choice", { selected: ["a"] }, false, 1, "2026-10-14T07:42:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "s2-period", "recall", { self_grade: "got" }, true, 1, "2026-10-14T07:43:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "spring-tides", "choice", { selected: ["b"] }, true, 1, "2026-10-14T07:44:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "stored", "choice", { selected: ["a", "b"] }, true, 1, "2026-10-14T07:46:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "predict-a-minute", "cloze", { blanks: ["constituent", "phase", "frequency", "amplitude", "MSL"] }, false, 1, "2026-10-14T07:49:00Z"),
      A("tidewater/harmonic-model", "en", 1, "twenty", "diurnal", "choice", { selected: ["a"] }, true, 1, "2026-10-14T07:50:00Z")
    ]
  };
})();
