/* Canvas only, never built: the annotation layer's engine for the reader canvas (job 05-annotations).
   The product anchors and re-anchors on the server (S3) and the page only paints what it is given. On the canvas this
   file plays both parts: it lays a chapter's blocks out into sections (an id'd block and the blocks after it, up to the
   next id'd block), finds each highlight's quote in its section, works out the anchor status for the version on screen,
   and splits the text runs so every board can draw the paint as markup (<mark>). The seed data is at the end of this file. */
(function () {
  "use strict";
  var RD = window.RD;
  var AN = (RD.an = RD.an || {});
  var LANG = { en: "English", ko: "한국어" };
  AN.LANG = LANG;

  /* ---------- containers and sections ---------- */
  /* A container is one run of text a highlight can live in: a paragraph, a list item, a quote's paragraph, a callout's
     title or paragraph, a table cell, or a code block (its lines joined by "\n"). Headings and a typed block's title
     and caption are containers too, of kind "head" and "cap": they take a note or a bookmark, never a highlight. */
  function partsOf(r) {
    if (r.kind === "text") return [{ v: r.v, isKo: false }];
    if (r.kind === "ko") return [{ v: r.v, isKo: true }];
    if (r.kind === "code") return [{ v: r.v, isKo: false }];
    return (r.parts || []).map(function (p) { return { v: p.v, isKo: !!p.isKo }; });
  }
  function runsText(runs) { return (runs || []).map(function (r) { return partsOf(r).map(function (p) { return p.v; }).join(""); }).join(""); }
  function codeText(lines) { return lines.map(function (l) { return l.toks.map(function (t) { return t.v; }).join(""); }).join("\n"); }
  function partsText(parts) { return (parts || []).map(function (p) { return p.v; }).join(""); }
  AN.runsText = runsText;
  /* A note's language, for line breaking: Korean when it has more Hangul than Latin letters. */
  AN.langOf = function (text, fallback) {
    var t = String(text || ""), ko = (t.match(/[\uac00-\ud7a3]/g) || []).length, la = (t.match(/[A-Za-z]/g) || []).length;
    if (!ko && !la) return fallback || "en";
    return ko > la ? "ko" : "en";
  };

  var BLOCK_WORD = { diagram: "Diagram", quiz: "Quiz", figure: "Figure", sources: "Sources" };

  /* Walks the blocks once. Returns the sections in order, each with its passage text (passage containers joined by
     "\n") and its containers; and a key for every container, so the boards can mark them up. Cached per block array. */
  var LAY = typeof WeakMap === "function" ? new WeakMap() : null;
  AN.layout = function (blocks, native) {
    if (LAY && LAY.has(blocks) && LAY.get(blocks).native === native) return LAY.get(blocks);
    var secs = {}, order = [], conts = [], cur = "", pre = false;
    function sec(id, title, kind, bi) {
      cur = id;
      if (!secs[id]) { secs[id] = { id: id, title: title, kind: kind, bi: bi, text: "", conts: [], n: order.length }; order.push(id); }
    }
    function add(key, kind, text, owner) {
      var c = { key: key, kind: kind, text: text, sec: native ? cur : "", base: -1, owner: owner };
      if (native && cur && (kind === "p" || kind === "code")) {
        var S = secs[cur];
        if (S.conts.length) S.text += "\n";
        c.base = S.text.length;
        S.text += text;
        S.conts.push(c);
      }
      if (native && !cur && (kind === "p" || kind === "code")) pre = true;
      conts.push(c);
      return c;
    }
    blocks.forEach(function (b, i) {
      var k = "b" + i;
      if (b.k === "h") {
        if (native && b.id) sec(b.id, b.text, "h" + b.level, i);
        add(k, "head", b.text, b);
      } else if (b.k === "p") add(k, "p", runsText(b.runs), b);
      else if (b.k === "list") {
        b.items.forEach(function (it, j) {
          add(k + "." + j, "p", runsText(it.runs), it);
          if (it.sub) it.sub.items.forEach(function (s, m) { add(k + "." + j + "." + m, "p", runsText(s.runs), s); });
        });
      } else if (b.k === "quote") {
        b.body.forEach(function (q, m) { if (q.runs) add(k + ".q" + m, "p", runsText(q.runs), q); });
      } else if (b.k === "callout") {
        if (b.hasTitle) add(k + ".t", "p", partsText(b.titleParts), b);
        b.body.forEach(function (c, m) {
          if (c.k === "p") add(k + ".c" + m, "p", runsText(c.runs), c);
          else if (c.k === "list") c.items.forEach(function (it, j) { add(k + ".c" + m + "." + j, "p", runsText(it.runs), it); });
          else if (c.k === "code") add(k + ".c" + m, "code", codeText(c.lines), c);
        });
      } else if (b.k === "code") add(k, "code", codeText(b.lines), b);
      else if (b.k === "table") {
        b.head.forEach(function (h, c) { add(k + ".h" + c, "p", partsText(h.parts), h); });
        b.rows.forEach(function (row, r) { row.cells.forEach(function (c, j) { add(k + ".r" + r + "." + j, "p", runsText(c.runs), c); }); });
      } else if (b.k === "diagram") {
        if (native && b.id) sec(b.id, b.title, "diagram", i);
        add(k + ".t", "cap", b.title, b);
        if (b.hasCaption) add(k + ".c", "cap", runsText(b.caption), b);
      }
    });
    var out = { secs: secs, order: order, conts: conts, pre: pre, native: native };
    if (LAY) LAY.set(blocks, out);
    return out;
  };

  /* The section's title as a reader sees it: a heading's text, or "Diagram · its title" for a typed block. */
  AN.secLabel = function (S) {
    if (!S) return "";
    return BLOCK_WORD[S.kind] ? BLOCK_WORD[S.kind] + " · " + S.title : S.title;
  };

  /* ---------- finding a quote ---------- */
  AN.locate = function (text, q) {
    var ex = q && q.exact;
    if (!ex) return -1;
    var best = -1, bestScore = -1, i = text.indexOf(ex);
    while (i >= 0) {
      var sc = 0, pre = q.prefix || "", suf = q.suffix || "";
      if (pre) { var p = text.slice(Math.max(0, i - pre.length), i); sc += p === pre ? 2 : p.slice(-6) === pre.slice(-6) ? 1 : 0; }
      if (suf) { var s = text.slice(i + ex.length, i + ex.length + suf.length); sc += s === suf ? 2 : s.slice(0, 6) === suf.slice(0, 6) ? 1 : 0; }
      if (sc > bestScore) { bestScore = sc; best = i; }
      i = text.indexOf(ex, i + 1);
    }
    return best;
  };

  /* Word snapping: a highlight never splits a word, in English or Korean (an eojeol is a word). */
  var WORD = /[\p{L}\p{N}_'’-]/u;
  AN.snap = function (text, s, e) {
    while (s > 0 && s < text.length && WORD.test(text.charAt(s - 1)) && WORD.test(text.charAt(s))) s--;
    while (e < text.length && e > 0 && WORD.test(text.charAt(e - 1)) && WORD.test(text.charAt(e))) e++;
    while (s < e && /\s/.test(text.charAt(s))) s++;
    while (e > s && /\s/.test(text.charAt(e - 1))) e--;
    return { s: s, e: e };
  };

  AN.quoteAt = function (text, s, e) {
    return { exact: text.slice(s, e), prefix: text.slice(Math.max(0, s - 32), s), suffix: text.slice(e, e + 32) };
  };

  /* ---------- statuses for the version on screen ---------- */
  /* A highlight: anchored (its quote is found in its section), block (the section is there, the quote is not) or
     orphan (the section's id is gone). A block note: anchored or orphan. A bookmark: on its block, approximate (a
     position from a migrated HTML chapter), or orphan. */
  AN.resolve = function (a, lay) {
    if (a.kind === "bm") {
      if (a.approx) return { status: "approx" };
      if (a.pos) return { status: "pos" };
      return lay.secs[a.block_id] ? { status: "anchored" } : { status: "orphan" };
    }
    var S = lay.secs[a.block_id];
    if (!S) return { status: "orphan" };
    if (a.kind === "bnote") return { status: "anchored" };
    var at = AN.locate(S.text, a.quote);
    if (at < 0) return { status: "block" };
    return { status: "anchored", s: at, e: at + a.quote.exact.length };
  };

  /* ---------- painting ---------- */
  function cut(parts, from, ranges, flags) {
    /* parts: [{v,isKo}], from: the container offset where these parts start, ranges: [{s,e,id,pending,note,active}] */
    var out = [], pos = from;
    parts.forEach(function (p) {
      var a = pos, b = pos + p.v.length, pts = [a, b];
      ranges.forEach(function (r) { if (r.s > a && r.s < b) pts.push(r.s); if (r.e > a && r.e < b) pts.push(r.e); });
      pts.sort(function (x, y) { return x - y; });
      for (var i = 0; i < pts.length - 1; i++) {
        var x = pts[i], y = pts[i + 1];
        if (y <= x) continue;
        var on = ranges.filter(function (r) { return r.s <= x && r.e >= y; });
        var piece = { v: p.v.slice(x - a, y - a), isKo: p.isKo, isPlain: !p.isKo, mk: false, nomk: true, mkCls: "", mkId: "" };
        if (on.length) {
          var pend = on.some(function (r) { return r.pending; });
          var hl = on.filter(function (r) { return !r.pending; });
          piece.mk = true; piece.nomk = false;
          if (pend) { piece.mkCls = "an-m an-pending"; piece.mkId = "pending"; }
          else {
            piece.mkCls = "an-m" + (hl.length > 1 ? " an-m--2" : "") + (hl.some(function (r) { return r.note; }) ? " an-m--note" : "") + (hl.some(function (r) { return r.active; }) ? " is-active" : "");
            piece.mkId = hl.map(function (r) { return r.id; }).join(" ");
          }
          /* round 02: the piece where a highlight starts is its keyboard stop (see stops() below) */
          piece._pend = pend;
          piece._hl = hl;
          piece._starts = hl.filter(function (r) { return r.first && r.s === x; });
        }
        out.push(piece);
      }
      pos = b;
    });
    if (!out.length) out.push({ v: "", isKo: false, isPlain: true, mk: false, nomk: true, mkCls: "", mkId: "" });
    if (flags) flags.end = pos;
    return out;
  }
  /* Round 02 (annotations 10, option a): the keyboard stop. Each highlight's first piece, in reading order, is a
     focusable button (tabindex 0) that opens what a tap on it opens: its popover, or the chooser where highlights
     overlap. A piece inside a link (or under the pending tint) never takes the stop; the stop moves to the highlight's
     next piece outside it, and a highlight wholly inside a link takes none (a tap on it follows the link, as signed).
     groups: [{ parts, link }] in reading order, within one container. */
  function setStop(p, st) {
    var ids = [];
    st.forEach(function (r) { if (ids.indexOf(r.id) < 0) ids.push(r.id); });
    var uid = st[0].uid, n = (p._hl || []).length;
    p.mkKey = ids.join(" ");
    p.mkTab = 0;
    p.mkRole = "button";
    p.mkPop = "dialog";
    p.mkDesc = uid ? uid + (n > 1 ? "-d-2" : (p._hl || []).some(function (r) { return r.note; }) ? "-d-note" : "-d-hl") : undefined;
    if (st.some(function (r) { return r.kf; })) p.mkCls += " is-kf";
  }
  function stops(groups) {
    var carry = [];
    groups.forEach(function (g) {
      (g.parts || []).forEach(function (p) {
        var here = p.mk && p._hl ? p._hl.map(function (r) { return r.id; }) : [];
        var st = (p._starts || []).slice();
        if (!g.link && !p._pend) {
          /* a start carried out of a link lands here if this piece still covers it; else it ended inside the link */
          carry.forEach(function (r) { if (here.indexOf(r.id) >= 0) st.push(r); });
          carry = [];
          if (st.length) setStop(p, st);
        } else carry = carry.filter(function (r) { return here.indexOf(r.id) >= 0; }).concat(st);
        delete p._starts; delete p._hl; delete p._pend;
      });
    });
  }
  function segRuns(runs, ranges) {
    var pos = 0;
    var out = (runs || []).map(function (r) {
      var parts = partsOf(r), f = {};
      var seg = cut(parts, pos, ranges, f);
      pos = f.end;
      var n = {};
      for (var k in r) n[k] = r[k];
      n.isText = r.kind === "text" || r.kind === "ko";
      n.isKo = false;
      n.parts = seg;
      return n;
    });
    stops(out.map(function (n) { return { parts: n.parts, link: n.kind === "link" || n.kind === "ext" }; }));
    return out;
  }
  function segParts(parts, ranges) { var out = cut(parts.map(function (p) { return { v: p.v, isKo: !!p.isKo }; }), 0, ranges); stops([{ parts: out, link: false }]); return out; }
  function segLines(lines, ranges) {
    var pos = 0;
    var out = lines.map(function (l, i) {
      if (i > 0) pos += 1;
      var off = pos;
      var toks = l.toks.map(function (t) {
        var f = {};
        var seg = cut([{ v: t.v, isKo: false }], pos, ranges, f);
        pos = f.end;
        return { c: t.c, v: t.v, parts: seg };
      });
      return { off: off, toks: toks };
    });
    var groups = [];
    out.forEach(function (l) { l.toks.forEach(function (t) { groups.push({ parts: t.parts, link: false }); }); });
    stops(groups);
    return out;
  }

  /* Decorates a block array for the boards: every container gets its key, section, kind and base offset, and its runs
     are split where the paint starts and ends. ranges: { containerKey: [range] }. rows: { blockIndex: [row] }.
     Never mutates the cached blocks. */
  AN.decorate = function (blocks, lay, ranges, extra) {
    ranges = ranges || {};
    extra = extra || {};
    var byKey = {};
    lay.conts.forEach(function (c) { byKey[c.key] = c; });
    function attrs(o, key) {
      var c = byKey[key];
      o.tx = key;
      o.sec = c ? c.sec : "";
      o.tk = c ? (c.sec ? c.kind : c.kind === "p" || c.kind === "code" ? "top" : c.kind) : "p";
      o.base = c ? c.base : -1;
      return o;
    }
    function rng(key) { return ranges[key] || []; }
    function copy(o) { var n = {}; for (var k in o) n[k] = o[k]; return n; }
    function decoP(p, key) { var n = attrs(copy(p), key); n.runs = segRuns(p.runs, rng(key)); return n; }
    function decoItems(items, key) {
      return items.map(function (it, j) {
        var n = decoP(it, key + "." + j);
        if (it.sub) {
          n.sub = copy(it.sub);
          n.sub.items = it.sub.items.map(function (s, m) { return decoP(s, key + "." + j + "." + m); });
        }
        return n;
      });
    }
    function decoCode(c, key) { var n = attrs(copy(c), key); n.lines = segLines(c.lines, rng(key)); return n; }
    return blocks.map(function (b, i) {
      var k = "b" + i, n = copy(b);
      n._an = true;
      n.blk = "";
      n.mrows = (extra.rows && extra.rows[i]) || [];
      n.hasRows = n.mrows.length > 0;
      n.bmTag = !!(extra.tags && extra.tags[i]);
      if (b.k === "h") {
        attrs(n, k);
        n.blk = lay.native && b.id ? b.id : "";
      } else if (b.k === "p") n = Object.assign(n, decoP(b, k));
      else if (b.k === "list") n.items = decoItems(b.items, k);
      else if (b.k === "quote") n.body = b.body.map(function (q, m) { return q.runs ? decoP(q, k + ".q" + m) : q; });
      else if (b.k === "callout") {
        attrs(n, k + ".t");
        n.titleParts = segParts(b.titleParts || [], rng(k + ".t"));
        n.body = b.body.map(function (c, m) {
          if (c.k === "p") return decoP(c, k + ".c" + m);
          if (c.k === "list") { var l = copy(c); l.items = decoItems(c.items, k + ".c" + m); return l; }
          if (c.k === "code") { var cc = decoCode(c, k + ".c" + m); cc._an = true; return cc; }
          return c;
        });
      } else if (b.k === "code") n = Object.assign(n, decoCode(b, k));
      else if (b.k === "table") {
        n.head = b.head.map(function (h, c) { var x = attrs(copy(h), k + ".h" + c); x.parts = segParts(h.parts, rng(k + ".h" + c)); return x; });
        n.rows = b.rows.map(function (row, r) {
          return { cells: row.cells.map(function (c, j) { return decoP(c, k + ".r" + r + "." + j); }) };
        });
      } else if (b.k === "diagram") {
        attrs(n, k + ".t");
        n.blk = lay.native && b.id ? b.id : "";
        n.capTx = k + ".c";
        n.caption = segRuns(b.caption, []);
      }
      return n;
    });
  };

  /* Blocks with no paint, for a board that draws a part on its own. */
  AN.plain = function (blocks, native) {
    if (!blocks || !blocks.length || blocks[0]._an) return blocks;
    return AN.decorate(blocks, AN.layout(blocks, native !== false), {}, {});
  };
  AN.plainBlock = function (b) {
    if (!b || b._an) return b;
    return AN.plain([b])[0];
  };

  /* Maps a range in section coordinates onto its containers. */
  function spread(S, s, e, base) {
    var out = {};
    S.conts.forEach(function (c) {
      var a = Math.max(s, c.base), b = Math.min(e, c.base + c.text.length);
      if (b > a) {
        var r = {};
        for (var k in base) r[k] = base[k];
        r.s = a - c.base; r.e = b - c.base;
        r.first = a === s;
        (out[c.key] = out[c.key] || []).push(r);
      }
    });
    return out;
  }
  function merge(into, add) { for (var k in add) into[k] = (into[k] || []).concat(add[k]); }

  /* ---------- the view model for one variant at one version ---------- */
  function count(n, one, many) { return n + " " + (n === 1 ? one : many); }
  AN.count = count;
  function marksWord(list) {
    var hl = list.filter(function (a) { return a.kind === "hl"; }).length, nb = list.length - hl;
    if (!nb) return count(hl, "highlight", "highlights");
    if (!hl) return count(nb, "note", "notes");
    return count(list.length, "highlight or note", "highlights and notes");
  }
  AN.marksWord = marksWord;

  AN.clip = function (s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

  /* r: RD.read(...); st: { ann, sel, active, member } */
  AN.view = function (r, st) {
    var native = r.doc.format !== "md";
    var lay = AN.layout(r.blocks, native);
    var ann = (st && st.ann) || { hl: [], bm: [] };
    var doc = r.key, lang = r.lang;
    var ranges = {}, rows = {}, tags = {};
    var rail = [], items = [], other = [], orphans = [], changed = {};
    var chTitle = r.title;
    function secOf(id) { return lay.secs[id]; }
    var mine = ann.hl.filter(function (a) { return a.doc === doc && a.lang === lang; });
    var theirs = ann.hl.filter(function (a) { return a.doc === doc && a.lang !== lang; });
    var bms = ann.bm.filter(function (b) { return b.doc === doc; });

    mine.forEach(function (a) {
      var res = AN.resolve(a, lay), S = secOf(a.block_id);
      var it = item(a, res.status, S);
      if (res.status === "anchored" && a.kind === "hl") {
        it.s = res.s;
        it.code = S.conts.some(function (c) { return c.kind === "code" && res.s >= c.base && res.e <= c.base + c.text.length; });
        merge(ranges, spread(S, res.s, res.e, { id: a.id, note: !!a.note, active: st && st.active === a.id, kf: !!(st && st.kf && st.kf === a.id), uid: (st && st.uid) || "" }));
        if (a.note) rail.push({ key: a.id, kind: "note", at: "mark", id: a.id, sec: a.block_id, label: "Note", text: a.note, lang: AN.langOf(a.note, a.lang), order: S.n * 1e6 + res.s });
      } else if (res.status === "anchored" && a.kind === "bnote") {
        it.s = -1;
        var row = { key: a.id, id: a.id, kind: "Note on this " + (S.kind === "diagram" ? "diagram" : "section"), hasKind: true, text: AN.clip(a.note, 120),
          hasL: false, ll: "", lname: "", act: "open:" + a.id, lang: AN.langOf(a.note, a.lang) };
        (rows[S.bi] = rows[S.bi] || []).push(row);
        rail.push({ key: a.id, kind: "bnote", at: "block", id: a.id, sec: a.block_id, label: row.kind, text: a.note, lang: row.lang, order: S.n * 1e6 - 2 });
      } else if (res.status === "block") {
        (changed[a.block_id] = changed[a.block_id] || []).push(a);
      }
      if (res.status === "orphan") orphans.push(it); else items.push(it);
    });
    Object.keys(changed).forEach(function (sid) {
      var S = secOf(sid), list = changed[sid];
      var row = { key: "chg-" + sid, kind: "Text changed", hasKind: true, text: marksWord(list) + " you made no longer match" + (list.length === 1 ? "es" : "") + " the text",
        hasL: false, ll: "", lname: "", act: "changed:" + sid, lang: "en" };
      (rows[S.bi] = rows[S.bi] || []).push(row);
      rail.push({ key: row.key, kind: "changed", at: "block", sec: sid, label: "Text changed", text: row.text, order: S.n * 1e6 - 1 });
    });
    /* the other language: a marker on the block, never paint */
    var byBlock = {};
    theirs.forEach(function (a) {
      var S = secOf(a.block_id);
      if (!S) return;
      (byBlock[a.block_id] = byBlock[a.block_id] || []).push(a);
      var it = item(a, "other", S);
      it.s = -1;
      other.push(it);
    });
    Object.keys(byBlock).forEach(function (sid) {
      var S = secOf(sid), list = byBlock[sid], L = LANG[list[0].lang] || list[0].lang;
      var row = { key: "lang-" + sid, kind: "", hasKind: false, text: marksWord(list) + " in ", hasL: true, ll: list[0].lang, lname: L, act: "other:" + sid, lang: "en", isLang: true };
      (rows[S.bi] = rows[S.bi] || []).push(row);
      rail.push({ key: row.key, kind: "other", at: "block", sec: sid, label: "", text: row.text, hasL: true, ll: row.ll, lname: L, lang: "en", order: S.n * 1e6 - 0.5 });
    });
    var bmBySec = {}, positions = [];
    bms.forEach(function (b) {
      var res = AN.resolve(b, lay), S = secOf(b.block_id);
      var it = item(b, res.status, S);
      it.s = -2;
      if (!it.snippet && S) it.snippet = AN.snippet(lay, b.block_id);
      if (res.status === "anchored") {
        tags[S.bi] = true;
        bmBySec[b.block_id] = it;
        rail.push({ key: b.id, kind: "bm", at: "block", id: b.id, sec: b.block_id, label: "Bookmarked", text: b.label || "", lang: AN.langOf(b.label, "en"), order: S.n * 1e6 - 3 });
        items.push(it);
      } else if (res.status === "approx" || res.status === "pos") { items.push(it); if (res.status === "pos") positions.push(it); }
      else orphans.push(it);
    });
    /* the pending selection */
    if (st && st.sel && st.sel.doc === doc && st.sel.lang === lang && (st.sel.ver || null) === (st.ver || null) && st.sel.mode === "passage") {
      var S2 = secOf(st.sel.sec);
      if (S2) merge(ranges, spread(S2, st.sel.s, st.sel.e, { id: "pending", pending: true }));
    }
    var dblocks = AN.decorate(r.blocks, lay, ranges, { rows: rows, tags: tags });
    function item(a, status, S) {
      var o = {
        id: a.id, kind: a.kind, doc: a.doc, lang: a.lang, sec: a.block_id, s: 0, secTitle: S ? AN.secLabel(S) : (a.snapshot && a.snapshot.block_title) || "",
        status: status, quote: a.quote ? a.quote.exact : "", note: a.note || "", label: a.label || "", snippet: a.snippet || "", review: !!a.review,
        approx: !!a.approx, pos: !!a.pos, frac: a.frac || 0, chapter: chTitle, snapshot: a.snapshot || null, ver: a.ver || 1, card: a.card || (a.review ? "active" : ""),
        noteLang: AN.langOf(a.note, a.lang), labelLang: AN.langOf(a.label, "en")
      };
      o.order = S ? S.n * 1e6 : 9e9;
      return o;
    }
    items.forEach(function (it) { it.order = (secOf(it.sec) ? secOf(it.sec).n * 1e6 : (it.approx || it.pos ? it.frac * 1e6 * Math.max(1, lay.order.length) : 9e9)) + it.s; });
    items.sort(function (a, b) { return a.order - b.order; });
    rail.sort(function (a, b) { return a.order - b.order; });
    return { lay: lay, blocks: dblocks, items: items, other: other, orphans: orphans, rail: rail, changed: changed, byBlock: byBlock, native: native,
      bmBySec: bmBySec, positions: positions, count: items.length + other.length + orphans.length };
  };

  /* The text a selection covers, in its section, for the bar's checks and the snapshot. */
  AN.secText = function (blocks, native, sid) {
    var S = AN.layout(blocks, native).secs[sid];
    return S ? S.text : "";
  };

  /* A bookmark's snippet: the heading (or a typed block's title), as S3 says. */
  AN.snippet = function (lay, sid) {
    var S = lay.secs[sid];
    if (!S) return "";
    return AN.clip(S.kind.charAt(0) === "h" ? S.title : AN.secLabel(S), 140);
  };

  var seq = 1000;
  AN.newId = function (p) { seq += 1; return (p || "a") + seq; };

  /* What one listed mark shows, in the chapter's Notes sheet ("panel") or the book's list ("book"). */
  AN.itemVm = function (it, ctx, editing) {
    var L = LANG[it.lang] || it.lang, book = ctx === "book";
    var isHl = it.kind === "hl", isB = it.kind === "bnote", isBm = it.kind === "bm";
    var gone = it.status === "orphan", changed = it.status === "block";
    var secWord = /^Diagram/.test(it.secTitle || "") ? "diagram" : "section";
    var k = gone ? "Unanchored" : changed ? "Text changed" : isHl ? (it.note ? "Highlight · note" : "Highlight") :
      isB ? "Note on this " + secWord : it.approx ? "Bookmark · approximate" : it.pos ? "Bookmark · position" : "Bookmark";
    var pct = Math.round((it.frac || 0) * 100);
    var meta = "";
    if (gone) {
      var sn = it.snapshot || {};
      meta = "Was in “" + (sn.block_title || it.secTitle || "a removed section") + "”" + (book ? "" : " · " + (sn.chapter_title || it.chapter || ""));
    } else if (changed) meta = "Made on " + L + " v" + it.ver + " · this version no longer says it";
    else if (it.approx) meta = "About " + pct + "% through · placed from the HTML version";
    else if (it.pos) meta = "About " + pct + "% through";
    else if (isBm) meta = it.label ? it.secTitle : "";
    else meta = it.secTitle || "";
    var quote = gone && !it.quote && it.snapshot ? it.snapshot.text : it.quote;
    var title = isBm ? (it.label || (it.approx || it.pos ? AN.clip(it.snippet, 140) : it.secTitle)) : "";
    return {
      id: it.id, raw: it, kind: it.kind, status: it.status, canGo: !gone,
      k: k, kOn: false, review: isHl && !!it.review && !gone,
      hasQuote: (isHl || (gone && !!quote)) && !gone && !!quote, quote: quote || "", quoteLang: it.lang,
      isGone: gone && !!quote, isPlainQ: changed, isCode: !!it.code,
      hasTitle: !!title, title: title, titleLang: isBm && it.label ? AN.langOf(it.label, "en") : it.lang, titleBold: !!(isBm && it.label),
      hasNote: !!it.note, note: it.note || "", noteLang: AN.langOf(it.note, it.lang),
      hasLang: book, langName: L, langCode: it.lang,
      hasMeta: !!meta || book, meta: meta,
      isBm: isBm && !gone, labelBtn: it.label ? "Edit label" : "Add label", label: it.label || "", editing: !!editing,
      delWord: isBm ? "Remove" : "Delete",
      delAria: (isBm ? "Remove bookmark: " : isB ? "Delete note: " : "Delete highlight: ") + AN.clip(title || quote || it.note || it.secTitle || "", 60)
    };
  };
})();

/* ---------- Seed data (canvas only): one invented reader's marks in "The knowledge maintainer guide" ----------
   Written for the canvas: study highlights and notes a reader would make in these chapters, in English and Korean.
   The reader is invented and has no email. Statuses: two highlights made on English v1 that v2 no longer says
   (block), two orphans whose sections a later version removed (the canvas's sample versions do not carry those
   sections; their snapshots hold the text), Korean highlights shown as markers in English and the other way round,
   and two bookmarks migrated from the HTML explainers (positions, approximate). */
(function () {
  "use strict";
  var RD = window.RD, AN = RD.an;
  var MG = "maintainer-guide/", INT = MG + "internals";
  var T_INT = "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts";

  function hl(id, doc, lang, ver, sec, exact, o) {
    var a = { id: id, kind: "hl", doc: doc, lang: lang, ver: ver, block_id: sec, quote: { exact: exact, prefix: "", suffix: "" }, note: "", review: false };
    for (var k in o || {}) a[k] = o[k];
    return a;
  }
  function bn(id, doc, lang, sec, note) { return { id: id, kind: "bnote", doc: doc, lang: lang, ver: 2, block_id: sec, note: note }; }
  function bm(id, doc, lang, sec, label, o) {
    var b = { id: id, kind: "bm", doc: doc, lang: lang, block_id: sec, label: label || "", snippet: "" };
    for (var k in o || {}) b[k] = o[k];
    return b;
  }

  var LONG = "Why answering first matters: the caller is usually an agent waiting on the response, and before P24 that wait " +
    "included a git push to a remote and an embedding call, both on the network and both able to time out. Now the durable " +
    "part (file, row, commit) finishes under the lock, the 201 goes out, and the push and the embedding run on the publish " +
    "worker. If the push fails, the document is still saved and goes out with the next good push. For the review: what does " +
    "a client see while the worker is down?";

  function base() {
    return {
      rev: 1,
      hl: [
        hl("a1", INT, "en", 2, "background", "one decision made early and honoured everywhere since"),
        hl("a2", INT, "en", 2, "the-two-planes", "knowing which one you are looking at is the first skill to acquire", { note: "Content plane: rebuilt from the files. Accounts plane: migrated and backed up. Ask which one before touching a table.", review: true }),
        hl("a3", INT, "en", 2, "the-one-idea", "Disk is canonical; the database is a projection.", { review: true }),
        hl("a4", INT, "en", 2, "the-one-idea", "removed = delete_rows_not_in(seen)", { note: "Why a stray row cannot survive a reindex: anything not seen on disk is deleted." }),
        hl("a5", INT, "en", 2, "the-write-path", "Since P24 the response sits in the middle of the sequence"),
        hl("a6", INT, "en", 2, "the-write-path", "the response sits in the middle of the sequence, and that boundary is load-bearing", { note: "Load-bearing: moving the push back in front of the 201 would bring the slow writes back." }),
        hl("a7", INT, "en", 2, "the-write-path", "Answer first, then go to the network", { note: LONG, review: true }),
        hl("a8", INT, "en", 2, "the-write-path", "Answer 201, then hand the push and the embedding to the publish worker.", { review: true }),
        hl("a9", INT, "en", 2, "the-write-path", "Scoped git commit", { note: "The commit is most of the wait. Worth knowing before blaming SQLite." }),
        hl("a14", INT, "en", 2, "why-a-queue", "do not fix it with a different subtle ordering guarantee", { note: "미묘한 순서 문제를 또 다른 미묘한 순서로 덮지 말 것. 큐가 답이다." }),
        hl("a10", INT, "en", 2, "contracts", "The decisions it forced are collected in Why Knowledge Is This Way, and How to Change It"),
        hl("a11", INT, "en", 2, "contracts", "A history feature that stored bodies only in SQLite would be erased by the next boot reindex"),
        hl("a12", INT, "en", 2, "contracts", "The write key publishes; the read key only reads.", { note: "Never hand a read-only client the write key to make it work.", review: true }),
        hl("a13", INT, "en", 2, "what-changed", "before it pushes", { note: "The whole v2 change, in three words." }),
        bn("b1", INT, "en", "two-planes", "Redraw this from memory before chapter 3: which plane does a session live in?"),
        bn("b2", INT, "en", "contracts", "Read the route table against the reader's routes before the review."),
        /* made on English v1; v2 no longer says them: status block */
        hl("c1", INT, "en", 1, "the-write-path", "Everything happens under the write lock, in order, and the caller hears back when the sequence ends.", { note: "So a slow push means a slow 201?" }),
        hl("c2", INT, "en", 1, "the-write-path", "Push, embed, then answer 201."),
        /* orphans: their sections were removed in a later version */
        hl("o1", INT, "en", 1, "scaling-out", "A second worker can take writes once the lock moves into SQLite.", { note: "Is this still planned? Check the sharding draft.",
          snapshot: { text: "A second worker can take writes once the lock moves into SQLite.", block_title: "Scaling out the writer", chapter_title: T_INT } }),
        hl("o2", INT, "en", 1, "the-nightly-export", "the nightly export copies every body into the backup bucket",
          { snapshot: { text: "the nightly export copies every body into the backup bucket", block_title: "The nightly export", chapter_title: T_INT } }),
        /* Korean, made on 한국어 v1 */
        hl("k1", INT, "ko", 1, "the-write-path", "모든 일은 쓰기 잠금 아래에서 순서대로 일어나고,", { note: "영어판 v2에서는 응답이 먼저다. 번역이 아직 v1이라 순서가 다르다." }),
        hl("k2", INT, "ko", 1, "contracts", "본문을 SQLite에만 저장하는 기록 기능은 다음 부팅 때의 reindex로 지워집니다."),
        hl("k3", INT, "ko", 1, "the-one-idea", "디스크가 정본이고 데이터베이스는 투영입니다.", { note: "핵심 문장. 복습 카드로 만들 것.", review: true }),
        /* the other chapters of the book */
        hl("w1", MG + "what-it-is", "en", 1, "background", "An agent explains a change, publishes the explanation, and the people who own the code read it"),
        hl("w2", MG + "what-it-is", "en", 1, "private-by-default", "nothing else changes: the files, the versions and the search stay where they were", { note: "Publishing is a flag, not a copy." }),
        hl("s1", MG + "shipping", "en", 1, "deploy-order", "The API goes first, then the web app, then the MCP server.", { note: "API, then web, then MCP. Each new version must still read the old one's responses.", review: true }),
        hl("y1", MG + "why", "en", 3, "background", "Write down what you rejected and why.", { review: true })
      ],
      bm: [
        bm("m2", INT, "en", "two-deployments", "Flags to check before a deploy"),
        bm("m1", INT, "en", "the-write-path", ""),
        bm("m3", INT, "en", "contracts", "Route table"),
        bm("m4", MG + "shipping", "en", "deploy-order", "Deploy order"),
        /* migrated from the HTML explainers: positions, approximate */
        bm("p1", MG + "what-it-is", "en", null, "", { approx: true, frac: 0.42, snippet: "The same files are reached four ways, and each door has its own contract: the write door, the setup door, the terminal door…" }),
        bm("p2", MG + "why", "en", null, "Before changing a contract", { approx: true, frac: 0.71, snippet: "Open a phase, state the intent in your own words, and let the decomposition slice cut the work." }),
        /* a position in the plain Markdown document */
        bm("p3", "doc/field-notes/wal-files", "en", null, "", { pos: true, frac: 0.46, snippet: "What a reader does. When its transaction starts, it notes the last committed frame in the log…" })
      ]
    };
  }

  /* Many marks, made from the chapters' own sentences: 30 in one chapter, and 100 across the book. */
  var NOTES = ["Check this against the code before the review.", "Good line for a review card.", "This is the part I keep forgetting.",
    "Compare with how chapter 3 handles it.", "Why not do this in SQLite instead?", "다시 읽을 것.", "Ask about this in the next session.",
    "The reason, not the rule, is what matters here.", "Write a test that would fail if this changed."];
  function sentences(text) {
    var out = [];
    text.split("\n").forEach(function (line) {
      line.split(/(?<=[.;:])\s+/).forEach(function (s) {
        s = s.trim();
        if (s.length > 24 && s.length < 150 && !/[{}<>]/.test(s) && !/^\/api|^GET|^POST/.test(s)) out.push(s);
        /* clauses too, so a short chapter still has enough distinct passages */
        s.split(/,\s+/).forEach(function (c) { if (c.length > 22 && c.length < s.length - 8 && !/[{}<>]/.test(c)) out.push(c.trim()); });
      });
    });
    return out;
  }
  function fill(doc, lang, n, start, prefix) {
    var r = RD.read(doc, lang), lay = AN.layout(r.blocks, true), out = [], i = 0, k = 0;
    var pool = [];
    lay.order.forEach(function (sid) { sentences(lay.secs[sid].text).forEach(function (s) { pool.push({ sid: sid, s: s }); }); });
    while (out.length < n && pool.length) {
      var p = pool[(k * (pool.length % 7 ? 7 : 5) + start) % pool.length];
      k += 1;
      if (out.some(function (a) { return a.quote && a.quote.exact === p.s; })) { if (k > pool.length * 3) break; continue; }
      i += 1;
      if (i % 9 === 0) out.push(bm(prefix + i, doc, lang, p.sid, i % 2 ? "" : "Come back to this"));
      else if (i % 11 === 0) out.push(bn(prefix + i, doc, lang, p.sid, NOTES[i % NOTES.length]));
      else out.push(hl(prefix + i, doc, lang, r.version, p.sid, p.s, { note: i % 3 === 0 ? NOTES[i % NOTES.length] : "", review: i % 4 === 0 }));
    }
    return out;
  }
  function split(list) {
    return { hl: list.filter(function (a) { return a.kind !== "bm"; }), bm: list.filter(function (a) { return a.kind === "bm"; }) };
  }

  AN.seed = function (name) {
    var s = base();
    if (name === "empty") return { rev: 1, hl: [], bm: [] };
    if (name === "heavy") {
      var h = split(fill(INT, "en", 30, 3, "h"));
      s.hl = s.hl.filter(function (a) { return a.doc !== INT || a.lang !== "en"; }).concat(h.hl);
      s.bm = s.bm.filter(function (a) { return a.doc !== INT; }).concat(h.bm);
    }
    if (name === "many") {
      /* 100 in all: the Korean, approximate, changed and unanchored marks, and generated ones to make up the rest */
      var keep = base();
      var fixed = keep.hl.filter(function (a) { return /^(k|c|o)/.test(a.id); }).concat(keep.bm.filter(function (a) { return a.approx; }));
      var gen = [].concat(fill(INT, "en", 30, 1, "x"), fill(MG + "what-it-is", "en", 20, 2, "y"), fill(MG + "read-surfaces", "en", 16, 4, "z"),
        fill(MG + "shipping", "en", 16, 5, "u"), fill(MG + "why", "en", 18, 6, "v"));
      var m = split(fixed.concat(gen).slice(0, 100));
      s.hl = m.hl;
      s.bm = m.bm;
    }
    s.name = name || "default";
    return s;
  };

  /* Every mark in a book, across its chapters and languages, for the per-book list. */
  AN.book = function (ann, bookKey) {
    var b = RD.books[bookKey], out = [];
    if (!b) return out;
    b.chapters.forEach(function (key, ci) {
      var d = RD.docs[key];
      if (!d || !d.variants) return;
      var langs = Object.keys(d.variants);
      langs.forEach(function (L) {
        var r = RD.read(key, L);
        var v = AN.view(r, { ann: { hl: ann.hl.filter(function (a) { return a.lang === L; }), bm: ann.bm.filter(function (x) { return x.lang === L; }) } });
        v.items.concat(v.orphans).forEach(function (it) {
          it.chapterN = ci + 1;
          it.chapterKey = key;
          it.chapter = RD.titleOf(key, L).text;
          out.push(it);
        });
      });
    });
    return out;
  };
})();
