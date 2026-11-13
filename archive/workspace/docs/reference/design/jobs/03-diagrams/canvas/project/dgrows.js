/* Canvas only, never built: the row kinds (stack, timeline, chart), each kind's text alternative, and DG.build, the
   one entry point the Diagram board calls (job 03-diagrams). The row kinds fill the column and re-flow with it; the
   drawn kinds (flow, state, sequence) keep their drawing and its rule: natural size, shrink down to the 11 px floor, then
   scroll in their own box. */
(function () {
  "use strict";
  var DG = window.DG, F = DG.F, measure = DG.measure, tone = DG.tone, r1 = DG.r1;
  /* an HTML text in Hangul carries lang="ko", so it takes keep-all and the Hangul face */
  function lg(t) { return DG.isKo(t) ? "ko" : undefined; }
  DG.lg = lg;

  function fmt(v) {
    if (v == null || isNaN(v)) return "";
    var a = Math.abs(v), s = a >= 1000 ? Math.round(v).toLocaleString("en-US") : (Math.round(v * 10) / 10).toString();
    return s.replace("-", "−");
  }
  DG.fmt = fmt;
  function niceStep(span, count) {
    var raw = span / Math.max(1, count), p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function niceTicks(lo, hi, count) {
    if (hi <= lo) hi = lo + 1;
    var st = niceStep(hi - lo, count || 5), a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, out = [];
    for (var v = a; v <= b + st / 1e6; v += st) out.push(Math.round(v / st) * st);
    return out;
  }
  DG.niceTicks = niceTicks;
  /* labels at the plot's right end, by height (endQ, % of the plot): pushed apart top down so no two overlap (1.1em at
     the default size is 7.5% of a 13em plot, so 9.5% leaves a gap), then pulled back inside the plot's height */
  function nudge(list) {
    var ends = list.slice().sort(function (a, b) { return b.endQ - a.endQ; }), gap = 9.5, k;
    for (k = 1; k < ends.length; k++) if (ends[k - 1].endQ - ends[k].endQ < gap) ends[k].endQ = ends[k - 1].endQ - gap;
    var low = ends.length ? ends[ends.length - 1].endQ : 0;
    if (low < 0) ends.forEach(function (e) { e.endQ -= low; });
    list.forEach(function (e) { e.endStyle = "bottom: " + r1(e.endQ) + "%"; });
  }

  /* ---------- stack: fixed rows, top to bottom; nested, each layer holds the next ---------- */
  function buildStack(spec) {
    var layers = (spec.layers || []).map(function (l, i) {
      var t = tone(l.tone);
      return { i: i, label: String(l.label || ""), lang: lg(l.label), tone: t, items: (l.items || []).map(function (x) { return { t: String(x), lang: lg(x) }; }) };
    });
    var nested = !!spec.nested, N = layers.length;
    layers.forEach(function (l, k) {
      l.hasItems = l.items.length > 0;
      l.cls = "dgs__layer dg-tone-" + l.tone;
      /* nested, a layer sits on its parent's tint; a muted layer inside a coloured one draws its border in the default
         line, because the muted line measures under 3:1 on a coloured tint in dark and sepia */
      var parent = nested && k > 0 ? layers[k - 1].tone : null;
      var lift = l.tone === "muted" && parent && parent !== "default" && parent !== "muted";
      l.boxCls = "dgs__layer dgs__box dg-tone-" + l.tone + (lift ? " dgs__box--lift" : "");
      l.koLabel = DG.isKo(l.label);
      if (nested) {
        l.boxStyle = "grid-row: " + (k + 1) + " / " + (2 * N + 1 - k) + "; grid-column: " + (k + 1) + " / " + (2 * N + 2 - k);
        l.headStyle = "grid-row: " + (k + 1) + "; grid-column: " + (k + 2) + " / " + (2 * N + 1 - k);
        l.inside = k > 0 ? "Inside " + layers[k - 1].label + ": " : "";
        l.hasInside = k > 0;
      }
    });
    var gridStyle = nested ? "grid-template-columns: repeat(" + N + ", var(--dgs-ind)) minmax(0, 1fr) repeat(" + N + ", var(--dgs-ind)); grid-template-rows: repeat(" + N + ", auto) repeat(" + N + ", var(--dgs-ind))" : "";
    return { layers: layers, nested: nested, plain: !nested, gridStyle: gridStyle };
  }

  /* ---------- timeline: lanes on one scaled axis ---------- */
  var TL_MIN_TRACK = 280; /* px at the default size: the track at the timeline's narrowest (its minimum width) */
  function buildTimeline(spec) {
    var ax = spec.axis || {}, lo = Number(ax.from || 0), hi = Number(ax.to != null ? ax.to : 1);
    if (hi <= lo) hi = lo + 1;
    var span = hi - lo;
    function pct(v) { return Math.max(0, Math.min(100, (Number(v) - lo) / span * 100)); }
    var ticks = (Array.isArray(ax.ticks) && ax.ticks.length ? ax.ticks : niceTicks(lo, hi, 6).filter(function (v) { return v >= lo && v <= hi; })).map(function (v, i, arr) {
      var p = pct(v);
      return { pct: r1(p), label: fmt(v), style: "left: " + r1(p) + "%", cls: "dgt__tick" + (p < 0.5 ? " is-first" : p > 99.5 ? " is-last" : "") + (i % 2 === 1 && arr.length > 6 ? " is-minor" : "") };
    });
    var lanes = (spec.lanes || []).map(function (ln, li) {
      var rows = [], bars = (ln.bars || []).map(function (b, bi) {
        var a = pct(b.from), z = pct(b.to), t = tone(b.tone, "series-" + ((li % 6) + 1));
        if (b.tone == null) t = "accent";
        var label = b.label != null ? String(b.label) : "";
        var lw = label ? measure(label, F.small) / TL_MIN_TRACK * 100 + 1.5 : 0;
        var end = label && a + lw > 100;
        var x0 = end ? Math.max(0, z - lw) : a, x1 = end ? z : Math.max(z, a + lw);
        return { from: b.from, to: b.to, a: a, z: z, label: label, lang: lg(label), hasLabel: !!label, x0: x0, x1: x1, end: end, tone: t };
      });
      bars.sort(function (p, q) { return p.x0 - q.x0; });
      bars.forEach(function (b) {
        var k = 0;
        while (rows[k] && rows[k].end > b.x0 - 1.5) k++;
        if (!rows[k]) rows[k] = { end: -10, bars: [] };
        rows[k].end = Math.max(rows[k].end, b.x1);
        rows[k].bars.push(b);
      });
      rows.forEach(function (row) {
        row.bars.forEach(function (b) {
          b.barStyle = "left: " + r1(b.a) + "%; width: max(" + r1(b.z - b.a) + "%, 3px)";
          b.labStyle = b.end ? "right: " + r1(100 - b.z) + "%; text-align: right" : "left: " + r1(b.a) + "%";
          b.cls = "dgt__bar dg-tone-" + b.tone;
          b.labCls = "dgt__blab" + (b.end ? " is-end" : "");
          b.lab = b.label;
        });
      });
      var marks = (ln.marks || []).map(function (m) {
        var p = pct(m.at), label = m.label != null ? String(m.label) : "";
        var lw = label ? measure(label, F.small) / TL_MIN_TRACK * 100 + 3 : 2;
        var end = p + lw > 100;
        return { at: m.at, p: p, label: label, lang: lg(label), x0: end ? p - lw : p, x1: end ? p : p + lw, end: end };
      });
      var mrows = [];
      marks.sort(function (p, q) { return p.x0 - q.x0; }).forEach(function (m) {
        var k = 0;
        while (mrows[k] && mrows[k].end > m.x0 - 1) k++;
        if (!mrows[k]) mrows[k] = { end: -10, marks: [] };
        mrows[k].end = m.x1; mrows[k].marks.push(m);
        m.lineStyle = "left: " + r1(m.p) + "%";
        m.labStyle = m.end ? "right: " + r1(100 - m.p) + "%; text-align: right" : "left: " + r1(m.p) + "%";
        m.labCls = "dgt__mlab" + (m.end ? " is-end" : "");
      });
      var allMarks = [];
      mrows.forEach(function (r) { r.marks.forEach(function (m) { allMarks.push(m); }); });
      return { label: String(ln.label || ""), lang: lg(ln.label), rows: rows, mrows: mrows, marks: allMarks, hasMarks: allMarks.length > 0 };
    });
    /* the lane-name column at the wide layout: as wide as the longest name, 5 to 9 em */
    var lw0 = lanes.reduce(function (m, l) { return Math.max(m, measure(l.label, F.smallB)); }, 0);
    var labW = r1(Math.max(5, Math.min(9, lw0 / 15 + 0.3)));
    return { ticks: ticks, lanes: lanes, unit: ax.unit != null ? String(ax.unit) : "", hasUnit: ax.unit != null, from: lo, to: hi,
      rootStyle: "--dgt-lab: " + labW + "em" };
  }

  /* ---------- chart: bar, line, interval ---------- */
  var DASH = ["", "6 3", "1.5 3", "8 3 1.5 3", "12 4", "4 2 1.5 2 1.5 2"];
  DG.DASH = DASH;
  function buildChart(spec) {
    var type = ["bar", "line", "interval"].indexOf(spec.type) >= 0 ? spec.type : "bar";
    var x = spec.x || {}, y = spec.y || {};
    var series = (spec.series || []).map(function (s, i) {
      var t = tone(s.tone, "series-" + ((i % 6) + 1));
      return { i: i, name: String(s.name || ""), tone: t, values: Array.isArray(s.values) ? s.values : [], dash: DASH[i % 6], pat: "dgc-pat-" + ((i % 6) + 1) };
    });
    var S = series.length;
    var cats = Array.isArray(x.categories) ? x.categories.map(String) : null;
    var numeric = !cats;
    var vals = [];
    series.forEach(function (s) { s.values.forEach(function (v) { if (Array.isArray(v)) v.forEach(function (u) { vals.push(Number(u)); }); else if (v != null) vals.push(Number(v)); }); });
    (spec.rules || []).forEach(function (r) { vals.push(Number(r.at)); });
    var dmin = Math.min.apply(null, vals.concat([0])), dmax = Math.max.apply(null, vals.concat([0]));
    if (type === "line" || type === "interval") { dmin = Math.min.apply(null, vals); dmax = Math.max.apply(null, vals); }
    var lo = y.min != null ? Number(y.min) : (type === "bar" ? Math.min(0, dmin) : dmin), hi = y.max != null ? Number(y.max) : dmax;
    var ticks = niceTicks(lo, hi, 5);
    if (y.min == null) lo = Math.min(lo, ticks[0]); else ticks = ticks.filter(function (v) { return v >= lo; });
    if (y.max == null) hi = Math.max(hi, ticks[ticks.length - 1]); else ticks = ticks.filter(function (v) { return v <= hi; });
    if (y.min == null) lo = ticks[0];
    if (y.max == null) hi = ticks[ticks.length - 1];
    var span = hi - lo || 1;
    function p(v) { return (Number(v) - lo) / span * 100; }
    var zero = lo < 0 && hi > 0 ? p(0) : null;
    var nCat = cats ? cats.length : 0;
    var longest = cats ? Math.max.apply(null, cats.map(function (c) { return measure(c, F.small); })) : 0;
    var horizontal = type === "interval" || (type === "bar" && (nCat > 7 || longest > 64));
    var vm = { rootStyle: "", type: type, horizontal: horizontal, vertical: !horizontal && type === "bar", isLine: type === "line", isInterval: type === "interval",
      ylabel: y.label != null ? String(y.label) : "", xlabel: x.label != null ? String(x.label) : "", hasLegend: S > 1 || type === "line",
      series: series.map(function (s) { return { name: s.name, lang: lg(s.name), cls: "dgc-key dg-tone-" + s.tone, swCls: "dgc-sw " + s.pat + " dg-tone-" + s.tone, lineCls: "dg-st-" + s.tone, dash: s.dash, dashStyle: s.dash ? "stroke-dasharray: " + s.dash : "", isLine: type === "line", isBar: type === "bar", isRange: type === "interval" }; }) };
    vm.ticks = ticks.map(function (v) { var q = p(v); return { label: fmt(v), q: r1(q), bottom: "bottom: " + r1(q) + "%", left: "left: " + r1(q) + "%", cls: "dgc-grid" + (v === 0 && zero != null ? " is-zero" : ""), isZero: v === 0 }; });
    vm.zeroStyle = zero != null ? "bottom: " + r1(zero) + "%" : "";
    vm.zeroLeft = zero != null ? "left: " + r1(zero) + "%" : "";
    vm.hasZero = zero != null || lo === 0;
    vm.hasZeroLine = zero != null;
    vm.hasYlabel = !!vm.ylabel; vm.hasXlabel = !!vm.xlabel;
    vm.ywide = vm.ticks.reduce(function (m, t) { return t.label.length > m.length ? t.label : m; }, "");
    if (lo === 0) { vm.zeroStyle = "bottom: 0%"; vm.zeroLeft = "left: 0%"; }
    vm.rules = (spec.rules || []).map(function (r) { var q = p(r.at); return { q: q, endQ: q, label: String(r.label || fmt(r.at)), bottom: "bottom: " + r1(q) + "%", left: "left: " + r1(q) + "%", end: q > 70 }; });
    vm.hasRules = vm.rules.length > 0;
    vm.hasNeg = lo < 0;
    vm.rootCls = "dgc" + (horizontal ? " dgc--h" : type === "line" ? " dgc--line" : " dgc--v") + (lo < 0 ? " dgc--neg" : "");
    if (type === "bar" && !horizontal) {
      vm.cats = cats.map(function (c, ci) {
        var bars = series.map(function (s, si) {
          var v = Number(s.values[ci]), a = zero != null ? p(Math.min(0, v)) : p(Math.max(lo, Math.min(0, v))), b = p(Math.max(0, v));
          if (zero == null) { a = 0; b = p(v); }
          var w = 100 / S;
          return { v: fmt(v), style: "left: " + r1(si * w + 6 / S) + "%; width: " + r1(w - 12 / S) + "%; bottom: " + r1(a) + "%; height: " + r1(Math.max(0.6, b - a)) + "%", cls: "dgc-bar " + s.pat + " dg-tone-" + s.tone + (v < 0 ? " is-neg" : ""),
            vstyle: "left: " + r1(si * w + w / 2) + "%; " + (v < 0 ? "top: " + r1(100 - a) + "%" : "bottom: " + r1(b) + "%"), vcls: "dgc-val" + (v < 0 ? " is-neg" : ""), showVal: S === 1 };
        });
        return { label: c, lang: lg(c), bars: bars };
      });
      vm.catStyle = "grid-template-columns: repeat(" + nCat + ", minmax(0, 1fr))";
      /* a rule's label sits past the plot's right edge, level with its line, so no bar ever covers it */
      var rw = vm.rules.reduce(function (m, r) { return Math.max(m, measure(r.label, F.smallB)); }, 0);
      nudge(vm.rules);
      vm.rootStyle = "min-width: " + r1(Math.max(18, nCat * Math.max(1, S) * 1.5 + 3) + (rw ? rw / 15 + 0.9 : 0)) + "em" + (rw ? "; --dgc-endw: " + r1(rw / 13 * 0.8667 + 0.9) + "em" : "");
      if (rw) vm.rootCls += " dgc--endrules";
    }
    if (type === "bar" && horizontal) {
      vm.rows = cats.map(function (c, ci) {
        var bars = series.map(function (s, si) {
          var v = Number(s.values[ci]), a = zero != null ? p(Math.min(0, v)) : 0, b = zero != null ? p(Math.max(0, v)) : p(v);
          return { v: fmt(v), style: "left: " + r1(a) + "%; width: " + r1(Math.max(0.4, b - a)) + "%", cls: "dgc-hbar " + s.pat + " dg-tone-" + s.tone + (v < 0 ? " is-neg" : ""),
            vstyle: v < 0 ? "right: " + r1(100 - a) + "%" : "left: " + r1(b) + "%", vcls: "dgc-hval" + (v < 0 ? " is-neg" : "") };
        });
        return { label: c, lang: lg(c), bars: bars };
      });
    }
    if (type === "interval") {
      vm.rows = cats.map(function (c, ci) {
        var bars = series.map(function (s) {
          var v = s.values[ci] || [];
          var a = Number(v[0]), b = Number(v[v.length - 1]), m = v.length === 3 ? Number(v[1]) : null;
          var pa = p(a), pb = p(b);
          return { style: "left: " + r1(pa) + "%; width: " + r1(Math.max(0.4, pb - pa)) + "%", cls: "dgc-range " + s.pat + " dg-tone-" + s.tone,
            hasMid: m != null, mstyle: m != null ? "left: " + r1((p(m) - pa) / Math.max(0.4, pb - pa) * 100) + "%" : "",
            text: fmt(a) + "–" + fmt(b) + (m != null ? " · median " + fmt(m) : ""), name: s.name,
            tstyle: pa > 55 ? "text-align: right; padding-right: " + r1(100 - pb) + "%" : "padding-left: " + r1(pa) + "%" };
        });
        return { label: c, lang: lg(c), bars: bars, sum: bars.map(function (b) { return (S > 1 ? b.name + " " : "") + b.text; }).join("; ") };
      });
    }
    var xAt = null;
    if (type === "line") {
      var xs = [], n = 0;
      series.forEach(function (s) { n = Math.max(n, s.values.length); });
      var nx = (x.numeric && typeof x.numeric === "object") ? x.numeric : x;
      var x0 = numeric && nx.from != null ? Number(nx.from) : 1, x1 = numeric && nx.to != null ? Number(nx.to) : (cats ? nCat : n);
      if (cats) { x0 = 0; x1 = Math.max(1, nCat - 1); }
      var xspan = x1 - x0 || 1;
      function px(i) { return ((cats ? i : x0 + i * (x1 - x0) / Math.max(1, n - 1)) - (cats ? 0 : x0)) / xspan * 1000; }
      vm.lines = series.map(function (s) {
        var pts = s.values.map(function (v, i) { return r1(px(i)) + "," + r1(1000 - p(v) * 10); }).join(" ");
        var last = s.values[s.values.length - 1];
        return { pts: pts, cls: "dgc-line dg-st-" + s.tone, dash: s.dash, dashStyle: s.dash ? "stroke-dasharray: " + s.dash : "", name: s.name, endQ: p(last), endV: fmt(last), labCls: "dgc-end dg-ink-" + s.tone };
      });
      /* end labels: each line's name and each rule's label past the plot's right edge, nudged apart so none overlaps */
      nudge(vm.lines.concat(vm.rules));
      var xt = cats ? cats.map(function (c, i) { return { label: c, q: px(i) / 10 }; }) : niceTicks(x0, x1, 5).filter(function (v) { return v >= x0 && v <= x1; });
      /* a numeric axis always names where it starts: the first value is a tick when the round ticks begin later */
      if (!cats && xt.length && xt[0] > x0 && (xt[0] - x0) / xspan > 0.08) xt.unshift(x0);
      if (!cats) xt = xt.map(function (v) { return { label: fmt(v), q: (v - x0) / xspan * 100 }; });
      xAt = cats ? null : function (i) { return fmt(x0 + i * (x1 - x0) / Math.max(1, n - 1)); };
      vm.xticks = xt.map(function (t, i, arr) { return { label: t.label, style: "left: " + r1(t.q) + "%", cls: "dgc-xt" + (t.q < 1 ? " is-first" : t.q > 99 ? " is-last" : "") + (arr.length > 6 && i % 2 === 1 ? " is-minor" : "") }; });
      vm.points = n;
      var endW = series.map(function (s) { return s.name; }).concat(vm.rules.map(function (r) { return r.label; })).reduce(function (m, t) { return Math.max(m, measure(t, F.smallB)); }, 0);
      vm.rootStyle = "min-width: " + r1(18 + endW / 15) + "em; --dgc-endw: " + r1(endW / 13 * 0.8667 + 0.9) + "em";
    }
    if (horizontal || type === "interval") {
      var lw1 = (cats || []).reduce(function (m, c) { return Math.max(m, measure(c, F.small)); }, 0);
      var lab = r1(Math.max(5, Math.min(11, lw1 / 15 + 0.4)));
      /* a bar chart re-flows down to its labels plus 6em of bar, never under 12em (a ~180 px figure-row item at size 3) */
      vm.rootStyle = "min-width: " + r1(Math.max(12, lab + 6)) + "em; --dgc-lab: " + lab + "em";
      vm.hgrid = vm.ticks.map(function (t) { return { style: t.left, cls: "dgc__hgl" + (t.isZero && zero != null ? " is-zero" : "") }; });
      vm.haxis = vm.ticks.map(function (t, i, arr) { return { label: t.label, style: t.left, cls: "dgt__tick" + (t.q < 0.5 ? " is-first" : t.q > 99.5 ? " is-last" : "") + (arr.length > 6 && i % 2 === 1 ? " is-minor" : "") }; });
      vm.vrules = vm.rules.map(function (r) { return { label: r.label, style: r.left, headStyle: r.end ? "right: " + r1(100 - r.q) + "%" : r.left, headCls: "dgc-vhead" + (r.end ? " is-end" : "") }; });
      vm.hasHead = !!vm.xlabel || vm.rules.length > 0;
    }
    /* the chart's data, as a table for assistive technology */
    var head = ["", ].concat(series.map(function (s) { return s.name; }));
    var body = [];
    var rowsN = cats ? nCat : Math.max.apply(null, series.map(function (s) { return s.values.length; }).concat([0]));
    for (var ri = 0; ri < rowsN; ri++) {
      body.push({ k: cats ? cats[ri] : xAt ? xAt(ri) : String(ri + 1), cells: series.map(function (s) { var v = s.values[ri]; return { v: !Array.isArray(v) ? fmt(v) : v.length >= 3 ? fmt(v[0]) + "–" + fmt(v[v.length - 1]) + ", median " + fmt(v[1]) : v.map(fmt).join("–") }; }) });
    }
    vm.table = { head: series.map(function (s) { return { v: s.name, lang: lg(s.name) }; }), first: cats ? (x.label || "") : (x.label || "Point"), rows: body };
    vm.table.rows.forEach(function (r) { r.lang = lg(r.k); });
    vm.tableCap = (vm.ylabel ? vm.ylabel : "Values") + (vm.xlabel ? ", by " + vm.xlabel.charAt(0).toLowerCase() + vm.xlabel.slice(1) : "");
    return vm;
  }

  /* ---------- the text alternative for the drawn kinds ---------- */
  function altGraph(L, spec, kind) {
    var lines = [];
    var name = function (n) { return String(n.src.label) + (n.src.sub ? " (" + n.src.sub + ")" : ""); };
    if (L.init) lines.push("Starts at " + L.init.src.label + ".");
    L.nodes.slice().sort(function (a, b) { return a.r - b.r || a.c - b.c; }).forEach(function (n) {
      var out = L.edges.filter(function (e) { return e.s === n; }).map(function (e) {
        return (e.s === e.t ? "back to itself" : "to " + e.t.src.label) + (e.label ? ", " + e.label : "");
      });
      var t = name(n);
      if (n.group) t += ", in " + (spec.groups || []).filter(function (g) { return g.id === n.group.id; }).map(function (g) { return g.label; })[0];
      if (n.isFinal) t += ", an end state";
      if (n.src.fields && n.src.fields.length) t += ". Fields: " + n.src.fields.join(", ");
      if (out.length) t += ". Goes " + out.join("; ") + ".";
      lines.push(t);
    });
    return lines;
  }
  function altSequence(L) {
    var lines = [];
    L.steps.forEach(function (s) {
      lines.push((s.self ? s.a.lab.join(" ") + ", to itself" : s.a.lab.join(" ") + " to " + s.b.lab.join(" ")) + ": " + (spec_label(s)) + (s.note ? ". Note: " + s.note.join(" ") : ""));
    });
    return lines;
    function spec_label(s) { return s.lines.join(" "); }
  }
  function altTimeline(T) {
    return T.lanes.map(function (l) {
      var bars = [];
      l.rows.forEach(function (r) { r.bars.forEach(function (b) { bars.push((b.label ? b.label + ", " : "") + fmt(b.from) + "–" + fmt(b.to) + (T.hasUnit ? " " + T.unit : "")); }); });
      var marks = l.marks.map(function (m) { return m.label + " at " + fmt(m.at) + (T.hasUnit ? " " + T.unit : ""); });
      return l.label + ": " + (bars.length ? bars.join("; ") : "no bars") + (marks.length ? ". Marks: " + marks.join("; ") : "") + ".";
    });
  }

  /* ---------- the one entry point ---------- */
  var built = typeof WeakMap === "function" ? new WeakMap() : null;
  DG.build = function (spec) {
    spec = spec || {};
    var hit = built && built.get(spec);
    if (hit && hit.fv === DG.fontsVersion) return hit.vm;
    var kind = ["flow", "state", "sequence", "stack", "timeline", "chart"].indexOf(spec.kind) >= 0 ? spec.kind : "flow";
    var vm = { kind: kind, isSvg: false, isStack: false, isTimeline: false, isChart: false };
    if (kind === "flow" || kind === "state" || kind === "sequence") {
      var L = kind === "sequence" ? DG.layoutSequence(spec) : DG.layoutGraph(spec, kind);
      vm.isSvg = true;
      vm.W = L.W; vm.H = L.H;
      vm.vb = "0 0 " + L.W + " " + L.H;
      /* natural size in em of the label size; never narrower than the width where 13 px text reaches 11 px */
      vm.svgStyle = "width: clamp(" + Math.ceil(L.W * 11 / 13) + "px, 100%, " + r1(L.W / 15) + "em)";
      vm.prims = L.prims;
      /* the canvas runtime wraps a {{hole}} in an HTML span, which SVG text does not draw: each text is set through
         its ref instead (canvas only; the server writes the text into the SVG). */
      L.prims.texts.forEach(function (t) { t.ref = function (el) { if (el && el.textContent !== t.t) el.textContent = t.t; }; });
      vm.alt = kind === "sequence" ? altSequence(L) : altGraph(L, spec, kind);
      vm.altOrdered = kind === "sequence";
      vm.counts = kind === "sequence" ? { actors: L.actors.length, steps: L.steps.length } : { nodes: L.nodes.length, edges: L.edges.length };
    } else if (kind === "stack") {
      vm.isStack = true; vm.stack = buildStack(spec);
    } else if (kind === "timeline") {
      vm.isTimeline = true; vm.tl = buildTimeline(spec); vm.alt = altTimeline(vm.tl);
    } else {
      vm.isChart = true; vm.chart = buildChart(spec);
    }
    if (built) built.set(spec, { fv: DG.fontsVersion, vm: vm });
    return vm;
  };
})();
