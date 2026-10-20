/* Canvas only, never built: a stand-in for the server's diagram renderer (job 03-diagrams, P29.S5).
   It turns a `diagram` block's data into plain geometry and row data, which Diagram.dc.html draws as markup. The
   product renders on the server from the same rules (build-prompt.md); this file exists so the canvas can show every
   kind, at every text size and theme, from the block's own data. Units: px at the reader's default text size, where a
   diagram's label is 15 px and its small text 13 px; the drawing then scales with the reader's text size. */
(function () {
  "use strict";
  var DG = (window.DG = window.DG || {});

  /* ---------------- A YAML 1.2 subset: block maps, block lists, flow maps and lists, quoted and plain scalars ---------------- */
  function scalar(s) {
    s = s.trim();
    if (s === "") return null;
    if (s.charAt(0) === '"') return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
    if (s.charAt(0) === "'") return s.slice(1, -1).replace(/''/g, "'");
    if (/^(true|false)$/.test(s)) return s === "true";
    if (/^(null|~)$/.test(s)) return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }
  function flow(src) {
    var i = 0;
    function ws() { while (i < src.length && /\s/.test(src.charAt(i))) i++; }
    function val(stops) {
      ws();
      var ch = src.charAt(i);
      if (ch === "{") return map();
      if (ch === "[") return list();
      var start = i, q = null;
      if (ch === '"' || ch === "'") {
        q = ch; i++;
        while (i < src.length && src.charAt(i) !== q) { if (src.charAt(i) === "\\") i++; i++; }
        i++;
        return scalar(src.slice(start, i));
      }
      while (i < src.length && stops.indexOf(src.charAt(i)) < 0) i++;
      return scalar(src.slice(start, i));
    }
    function key() {
      ws();
      var start = i, ch = src.charAt(i);
      if (ch === '"' || ch === "'") { i++; while (src.charAt(i) !== ch) i++; i++; return scalar(src.slice(start, i)); }
      while (i < src.length && src.charAt(i) !== ":") i++;
      return src.slice(start, i).trim();
    }
    function map() {
      var o = {}; i++; ws();
      while (i < src.length && src.charAt(i) !== "}") {
        var k = key(); i++; /* ':' */
        o[k] = val(",}"); ws();
        if (src.charAt(i) === ",") { i++; ws(); }
      }
      i++;
      return o;
    }
    function list() {
      var a = []; i++; ws();
      while (i < src.length && src.charAt(i) !== "]") {
        a.push(val(",]")); ws();
        if (src.charAt(i) === ",") { i++; ws(); }
      }
      i++;
      return a;
    }
    return val("");
  }
  function stripComment(l) {
    var q = null;
    for (var i = 0; i < l.length; i++) {
      var c = l.charAt(i);
      if (q) { if (c === "\\") i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === "#" && (i === 0 || /\s/.test(l.charAt(i - 1)))) return l.slice(0, i);
    }
    return l;
  }
  var parsed = {};
  DG.yaml = function (src) {
    var key = String(src || "");
    if (parsed[key]) return parsed[key];
    parsed[key] = yamlParse(key);
    return parsed[key];
  };
  function yamlParse(src) {
    var lines = String(src || "").replace(/\r/g, "").split("\n").map(stripComment)
      .filter(function (l) { return l.trim() !== ""; })
      .map(function (l) { return { ind: l.match(/^ */)[0].length, t: l.trim() }; });
    var p = 0;
    function value(text, ind) {
      text = text.trim();
      if (text === "" || text === "|" || text === ">") {
        if (p < lines.length && lines[p].ind > ind) return block(lines[p].ind);
        return null;
      }
      if (text.charAt(0) === "{" || text.charAt(0) === "[") {
        /* a flow collection may run over several lines */
        var depth = 0, s = text;
        var count = function (str) { var d = 0, q = null; for (var k = 0; k < str.length; k++) { var c = str.charAt(k); if (q) { if (c === "\\") k++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === "{" || c === "[") d++; else if (c === "}" || c === "]") d--; } return d; };
        depth = count(s);
        while (depth > 0 && p < lines.length) { s += " " + lines[p].t; depth += count(lines[p].t); p++; }
        return flow(s);
      }
      return scalar(text);
    }
    function block(ind) {
      if (lines[p].t.charAt(0) === "-" && (lines[p].t.length === 1 || lines[p].t.charAt(1) === " ")) {
        var arr = [];
        while (p < lines.length && lines[p].ind === ind && lines[p].t.charAt(0) === "-") {
          var rest = lines[p].t.slice(1).trim(); p++;
          var m = /^([A-Za-z_][\w-]*)\s*:(\s|$)(.*)$/.exec(rest);
          if (m && rest.charAt(0) !== "{" && rest.charAt(0) !== '"') {
            /* "- key: value" starts a block map, its other keys indented under it */
            var o = {}, kind = ind + 2;
            o[m[1]] = value(m[3], kind);
            if (p < lines.length && lines[p].ind > ind) { var more = block(lines[p].ind); for (var k in more) o[k] = more[k]; }
            arr.push(o);
          } else {
            arr.push(value(rest, ind));
          }
        }
        return arr;
      }
      var obj = {};
      while (p < lines.length && lines[p].ind === ind) {
        var mm = /^("[^"]*"|'[^']*'|[^:]+?)\s*:(\s(.*))?$/.exec(lines[p].t);
        if (!mm) { p++; continue; }
        var key = scalar(mm[1]); p++;
        obj[key] = value(mm[3] || "", ind);
      }
      return obj;
    }
    if (!lines.length) return {};
    return block(lines[0].ind);
  }

  /* ---------------- Text: measuring and wrapping ---------------- */
  var SANS = '"Source Sans 3", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  var MONO = '"JetBrains Mono", Pretendard, "Apple SD Gothic Neo", ui-monospace, "SF Mono", Menlo, monospace';
  var F = DG.F = {
    label: { css: "600 15px " + SANS, size: 15, lh: 19 },
    small: { css: "400 13px " + SANS, size: 13, lh: 17 },
    smallB: { css: "600 13px " + SANS, size: 13, lh: 17 },
    mono: { css: "400 13px " + MONO, size: 13, lh: 18 }
  };
  var HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
  DG.isKo = function (s) { return HANGUL.test(String(s || "")); };
  var ctx = null, cache = {};
  DG.fontsVersion = 0;
  function measure(text, font) {
    var key = font.css + "|" + DG.fontsVersion + "|" + text;
    if (cache[key] != null) return cache[key];
    var w;
    if (DG.measureText) w = DG.measureText(text, font);
    else {
      if (!ctx) ctx = document.createElement("canvas").getContext("2d");
      ctx.font = font.css;
      w = ctx.measureText(text).width;
    }
    cache[key] = w;
    return w;
  }
  DG.measure = measure;
  /* The drawing is laid out from measured text, so it is laid out again once the faces have loaded (the server
     measures with the font files themselves and never needs this). */
  var listeners = [];
  DG.onFonts = function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };
  if (typeof document !== "undefined" && document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('600 15px "Source Sans 3"'), document.fonts.load('400 13px "Source Sans 3"'),
      document.fonts.load('400 13px "JetBrains Mono"')
    ]).catch(function () {}).then(function () {
      DG.fontsVersion += 1; cache = {};
      listeners.slice().forEach(function (fn) { try { fn(); } catch (e) {} });
    });
  }
  /* Break opportunities: spaces, and inside a word wider than the line, after / - _ . · and ( (Hangul words are kept
     whole: they break only at spaces, the keep-all rule). */
  function splitLong(word, font, maxW) {
    if (measure(word, font) <= maxW) return [word];
    var parts = word.split(/(?<=[\/\-_.·(])/u);
    if (parts.length === 1 && !HANGUL.test(word)) parts = word.split("");
    var out = [], cur = "";
    parts.forEach(function (p) {
      if (cur && measure(cur + p, font) > maxW) { out.push(cur); cur = p; }
      else cur += p;
    });
    if (cur) out.push(cur);
    return out;
  }
  function wrap(text, font, maxW) {
    /* a lone separator (·) stays with the word before it, so no line starts with one */
    var words = String(text == null ? "" : text).split(/\s+/).filter(Boolean).reduce(function (a, w) {
      if (w === "·" && a.length) a[a.length - 1] += " ·"; else a.push(w);
      return a;
    }, []), lines = [], cur = "";
    words.forEach(function (w) {
      var pieces = splitLong(w, font, maxW);
      pieces.forEach(function (piece, k) {
        var joint = k === 0 ? " " : "";
        var cand = cur ? cur + joint + piece : piece;
        if (cur && measure(cand, font) > maxW) { lines.push(cur); cur = piece; }
        else cur = cand;
      });
    });
    if (cur || !lines.length) lines.push(cur);
    return lines;
  }
  DG.wrap = wrap;
  function widest(lines, font) { return lines.reduce(function (m, l) { return Math.max(m, measure(l, font)); }, 0); }
  /* A balanced wrap: the narrowest width that keeps the line count of a greedy wrap at maxW. */
  function wrapBalanced(text, font, maxW) {
    var lines = wrap(text, font, maxW);
    if (lines.length < 2) return lines;
    /* never narrower than a word that fits whole at maxW, so the balance never breaks inside a word */
    var lo = String(text).split(/\s+/).reduce(function (m, w) { var ww = measure(w, font); return ww <= maxW ? Math.max(m, ww) : m; }, 24), hi = maxW, best = lines;
    for (var k = 0; k < 7; k++) {
      var mid = (lo + hi) / 2, t = wrap(text, font, mid);
      if (t.length <= lines.length && widest(t, font) <= mid + 0.5) { best = t; hi = mid; } else lo = mid;
    }
    return best;
  }
  DG.wrapBalanced = wrapBalanced;

  /* ---------------- Tones ---------------- */
  var TONES = ["default", "muted", "accent", "ok", "warn", "bad", "store", "series-1", "series-2", "series-3", "series-4", "series-5", "series-6"];
  DG.TONES = TONES;
  function tone(t, fallback) { return TONES.indexOf(t) >= 0 ? t : (fallback || "default"); }
  DG.tone = tone;
  function r1(n) { return Math.round(n * 10) / 10; }
  DG.r1 = r1;
  function textBlock(lines, font, x, top, cls, anchor) {
    return lines.map(function (l, i) {
      return { x: r1(x), y: r1(top + i * font.lh + font.lh / 2 + font.size * 0.34), t: l, cls: cls + (anchor === "start" ? " dg-t--start" : anchor === "end" ? " dg-t--end" : "") };
    });
  }
  DG.textBlock = textBlock;
})();
