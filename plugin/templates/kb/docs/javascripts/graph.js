/* ==========================================================================
   Knowledge Base — graph.js  (P6 · the knowledge map renderer)
   --------------------------------------------------------------------------
   The repo's first custom JS. Vendored, hand-rolled, ZERO third-party code and
   ZERO CDN references (site_smoke.py allowlists exactly this one entry). An
   interactive Obsidian-style knowledge map, drawn client-side from the static
   <site>/graph.json that scripts/graph_hook.py emits at build time.

   Design mapping (mirror: components/graph/, tokens/graph.css):
     · tokens/graph.css   → live getComputedStyle reads (both schemes)
     · graph-render.js     → the DRAWING grammar (draw order, mark recipes, 3px
                             label halo, α-dim) AND — since the P6.S1 revision —
                             the LIVE MODEL: kbGraph.mount() is the reference for
                             every interactive behavior ported below.

   P6.S1 revision (operator-directed, 2026-07-14) — this file ports
   kbGraph.mount()'s live model on top of engineering's force sim:
     · Quiet labels (Strategy A′) — idle map shows MARKS ONLY; hover/selection
       reveals a node + its neighborhood; doc titles fade up past ~110% zoom
       (relative to fit; fully on by ~135%). Tag labels stay on-demand.
     · Settle, then mingle — the sim settles in ~600ms (--kb-graph-settle), then
       a persistent rAF loop keeps a barely-there idle wander (≤ --kb-graph-drift
       from rest over ~--kb-graph-drift-period; tags ×1.5, ghosts ×1.2).
     · Pointer zoom + pan — wheel / trackpad-pinch zooms toward the pointer
       (--kb-graph-zoom-min…max × fit); dragging empty plate pans 1:1.
     · Node re-placement — a dragged node STAYS where dropped; a doc's tag spokes
       follow on a soft spring; a dragged tag keeps its new offset.
     · Legend = lens, never filter — clicking a project keeps its docs + spokes
       in full ink (titles on) and dims the rest; click again clears (.is-on).
     · Reduced motion — no settle animation, no mingle, no fades: paint at rest,
       hold still, snap pan/zoom (event-driven, no persistent loop).

   P6.F3 revision (operator browser QA, 2026-07-14):
     · Roomier default spacing — retuned sim constants so the settled map fills
       the plate instead of clumping at the FIT_Z_MAX clamp.
     · Smarter first placement — degree-aware doc seeding (hubs in, leaves out)
       and owner-anchored tag/ghost seeding (deterministic; no randomness).
     · Placement survives reloads — the rest layout + camera + lens state persist
       to sessionStorage keyed by a corpus signature, so a page reload (mkdocs
       live-reload, or leaving to read a doc and coming back in the same tab)
       restores the map exactly as left and SKIPS the settle. A fresh tab (or a
       changed corpus → changed key) gets the default layout.

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
     600ms --kb-graph-settle budget, then the sim STOPS — but the map keeps a
     barely-there idle mingle (see the persistent rAF loop below).
     P6.F3 retuned these for roomier default spacing (validated on the numeric
     harness): the settled bbox fills the plate so fit() no longer rails at
     FIT_Z_MAX. related still SHORTER + STRONGER than tag (doc backbone tight). */
  var REST_RELATED = 150, K_RELATED = 0.9;
  var REST_TAG = 210, K_TAG = 0.2;
  var REPULSION = 9000, REPULSION_MAX_D2 = 600 * 600;
  var CENTER_K = 0.016, COLLIDE_PAD = 20, COLLIDE_ITERS = 2;
  var ALPHA_DECAY = 0.1, ALPHA_MIN = 0.02, VEL_DECAY = 0.6;
  var LAYOUT_RADIUS = 400;
  var FIT_PAD = 64, FIT_Z_MIN = 0.5, FIT_Z_MAX = 1.5;

  /* per-frame ease factors (snap to 1 under reduced motion) */
  var EASE_POS = 0.12, EASE_ALPHA = 0.18, EASE_VIEW = 0.16, EASE_DRAG = 0.55;

  /* ------------------------------------------------------------------ tokens */
  /* Read live per paint so the Material scheme toggle "just works". */
  function readTokens() {
    var cs = getComputedStyle(host);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    var px = function (n) { return parseFloat(v(n)) || 0; };
    var pxf = function (n, fb) { var s = v(n); return s === '' ? fb : (parseFloat(s) || 0); };
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
      settle: px('--kb-graph-settle') || 600,
      drift: pxf('--kb-graph-drift', 3),
      driftPeriod: pxf('--kb-graph-drift-period', 9),
      zoomMin: pxf('--kb-graph-zoom-min', 0.5),
      zoomMax: pxf('--kb-graph-zoom-max', 2.5)
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

  /* deterministic per-node wander seed (sum of two sines; verbatim from the
     design reference's seed() LCG). w1,w3 ∈ [0.7,1.3]; w2,w4 ∈ [1.4,2.3]. */
  function seed(id) {
    var x = 7;
    for (var i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) % 233280;
    var r = function () { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    var TAU = Math.PI * 2;
    return { p1: r() * TAU, p2: r() * TAU, p3: r() * TAU, p4: r() * TAU,
             w1: 0.7 + r() * 0.6, w2: 1.4 + r() * 0.9,
             w3: 0.7 + r() * 0.6, w4: 1.4 + r() * 0.9 };
  }
  function drift(n, time) {
    if (reduceMotion || !T.drift || !n.sd) return { x: 0, y: 0 };
    var amp = T.drift * (n.type === 'tag' ? 1.5 : n.type === 'missing' ? 1.2 : 1);
    var base = (Math.PI * 2) / T.driftPeriod;
    var s = n.sd;
    return {
      x: amp * (Math.sin(time * base * s.w1 + s.p1) + 0.5 * Math.sin(time * base * s.w2 + s.p2)) / 1.5,
      y: amp * (Math.sin(time * base * s.w3 + s.p3) + 0.5 * Math.sin(time * base * s.w4 + s.p4)) / 1.5
    };
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
        '<div class="kb-graph-empty__sub">지도를 배치하는 중 — settles in ~0.6s.</div>';
    } else { /* 'empty' */
      elEmpty.innerHTML = emptyDefaultHTML;
    }
    elEmpty.hidden = false;
  }

  /* ------------------------------------------------------------------- state */
  var nodes = [], edges = [], nodeById = {}, adjacency = {};
  var projectInk = {};                      /* project name → 0-based ink index */
  var activeProject = null;                  /* highlighted project name (legend lens) — never a filter */
  var tagAnchor = {};                        /* tag id → { owners:[docId], dx, dy } offset from owners' REST centroid */
  var tagsVisible = true;
  var hoverId = null, selectedId = null;
  var W = 0, H = 0, dpr = 1;
  /* view: current (z/panX/panY) eases toward targets (zt/pxt/pyt) each frame */
  var view = { z: 1, panX: 0, panY: 0, zt: 1, pxt: 0, pyt: 0, fitZoom: 1, auto: true };
  var center = { x: 0, y: 0 };
  var alpha = 0, simStarted = false, restCaptured = false;
  var frameQueued = false;
  var drag = null;                           /* { mode:'node'|'pan', id, wx, wy, moved, px, py } */
  var STORE_KEY = null;                       /* sessionStorage key = corpus signature (set in start) */

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
      return {
        id: n.id, type: n.type, title: n.title || n.id, deg: deg, r: r,
        url: n.url, date: n.date, project: n.project, tags: n.tags || [],
        x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null,
        bx: 0, by: 0, sd: null, al: 1, la: 0   /* live-model state (rest pos, seed, ink/label alpha) */
      };
    });
    nodes.forEach(function (n) { nodeById[n.id] = n; });

    /* edges + adjacency FIRST — the owner-anchored seeding below needs to know
       which docs own each tag (and which doc links each ghost). */
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

    /* deterministic, degree-aware, owner-anchored initial placement (no random) */
    seedPositions(projects.length);
  }

  /* Seed every node's start position as a pure function of the corpus (hash01
     only — the no-randomness invariant is HARD). Docs sit in their project's
     angular sector with a DEGREE-AWARE radius: high-degree hubs pull toward the
     center, low-degree leaves push out (same (deg−2)/6 ramp as the r 6→14
     sizing), ±0.08·R jitter. Tags start at their owner docs' seeded centroid,
     spread on a hub-and-spoke RING at ~REST_TAG: the first spoke faces OUTWARD
     (away from the origin) and the rest fan EVENLY around the owner, keyed to
     the tag's slot in its owner's tag list. Even slotting (not a hash-random
     fan) guarantees a doc's tags never seed on top of each other — two stacked
     tags would repel explosively and the weak tag spring could not reel them
     back inside the design-locked ~600ms settle. Ghosts sit ~REST_RELATED beyond
     the doc that links to them. A good seed means the springs barely have to
     drag, so the short settle converges. Deterministic — hash01 only. */
  function seedPositions(projectCount) {
    var P = Math.max(1, projectCount);
    nodes.forEach(function (n) {              /* pass 1 — docs */
      if (n.type !== 'doc') return;
      var pIdx = projectInk[n.project] != null ? projectInk[n.project] : 0;
      var ang = (2 * Math.PI * pIdx) / P + (hash01(n.id) - 0.5) * (2 * Math.PI / P) * 0.7;
      var degNorm = Math.min(1, Math.max(0, (n.deg - 2) / 6));
      var rad = LAYOUT_RADIUS * (0.35 + 0.5 * (1 - degNorm)) + (hash01(n.id + '#r') - 0.5) * 0.16 * LAYOUT_RADIUS;
      n.x = Math.cos(ang) * rad; n.y = Math.sin(ang) * rad;
    });
    nodes.forEach(function (n) {              /* pass 2 — tags + ghosts (need doc positions) */
      if (n.type === 'doc') return;
      if (n.type === 'tag') {
        var owners = ownerDocsOf(n.id);
        var c = seedCentroid(owners);
        var owner = owners.length ? nodeById[owners[0]] : null;   /* primary owner (for even slotting) */
        var name = n.id.replace(/^tag:/, '');
        var count = owner && owner.tags.length ? owner.tags.length : 1;
        var idx = owner ? owner.tags.indexOf(name) : -1; if (idx < 0) idx = 0;
        var base = owners.length ? Math.atan2(c.y, c.x) : 2 * Math.PI * hash01(n.id);  /* spoke 0 outward */
        var ang2 = base + (2 * Math.PI * idx) / count;            /* remaining spokes even around the owner */
        var off = REST_TAG * 0.9 * (1 + (hash01(n.id) - 0.5) * 0.2);
        n.x = c.x + Math.cos(ang2) * off;
        n.y = c.y + Math.sin(ang2) * off;
      } else {                                /* missing / ghost — beside its linking doc */
        var src = ghostSourceOf(n.id);
        if (src) {
          var ag = 2 * Math.PI * hash01(n.id + '#g');
          n.x = src.x + Math.cos(ag) * REST_RELATED;
          n.y = src.y + Math.sin(ag) * REST_RELATED;
        } else {
          var ar = 2 * Math.PI * hash01(n.id);
          n.x = Math.cos(ar) * LAYOUT_RADIUS; n.y = Math.sin(ar) * LAYOUT_RADIUS;
        }
      }
    });
  }
  function seedCentroid(ids) {
    var sx = 0, sy = 0, c = 0;
    ids.forEach(function (id) { var d = nodeById[id]; if (d) { sx += d.x; sy += d.y; c++; } });
    return c ? { x: sx / c, y: sy / c } : { x: 0, y: 0 };
  }
  function ghostSourceOf(ghostId) {
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].kind === 'related' && edges[i].b === ghostId) return nodeById[edges[i].a] || null;
    }
    return null;
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

    /* integrate with velocity decay; pinned (dragged, pre-rest) nodes hold position */
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

  /* ---- capture the settled layout as each node's REST position, seed its
     wander, and pin every tag's offset from its owner docs' rest centroid.
     After this, the map switches from the force sim to the idle mingle. ---- */
  function captureRest() {
    if (restCaptured) return;
    nodes.forEach(function (n) { n.bx = n.x; n.by = n.y; n.sd = seed(n.id); });
    computeTagAnchors();
    restCaptured = true;
    persist();      /* the first settled layout is restorable too */
  }
  function ownerDocsOf(tagId) {
    var owners = [];
    Object.keys(adjacency[tagId] || {}).forEach(function (k) {
      var o = nodeById[k];
      if (o && o.type === 'doc') owners.push(k);
    });
    return owners;
  }
  function anchorOf(owners, live) {
    var sx = 0, sy = 0, c = 0;
    owners.forEach(function (id) {
      var d = nodeById[id];
      if (!d) return;
      sx += live ? d.x : d.bx; sy += live ? d.y : d.by; c++;
    });
    return c ? { x: sx / c, y: sy / c } : { x: center.x, y: center.y };
  }
  function computeTagAnchors() {
    tagAnchor = {};
    nodes.forEach(function (n) {
      if (n.type !== 'tag') return;
      var owners = ownerDocsOf(n.id);
      var a = anchorOf(owners, false);
      tagAnchor[n.id] = { owners: owners, dx: n.bx - a.x, dy: n.by - a.y };
    });
  }

  /* ===================================================== reload persistence ==
     Tab-scoped sessionStorage so the rest layout + camera + lens survive a page
     reload — the mkdocs live-reload dev server force-reloads the page on any
     docs/ change, which is what looked like a "reset to default" in browser QA;
     it also survives leaving to read a doc and coming back in the same tab. The
     key is a signature over the SORTED node ids, so a changed corpus lands on a
     different key and the stale blob is simply ignored (it expires with the tab).
     EVERY storage access is in try/catch — private-mode Safari throws on access;
     a storage failure must be a silent no-op, never an error. sessionStorage
     (not localStorage) is the right conservatism: a fresh visit tomorrow gets the
     current default layout, not a frozen one. */
  function computeStoreKey() {
    var ids = nodes.map(function (n) { return n.id; }).sort();
    return 'kb-graph:v1:' + hash01(ids.join('\n'));
  }
  var persistTimer = null;
  function persist() {                         /* debounced ~250ms; coalesces bursts */
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () { persistTimer = null; persistNow(); }, 250);
  }
  function flushPersist() {                    /* immediate flush (pagehide) */
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    persistNow();
  }
  function persistNow() {
    if (!STORE_KEY) return;
    try {
      var rest = {};
      nodes.forEach(function (n) { rest[n.id] = [Math.round(n.bx * 10) / 10, Math.round(n.by * 10) / 10]; });
      var blob = {
        rest: rest,
        view: { zt: view.zt, pxt: view.pxt, pyt: view.pyt, auto: view.auto },
        tagsVisible: tagsVisible, activeProject: activeProject, selectedId: selectedId
      };
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(blob));
    } catch (e) { /* private-mode / quota / disabled: silent no-op */ }
  }
  /* Load a matching stored blob into the model. Returns the blob (so start() can
     restore the camera + selection) or null. On a hit it sets each node's rest
     position, seeds its wander, rebuilds tag anchors, and marks the layout
     already settled (restCaptured / alpha 0 / simStarted false) so start() skips
     the animated settle entirely. */
  function restoreState() {
    if (!STORE_KEY) return null;
    var raw;
    try { raw = window.sessionStorage.getItem(STORE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    var blob;
    try { blob = JSON.parse(raw); } catch (e) { return null; }
    if (!blob || !blob.rest) return null;

    nodes.forEach(function (n) {
      n.sd = seed(n.id);
      var p = blob.rest[n.id];
      if (p && isFinite(p[0]) && isFinite(p[1])) { n.x = n.bx = p[0]; n.y = n.by = p[1]; }
      else { n.bx = n.x; n.by = n.y; }     /* belt-and-braces: seeded position (sig-match makes this rare) */
    });
    computeTagAnchors();
    restCaptured = true; alpha = 0; simStarted = false;

    if (typeof blob.tagsVisible === 'boolean') tagsVisible = blob.tagsVisible;
    activeProject = (blob.activeProject != null && projectInk[blob.activeProject] != null) ? blob.activeProject : null;
    return blob;
  }
  /* Reflect a restored tagsVisible / activeProject in the just-built legend DOM. */
  function syncLegendUI() {
    if (!elLegend) return;
    var sw = elLegend.querySelector('.kb-graph-switch');
    if (sw) { sw.classList.toggle('is-on', tagsVisible); sw.setAttribute('aria-pressed', tagsVisible ? 'true' : 'false'); }
    Array.prototype.forEach.call(elLegend.querySelectorAll('.kb-graph-legend__item'), function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-project') === activeProject);
    });
  }

  /* ================================================================ camera */
  function visibleNodes() {
    return nodes.filter(function (n) { return !isHidden(n); });
  }

  /* Recompute the fit frame (center + fitZoom) and set the view targets to it;
     snap=true also jumps the current view (settle auto-fit / resize), snap=false
     lets the loop ease there (fit button in live mode). */
  function fit(snap) {
    var vis = visibleNodes();
    var z;
    if (!vis.length) {
      center.x = 0; center.y = 0; z = 1;
    } else {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      vis.forEach(function (n) {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      });
      center.x = (minX + maxX) / 2; center.y = (minY + maxY) / 2;
      var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
      z = Math.min((W - 2 * FIT_PAD) / bw, (H - 2 * FIT_PAD) / bh);
      if (!isFinite(z) || z <= 0) z = 1;
      z = Math.max(FIT_Z_MIN, Math.min(FIT_Z_MAX, z));
    }
    view.fitZoom = z;
    view.zt = z; view.pxt = 0; view.pyt = 0;
    if (snap) { view.z = z; view.panX = 0; view.panY = 0; }
  }

  function toScreen(n) {
    return { x: W / 2 + (n.x - center.x) * view.z + view.panX, y: H / 2 + (n.y - center.y) * view.z + view.panY };
  }
  function toWorld(sx, sy) {
    return { x: (sx - W / 2 - view.panX) / view.z + center.x, y: (sy - H / 2 - view.panY) / view.z + center.y };
  }
  function displayZoom() { return view.z / (view.fitZoom || 1); }

  function clampPan() {
    var mx = (W * view.zt) / 2, my = (H * view.zt) / 2;
    view.pxt = Math.max(-mx, Math.min(mx, view.pxt));
    view.pyt = Math.max(-my, Math.min(my, view.pyt));
  }

  /* zoom the TARGET view toward (sx,sy); successive events compose because it
     works against zt/pxt/pyt. clamp zt to fitZoom × [zoomMin, zoomMax]. */
  function zoomAbout(sx, sy, factor) {
    var z = Math.max(view.fitZoom * T.zoomMin, Math.min(view.fitZoom * T.zoomMax, view.zt * factor));
    var wx = (sx - W / 2 - view.pxt) / view.zt + center.x;
    var wy = (sy - H / 2 - view.pyt) / view.zt + center.y;
    view.zt = z;
    view.pxt = sx - W / 2 - (wx - center.x) * z;
    view.pyt = sy - H / 2 - (wy - center.y) * z;
    view.auto = false;
    clampPan();
    if (reduceMotion) { view.z = view.zt; view.panX = view.pxt; view.panY = view.pyt; }
    scheduleDraw();
    persist();
  }

  /* ============================================================ visibility */
  /* Legend is a LENS now, never a filter — only the tag switch hides anything. */
  function isHidden(n) {
    if (n.type === 'tag') return !tagsVisible;
    return false; /* docs + ghosts always visible */
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

  /* project lens: the project's doc nodes + every edge-neighbor (tags, related
     docs, ghost targets) — kept in full ink, everything else dims. */
  function projectKeep(name) {
    var keep = {};
    nodes.forEach(function (n) { if (n.type === 'doc' && n.project === name) keep[n.id] = true; });
    edges.forEach(function (e) { if (keep[e.a]) keep[e.b] = true; if (keep[e.b]) keep[e.a] = true; });
    return keep;
  }

  function currentFocus() {
    var id = (drag && drag.mode === 'node' && drag.id) ? drag.id : (hoverId || selectedId);
    if (!id || !nodeById[id] || isHidden(nodeById[id])) return null;
    return id;
  }
  function computeKeep(focus) {
    if (focus) return neighborhood(focus);
    if (activeProject != null) return projectKeep(activeProject);
    return null;
  }

  /* ---- labels (Strategy A′): quiet map + zoom ladder relative to fit ---- */
  function ladder() { return Math.max(0, Math.min(1, (displayZoom() - 1.1) / 0.25)); }
  function labelTarget(n, keep, focus) {
    if (keep && !keep[n.id]) return 0;             /* outside the lens/neighborhood: no label */
    if (focus && keep) return 1;                    /* node focus: whole neighborhood reveals */
    if (n.type === 'doc') return keep ? 1 : ladder();  /* project lens: its doc titles on */
    if (n.type === 'missing') return ladder() * 0.9;
    return 0;                                        /* tag: on-demand only */
  }

  /* ============================================================== kinematics */
  /* Ease node positions toward their drift targets (mingle phase only; during
     the settle the force sim owns positions). Dragged node → the pointer. */
  function stepPositions(time) {
    var eP = reduceMotion ? 1 : EASE_POS;
    nodes.forEach(function (n) {
      var tx, ty, k;
      if (drag && drag.mode === 'node' && drag.id === n.id) {
        tx = drag.wx; ty = drag.wy; k = reduceMotion ? 1 : EASE_DRAG;
      } else if (n.type === 'tag') {
        var a = tagAnchor[n.id], d = drift(n, time);
        if (a) { var p = anchorOf(a.owners, true); tx = p.x + a.dx + d.x; ty = p.y + a.dy + d.y; }
        else { tx = n.bx + d.x; ty = n.by + d.y; }
        k = eP;
      } else {
        var d2 = drift(n, time);
        tx = n.bx + d2.x; ty = n.by + d2.y; k = eP;
      }
      n.x += (tx - n.x) * k; n.y += (ty - n.y) * k;
    });
  }

  /* Ease ink alpha (al), label alpha (la) and the view toward their targets. */
  function stepAlphaLabelView(time, focus, keep) {
    var eA = reduceMotion ? 1 : EASE_ALPHA;
    nodes.forEach(function (n) {
      var aT = keep ? (keep[n.id] ? 1 : T.dim) : 1;
      n.al += (aT - n.al) * eA;
      var lT = labelTarget(n, keep, focus);
      n.la += (lT - n.la) * eA;
    });
    var eV = reduceMotion ? 1 : EASE_VIEW;
    view.z += (view.zt - view.z) * eV;
    view.panX += (view.pxt - view.panX) * eV;
    view.panY += (view.pyt - view.panY) * eV;
  }

  /* ================================================================ drawing */
  /* Single-pass grammar (ported from graph-render.js frame()): edges → halo
     behind focus → nodes → selection ring → labels; every mark at its own α. */
  function render(now) {
    if (!now) now = performance.now();
    var time = now / 1000;

    var settling = simStarted && alpha > ALPHA_MIN && !reduceMotion;
    if (settling) {
      tick(alpha); alpha *= (1 - ALPHA_DECAY);
      if (view.auto) fit(true);                 /* keep the settling map framed */
      if (alpha <= ALPHA_MIN) { alpha = 0; if (view.auto) fit(true); captureRest(); }
    } else {
      stepPositions(time);
    }

    var focus = currentFocus();
    var keep = computeKeep(focus);
    stepAlphaLabelView(time, focus, keep);
    frame(focus);
  }

  function frame(focus) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = T.canvas;
    ctx.fillRect(0, 0, W, H);
    var z = view.z;

    /* --- edges (alpha = min of endpoint inks) --- */
    edges.forEach(function (e) {
      if (edgeHidden(e)) return;
      var al = Math.min(nodeById[e.a].al, nodeById[e.b].al);
      if (al < 0.01) return;
      ctx.globalAlpha = al;
      var active = !!focus && (e.a === focus || e.b === focus) && al > T.dim + 0.05;
      drawEdge(e, z, active);
    });

    /* --- halo behind the focused node --- */
    if (focus && nodeById[focus] && !isHidden(nodeById[focus])) {
      ctx.globalAlpha = nodeById[focus].al;
      drawHalo(nodeById[focus], z);
    }

    /* --- nodes --- */
    nodes.forEach(function (n) {
      if (isHidden(n) || n.al < 0.01) return;
      ctx.globalAlpha = n.al;
      drawNode(n, z);
    });

    /* --- selection ring --- */
    if (selectedId && nodeById[selectedId] && !isHidden(nodeById[selectedId])) {
      ctx.globalAlpha = nodeById[selectedId].al;
      drawRing(nodeById[selectedId], z);
    }

    /* --- labels (alpha = ink × label reveal) --- */
    nodes.forEach(function (n) {
      if (isHidden(n)) return;
      var a = n.al * n.la;
      if (a < 0.02) return;
      drawLabel(n, z, n.type !== 'doc', a);
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
  }

  /* ============================================================ animation ==
     Live: ONE persistent rAF loop drives the settle then the idle mingle. It
     re-queues first and idles (does nothing) while the tab is hidden, so it
     costs nothing off-screen and dies with the page (navigation.instant off).
     Reduced motion: NO persistent loop — event-driven scheduleDraw() renders a
     single snapped frame per interaction. */
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    render(now);
  }
  function scheduleDraw() {
    if (!reduceMotion) return;   /* live: the persistent loop already paints */
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(function (now) { frameQueued = false; render(now); });
  }

  /* ================================================================= chrome */
  function resize() {
    W = host.clientWidth || 1; H = host.clientHeight || 1;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (view.auto) fit(true);    /* world coords are resolution-independent; only refit the camera */
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
    persist();
  }
  function deselect() { selectedId = null; closePanel(); scheduleDraw(); persist(); }

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
        activeProject = (activeProject === name) ? null : name;   /* single-select lens toggle */
        Array.prototype.forEach.call(elLegend.querySelectorAll('.kb-graph-legend__item'), function (b) {
          b.classList.toggle('is-on', b.getAttribute('data-project') === activeProject);
        });
        scheduleDraw();   /* NO refit — nothing moves or hides */
        persist();
      });
    });
    var sw = elLegend.querySelector('.kb-graph-switch');
    if (sw) sw.addEventListener('click', function () {
      tagsVisible = !tagsVisible;
      sw.classList.toggle('is-on', tagsVisible);
      sw.setAttribute('aria-pressed', tagsVisible ? 'true' : 'false');
      if (view.auto) fit(true);   /* tag switch keeps its refit-if-auto behavior */
      scheduleDraw();
      persist();
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
        else { view.auto = true; fit(reduceMotion); scheduleDraw(); persist(); }   /* fit: ease live, snap reduced */
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
      var rr = Math.max(n.r * view.z + 4, 10);
      var d = Math.hypot(sx - p.x, sy - p.y);
      if (d <= rr && d < bestD) { bestD = d; best = n; }
    }
    return best;
  }
  function localPoint(ev) {
    var rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* =========================================================== interactions */
  function bindInteractions() {
    canvas.addEventListener('pointerdown', function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      var p = localPoint(ev);
      var n = nodeAt(p.x, p.y);
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} }
      if (n) {
        drag = { mode: 'node', id: n.id, wx: n.x, wy: n.y, moved: 0, px: p.x, py: p.y };
      } else {
        drag = { mode: 'pan', id: null, moved: 0, px: p.x, py: p.y };
        view.auto = false;
      }
      scheduleDraw();
    });

    canvas.addEventListener('pointermove', function (ev) {
      var p = localPoint(ev);
      if (drag) {
        drag.moved += Math.abs(p.x - drag.px) + Math.abs(p.y - drag.py);
        if (drag.mode === 'pan') {                 /* pan tracks the hand 1:1 */
          view.pxt += p.x - drag.px; view.pyt += p.y - drag.py;
          clampPan(); view.panX = view.pxt; view.panY = view.pyt;
        } else {                                   /* re-place a node (clamp inside the viewport) */
          var wpt = toWorld(clamp(p.x, 12, W - 12), clamp(p.y, 12, H - 12));
          drag.wx = wpt.x; drag.wy = wpt.y;
          var n = nodeById[drag.id];
          if (n && simStarted && alpha > ALPHA_MIN && !reduceMotion) {   /* pre-rest: pin so the sim respects it */
            n.fx = drag.wx; n.fy = drag.wy; n.x = drag.wx; n.y = drag.wy;
          }
          canvas.style.cursor = 'grabbing';
        }
        drag.px = p.x; drag.py = p.y;
        scheduleDraw();
      } else {
        var hit = nodeAt(p.x, p.y);
        var newHover = hit ? hit.id : null;
        if (newHover !== hoverId) { hoverId = newHover; scheduleDraw(); }
        canvas.style.cursor = hit ? 'pointer' : '';
        updateTooltip(p.x, p.y);
      }
    });

    function endDrag() {
      if (!drag) return;
      var tap = drag.moved < 5;
      if (drag.mode === 'node') {
        var n = nodeById[drag.id];
        if (n && n.fx != null) { n.fx = null; n.fy = null; }   /* release any pre-rest pin */
        if (tap) {
          if (selectedId === drag.id) deselect(); else select(drag.id);   /* toggle select */
        } else if (n) {                              /* commit the re-placement — it stays put */
          var d = drift(n, performance.now() / 1000);
          n.bx = n.x - d.x; n.by = n.y - d.y;
          if (n.type === 'tag') {                    /* re-pin the tag's offset to its owners' rest centroid */
            var a = tagAnchor[n.id];
            if (a) { var p0 = anchorOf(a.owners, false); a.dx = n.bx - p0.x; a.dy = n.by - p0.y; }
          }
          /* doc/ghost: rest position only — its tag spokes follow via live anchors */
        }
      } else if (drag.mode === 'pan' && tap) {       /* click empty plate → deselect */
        deselect();
      }
      drag = null;
      canvas.style.cursor = '';
      scheduleDraw();
      persist();      /* drag-commit / pan-end / lens change — save the new state */
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', function () { if (drag && drag.mode === 'node') { var n = nodeById[drag.id]; if (n && n.fx != null) { n.fx = null; n.fy = null; } } drag = null; canvas.style.cursor = ''; });
    canvas.addEventListener('pointerleave', function () { if (!drag && hoverId) { hoverId = null; scheduleDraw(); } });

    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var p = localPoint(ev);
      /* trackpad pinch reports as ctrl/meta-wheel; scroll-wheel zooms gentler */
      var factor = Math.exp(-ev.deltaY * ((ev.ctrlKey || ev.metaKey) ? 0.01 : 0.0024));
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
    STORE_KEY = computeStoreKey();
    var restored = restoreState();     /* null unless a matching blob is stored for this corpus */

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
    if (restored) syncLegendUI();      /* reflect a restored tag switch / project lens */

    resize();
    if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(host); }
    else window.addEventListener('resize', resize);
    window.addEventListener('pagehide', flushPersist);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleDraw(); });

    if (restored) {
      /* restored rest layout — SKIP the animated settle: paint at rest, then go
         straight to the mingle loop (live) / event-driven stillness (reduced). */
      fit(true);                         /* center + fitZoom from the restored positions */
      if (restored.view && restored.view.auto === false && isFinite(restored.view.zt)) {
        view.zt = restored.view.zt; view.pxt = restored.view.pxt; view.pyt = restored.view.pyt;
        view.z = view.zt; view.panX = view.pxt; view.panY = view.pyt;
        view.auto = false;               /* snap the stored camera — do not animate a restore */
      }
      if (restored.selectedId && nodeById[restored.selectedId]) select(restored.selectedId);
      if (reduceMotion) scheduleDraw(); else requestAnimationFrame(loop);
    } else if (reduceMotion) {
      convergeSync(400);      /* solve the layout, capture rest, paint still — no settle, no mingle */
      fit(true);
      captureRest();
      scheduleDraw();
    } else {
      alpha = 1; simStarted = true;
      requestAnimationFrame(loop);   /* one persistent loop: settle → idle mingle */
    }
  }

  showEmpty('loading');
  fetch(SRC, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) { start(data); })
    .catch(function () { showEmpty('empty'); });
})();
