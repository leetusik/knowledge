/* Canvas only, never built: flow, state and sequence layout (job 03-diagrams). The rules are build-prompt.md's:
   nodes on the author's grid (or flowing in `direction`), every column as wide as its widest node and every row as tall
   as its tallest, edges routed orthogonally through the gaps from a fixed list of route shapes, never across a node,
   each label set on its own edge. Output: plain SVG geometry in px at the default text size. */
(function () {
  "use strict";
  var DG = window.DG, F = DG.F, measure = DG.measure, wrap = DG.wrap, wrapB = DG.wrapBalanced, r1 = DG.r1, tone = DG.tone;
  var M = DG.M = {
    padX: 12, padY: 9, labelMax: 132, subMax: 140, minW: 72, minH: 40,
    gapC: 40, gapR: 36, outer: 4, head: 7, headW: 3.6, track: 10, bend: 6,
    labMax: 124, labPadX: 5, labPadY: 2, labClear: 8,
    grpPad: 12, grpLab: 24,
    entPadX: 12, entHeadPad: 8, fieldPad: 3, fieldMax: 204,
    stateR: 12, initLen: 30, dotR: 5.5, loopH: 22, loopW: 32
  };
  function widest(lines, font) { return lines.reduce(function (m, l) { return Math.max(m, measure(l, font)); }, 0); }
  function sum(a, from, to) { var s = 0; for (var i = from; i < to; i++) s += a[i] || 0; return s; }

  /* ---------- node content ---------- */
  function sizeNode(n, kind) {
    var shape = kind === "state" ? "state" : (["box", "pill", "store", "entity"].indexOf(n.shape) >= 0 ? n.shape : "box");
    if (shape === "entity") {
      var head = wrapB(n.label, F.label, 200);
      var fields = (n.fields || []).map(function (f) { return wrap(String(f), F.mono, M.fieldMax); });
      var fw = fields.reduce(function (m, fl) { return Math.max(m, widest(fl, F.mono)); }, 0);
      var w = Math.max(widest(head, F.label), fw) + 2 * M.entPadX;
      var headH = head.length * F.label.lh + 2 * M.entHeadPad;
      var rows = fields.map(function (fl) { return fl.length * F.mono.lh + 2 * M.fieldPad; });
      var h = headH + rows.reduce(function (s, x) { return s + x; }, 0) + (fields.length ? 6 : 0);
      return { shape: shape, head: head, fields: fields, rows: rows, w: Math.max(M.minW, Math.ceil(w)), h: Math.ceil(h), headH: headH };
    }
    var lab = wrapB(n.label, F.label, M.labelMax);
    var sub = n.sub ? wrapB(n.sub, F.small, M.subMax) : [];
    var cw = Math.max(widest(lab, F.label), widest(sub, F.small));
    var ch = lab.length * F.label.lh + (sub.length ? 2 + sub.length * F.small.lh : 0);
    var padT = M.padY, padB = M.padY;
    if (shape === "store") { padT += 8; padB += 2; }
    var h = Math.max(M.minH, ch + padT + padB);
    var padX = M.padX;
    if (shape === "pill") padX = Math.max(padX, Math.round(h * 0.4));
    if (shape === "state") padX = 16;
    return { shape: shape, lab: lab, sub: sub, ch: ch, padT: padT, padB: padB, w: Math.max(M.minW, Math.ceil(cw + 2 * padX)), h: Math.ceil(h) };
  }

  /* ---------- placement on the grid ---------- */
  function place(spec) {
    var dir = spec.direction === "down" ? "down" : "right";
    var used = {}, cur = dir === "right" ? [0, -1] : [-1, 0];
    var nodes = (spec.nodes || []).map(function (n, i) {
      var o = { id: String(n.id), i: i, src: n, tone: tone(n.tone) };
      if (Array.isArray(n.at) && n.at.length === 2) { o.r = Math.max(0, Math.round(n.at[0])); o.c = Math.max(0, Math.round(n.at[1])); cur = [o.r, o.c]; }
      else {
        do { cur = dir === "right" ? [cur[0], cur[1] + 1] : [cur[0] + 1, cur[1]]; } while (used[cur[0] + "," + cur[1]]);
        o.r = cur[0]; o.c = cur[1];
      }
      used[o.r + "," + o.c] = o;
      return o;
    });
    var R = 0, C = 0;
    nodes.forEach(function (n) { R = Math.max(R, n.r + 1); C = Math.max(C, n.c + 1); });
    return { dir: dir, nodes: nodes, cells: used, R: R, C: C };
  }
  function empty(G, r, c) { return !G.cells[r + "," + c]; }
  function rowFree(G, r, c1, c2) { for (var c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) if (!empty(G, r, c)) return false; return true; }
  function colFree(G, c, r1, r2) { for (var r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) if (!empty(G, r, c)) return false; return true; }

  /* ---------- route shapes, picked in order of preference; U is always valid ---------- */
  function pickRoute(G, s, t) {
    if (s === t) return { k: "self" };
    var right = G.dir === "right", tries = [];
    var dc = t.c - s.c, dr = t.r - s.r;
    function zh() {
      if (dc === 0) return null;
      var g = dc > 0 ? [t.c, s.c + 1] : [t.c + 1, s.c];
      for (var i = 0; i < g.length; i++) {
        var gap = g[i];
        if (rowFree(G, s.r, s.c, dc > 0 ? gap : gap - 1) && rowFree(G, t.r, dc > 0 ? gap - 1 : gap, t.c)) return { k: "zh", g: gap };
      }
      return null;
    }
    function zv() {
      if (dr === 0) {
        var below = s.r + 1;
        return { k: "zv", g: below, same: true, side: "B" };
      }
      var g = dr > 0 ? [t.r, s.r + 1] : [t.r + 1, s.r];
      for (var i = 0; i < g.length; i++) {
        var gap = g[i];
        if (colFree(G, s.c, s.r, dr > 0 ? gap : gap - 1) && colFree(G, t.c, dr > 0 ? gap - 1 : gap, t.r)) return { k: "zv", g: gap };
      }
      return null;
    }
    var straightH = dr === 0 && rowFree(G, s.r, s.c, t.c) ? { k: "sh" } : null;
    var straightV = dc === 0 && colFree(G, s.c, s.r, t.r) ? { k: "sv" } : null;
    var lhv = dr !== 0 && dc !== 0 && rowFree(G, s.r, s.c, t.c) && empty(G, s.r, t.c) && colFree(G, t.c, s.r, t.r) ? { k: "lhv" } : null;
    var lvh = dr !== 0 && dc !== 0 && colFree(G, s.c, s.r, t.r) && empty(G, t.r, s.c) && rowFree(G, t.r, s.c, t.c) ? { k: "lvh" } : null;
    var back = right ? dc < 0 : dr < 0;
    /* a way back between neighbours runs straight when nothing runs the other way between them; else it goes round */
    var paired = G.pairs && G.pairs[t.id + ">" + s.id];
    if (back && !paired && (straightH && Math.abs(dc) === 1 || straightV && Math.abs(dr) === 1)) return straightH || straightV;
    if (back) tries = [right ? zv : zh, right ? zh : zv, function () { return lvh; }, function () { return lhv; }];
    else if (right) tries = [function () { return straightH; }, function () { return straightV; }, zh, function () { return lhv; }, function () { return lvh; }, zv];
    else tries = [function () { return straightV; }, function () { return straightH; }, zv, function () { return lvh; }, function () { return lhv; }, zh];
    for (var i = 0; i < tries.length; i++) { var r = tries[i](); if (r) return r; }
    return { k: "u" };
  }

  /* ---------- geometry helpers ---------- */
  function rounded(pts, rad) {
    if (pts.length < 2) return "";
    var d = "M" + r1(pts[0][0]) + " " + r1(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var r = Math.min(rad, l1 / 2, l2 / 2);
      if (r < 0.5) { d += " L" + r1(b[0]) + " " + r1(b[1]); continue; }
      var p1 = [b[0] + (a[0] - b[0]) * r / l1, b[1] + (a[1] - b[1]) * r / l1];
      var p2 = [b[0] + (c[0] - b[0]) * r / l2, b[1] + (c[1] - b[1]) * r / l2];
      d += " L" + r1(p1[0]) + " " + r1(p1[1]) + " Q" + r1(b[0]) + " " + r1(b[1]) + " " + r1(p2[0]) + " " + r1(p2[1]);
    }
    var z = pts[pts.length - 1];
    return d + " L" + r1(z[0]) + " " + r1(z[1]);
  }
  DG.rounded = rounded;
  function head(tip, from, len, half) {
    var dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    var bx = tip[0] - dx * len, by = tip[1] - dy * len;
    return "M" + r1(tip[0]) + " " + r1(tip[1]) + " L" + r1(bx - dy * half) + " " + r1(by + dx * half) + " L" + r1(bx + dy * half) + " " + r1(by - dx * half) + " Z";
  }
  DG.head = head;
  function rectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return "M" + r1(x + r) + " " + r1(y) + " H" + r1(x + w - r) + " A" + r + " " + r + " 0 0 1 " + r1(x + w) + " " + r1(y + r) +
      " V" + r1(y + h - r) + " A" + r + " " + r + " 0 0 1 " + r1(x + w - r) + " " + r1(y + h) + " H" + r1(x + r) +
      " A" + r + " " + r + " 0 0 1 " + r1(x) + " " + r1(y + h - r) + " V" + r1(y + r) + " A" + r + " " + r + " 0 0 1 " + r1(x + r) + " " + r1(y) + " Z";
  }
  DG.rectPath = rectPath;
  function labelBox(text, maxW) {
    var lines = wrapB(text, F.small, maxW || M.labMax);
    return { lines: lines, w: Math.ceil(widest(lines, F.small) + 2 * M.labPadX), h: lines.length * F.small.lh + 2 * M.labPadY };
  }
  DG.labelBox = labelBox;

  /* ---------- the flow and state layout ---------- */
  function layoutGraph(spec, kind) {
    var G = place(spec);
    var byId = {};
    G.nodes.forEach(function (n) { byId[n.id] = n; Object.assign(n, sizeNode(n.src, kind)); });
    var finals = [].concat(spec.final == null ? [] : spec.final).map(String);
    G.nodes.forEach(function (n) { n.isFinal = kind === "state" && finals.indexOf(n.id) >= 0; });
    var init = kind === "state" && spec.initial != null ? byId[String(spec.initial)] : null;
    G.pairs = {};
    (spec.edges || spec.transitions || []).forEach(function (e) { G.pairs[String(e.from) + ">" + String(e.to)] = true; });
    var edges = (spec.edges || spec.transitions || []).filter(function (e) { return byId[String(e.from)] && byId[String(e.to)]; }).map(function (e, i) {
      var s = byId[String(e.from)], t = byId[String(e.to)];
      return { i: i, s: s, t: t, src: e, tone: tone(e.tone), dashed: e.style === "dashed", label: e.label != null ? String(e.label) : "", route: pickRoute(G, s, t) };
    });
    /* groups: the padded box of their cells; a group that owns whole rows (or whole columns) spans the drawing (lanes, layers) */
    var groups = (spec.groups || []).map(function (g) {
      var mem = (g.nodes || []).map(function (id) { return byId[String(id)]; }).filter(Boolean);
      if (!mem.length) return null;
      var rmin = Infinity, rmax = -1, cmin = Infinity, cmax = -1;
      mem.forEach(function (n) { rmin = Math.min(rmin, n.r); rmax = Math.max(rmax, n.r); cmin = Math.min(cmin, n.c); cmax = Math.max(cmax, n.c); });
      var ownsRows = G.nodes.every(function (n) { return n.r < rmin || n.r > rmax || mem.indexOf(n) >= 0; });
      var ownsCols = G.nodes.every(function (n) { return n.c < cmin || n.c > cmax || mem.indexOf(n) >= 0; });
      if (ownsRows && G.dir === "right") { cmin = 0; cmax = G.C - 1; }
      else if (ownsCols && G.dir === "down") { rmin = 0; rmax = G.R - 1; }
      else if (ownsRows) { cmin = 0; cmax = G.C - 1; }
      var lab = wrapB(String(g.label || ""), F.smallB, 420);
      /* a group is always drawn in the muted tone: the contract gives a group no tone, and every line measures 3:1 on its ground */
      return { id: g.id, label: lab, rmin: rmin, rmax: rmax, cmin: cmin, cmax: cmax, mem: mem, tone: "muted" };
    }).filter(Boolean);
    G.nodes.forEach(function (n) { n.group = null; groups.forEach(function (g) { if (g.mem.indexOf(n) >= 0) n.group = g; }); });

    /* column widths and row heights */
    var colW = [], rowH = [], rowBox = [];
    for (var c = 0; c < G.C; c++) colW[c] = M.minW;
    for (var r = 0; r < G.R; r++) { rowH[r] = M.minH; rowBox[r] = M.minH; }
    G.nodes.forEach(function (n) {
      colW[n.c] = Math.max(colW[n.c], n.w);
      if (n.shape !== "entity") rowBox[n.r] = Math.max(rowBox[n.r], n.h);
      rowH[n.r] = Math.max(rowH[n.r], n.h);
    });
    G.nodes.forEach(function (n) { if (n.shape !== "entity") rowH[n.r] = Math.max(rowH[n.r], rowBox[n.r]); });
    /* gaps: base, then whatever groups, loops, the start dot, channels and labels need */
    var gapC = [], gapR = [];
    /* each gap keeps a free corridor between the group boxes on either side of it: lo is the part a group ending
       before the gap takes (its padding), hi the part a group starting after it takes (padding, and its label band) */
    var loC = [], hiC = [], loR = [], hiR = [];
    function baseGaps() {
      for (var g = 0; g <= G.C; g++) { loC[g] = 0; hiC[g] = 0; }
      for (var h = 0; h <= G.R; h++) { loR[h] = 0; hiR[h] = 0; }
      groups.forEach(function (gr) {
        hiC[gr.cmin] = Math.max(hiC[gr.cmin], M.grpPad); loC[gr.cmax + 1] = Math.max(loC[gr.cmax + 1], M.grpPad);
        hiR[gr.rmin] = Math.max(hiR[gr.rmin], M.grpPad + M.grpLab); loR[gr.rmax + 1] = Math.max(loR[gr.rmax + 1], M.grpPad);
      });
      for (var g2 = 0; g2 <= G.C; g2++) gapC[g2] = (g2 === 0 || g2 === G.C ? M.outer : M.gapC) + loC[g2] + hiC[g2];
      for (var h2 = 0; h2 <= G.R; h2++) gapR[h2] = (h2 === 0 || h2 === G.R ? M.outer : M.gapR) + loR[h2] + hiR[h2];
      edges.forEach(function (e) {
        if (e.route.k === "self") {
          var lb = e.label ? labelBox(e.label) : { h: 0 };
          gapR[e.s.r] += M.loopH + lb.h + 6;
        }
      });
      if (init) {
        if (G.dir === "right") gapC[init.c] += M.initLen + 2 * M.dotR;
        else gapR[init.r] += M.initLen + 2 * M.dotR;
      }
    }
    baseGaps();
    var extraC = [], extraR = [];
    for (var g0 = 0; g0 <= G.C; g0++) extraC[g0] = 0;
    for (var h0 = 0; h0 <= G.R; h0++) extraR[h0] = 0;

    var geo = null;
    for (var pass = 0; pass < 4; pass++) {
      geo = buildGeometry();
      var grew = false, addC = {}, addR = {};
      geo.need.forEach(function (n) {
        if (n.amount <= 0.5) return;
        if (n.axis === "c") addC[n.g] = Math.max(addC[n.g] || 0, n.amount); else addR[n.g] = Math.max(addR[n.g] || 0, n.amount);
      });
      Object.keys(addC).forEach(function (g) { extraC[g] = (extraC[g] || 0) + Math.ceil(addC[g]); grew = true; });
      Object.keys(addR).forEach(function (g) { extraR[g] = (extraR[g] || 0) + Math.ceil(addR[g]); grew = true; });
      if (!grew) break;
    }

    function buildGeometry() {
      var gc = gapC.map(function (v, i) { return v + (extraC[i] || 0); });
      var gr = gapR.map(function (v, i) { return v + (extraR[i] || 0); });
      var colX = [], rowY = [];
      for (var c = 0; c < G.C; c++) colX[c] = sum(gc, 0, c + 1) + sum(colW, 0, c);
      for (var r = 0; r < G.R; r++) rowY[r] = sum(gr, 0, r + 1) + sum(rowH, 0, r);
      var W = sum(gc, 0, G.C + 1) + sum(colW, 0, G.C), H = sum(gr, 0, G.R + 1) + sum(rowH, 0, G.R);
      function gapX(g) { return (g === 0 ? 0 : colX[g - 1] + colW[g - 1]); }
      function gapY(g) { return (g === 0 ? 0 : rowY[g - 1] + rowH[g - 1]); }
      G.nodes.forEach(function (n) {
        n.w2 = n.shape === "entity" ? Math.max(n.w, colW[n.c]) : colW[n.c];
        n.h2 = n.shape === "entity" ? n.h : rowH[n.r];
        n.x = colX[n.c] + (colW[n.c] - n.w2) / 2; n.y = rowY[n.r] + (rowH[n.r] - n.h2) / 2;
        n.cx = n.x + n.w2 / 2; n.cy = n.y + n.h2 / 2;
      });
      /* group regions */
      groups.forEach(function (g) {
        g.x = colX[g.cmin] - M.grpPad; g.y = rowY[g.rmin] - M.grpPad - M.grpLab;
        g.w = colX[g.cmax] + colW[g.cmax] + M.grpPad - g.x; g.h = rowY[g.rmax] + rowH[g.rmax] + M.grpPad - g.y;
      });
      /* sides for each end */
      var ends = [];
      edges.forEach(function (e) {
        var s = e.s, t = e.t, k = e.route.k, ss, ts;
        if (k === "self") { ss = "T"; ts = "T"; }
        else if (k === "sh") { ss = t.c > s.c ? "R" : "L"; ts = t.c > s.c ? "L" : "R"; }
        else if (k === "sv") { ss = t.r > s.r ? "B" : "T"; ts = t.r > s.r ? "T" : "B"; }
        else if (k === "lhv") { ss = t.c > s.c ? "R" : "L"; ts = t.r > s.r ? "T" : "B"; }
        else if (k === "lvh") { ss = t.r > s.r ? "B" : "T"; ts = t.c > s.c ? "L" : "R"; }
        else if (k === "zh") { ss = t.c > s.c ? "R" : "L"; ts = t.c > s.c ? "L" : "R"; }
        else if (k === "zv") {
          if (e.route.same) { ss = "B"; ts = "B"; }
          else { ss = t.r > s.r ? "B" : "T"; ts = t.r > s.r ? "T" : "B"; }
        } else { ss = "B"; ts = t.c >= s.c ? "L" : "R"; }
        e.ss = ss; e.ts = ts;
        ends.push({ e: e, n: s, side: ss, other: t, isS: true });
        ends.push({ e: e, n: t, side: ts, other: s, isS: false });
      });
      /* ports: the ends on one side share it evenly, ordered by where their other end lies */
      var bySide = {};
      ends.forEach(function (en) { var key = en.n.id + ":" + en.side; (bySide[key] = bySide[key] || []).push(en); });
      Object.keys(bySide).forEach(function (key) {
        var list = bySide[key], n = list[0].n, side = list[0].side;
        var horiz = side === "T" || side === "B";
        list.sort(function (a, b) {
          if (a.e === b.e) return a.isS ? 1 : -1;
          var oa = horiz ? a.other.cx : a.other.cy, ob = horiz ? b.other.cx : b.other.cy;
          if (a.e.route.k === "self") oa = horiz ? n.cx + 1 : n.cy;
          if (b.e.route.k === "self") ob = horiz ? n.cx + 1 : n.cy;
          return oa - ob || a.e.i - b.e.i;
        });
        var len = horiz ? n.w2 : n.h2, inset = horiz ? Math.min(18, len / 4) : Math.min(10, len / 4);
        if (n.shape === "pill" && !horiz) inset = len / 2 - 1;
        list.forEach(function (en, k) {
          var f = list.length === 1 ? 0.5 : (k + 1) / (list.length + 1);
          var along = list.length === 1 ? len / 2 : inset + (len - 2 * inset) * (k + 0.5) / list.length;
          if (list.length === 1) along = len / 2;
          var px = side === "L" ? n.x : side === "R" ? n.x + n.w2 : n.x + along;
          var py = side === "T" ? n.y : side === "B" ? n.y + n.h2 : n.y + along;
          if (n.shape === "store" && side === "T") py += 2;
          en.p = [px, py];
          if (en.isS) en.e.ps = en.p; else en.e.pt = en.p;
        });
      });
      /* a straight edge whose one end is alone on its side moves that end level with the other, so it runs straight */
      edges.forEach(function (e) {
        var k = e.route.k;
        if (k !== "sh" && k !== "sv") return;
        var ns = bySide[e.s.id + ":" + e.ss].length, nt = bySide[e.t.id + ":" + e.ts].length;
        var ax = k === "sh" ? 1 : 0;
        function within(n, v) { return ax === 1 ? v >= n.y + 8 && v <= n.y + n.h2 - 8 : v >= n.x + 8 && v <= n.x + n.w2 - 8; }
        if (ns === 1 && nt > 1 && within(e.s, e.pt[ax])) { e.ps = e.ps.slice(); e.ps[ax] = e.pt[ax]; }
        else if (nt === 1 && ns > 1 && within(e.t, e.ps[ax])) { e.pt = e.pt.slice(); e.pt[ax] = e.ps[ax]; }
      });
      /* polylines, with channel placeholders */
      var chans = {};
      function chan(axis, g, e, a, b) { var key = axis + g; (chans[key] = chans[key] || []).push({ e: e, lo: Math.min(a, b), hi: Math.max(a, b) }); }
      edges.forEach(function (e) {
        var ps = e.ps, pt = e.pt, k = e.route.k, s = e.s, t = e.t;
        e.chan = null;
        if (k === "self") {
          var top = s.y - M.loopH;
          e.pts = [ps, [ps[0], top], [pt[0], top], pt];
          if (ps[0] > pt[0]) e.pts = [ps, [ps[0], top], [pt[0], top], pt];
        } else if (k === "sh") {
          if (Math.abs(ps[1] - pt[1]) < 0.5) e.pts = [ps, [pt[0], ps[1]]];
          else { var gj = t.c > s.c ? s.c + 1 : s.c; e.chan = { axis: "c", g: gj }; chan("c", gj, e, ps[1], pt[1]); e.pts = [ps, null, null, pt]; }
        } else if (k === "sv") {
          if (Math.abs(ps[0] - pt[0]) < 0.5) e.pts = [ps, [ps[0], pt[1]]];
          else { var gv = t.r > s.r ? s.r + 1 : s.r; e.chan = { axis: "r", g: gv }; chan("r", gv, e, ps[0], pt[0]); e.pts = [ps, null, null, pt]; }
        } else if (k === "lhv") e.pts = [ps, [pt[0], ps[1]], pt];
        else if (k === "lvh") e.pts = [ps, [ps[0], pt[1]], pt];
        else if (k === "zh") { e.chan = { axis: "c", g: e.route.g }; chan("c", e.route.g, e, ps[1], pt[1]); e.pts = [ps, null, null, pt]; }
        else if (k === "zv") { e.chan = { axis: "r", g: e.route.g }; chan("r", e.route.g, e, ps[0], pt[0]); e.pts = [ps, null, null, pt]; }
        else {
          var gRow = s.r + 1, gCol = t.c >= s.c ? t.c : t.c + 1;
          e.chan = { axis: "r", g: gRow, axis2: "c", g2: gCol };
          var gxGuess = gapX(gCol) + loC[gCol] + (gc[gCol] - loC[gCol] - hiC[gCol]) / 2;
          chan("r", gRow, e, ps[0], gxGuess); chan("c", gCol, e, gapY(gRow) + loR[gRow] + (gr[gRow] - loR[gRow] - hiR[gRow]) / 2, pt[1]);
          e.pts = [ps, null, null, null, pt];
        }
      });
      /* tracks: segments sharing a gap, side by side, 10 px apart */
      var need = [];
      Object.keys(chans).forEach(function (key) {
        var list = chans[key].sort(function (a, b) { return a.lo - b.lo || a.hi - b.hi; }), tracks = [];
        list.forEach(function (sg) {
          var k = 0;
          while (tracks[k] != null && tracks[k] > sg.lo - 6) k++;
          tracks[k] = sg.hi; sg.track = k;
        });
        var n = tracks.length;
        list.forEach(function (sg) { sg.n = n; });
        var axis = key.charAt(0), g = Number(key.slice(1));
        var room = (n - 1) * M.track + 20;
        var lo = axis === "c" ? loC[g] : loR[g], hi = axis === "c" ? hiC[g] : hiR[g];
        var have = (axis === "c" ? gc[g] : gr[g]) - lo - hi;
        if (room > have) need.push({ axis: axis, g: g, amount: room - have });
        list.forEach(function (sg) {
          var mid = axis === "c" ? gapX(g) + lo + (gc[g] - lo - hi) / 2 : gapY(g) + lo + (gr[g] - lo - hi) / 2;
          var off = (sg.track - (n - 1) / 2) * M.track;
          if (axis === "c") sg.e.gx = mid + off; else sg.e.gy = mid + off;
        });
      });
      /* two edges never share a run: where an end's stub in a gap lies on another edge's stub, that end's port moves one
         track along its side (two edges that must cross then cross once, at a point) */
      Object.keys(chans).forEach(function (key) {
        var axis = key.charAt(0), list = chans[key].filter(function (sg) { return sg.e.route.k !== "u"; });
        if (list.length < 2) return;
        var ax = axis === "r" ? 0 : 1;
        function stubs(e) {
          var g = axis === "r" ? e.gy : e.gx;
          if (g == null) return [];
          return [{ end: "s", v: e.ps[ax], a: e.ps[1 - ax], b: g }, { end: "t", v: e.pt[ax], a: g, b: e.pt[1 - ax] }];
        }
        for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
          var A = list[i].e, B = list[j].e;
          stubs(A).forEach(function (sa) {
            stubs(B).forEach(function (sb) {
              if (Math.abs(sa.v - sb.v) > 1) return;
              var lo = Math.max(Math.min(sa.a, sa.b), Math.min(sb.a, sb.b)), hi = Math.min(Math.max(sa.a, sa.b), Math.max(sb.a, sb.b));
              if (hi - lo < 1) return;
              var n = sb.end === "s" ? B.s : B.t, p = (sb.end === "s" ? B.ps : B.pt).slice();
              var lim0 = (ax === 0 ? n.x : n.y) + 6, lim1 = (ax === 0 ? n.x + n.w2 : n.y + n.h2) - 6;
              var nv = p[ax] + M.track <= lim1 ? p[ax] + M.track : p[ax] - M.track;
              if (nv < lim0) return;
              p[ax] = nv;
              if (sb.end === "s") B.ps = p; else B.pt = p;
            });
          });
        }
      });
      edges.forEach(function (e) {
        var ps = e.ps, pt = e.pt, k = e.route.k;
        if ((k === "sh" || k === "zh") && e.pts[1] === null) e.pts = [ps, [e.gx, ps[1]], [e.gx, pt[1]], pt];
        if ((k === "sv" || k === "zv") && e.pts[1] === null) e.pts = [ps, [ps[0], e.gy], [pt[0], e.gy], pt];
        if (k === "u") e.pts = [ps, [ps[0], e.gy], [e.gx, e.gy], [e.gx, pt[1]], pt];
        /* drop zero-length segments */
        var out = [e.pts[0]];
        for (var i = 1; i < e.pts.length; i++) { var a = out[out.length - 1], b = e.pts[i]; if (Math.abs(a[0] - b[0]) > 0.2 || Math.abs(a[1] - b[1]) > 0.2) out.push(b); }
        e.pts = out;
      });
      /* labels on their edge's longest segment (the loop's top), knocked out of the line */
      var placed = [];
      function labelBlocked(b, self) {
        var m = 3, i;
        for (i = 0; i < groups.length; i++) {
          var g = groups[i];
          var ov = b.x < g.x + g.w + m && b.x + b.w > g.x - m && b.y < g.y + g.h + m && b.y + b.h > g.y - m;
          var ins = b.x >= g.x + m && b.x + b.w <= g.x + g.w - m && b.y >= g.y + m && b.y + b.h <= g.y + g.h - m;
          if (ov && !ins) return true;
        }
        for (i = 0; i < G.nodes.length; i++) {
          var n = G.nodes[i];
          if (b.x < n.x + n.w2 + 2 && b.x + b.w > n.x - 2 && b.y < n.y + n.h2 + 2 && b.y + b.h > n.y - 2) return true;
        }
        for (i = 0; i < placed.length; i++) {
          var c = placed[i].lab;
          if (placed[i] !== self && c && b.x < c.x + c.w + 2 && b.x + b.w > c.x - 2 && b.y < c.y + c.h + 2 && b.y + b.h > c.y - 2) return true;
        }
        return false;
      }
      edges.forEach(function (e) {
        e.lab = null;
        if (!e.label) return;
        var lb = labelBox(e.label), best = -1, bi = 0;
        for (var i = 1; i < e.pts.length; i++) {
          var a = e.pts[i - 1], b = e.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (e.route.k === "self") { if (i === 2) { best = L; bi = i; } continue; }
          if (L > best + 0.5) { best = L; bi = i; }
        }
        var A = e.pts[bi - 1], B = e.pts[bi], horiz = Math.abs(A[1] - B[1]) < 0.5;
        var last = bi === e.pts.length - 1;
        var cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2;
        if (e.route.k === "self") { cy = A[1] - 4 - lb.h / 2; }
        else if (last) { if (horiz) cx -= (B[0] > A[0] ? 1 : -1) * M.head / 2; else cy -= (B[1] > A[1] ? 1 : -1) * M.head / 2; }
        e.lab = { lines: lb.lines, w: lb.w, h: lb.h, x: cx - lb.w / 2, y: cy - lb.h / 2, cx: cx };
        if (e.route.k === "self") return;
        /* a straight pair between two neighbours, one edge each way, runs as two parallel lines: each label sits beside
           its own line, on the pair's outer side, so neither label covers the other line */
        var twin = (e.route.k === "sv" || e.route.k === "sh") && e.pts.length === 2 ? edges.filter(function (o) {
          return o !== e && o.s === e.t && o.t === e.s && (o.route.k === "sv" || o.route.k === "sh") && o.pts && o.pts.length === 2;
        })[0] : null;
        if (twin) {
          /* beside a line, a label takes width from the drawing, so it wraps narrower (96 px) */
          if (!horiz) { lb = labelBox(e.label, 96); e.lab.lines = lb.lines; e.lab.w = lb.w; e.lab.h = lb.h; e.lab.y = cy - lb.h / 2; }
          if (!horiz) {
            var onLeft = A[0] < twin.pts[0][0];
            e.lab.x = onLeft ? A[0] - 6 - lb.w : A[0] + 6;
            e.lab.anchor = onLeft ? "end" : "start";
          } else {
            var onTop = A[1] < twin.pts[0][1];
            e.lab.y = onTop ? A[1] - 4 - lb.h : A[1] + 4;
          }
          e.lab.cx = e.lab.x + lb.w / 2;
        }
        /* a label sits wholly on one ground: where its box would cross a group's border, it slides along its segment
           (keeping its clear line and the arrowhead) to the nearest place clear of every border, node and earlier label;
           where the segment has no such place, the gap it crosses grows until it has one */
        if (!twin && labelBlocked(e.lab, e)) {
          var ax = horiz ? 0 : 1, half = (horiz ? lb.w : lb.h) / 2;
          var a0 = Math.min(A[ax], B[ax]), a1 = Math.max(A[ax], B[ax]);
          var lo = a0 + M.labClear + half + (last && B[ax] < A[ax] ? M.head : 0);
          var hi = a1 - M.labClear - half - (last && B[ax] > A[ax] ? M.head : 0);
          var mid = horiz ? cx : cy, got = null;
          for (var d = 0; got == null && (mid + d <= hi || mid - d >= lo); d += 1) {
            [mid + d, mid - d].forEach(function (v) {
              if (got != null || v < lo || v > hi) return;
              var bx = horiz ? v - lb.w / 2 : cx - lb.w / 2, by = horiz ? cy - lb.h / 2 : v - lb.h / 2;
              if (!labelBlocked({ x: bx, y: by, w: lb.w, h: lb.h }, e)) got = v;
            });
          }
          if (got != null) {
            if (horiz) cx = got; else cy = got;
            e.lab.x = cx - lb.w / 2; e.lab.y = cy - lb.h / 2; e.lab.cx = cx;
          } else {
            var reqd = (horiz ? lb.w : lb.h) + 2 * M.labClear + (last ? M.head : 0);
            if (horiz) {
              for (var gq = 0; gq <= G.C; gq++) {
                var qx0 = gapX(gq), qx1 = qx0 + gc[gq];
                if (qx1 > a0 + 0.5 && qx0 < a1 - 0.5) { var fq = gc[gq] - loC[gq] - hiC[gq]; if (reqd > fq) need.push({ axis: "c", g: gq, amount: reqd - fq }); break; }
              }
            } else {
              for (var hq = 0; hq <= G.R; hq++) {
                var qy0 = gapY(hq), qy1 = qy0 + gr[hq];
                if (qy1 > a0 + 0.5 && qy0 < a1 - 0.5) { var fr = gr[hq] - loR[hq] - hiR[hq]; if (reqd > fr) need.push({ axis: "r", g: hq, amount: reqd - fr }); break; }
              }
            }
          }
        }
        placed.push(e);
        /* room: the label plus clear line on both sides, along its segment */
        var span = horiz ? Math.abs(B[0] - A[0]) : Math.abs(B[1] - A[1]);
        var want = (horiz ? lb.w : lb.h) + 2 * M.labClear + (last ? M.head : 0) + (bi === 1 ? 2 : 0);
        if (span < want) {
          /* grow the gap the segment crosses */
          if (horiz) {
            var xa = Math.min(A[0], B[0]), xb = Math.max(A[0], B[0]), gi = null;
            for (var g = 0; g <= G.C; g++) { var gx0 = gapX(g), gx1 = gx0 + gc[g]; if (gx1 > xa + 0.5 && gx0 < xb - 0.5) { gi = g; break; } }
            if (gi != null) need.push({ axis: "c", g: gi, amount: want - span });
          } else {
            var ya = Math.min(A[1], B[1]), yb = Math.max(A[1], B[1]), gj = null;
            for (var h = 0; h <= G.R; h++) { var gy0 = gapY(h), gy1 = gy0 + gr[h]; if (gy1 > ya + 0.5 && gy0 < yb - 0.5) { gj = h; break; } }
            if (gj != null) need.push({ axis: "r", g: gj, amount: want - span });
          }
        }
        /* a label beside a vertical line in a column gap, or under a horizontal one in a row gap, needs the gap's breadth */
        if (!horiz && e.chan && (e.chan.axis === "c" || e.chan.axis2 === "c")) {
          var gcol = e.chan.axis === "c" ? e.chan.g : e.chan.g2, freeC = gc[gcol] - loC[gcol] - hiC[gcol];
          if (lb.w + 12 > freeC) need.push({ axis: "c", g: gcol, amount: lb.w + 12 - freeC });
        }
        if (horiz && e.chan && e.chan.axis === "r" && Math.abs(A[1] - e.gy) < 0.5) {
          var freeR = gr[e.chan.g] - loR[e.chan.g] - hiR[e.chan.g];
          if (lb.h + 10 > freeR) need.push({ axis: "r", g: e.chan.g, amount: lb.h + 10 - freeR });
        }
        if (!horiz && (e.route.k === "sv" || e.route.k === "lhv" || e.route.k === "lvh") && lb.w > 0) {
          /* a label on a vertical run inside a column: keep it inside the drawing */
          var minX = 2, maxX = W - 2;
          if (e.lab.x < minX) need.push({ axis: "c", g: 0, amount: minX - e.lab.x });
          if (e.lab.x + e.lab.w > maxX) need.push({ axis: "c", g: G.C, amount: e.lab.x + e.lab.w - maxX });
        }
      });
      /* a loop's label must not run past the drawing */
      edges.forEach(function (e) {
        if (e.route.k !== "self" || !e.lab) return;
        if (e.lab.x < 2) need.push({ axis: "c", g: 0, amount: 2 - e.lab.x });
        if (e.lab.x + e.lab.w > W - 2) need.push({ axis: "c", g: G.C, amount: e.lab.x + e.lab.w - W + 2 });
      });
      return { W: W, H: H, colX: colX, rowY: rowY, gc: gc, gr: gr, need: need };
    }

    /* ---------- primitives ---------- */
    var out = { regions: [], edges: [], heads: [], shapes: [], rules: [], knocks: [], texts: [] };
    /* a group's name sits at its top left, moved right past any edge that crosses its band; where none of the band is
       free, the name is knocked out of the edge, as an edge label is */
    var verts = [];
    edges.forEach(function (e) { for (var i = 1; i < e.pts.length; i++) { var A = e.pts[i - 1], B = e.pts[i]; if (Math.abs(A[0] - B[0]) < 0.5) verts.push({ x: A[0], y0: Math.min(A[1], B[1]), y1: Math.max(A[1], B[1]) }); } });
    groups.forEach(function (g) {
      out.regions.push({ d: rectPath(g.x, g.y, g.w, g.h, 8), cls: "dg-grp dg-tone-" + g.tone });
      var lw = widest(g.label, F.smallB), top = g.y + 6, bot = top + g.label.length * F.smallB.lh;
      var hits = verts.filter(function (v) { return v.y1 > top - 2 && v.y0 < bot + 2 && v.x > g.x && v.x < g.x + g.w; });
      var x0 = g.x + 10, moved = true, knock = false;
      for (var k = 0; k < 12 && moved; k++) {
        moved = false;
        hits.forEach(function (v) { if (v.x > x0 - 6 && v.x < x0 + lw + 6) { x0 = v.x + 8; moved = true; } });
      }
      if (x0 + lw > g.x + g.w - 8) { x0 = g.x + 10; knock = hits.length > 0; }
      if (knock) out.knocks.push({ x: r1(x0 - 3), y: r1(top - 1), w: r1(lw + 6), h: r1(bot - top + 2), cls: "dg-knock dg-knock--grp dg-tone-" + g.tone });
      DG.textBlock(g.label, F.smallB, x0, top, "dg-t dg-t--grp", "start").forEach(function (t) { out.texts.push(t); });
    });
    if (init) {
      var dot, tip, from;
      if (G.dir === "right") { tip = [init.x, init.cy]; dot = [init.x - M.initLen - M.dotR, init.cy]; from = [dot[0] + M.dotR, dot[1]]; }
      else { tip = [init.cx, init.y]; dot = [init.cx, init.y - M.initLen - M.dotR]; from = [dot[0], dot[1] + M.dotR]; }
      out.edges.push({ d: rounded([from, [tip[0] - (G.dir === "right" ? M.head - 1 : 0), tip[1] - (G.dir === "right" ? 0 : M.head - 1)]], 0), cls: "dg-e" });
      out.heads.push({ d: head(tip, from, M.head, M.headW), cls: "dg-h" });
      out.shapes.push({ d: "M" + r1(dot[0] - M.dotR) + " " + r1(dot[1]) + " a" + M.dotR + " " + M.dotR + " 0 1 0 " + 2 * M.dotR + " 0 a" + M.dotR + " " + M.dotR + " 0 1 0 " + -2 * M.dotR + " 0 Z", cls: "dg-start" });
    }
    edges.forEach(function (e) {
      var pts = e.pts.slice(), n = pts.length, tipP = pts[n - 1], prev = pts[n - 2];
      var dx = tipP[0] - prev[0], dy = tipP[1] - prev[1], l = Math.hypot(dx, dy) || 1;
      pts[n - 1] = [tipP[0] - dx / l * (M.head - 1.5), tipP[1] - dy / l * (M.head - 1.5)];
      var tc = e.tone === "default" ? "" : " dg-st-" + e.tone;
      out.edges.push({ d: rounded(pts, M.bend), cls: "dg-e" + (e.dashed ? " dg-e--dash" : "") + tc });
      out.heads.push({ d: head(tipP, prev, M.head, M.headW), cls: "dg-h" + (e.tone === "default" ? "" : " dg-hf-" + e.tone) });
      if (e.lab) {
        var under = null;
        groups.forEach(function (g) { if (e.lab.cx >= g.x && e.lab.cx <= g.x + g.w && e.lab.y + e.lab.h / 2 >= g.y && e.lab.y + e.lab.h / 2 <= g.y + g.h) under = g; });
        out.knocks.push({ x: r1(e.lab.x), y: r1(e.lab.y), w: r1(e.lab.w), h: r1(e.lab.h), cls: "dg-knock" + (under ? " dg-knock--grp dg-tone-" + under.tone : "") });
        var tx = e.lab.anchor === "end" ? e.lab.x + e.lab.w - M.labPadX : e.lab.anchor === "start" ? e.lab.x + M.labPadX : e.lab.x + e.lab.w / 2;
        DG.textBlock(e.lab.lines, F.small, tx, e.lab.y + M.labPadY, "dg-t dg-t--edge" + (e.tone === "default" ? "" : " dg-ink-" + e.tone), e.lab.anchor).forEach(function (t) { out.texts.push(t); });
      }
    });
    G.nodes.forEach(function (n) {
      var cls = "dg-n dg-tone-" + n.tone;
      if (n.shape === "box") out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, 4), cls: cls });
      else if (n.shape === "pill") out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, n.h2 / 2), cls: cls });
      else if (n.shape === "state") {
        out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, M.stateR), cls: cls });
        if (n.isFinal) out.rules.push({ d: rectPath(n.x + 3.5, n.y + 3.5, n.w2 - 7, n.h2 - 7, M.stateR - 3), cls: "dg-line dg-st-" + (n.tone === "default" ? "ink" : n.tone) });
      } else if (n.shape === "store") {
        var rx = n.w2 / 2, ry = 6, x = n.x, y = n.y, w = n.w2, h = n.h2;
        out.shapes.push({ d: "M" + r1(x) + " " + r1(y + ry) + " A" + r1(rx) + " " + ry + " 0 0 1 " + r1(x + w) + " " + r1(y + ry) + " V" + r1(y + h - ry) + " A" + r1(rx) + " " + ry + " 0 0 1 " + r1(x) + " " + r1(y + h - ry) + " Z", cls: cls });
        out.rules.push({ d: "M" + r1(x) + " " + r1(y + ry) + " A" + r1(rx) + " " + ry + " 0 0 0 " + r1(x + w) + " " + r1(y + ry), cls: "dg-line dg-st-" + n.tone });
      } else if (n.shape === "entity") {
        out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, 4), cls: cls + " dg-n--entity" });
        out.shapes.push({ d: "M" + r1(n.x + 0.5) + " " + r1(n.y + 4) + " A3.5 3.5 0 0 1 " + r1(n.x + 4) + " " + r1(n.y + 0.5) + " H" + r1(n.x + n.w2 - 4) + " A3.5 3.5 0 0 1 " + r1(n.x + n.w2 - 0.5) + " " + r1(n.y + 4) + " V" + r1(n.y + n.headH) + " H" + r1(n.x + 0.5) + " Z", cls: "dg-enthead dg-tone-" + n.tone });
        out.rules.push({ d: "M" + r1(n.x) + " " + r1(n.y + n.headH) + " H" + r1(n.x + n.w2), cls: "dg-line dg-st-" + n.tone });
      }
      /* text */
      if (n.shape === "entity") {
        DG.textBlock(n.head, F.label, n.x + M.entPadX, n.y + M.entHeadPad, "dg-t dg-t--label", "start").forEach(function (t) { out.texts.push(t); });
        var fy = n.y + n.headH + 3;
        n.fields.forEach(function (fl, k) {
          if (k > 0) out.rules.push({ d: "M" + r1(n.x + 8) + " " + r1(fy) + " H" + r1(n.x + n.w2 - 8), cls: "dg-hair" });
          DG.textBlock(fl, F.mono, n.x + M.entPadX, fy + M.fieldPad, "dg-t dg-t--field", "start").forEach(function (t) { out.texts.push(t); });
          fy += n.rows[k];
        });
      } else {
        var top = n.y + n.padT + (n.h2 - n.padT - n.padB - n.ch) / 2;
        DG.textBlock(n.lab, F.label, n.cx, top, "dg-t dg-t--label" + (n.tone === "muted" ? " dg-t--muted" : "")).forEach(function (t) { out.texts.push(t); });
        if (n.sub.length) DG.textBlock(n.sub, F.small, n.cx, top + n.lab.length * F.label.lh + 2, "dg-t dg-t--sub").forEach(function (t) { out.texts.push(t); });
      }
    });
    var W = Math.ceil(geo.W), H = Math.ceil(geo.H);
    return { W: W, H: H, prims: out, nodes: G.nodes, edges: edges, groups: groups, init: init, finals: finals };
  }
  DG.layoutGraph = layoutGraph;

  /* ---------- sequence: one column per actor, one row per step ---------- */
  function layoutSequence(spec) {
    var actors = (spec.actors || []).map(function (a, i) {
      var lab = wrapB(String(a.label || a.id), F.label, 128);
      return { id: String(a.id), i: i, lab: lab, w: Math.max(84, Math.ceil(widest(lab, F.label) + 2 * M.padX)), h: lab.length * F.label.lh + 2 * M.padY };
    });
    var byId = {};
    actors.forEach(function (a) { byId[a.id] = a; });
    var N = actors.length;
    var steps = (spec.steps || []).filter(function (s) { return byId[String(s.from)] && byId[String(s.to)]; }).map(function (s, i) {
      var a = byId[String(s.from)], b = byId[String(s.to)];
      var text = (i + 1) + "  " + String(s.label || "");
      var self = a === b;
      var lb = wrapB(String(s.label || ""), F.small, self ? 150 : 210);
      var note = s.note ? wrapB(String(s.note), F.small, 220) : null;
      return { i: i, a: a, b: b, self: self, dashed: s.style === "dashed", tone: tone(s.tone), lines: lb, lw: widest(lb, F.small), note: note, nw: note ? widest(note, F.small) : 0 };
    });
    /* column spacing: wide enough for each actor's box and each step's label over the columns it spans */
    var sp = [];
    for (var k = 0; k < N - 1; k++) sp[k] = Math.max(110, (actors[k].w + actors[k + 1].w) / 2 + 24);
    var numW = 18;
    steps.forEach(function (s) {
      if (s.self) {
        var needR = M.loopW + 8 + numW + s.lw + 10;
        if (s.a.i < N - 1) sp[s.a.i] = Math.max(sp[s.a.i], needR + 16);
        return;
      }
      var lo = Math.min(s.a.i, s.b.i), hi = Math.max(s.a.i, s.b.i), have = sum(sp, lo, hi), want = s.lw + numW + 28;
      if (have < want) { var add = (want - have) / (hi - lo); for (var q = lo; q < hi; q++) sp[q] += add; }
    });
    var left = Math.max(actors.length ? actors[0].w / 2 : 0, 0) + 4;
    var xs = [], x = left;
    actors.forEach(function (a, i) { xs[i] = x; if (i < N - 1) x += sp[i]; });
    var rightNeed = N ? actors[N - 1].w / 2 + 4 : 0;
    steps.forEach(function (s) { if (s.self && s.a.i === N - 1) rightNeed = Math.max(rightNeed, M.loopW + 8 + numW + s.lw + 10); });
    steps.forEach(function (s) { if (s.note) { var cx = s.self ? xs[s.a.i] : (xs[s.a.i] + xs[s.b.i]) / 2; rightNeed = Math.max(rightNeed, cx + s.nw / 2 + 14 - xs[N - 1]); } });
    var W = Math.ceil(x + rightNeed);
    var headH = actors.reduce(function (m, a) { return Math.max(m, a.h); }, 40);
    var out = { regions: [], edges: [], heads: [], shapes: [], rules: [], knocks: [], texts: [] };
    var y = headH + 22;
    steps.forEach(function (s) {
      var labH = s.lines.length * F.small.lh;
      s.y0 = y;
      if (s.self) {
        var lx = xs[s.a.i];
        var ly = y + 4;
        s.ly = ly;
        y += Math.max(labH + 6, M.loopH + 12) + 6;
      } else {
        s.ly = y + labH + 4;
        y = s.ly + 14;
      }
      if (s.note) { s.ny = y; y += s.note.length * F.small.lh + 14 + 12; }
      y += 4;
    });
    var H = Math.ceil(y + 6);
    actors.forEach(function (a, i) {
      /* lifelines lie under everything else, so a note covers them */
      out.regions.push({ d: "M" + r1(xs[i]) + " " + r1(headH) + " V" + r1(H - 2), cls: "dg-life" });
      out.shapes.push({ d: DG.rectPath(xs[i] - a.w / 2, (headH - a.h) / 2, a.w, a.h, 4), cls: "dg-n dg-tone-default" });
      DG.textBlock(a.lab, F.label, xs[i], (headH - a.h) / 2 + M.padY, "dg-t dg-t--label").forEach(function (t) { out.texts.push(t); });
    });
    steps.forEach(function (s) {
      var xa = xs[s.a.i], xb = xs[s.b.i], tc = s.tone === "default" ? "" : " dg-st-" + s.tone, hc = s.tone === "default" ? "" : " dg-hf-" + s.tone;
      var num = String(s.i + 1);
      if (s.self) {
        var top = s.ly + 2, bot = top + M.loopH, r = xa + M.loopW;
        var pts = [[xa, top], [r, top], [r, bot], [xa + M.head - 1.5, bot]];
        out.edges.push({ d: DG.rounded(pts, M.bend), cls: "dg-e" + (s.dashed ? " dg-e--dash" : "") + tc });
        out.heads.push({ d: DG.head([xa + 1, bot], [r, bot], M.head, M.headW), cls: "dg-h" + hc });
        var tx = r + 8;
        /* the step's number and label are knocked out of any line they cross */
        out.knocks.push({ x: r1(tx - 3), y: r1(top - 3), w: r1(numW + s.lw + 6), h: r1(s.lines.length * F.small.lh + 2), cls: "dg-knock" });
        out.texts.push({ x: r1(tx), y: r1(top + F.small.lh / 2 + F.small.size * 0.34 - 2), t: num, cls: "dg-t dg-t--num dg-t--start" });
        DG.textBlock(s.lines, F.small, tx + numW, top - 2, "dg-t dg-t--edge" + (s.tone === "default" ? "" : " dg-ink-" + s.tone), "start").forEach(function (t) { out.texts.push(t); });
      } else {
        var dir = xb > xa ? 1 : -1;
        var from = [xa + dir * 1, s.ly], tip = [xb - dir * 1, s.ly];
        out.edges.push({ d: "M" + r1(from[0]) + " " + r1(s.ly) + " H" + r1(tip[0] - dir * (M.head - 1.5)), cls: "dg-e" + (s.dashed ? " dg-e--dash" : "") + tc });
        out.heads.push({ d: DG.head(tip, from, M.head, M.headW), cls: "dg-h" + hc });
        var mid = (xa + xb) / 2, total = numW + s.lw, x0 = mid - total / 2;
        var top2 = s.ly - 4 - s.lines.length * F.small.lh;
        /* a label that spans several columns is knocked out of the lifelines it crosses */
        out.knocks.push({ x: r1(x0 - 3), y: r1(top2 - 1), w: r1(total + 6), h: r1(s.lines.length * F.small.lh + 2), cls: "dg-knock" });
        out.texts.push({ x: r1(x0), y: r1(top2 + F.small.lh / 2 + F.small.size * 0.34), t: num, cls: "dg-t dg-t--num dg-t--start" });
        DG.textBlock(s.lines, F.small, x0 + numW, top2, "dg-t dg-t--edge" + (s.tone === "default" ? "" : " dg-ink-" + s.tone), "start").forEach(function (t) { out.texts.push(t); });
      }
      if (s.note) {
        var ncx = s.self ? xa + 30 : (xa + xb) / 2;
        var nw = Math.ceil(s.nw + 24), nh = s.note.length * F.small.lh + 14, nx = ncx - nw / 2, ny = s.ny;
        if (nx < 2) nx = 2;
        var fold = 8;
        out.shapes.push({ d: "M" + r1(nx) + " " + r1(ny) + " H" + r1(nx + nw - fold) + " L" + r1(nx + nw) + " " + r1(ny + fold) + " V" + r1(ny + nh) + " H" + r1(nx) + " Z", cls: "dg-note" });
        out.rules.push({ d: "M" + r1(nx + nw - fold) + " " + r1(ny) + " V" + r1(ny + fold) + " H" + r1(nx + nw), cls: "dg-line dg-st-warn" });
        DG.textBlock(s.note, F.small, nx + 12, ny + 7, "dg-t dg-t--note", "start").forEach(function (t) { out.texts.push(t); });
      }
    });
    return { W: W, H: H, prims: out, actors: actors, steps: steps };
  }
  DG.layoutSequence = layoutSequence;
})();
