/* ==========================================================================
   Knowledge Base — graph.js  (P6.S2 · the knowledge map renderer)
   --------------------------------------------------------------------------
   The repo's first custom JS. Vendored, hand-rolled, ZERO third-party code and
   ZERO CDN references (site_smoke.py allowlists exactly this one entry). An
   interactive Obsidian-style knowledge map, drawn client-side from the static
   <site>/graph.json that scripts/graph_hook.py emits at build time.

   This file ports the LOCKED P6.S0 design (mirror: components/graph/) 1:1:
     · tokens/graph.css              → live getComputedStyle reads (both schemes)
     · graph-render.js               → the drawing grammar (draw order, mark
                                        recipes, 3px label halo, α-dim)
     · graph-labels.card.html        → Strategy A + the zoom ladder
     · graph-panel.card.html         → legend / switch / zoom / tooltip / panel
   Engineering replaces the design-reference hand-placed layout with a real
   hand-rolled force sim (settle-then-still ~600ms, then STOP — no idle drift).

   extra_javascript loads on every page, so the very first thing this does is a
   no-op guard: if there is no .kb-graph mount, it returns immediately.
   ========================================================================== */
(function () {
  'use strict';

  var host = document.querySelector('.kb-graph');
  if (!host) return; /* no-op on every page but /graph/ */
  var canvas = host.querySelector('canvas.kb-graph__canvas') || host.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var SRC = host.getAttribute('data-graph-src') || '../graph.json';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- sim tuning (engineering; unconstrained by the locked visual design) --
     Link springs: related edges are SHORTER + STRONGER than tag edges (the doc
     backbone reads tight); tag spokes are longer + gentle so tags nestle in a
     hub-and-spoke around their doc. Pairwise repulsion + mild centering +
     collision padding. Alpha cools ~0.9/tick from 1 → 0.02 in ~37 ticks ≈ the
     600ms --kb-graph-settle budget, then the loop STOPS. */
  var REST_RELATED = 110, K_RELATED = 0.9;
  var REST_TAG = 160, K_TAG = 0.2;
  var REPULSION = 9000, REPULSION_MAX_D2 = 600 * 600;
  var CENTER_K = 0.016, COLLIDE_PAD = 6, COLLIDE_ITERS = 2;
  var ALPHA_DECAY = 0.1, ALPHA_MIN = 0.02, ALPHA_REHEAT = 0.35, VEL_DECAY = 0.6;
  var LAYOUT_RADIUS = 340;
  var FIT_PAD = 64, FIT_Z_MIN = 0.5, FIT_Z_MAX = 1.5, ZOOM_MIN = 0.3, ZOOM_MAX = 4;
  var HUB_DEGREE = 6;                 /* degree ≥ 6 → a hub doc (labelled when zoomed out) */

  /* ------------------------------------------------------------------ tokens */
  /* Read live per paint so the Material scheme toggle "just works". */
  function readTokens() {
    var cs = getComputedStyle(host);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    var px = function (n) { return parseFloat(v(n)) || 0; };
    return {
      canvas: v('--kb-graph-canvas'),
      projects: [v('--kb-graph-project-1'), v('--kb-graph-project-2'), v('--kb-graph-project-3')],
      docFallback: v('--kb-graph-node-doc'),
      outline: v('--kb-graph-node-outline'),
      tag: v('--kb-graph-node-tag'),
      ghost: v('--kb-graph-node-ghost'),
      edge: v('--kb-graph-edge'),
      edgeRelated: v('--kb-graph-edge-related'),
      edgeActive: v('--kb-graph-edge-active'),
      focus: v('--kb-graph-focus'),
      halo: v('--kb-graph-halo'),
      label: v('--kb-graph-label'),
      labelMuted: v('--kb-graph-label-muted'),
      labelHalo: v('--kb-graph-label-halo'),
      dim: parseFloat(v('--kb-graph-dim')) || 0.16,
      rMin: px('--kb-graph-node-r-min') || 6,
      rMax: px('--kb-graph-node-r-max') || 14,
      rTag: px('--kb-graph-node-r-tag') || 4.5,
      rGhost: px('--kb-graph-node-r-ghost') || 5.5,
      strokeW: px('--kb-graph-node-stroke') || 1.5,
      cutout: px('--kb-graph-node-cutout') || 1.5,
      edgeW: px('--kb-graph-edge-w') || 1,
      edgeWRel: px('--kb-graph-edge-w-related') || 1.75,
      arrow: px('--kb-graph-arrow') || 5,
      dash: (v('--kb-graph-ghost-dash') || '4, 4').split(',').map(function (s) { return parseFloat(s) || 4; }),
      haloBlur: px('--kb-graph-halo-blur') || 8,
      focusW: px('--kb-graph-focus-w') || 2,
      focusGap: px('--kb-graph-focus-gap') || 2,
      font: v('--kb-graph-font') || 'sans-serif',
      labelSize: px('--kb-graph-label-size') || 12.5,
      labelSizeTag: px('--kb-graph-label-size-tag') || 11,
      labelGap: px('--kb-graph-label-gap') || 6,
      settle: px('--kb-graph-settle') || 600
    };
  }
  var T = readTokens();

  /* ------------------------------------------------------- deterministic hash */
  /* FNV-1a → [0,1). No randomness anywhere: the initial layout is a pure
     function of the node ids, so every load places the same map. */
  function hash01(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000000) / 1000000;
  }

  /* --------------------------------------------------------- overlay elements */
  var elLegend = host.querySelector('.kb-graph-legend');
  var elZoom = host.querySelector('.kb-graph-zoom');
  var elTooltip = host.querySelector('.kb-graph-tooltip');
  var elPanel = host.querySelector('.kb-graph-panel');
  var elEmpty = host.querySelector('.kb-graph-empty');
  var emptyDefaultHTML = elEmpty ? elEmpty.innerHTML : '';

  function showEmpty(mode) {
    if (!elEmpty) return;
    if (mode === 'none') { elEmpty.hidden = true; return; }
    if (mode === 'loading') {
      elEmpty.innerHTML =
        '<div class="kb-graph-empty__title">Laying out the map…</div>' +
        '<div class="kb-graph-empty__sub">지도를 배치하는 중 — settles in ~0.6s, then holds still.</div>';
    } else { /* 'empty' */
      elEmpty.innerHTML = emptyDefaultHTML;
    }
    elEmpty.hidden = false;
  }

  /* ------------------------------------------------------------------- state */
  var nodes = [], edges = [], nodeById = {}, adjacency = {};
  var projectInk = {};                      /* project name → 0-based ink index */
  var offProjects = {};                      /* project name → true when filtered off */
  var tagsVisible = true;
  var hoverId = null, selectedId = null;
  var W = 0, H = 0, dpr = 1;
  var view = { z: 1, panX: 0, panY: 0, fitZoom: 1, auto: true };
  var center = { x: 0, y: 0 };
  var alpha = 0, simStarted = false;
  var tagReveal = 0;                         /* 0..1 fade of neighborhood/zoom-in tag labels */
  var frameQueued = false, lastT = 0;
  var pointer = { down: false, moved: false, mode: null, id: null, sx: 0, sy: 0, startX: 0, startY: 0 };

  /* ============================================================ data → model */
  function buildModel(data) {
    var projects = (data && data.projects) || [];
    projects.forEach(function (p, i) { projectInk[p.name] = i % 3; });

    var raw = (data && data.nodes) || [];
    var rawEdges = (data && data.edges) || [];

    nodes = raw.map(function (n) {
      var deg = n.degree || 0;
      var r;
      if (n.type === 'doc') r = T.rMin + (T.rMax - T.rMin) * Math.min(1, Math.max(0, (deg - 2) / 6));
      else if (n.type === 'tag') r = T.rTag;
      else r = T.rGhost;
      var m = {
        id: n.id, type: n.type, title: n.title || n.id, deg: deg, r: r,
        url: n.url, date: n.date, project: n.project, tags: n.tags || [],
        x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null
      };
      return m;
    });
    nodes.forEach(function (n) { nodeById[n.id] = n; });

    /* deterministic, project-clustered initial placement (no randomness) */
    var P = Math.max(1, projects.length);
    nodes.forEach(function (n) {
      var ang, rad;
      if (n.type === 'doc') {
        var pIdx = projectInk[n.project] != null ? projectInk[n.project] : 0;
        ang = (2 * Math.PI * pIdx) / P + (hash01(n.id) - 0.5) * (2 * Math.PI / P) * 0.7;
        rad = LAYOUT_RADIUS * (0.45 + hash01(n.id + '#r') * 0.5);
      } else {
        ang = 2 * Math.PI * hash01(n.id);
        rad = LAYOUT_RADIUS * (0.85 + hash01(n.id + '#r') * 0.55);
      }
      n.x = Math.cos(ang) * rad;
      n.y = Math.sin(ang) * rad;
    });

    edges = rawEdges.filter(function (e) {
      return nodeById[e.source] && nodeById[e.target];
    }).map(function (e) {
      return {
        a: e.source, b: e.target, kind: e.kind,
        ghost: nodeById[e.target].type === 'missing'
      };
    });

    adjacency = {};
    nodes.forEach(function (n) { adjacency[n.id] = {}; });
    edges.forEach(function (e) { adjacency[e.a][e.b] = true; adjacency[e.b][e.a] = true; });
  }

  /* ============================================================== force sim */
  function tick(a) {
    var i, j, n, e, A, B, dx, dy, d, d2, ux, uy, f;

    /* pairwise repulsion (O(n²); trivial at ≤150 nodes) */
    for (i = 0; i < nodes.length; i++) {
      A = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        B = nodes[j];
        dx = B.x - A.x; dy = B.y - A.y; d2 = dx * dx + dy * dy;
        if (d2 > REPULSION_MAX_D2) continue;
        if (d2 < 1) { d2 = 1; dx = 0.5 - hash01(A.id + B.id); dy = 0.5 - hash01(B.id + A.id); }
        d = Math.sqrt(d2); ux = dx / d; uy = dy / d;
        f = (REPULSION / d2) * a;
        A.vx -= ux * f; A.vy -= uy * f;
        B.vx += ux * f; B.vy += uy * f;
      }
    }

    /* link springs (related shorter/stronger than tag) */
    for (i = 0; i < edges.length; i++) {
      e = edges[i]; A = nodeById[e.a]; B = nodeById[e.b];
      dx = B.x - A.x; dy = B.y - A.y; d = Math.hypot(dx, dy) || 0.01;
      var rest = e.kind === 'related' ? REST_RELATED : REST_TAG;
      var k = e.kind === 'related' ? K_RELATED : K_TAG;
      f = ((d - rest) / d) * k * a * 0.5;
      dx *= f; dy *= f;
      A.vx += dx; A.vy += dy;
      B.vx -= dx; B.vy -= dy;
    }

    /* mild centering toward the origin */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.vx -= n.x * CENTER_K * a;
      n.vy -= n.y * CENTER_K * a;
    }

    /* integrate with velocity decay; pinned (dragged) nodes hold position */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0; continue; }
      n.vx *= VEL_DECAY; n.vy *= VEL_DECAY;
      n.x += n.vx; n.y += n.vy;
    }

    /* collision relax (position-based) */
    for (var it = 0; it < COLLIDE_ITERS; it++) {
      for (i = 0; i < nodes.length; i++) {
        A = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          B = nodes[j];
          var min = A.r + B.r + COLLIDE_PAD;
          dx = B.x - A.x; dy = B.y - A.y; d = Math.hypot(dx, dy) || 0.01;
          if (d < min) {
            var push = (min - d) / 2; ux = dx / d; uy = dy / d;
            if (A.fx == null) { A.x -= ux * push; A.y -= uy * push; }
            if (B.fx == null) { B.x += ux * push; B.y += uy * push; }
          }
        }
      }
    }
  }

  function convergeSync(maxTicks) {
    var a = 1;
    for (var i = 0; i < maxTicks && a > ALPHA_MIN; i++) { tick(a); a *= (1 - ALPHA_DECAY); }
  }

  /* ================================================================ camera */
  function visibleNodes() {
    return nodes.filter(function (n) { return !isHidden(n); });
  }

  function fit() {
    var vis = visibleNodes();
    if (!vis.length) { view.z = 1; view.fitZoom = 1; view.panX = 0; view.panY = 0; return; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    vis.forEach(function (n) {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    });
    center.x = (minX + maxX) / 2; center.y = (minY + maxY) / 2;
    var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    var z = Math.min((W - 2 * FIT_PAD) / bw, (H - 2 * FIT_PAD) / bh);
    if (!isFinite(z) || z <= 0) z = 1;
    z = Math.max(FIT_Z_MIN, Math.min(FIT_Z_MAX, z));
    view.z = z; view.fitZoom = z; view.panX = 0; view.panY = 0;
  }

  function toScreen(n) {
    return { x: W / 2 + (n.x - center.x) * view.z + view.panX, y: H / 2 + (n.y - center.y) * view.z + view.panY };
  }
  function toWorld(sx, sy) {
    return { x: (sx - W / 2 - view.panX) / view.z + center.x, y: (sy - H / 2 - view.panY) / view.z + center.y };
  }
  function displayZoom() { return view.z / (view.fitZoom || 1); }

  function zoomAbout(sx, sy, factor) {
    var wx = (sx - W / 2 - view.panX) / view.z + center.x;
    var wy = (sy - H / 2 - view.panY) / view.z + center.y;
    var target = Math.max(view.fitZoom * ZOOM_MIN, Math.min(view.fitZoom * ZOOM_MAX, view.z * factor));
    view.z = target;
    view.panX = sx - W / 2 - (wx - center.x) * view.z;
    view.panY = sy - H / 2 - (wy - center.y) * view.z;
    view.auto = false;
    scheduleDraw();
  }

  /* ============================================================ visibility */
  function isHidden(n) {
    if (n.type === 'doc') return !!offProjects[n.project];
    if (n.type === 'tag') {
      if (!tagsVisible) return true;
      /* hide a tag with no visible doc neighbour (e.g. its only doc filtered off) */
      var keys = Object.keys(adjacency[n.id] || {});
      for (var i = 0; i < keys.length; i++) {
        var o = nodeById[keys[i]];
        if (o && o.type === 'doc' && !offProjects[o.project]) return false;
      }
      return true;
    }
    return false; /* ghost stays visible */
  }
  function edgeHidden(e) {
    if (e.kind === 'tag' && !tagsVisible) return true;
    return isHidden(nodeById[e.a]) || isHidden(nodeById[e.b]);
  }

  function neighborhood(id) {
    var keep = {}; keep[id] = true;
    var adj = adjacency[id] || {};
    Object.keys(adj).forEach(function (k) { keep[k] = true; });
    return keep;
  }

  /* ================================================================ drawing */
  /* Draw order (ported from graph-render.js): dimmed edges → live edges →
     halo → dimmed nodes → live nodes → selection ring → labels. */
  function draw() {
    var z = view.z;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = T.canvas;
    ctx.fillRect(0, 0, W, H);

    var focusId = selectedId || hoverId;
    var keep = focusId && nodeById[focusId] ? neighborhood(focusId) : null;
    var dz = displayZoom();

    /* --- edges: dimmed pass, then live pass --- */
    edges.forEach(function (e) {
      if (edgeHidden(e)) return;
      var live = !keep || (keep[e.a] && keep[e.b]);
      if (live) return;
      ctx.globalAlpha = T.dim; drawEdge(e, z, false); ctx.globalAlpha = 1;
    });
    edges.forEach(function (e) {
      if (edgeHidden(e)) return;
      var live = !keep || (keep[e.a] && keep[e.b]);
      if (!live) return;
      var active = !!keep && (e.a === focusId || e.b === focusId);
      drawEdge(e, z, active);
    });

    /* --- halo behind the focused node --- */
    if (focusId && nodeById[focusId] && !isHidden(nodeById[focusId])) drawHalo(nodeById[focusId], z);

    /* --- nodes: dimmed, then live --- */
    nodes.forEach(function (n) {
      if (isHidden(n)) return;
      if (keep && !keep[n.id]) { ctx.globalAlpha = T.dim; drawNode(n, z); ctx.globalAlpha = 1; }
    });
    nodes.forEach(function (n) {
      if (isHidden(n)) return;
      if (!keep || keep[n.id]) drawNode(n, z);
    });

    /* --- selection ring --- */
    if (selectedId && nodeById[selectedId] && !isHidden(nodeById[selectedId])) drawRing(nodeById[selectedId], z);

    /* --- labels (hidden on dimmed nodes) --- */
    nodes.forEach(function (n) {
      if (isHidden(n)) return;
      if (keep && !keep[n.id]) return;
      drawLabelForNode(n, z, dz, keep, focusId);
    });

    ctx.globalAlpha = 1;
  }

  function drawEdge(e, z, active) {
    var A = nodeById[e.a], B = nodeById[e.b];
    var pA = toScreen(A), pB = toScreen(B);
    var dx = pB.x - pA.x, dy = pB.y - pA.y, d = Math.hypot(dx, dy) || 1;
    var ux = dx / d, uy = dy / d;
    var rA = A.r * z, rB = B.r * z, arrow = T.arrow * z;
    var related = e.kind === 'related';
    var x1 = pA.x + ux * rA, y1 = pA.y + uy * rA;
    var gap = related ? 3 * z + arrow : 1;
    var x2 = pB.x - ux * (rB + gap), y2 = pB.y - uy * (rB + gap);

    ctx.strokeStyle = active ? T.edgeActive : (related ? T.edgeRelated : T.edge);
    ctx.lineWidth = (related ? T.edgeWRel : T.edgeW) * z;
    ctx.setLineDash(e.ghost ? T.dash.map(function (v) { return v * z; }) : []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);

    if (related) { /* arrowhead, tip 3px off the target rim */
      var tipX = pB.x - ux * (rB + 3 * z), tipY = pB.y - uy * (rB + 3 * z);
      var bx = tipX - ux * arrow, by = tipY - uy * arrow;
      var wx = -uy * arrow * 0.48, wy = ux * arrow * 0.48;
      ctx.fillStyle = active ? T.edgeActive : T.edgeRelated;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(bx + wx, by + wy); ctx.lineTo(bx - wx, by - wy);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawHalo(n, z) {
    var p = toScreen(n), r = n.r * z, R = r + T.haloBlur * 1.9 * z;
    var grad = ctx.createRadialGradient(p.x, p.y, Math.max(1, r * 0.5), p.x, p.y, R);
    grad.addColorStop(0, T.halo); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
  }

  function drawNode(n, z) {
    var p = toScreen(n), r = n.r * z;
    ctx.setLineDash([]);
    if (n.type === 'doc') {
      var ink = projectInk[n.project] != null ? T.projects[projectInk[n.project]] : T.docFallback;
      ctx.fillStyle = ink || T.docFallback;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (T.cutout > 0) {
        ctx.strokeStyle = T.outline; ctx.lineWidth = T.cutout * z;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + T.cutout * z / 2, 0, Math.PI * 2); ctx.stroke();
      }
    } else { /* tag / ghost: hollow ring on a plate-filled disc */
      ctx.fillStyle = T.canvas;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = n.type === 'missing' ? T.ghost : T.tag;
      ctx.lineWidth = T.strokeW * z;
      if (n.type === 'missing') ctx.setLineDash(T.dash.map(function (v) { return v * z; }));
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawRing(n, z) {
    var p = toScreen(n), r = n.r * z;
    ctx.strokeStyle = T.focus; ctx.lineWidth = T.focusW * z;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + (T.focusGap + T.focusW / 2 + (n.type === 'doc' ? T.cutout : 0)) * z, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawLabelForNode(n, z, dz, keep, focusId) {
    var focused = focusId && n.id === focusId;
    if (n.type === 'tag') {
      /* tag labels: neighborhood (hover/selected) OR zoomed-in past 110% — faded */
      var wantTag = (keep && keep[n.id]) || dz > 1.1;
      if (!wantTag || tagReveal <= 0.01) return;
      drawLabel(n, z, true, tagReveal);
    } else if (n.type === 'missing') {
      var wantGhost = dz >= 0.6 || focused || (keep && keep[n.id]);
      if (wantGhost) drawLabel(n, z, true, 1);
    } else { /* doc — Strategy A: always on, laddered by zoom */
      if (dz < 0.6 && n.deg < HUB_DEGREE && !focused && !(keep && keep[n.id])) return; /* <60%: hubs only */
      drawLabel(n, z, false, 1);
    }
  }

  function drawLabel(n, z, muted, a) {
    var p = toScreen(n), r = n.r * z;
    var isDoc = n.type === 'doc';
    var size = (isDoc ? T.labelSize : T.labelSizeTag) * z;
    ctx.globalAlpha = a;
    ctx.font = (isDoc ? '500 ' : '400 ') + size + 'px ' + T.font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var y = p.y + r + T.labelGap * z;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = T.labelHalo; ctx.lineWidth = 3 * z;
    ctx.strokeText(n.title, p.x, y);
    ctx.fillStyle = muted ? T.labelMuted : T.label;
    ctx.fillText(n.title, p.x, y);
    ctx.globalAlpha = 1;
  }

  /* ============================================================ animation */
  function scheduleDraw() { if (!frameQueued) { frameQueued = true; requestAnimationFrame(frame); } }

  function animating() { return (simStarted && alpha > ALPHA_MIN) || pointer.down || fadeActive(); }

  function fadeActive() {
    var target = tagRevealTarget();
    return Math.abs(tagReveal - target) > 0.01;
  }
  function tagRevealTarget() {
    var focusId = selectedId || hoverId;
    var keep = focusId && nodeById[focusId] ? true : false;
    return (keep || displayZoom() > 1.1) ? 1 : 0;
  }

  function frame(now) {
    frameQueued = false;
    if (!now) now = performance.now();
    var dt = lastT ? Math.min(50, now - lastT) : 16; lastT = now;

    if (simStarted && alpha > ALPHA_MIN && !reduceMotion) {
      tick(alpha); alpha *= (1 - ALPHA_DECAY);
      if (view.auto) fit();          /* keep the settling map framed */
      if (alpha <= ALPHA_MIN) { alpha = 0; if (view.auto) fit(); }
    }

    /* label fade toward target (skip animation under reduced motion) */
    var target = tagRevealTarget();
    if (reduceMotion) tagReveal = target;
    else if (tagReveal !== target) {
      var step = dt / 80;
      tagReveal += (target > tagReveal ? step : -step);
      tagReveal = Math.max(0, Math.min(1, tagReveal));
    }

    draw();
    if (animating()) scheduleDraw();
  }

  /* ================================================================= chrome */
  function resize() {
    W = host.clientWidth || 1; H = host.clientHeight || 1;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (view.auto) fit();
    scheduleDraw();
  }

  /* =============================================================== tooltip */
  function updateTooltip(sx, sy) {
    if (!elTooltip) return;
    var n = hoverId ? nodeById[hoverId] : null;
    var lowZoom = displayZoom() < 0.6;
    if (!n || !lowZoom || isHidden(n)) { elTooltip.hidden = true; return; }
    var html = '';
    if (n.type === 'doc') {
      var ink = projectInk[n.project] != null ? (projectInk[n.project] + 1) : 1;
      html = '<span class="kb-graph-tooltip__chip" style="--chip: var(--kb-graph-project-' + ink + ')"></span>' + esc(n.title);
    } else if (n.type === 'tag') {
      html = '<span class="kb-graph-tooltip__chip kb-graph-legend__chip--ring"></span>' + esc(n.title) +
             ' <span class="kb-graph-tooltip__kind">· tag · ' + docCount(n) + ' docs</span>';
    } else {
      html = '<span class="kb-graph-tooltip__chip kb-graph-legend__chip--ghost"></span>' + esc(n.title) +
             ' <span class="kb-graph-tooltip__kind">· unresolved</span>';
    }
    elTooltip.innerHTML = html;
    elTooltip.hidden = false;
    var pad = 14;
    var tw = elTooltip.offsetWidth, th = elTooltip.offsetHeight;
    var x = sx + pad, y = sy + pad;
    if (x + tw > W) x = sx - pad - tw;
    if (y + th > H) y = sy - pad - th;
    elTooltip.style.left = Math.max(0, x) + 'px';
    elTooltip.style.top = Math.max(0, y) + 'px';
  }
  function docCount(tagNode) {
    var keys = Object.keys(adjacency[tagNode.id] || {}), c = 0;
    keys.forEach(function (k) { if (nodeById[k] && nodeById[k].type === 'doc') c++; });
    return c;
  }

  /* ================================================================= panel */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function relLinkCount(id) {
    var c = 0; edges.forEach(function (e) { if (e.kind === 'related' && (e.a === id || e.b === id)) c++; });
    return c;
  }
  function resolveUrl(url) { return url ? ('../' + url) : '#'; }

  function openPanel(n) {
    if (!elPanel) return;
    elPanel.classList.remove('kb-graph-panel--ghost');
    var html;
    if (n.type === 'missing') {
      elPanel.classList.add('kb-graph-panel--ghost');
      var sources = [];
      edges.forEach(function (e) {
        if (e.kind === 'related' && e.b === n.id && nodeById[e.a]) sources.push(nodeById[e.a].title);
      });
      html =
        '<div class="kb-graph-panel__eyebrow"><span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>Unresolved' +
        '<button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">' + closeGlyph() + '</button></div>' +
        '<h3 class="kb-graph-panel__title">' + esc(n.title) + '</h3>' +
        '<div class="kb-graph-panel__meta">' + (sources.length ? 'linked from ' + esc(sources.join(', ')) : 'unresolved link') + '</div>' +
        '<span class="kb-graph-panel__badge">no document yet · 문서 없음</span>';
    } else {
      var ink = (projectInk[n.project] != null ? projectInk[n.project] : 0) + 1;
      var tags = (n.tags || []).map(function (t) {
        return '<li><a class="kb-tag" href="' + resolveUrl('tags/') + '">' + esc(t) + '</a></li>';
      }).join('');
      var links = relLinkCount(n.id);
      html =
        '<div class="kb-graph-panel__eyebrow"><span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' + ink + ')"></span>' +
        esc(n.project || '') +
        '<button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">' + closeGlyph() + '</button></div>' +
        '<h3 class="kb-graph-panel__title">' + esc(n.title) + '</h3>' +
        '<div class="kb-graph-panel__meta">' + esc(n.date || '') + ' · ' + (n.tags || []).length + ' tags · ' + links + ' links</div>' +
        (tags ? '<ul class="kb-graph-panel__tags">' + tags + '</ul>' : '') +
        '<a class="kb-graph-panel__read" href="' + resolveUrl(n.url) + '">Read the explainer →</a>';
    }
    elPanel.innerHTML = html;
    elPanel.hidden = false;
    var closeBtn = elPanel.querySelector('.kb-graph-panel__close');
    if (closeBtn) closeBtn.addEventListener('click', deselect);
  }
  function closePanel() { if (elPanel) { elPanel.hidden = true; elPanel.innerHTML = ''; } }

  function select(id) {
    selectedId = id;
    var n = nodeById[id];
    if (n && (n.type === 'doc' || n.type === 'missing')) openPanel(n); else closePanel();
    scheduleDraw();
  }
  function deselect() { selectedId = null; closePanel(); scheduleDraw(); }

  /* ================================================================= icons */
  /* NO Iconify / CDN — text glyphs for +/− and inline SVG for fit / close. */
  function closeGlyph() { return '✕'; }
  function fitGlyph() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'd="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  }

  /* ================================================================ legend */
  function buildLegend(projects, tagCount, ghostCount) {
    if (!elLegend) return;
    var rows = '<div class="kb-graph-legend__head">Projects · 프로젝트</div>';
    projects.forEach(function (p, i) {
      var ink = (i % 3) + 1;
      rows += '<button class="kb-graph-legend__item" type="button" data-project="' + esc(p.name) + '">' +
        '<span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' + ink + ')"></span>' +
        '<span class="kb-graph-legend__name">' + esc(p.name) + '</span>' +
        '<span class="kb-graph-legend__count">' + (p.docs || 0) + '</span></button>';
    });
    rows += '<hr class="kb-graph-legend__rule">';
    rows += '<div class="kb-graph-legend__row"><span class="kb-graph-legend__chip kb-graph-legend__chip--ring"></span>' +
      'Tags · 태그<span class="kb-graph-legend__count">' + tagCount + '</span>' +
      '<button class="kb-graph-switch is-on" type="button" data-switch="tags" aria-label="Toggle tag visibility" aria-pressed="true"></button></div>';
    if (ghostCount > 0) {
      rows += '<div class="kb-graph-legend__row"><span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>' +
        'Unresolved<span class="kb-graph-legend__count">' + ghostCount + '</span></div>';
    }
    rows += '<div class="kb-graph-legend__note">Size = connections · 크기=연결 수</div>';
    elLegend.innerHTML = rows;
    elLegend.hidden = false;

    Array.prototype.forEach.call(elLegend.querySelectorAll('.kb-graph-legend__item'), function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-project');
        if (offProjects[name]) { delete offProjects[name]; btn.classList.remove('is-off'); }
        else { offProjects[name] = true; btn.classList.add('is-off'); }
        if (view.auto) fit();
        scheduleDraw();
      });
    });
    var sw = elLegend.querySelector('.kb-graph-switch');
    if (sw) sw.addEventListener('click', function () {
      tagsVisible = !tagsVisible;
      sw.classList.toggle('is-on', tagsVisible);
      sw.setAttribute('aria-pressed', tagsVisible ? 'true' : 'false');
      if (view.auto) fit();
      scheduleDraw();
    });
  }

  /* =========================================================== zoom buttons */
  function buildZoom() {
    if (!elZoom) return;
    elZoom.innerHTML =
      '<button class="kb-graph-zoom__btn" type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button class="kb-graph-zoom__btn" type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>' +
      '<button class="kb-graph-zoom__btn" type="button" data-zoom="fit" title="Fit" aria-label="Fit to view">' + fitGlyph() + '</button>';
    elZoom.hidden = false;
    Array.prototype.forEach.call(elZoom.querySelectorAll('.kb-graph-zoom__btn'), function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-zoom');
        if (kind === 'in') zoomAbout(W / 2, H / 2, 1.3);
        else if (kind === 'out') zoomAbout(W / 2, H / 2, 1 / 1.3);
        else { view.auto = true; fit(); scheduleDraw(); }
      });
    });
  }

  /* =========================================================== hit-testing */
  function nodeAt(sx, sy) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (isHidden(n)) continue;
      var p = toScreen(n);
      var rr = n.r * view.z + 4;
      var d = Math.hypot(sx - p.x, sy - p.y);
      if (d <= rr && d < bestD) { bestD = d; best = n; }
    }
    return best;
  }
  function localPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  /* =========================================================== interactions */
  function bindInteractions() {
    canvas.addEventListener('pointerdown', function (ev) {
      var p = localPoint(ev);
      pointer.down = true; pointer.moved = false;
      pointer.sx = p.x; pointer.sy = p.y; pointer.startX = view.panX; pointer.startY = view.panY;
      var n = nodeAt(p.x, p.y);
      if (n) { pointer.mode = 'node'; pointer.id = n.id; alpha = Math.max(alpha, ALPHA_REHEAT); simStarted = true; }
      else { pointer.mode = 'pan'; pointer.id = null; }
      view.auto = false;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} }
    });

    canvas.addEventListener('pointermove', function (ev) {
      var p = localPoint(ev);
      if (pointer.down) {
        var dx = p.x - pointer.sx, dy = p.y - pointer.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) pointer.moved = true;
        if (pointer.mode === 'node') {
          var n = nodeById[pointer.id];
          if (n) { var w = toWorld(p.x, p.y); n.fx = w.x; n.fy = w.y; n.x = w.x; n.y = w.y; alpha = Math.max(alpha, ALPHA_REHEAT); }
          scheduleDraw();
        } else if (pointer.mode === 'pan') {
          view.panX = pointer.startX + dx; view.panY = pointer.startY + dy; scheduleDraw();
        }
      } else {
        var hit = nodeAt(p.x, p.y);
        var newHover = hit ? hit.id : null;
        if (newHover !== hoverId) { hoverId = newHover; scheduleDraw(); }
        canvas.style.cursor = hit ? 'pointer' : '';
        updateTooltip(p.x, p.y);
      }
    });

    function endPointer(ev) {
      if (!pointer.down) return;
      var p = localPoint(ev);
      if (pointer.mode === 'node') {
        var n = nodeById[pointer.id];
        if (n) { n.fx = null; n.fy = null; }
        if (!pointer.moved) {
          if (n.type === 'tag') select(n.id);
          else select(n.id);
        }
      } else if (pointer.mode === 'pan' && !pointer.moved) {
        deselect();
      }
      pointer.down = false; pointer.mode = null; pointer.id = null;
      scheduleDraw();
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', function () { pointer.down = false; pointer.mode = null; });

    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var p = localPoint(ev);
      var factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAbout(p.x, p.y, factor);
    }, { passive: false });

    host.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') deselect(); });
  }

  /* ================================================================= scheme */
  function observeScheme() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function () { T = readTokens(); scheduleDraw(); });
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
  }

  /* =================================================================== boot */
  function start(data) {
    T = readTokens();
    buildModel(data);

    var docNodes = nodes.filter(function (n) { return n.type === 'doc'; });
    if (!docNodes.length) { showEmpty('empty'); return; }
    showEmpty('none');

    var projects = (data.projects || []);
    var tagCount = nodes.filter(function (n) { return n.type === 'tag'; }).length;
    var ghostCount = nodes.filter(function (n) { return n.type === 'missing'; }).length;
    buildLegend(projects, tagCount, ghostCount);
    buildZoom();
    bindInteractions();
    observeScheme();

    resize();
    if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(host); }
    else window.addEventListener('resize', resize);

    if (reduceMotion) {
      convergeSync(400);      /* solve the layout, paint at rest — no animated settle */
      fit();
      draw();
    } else {
      alpha = 1; simStarted = true;
      scheduleDraw();
    }
  }

  showEmpty('loading');
  fetch(SRC, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) { start(data); })
    .catch(function () { showEmpty('empty'); });
})();
