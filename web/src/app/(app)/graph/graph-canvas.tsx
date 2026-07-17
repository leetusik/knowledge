"use client";

import { useEffect, useRef } from "react";

import { GRAPH } from "@/content";
import type { KbGraph, KbGraphNode } from "@/lib/knowledge/types";

import "./graph-tokens.css";
import "./graph.css";

/*
 * GraphCanvas (P12.S6) — a FAITHFUL port of the docs' `docs/javascripts/graph.js`
 * (a ~1130-line zero-dependency <canvas> force-sim renderer) into the app's first
 * `"use client"` canvas + rAF component. The proven CORE is intact — the
 * deterministic force sim (FNV-hash seeding, alpha cooling, the tick integrator,
 * collision relax), the draw grammar (DPR scaling, edges/halo/nodes/rings/labels,
 * the quiet-label ladder), and the full interaction model (pointer drag/pan/hover-
 * neighbor-highlight, wheel zoom {passive:false}, Escape, the legend project-lens +
 * tag toggle, zoom buttons, node-tap → info panel). Only the SHELL is adapted:
 *
 *   - Data rides in as a `data` prop (no fetch); `start(data)` runs in a useEffect.
 *   - Node navigation: the info-panel "Read" link uses `node.url` directly (now the
 *     absolute `/documents/{id}` S5 read route); tag pills link to `/documents?tag=`.
 *   - Lifecycle cleanup: the useEffect return tears down EVERYTHING the original
 *     IIFE never did — the persistent rAF loop + the one-shot draw, the
 *     ResizeObserver + scheme MutationObserver, the window resize/pagehide
 *     listeners, the persist debounce, and a post-unmount guard on document.fonts.
 *   - Colours/geometry are still read LIVE via getComputedStyle of `--kb-graph-*`
 *     (graph-tokens.css) — never a hardcoded hex — so re-theming stays CSS-only.
 *
 * The overlay shells (legend/zoom/tooltip/panel/empty) render in JSX; the ported
 * engine fills legend/zoom/panel/tooltip imperatively exactly as graph.js does
 * (the lowest-risk faithful port).
 */

// ── model types (the engine's internal shapes) ─────────────────────────────
type NodeType = "doc" | "tag" | "missing";
type EdgeKind = "related" | "tag";

interface Seed {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

interface GNode {
  id: string;
  type: NodeType;
  title: string;
  deg: number;
  r: number;
  url?: string;
  date?: string;
  project?: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  bx: number;
  by: number;
  sd: Seed | null;
  al: number;
  la: number;
}

interface GEdge {
  a: string;
  b: string;
  kind: EdgeKind;
  ghost: boolean;
}

interface View {
  z: number;
  panX: number;
  panY: number;
  zt: number;
  pxt: number;
  pyt: number;
  fitZoom: number;
  auto: boolean;
}

interface Drag {
  mode: "node" | "pan";
  id: string | null;
  wx: number;
  wy: number;
  moved: number;
  px: number;
  py: number;
}

interface TagAnchor {
  owners: string[];
  dx: number;
  dy: number;
}

interface Tokens {
  canvas: string;
  projects: string[];
  docFallback: string;
  outline: string;
  tag: string;
  ghost: string;
  edge: string;
  edgeRelated: string;
  edgeActive: string;
  focus: string;
  halo: string;
  label: string;
  labelMuted: string;
  labelHalo: string;
  dim: number;
  rMin: number;
  rMax: number;
  rTag: number;
  rGhost: number;
  strokeW: number;
  cutout: number;
  edgeW: number;
  edgeWRel: number;
  arrow: number;
  dash: number[];
  haloBlur: number;
  focusW: number;
  focusGap: number;
  font: string;
  labelSize: number;
  labelSizeTag: number;
  labelGap: number;
  settle: number;
  drift: number;
  driftPeriod: number;
  zoomMin: number;
  zoomMax: number;
}

interface StoredBlob {
  rest?: Record<string, [number, number]>;
  view?: { zt: number; pxt: number; pyt: number; auto: boolean };
  tagsVisible?: boolean;
  activeProject?: string | null;
  selectedId?: string | null;
}

export function GraphCanvas({ data }: { data: KbGraph }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    // ── cleanup handles (the React-specific work the original IIFE never did) ──
    let disposed = false;
    let rafId = 0;
    let drawRafId = 0;
    let ro: ResizeObserver | null = null;
    let schemeObs: MutationObserver | null = null;

    // ── sim tuning (engineering; unconstrained by the locked visual design) ──
    const REST_RELATED = 150,
      K_RELATED = 0.9;
    const REST_TAG = 210,
      K_TAG = 0.2;
    const REPULSION = 9000,
      REPULSION_MAX_D2 = 600 * 600;
    const CENTER_K = 0.016,
      COLLIDE_PAD = 20,
      COLLIDE_ITERS = 2;
    const ALPHA_DECAY = 0.1,
      ALPHA_MIN = 0.02,
      VEL_DECAY = 0.6;
    const LAYOUT_RADIUS = 400;
    const FIT_PAD = 64,
      FIT_Z_MIN = 0.5,
      FIT_Z_MAX = 1.5;
    const EASE_POS = 0.12,
      EASE_ALPHA = 0.18,
      EASE_VIEW = 0.16,
      EASE_DRAG = 0.55;

    // ── tokens (read live per paint so the scheme "just works") ──
    function readTokens(): Tokens {
      const cs = getComputedStyle(host!);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      const px = (n: string) => parseFloat(v(n)) || 0;
      const pxf = (n: string, fb: number) => {
        const s = v(n);
        return s === "" ? fb : parseFloat(s) || 0;
      };
      return {
        canvas: v("--kb-graph-canvas"),
        projects: [
          v("--kb-graph-project-1"),
          v("--kb-graph-project-2"),
          v("--kb-graph-project-3"),
        ],
        docFallback: v("--kb-graph-node-doc"),
        outline: v("--kb-graph-node-outline"),
        tag: v("--kb-graph-node-tag"),
        ghost: v("--kb-graph-node-ghost"),
        edge: v("--kb-graph-edge"),
        edgeRelated: v("--kb-graph-edge-related"),
        edgeActive: v("--kb-graph-edge-active"),
        focus: v("--kb-graph-focus"),
        halo: v("--kb-graph-halo"),
        label: v("--kb-graph-label"),
        labelMuted: v("--kb-graph-label-muted"),
        labelHalo: v("--kb-graph-label-halo"),
        dim: parseFloat(v("--kb-graph-dim")) || 0.16,
        rMin: px("--kb-graph-node-r-min") || 6,
        rMax: px("--kb-graph-node-r-max") || 14,
        rTag: px("--kb-graph-node-r-tag") || 4.5,
        rGhost: px("--kb-graph-node-r-ghost") || 5.5,
        strokeW: px("--kb-graph-node-stroke") || 1.5,
        cutout: px("--kb-graph-node-cutout") || 1.5,
        edgeW: px("--kb-graph-edge-w") || 1,
        edgeWRel: px("--kb-graph-edge-w-related") || 1.75,
        arrow: px("--kb-graph-arrow") || 5,
        dash: (v("--kb-graph-ghost-dash") || "4, 4")
          .split(",")
          .map((s) => parseFloat(s) || 4),
        haloBlur: px("--kb-graph-halo-blur") || 8,
        focusW: px("--kb-graph-focus-w") || 2,
        focusGap: px("--kb-graph-focus-gap") || 2,
        font: v("--kb-graph-font") || "sans-serif",
        labelSize: px("--kb-graph-label-size") || 12.5,
        labelSizeTag: px("--kb-graph-label-size-tag") || 11,
        labelGap: px("--kb-graph-label-gap") || 6,
        settle: px("--kb-graph-settle") || 600,
        drift: pxf("--kb-graph-drift", 3),
        driftPeriod: pxf("--kb-graph-drift-period", 9),
        zoomMin: pxf("--kb-graph-zoom-min", 0.5),
        zoomMax: pxf("--kb-graph-zoom-max", 2.5),
      };
    }
    let T = readTokens();

    // ── deterministic hash (FNV-1a → [0,1); no randomness anywhere) ──
    function hash01(str: string): number {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 1000000) / 1000000;
    }

    function seed(id: string): Seed {
      let x = 7;
      for (let i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) % 233280;
      const r = () => {
        x = (x * 9301 + 49297) % 233280;
        return x / 233280;
      };
      const TAU = Math.PI * 2;
      return {
        p1: r() * TAU,
        p2: r() * TAU,
        p3: r() * TAU,
        p4: r() * TAU,
        w1: 0.7 + r() * 0.6,
        w2: 1.4 + r() * 0.9,
        w3: 0.7 + r() * 0.6,
        w4: 1.4 + r() * 0.9,
      };
    }
    function drift(n: GNode, time: number): { x: number; y: number } {
      if (reduceMotion || !T.drift || !n.sd) return { x: 0, y: 0 };
      const amp = T.drift * (n.type === "tag" ? 1.5 : n.type === "missing" ? 1.2 : 1);
      const base = (Math.PI * 2) / T.driftPeriod;
      const s = n.sd;
      return {
        x:
          (amp *
            (Math.sin(time * base * s.w1 + s.p1) +
              0.5 * Math.sin(time * base * s.w2 + s.p2))) /
          1.5,
        y:
          (amp *
            (Math.sin(time * base * s.w3 + s.p3) +
              0.5 * Math.sin(time * base * s.w4 + s.p4))) /
          1.5,
      };
    }

    // ── overlay elements (rendered as shells in JSX; filled imperatively) ──
    const elLegend = host.querySelector<HTMLElement>(".kb-graph-legend");
    const elZoom = host.querySelector<HTMLElement>(".kb-graph-zoom");
    const elTooltip = host.querySelector<HTMLElement>(".kb-graph-tooltip");
    const elPanel = host.querySelector<HTMLElement>(".kb-graph-panel");
    const elEmpty = host.querySelector<HTMLElement>(".kb-graph-empty");
    const emptyDefaultHTML = elEmpty ? elEmpty.innerHTML : "";

    function showEmpty(mode: "none" | "empty") {
      if (!elEmpty) return;
      if (mode === "none") {
        elEmpty.hidden = true;
        return;
      }
      elEmpty.innerHTML = emptyDefaultHTML;
      elEmpty.hidden = false;
    }

    // ── state ──
    let nodes: GNode[] = [];
    let edges: GEdge[] = [];
    let nodeById: Record<string, GNode> = {};
    let adjacency: Record<string, Record<string, boolean>> = {};
    const projectInk: Record<string, number> = {};
    let activeProject: string | null = null;
    let tagAnchor: Record<string, TagAnchor> = {};
    let tagsVisible = true;
    let hoverId: string | null = null,
      selectedId: string | null = null;
    let W = 0,
      H = 0,
      dpr = 1;
    const view: View = {
      z: 1,
      panX: 0,
      panY: 0,
      zt: 1,
      pxt: 0,
      pyt: 0,
      fitZoom: 1,
      auto: true,
    };
    const center = { x: 0, y: 0 };
    let alpha = 0,
      simStarted = false,
      restCaptured = false;
    let frameQueued = false;
    let drag: Drag | null = null;
    let STORE_KEY: string | null = null;

    // ── data → model ──
    function buildModel(d: KbGraph) {
      const projects = d.projects || [];
      projects.forEach((p, i) => {
        projectInk[p.name] = i % 3;
      });

      const raw: KbGraphNode[] = d.nodes || [];
      const rawEdges = d.edges || [];

      nodes = raw.map((n) => {
        const deg = n.degree || 0;
        let r: number;
        if (n.type === "doc")
          r = T.rMin + (T.rMax - T.rMin) * Math.min(1, Math.max(0, (deg - 2) / 6));
        else if (n.type === "tag") r = T.rTag;
        else r = T.rGhost;
        return {
          id: n.id,
          type: n.type,
          title: n.title || n.id,
          deg,
          r,
          url: n.url,
          date: n.date,
          project: n.project,
          tags: n.tags || [],
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          fx: null,
          fy: null,
          bx: 0,
          by: 0,
          sd: null,
          al: 1,
          la: 0,
        };
      });
      nodeById = {};
      nodes.forEach((n) => {
        nodeById[n.id] = n;
      });

      edges = rawEdges
        .filter((e) => nodeById[e.source] && nodeById[e.target])
        .map((e) => ({
          a: e.source,
          b: e.target,
          kind: e.kind,
          ghost: nodeById[e.target].type === "missing",
        }));

      adjacency = {};
      nodes.forEach((n) => {
        adjacency[n.id] = {};
      });
      edges.forEach((e) => {
        adjacency[e.a][e.b] = true;
        adjacency[e.b][e.a] = true;
      });

      seedPositions(projects.length);
    }

    function seedPositions(projectCount: number) {
      const P = Math.max(1, projectCount);
      nodes.forEach((n) => {
        if (n.type !== "doc") return;
        const pIdx = projectInk[n.project ?? ""] != null ? projectInk[n.project ?? ""] : 0;
        const ang =
          (2 * Math.PI * pIdx) / P +
          (hash01(n.id) - 0.5) * ((2 * Math.PI) / P) * 0.7;
        const degNorm = Math.min(1, Math.max(0, (n.deg - 2) / 6));
        const rad =
          LAYOUT_RADIUS * (0.35 + 0.5 * (1 - degNorm)) +
          (hash01(n.id + "#r") - 0.5) * 0.16 * LAYOUT_RADIUS;
        n.x = Math.cos(ang) * rad;
        n.y = Math.sin(ang) * rad;
      });
      nodes.forEach((n) => {
        if (n.type === "doc") return;
        if (n.type === "tag") {
          const owners = ownerDocsOf(n.id);
          const c = seedCentroid(owners);
          const owner = owners.length ? nodeById[owners[0]] : null;
          const name = n.id.replace(/^tag:/, "");
          const count = owner && owner.tags.length ? owner.tags.length : 1;
          let idx = owner ? owner.tags.indexOf(name) : -1;
          if (idx < 0) idx = 0;
          const base = owners.length ? Math.atan2(c.y, c.x) : 2 * Math.PI * hash01(n.id);
          const ang2 = base + (2 * Math.PI * idx) / count;
          const off = REST_TAG * 0.9 * (1 + (hash01(n.id) - 0.5) * 0.2);
          n.x = c.x + Math.cos(ang2) * off;
          n.y = c.y + Math.sin(ang2) * off;
        } else {
          const src = ghostSourceOf(n.id);
          if (src) {
            const ag = 2 * Math.PI * hash01(n.id + "#g");
            n.x = src.x + Math.cos(ag) * REST_RELATED;
            n.y = src.y + Math.sin(ag) * REST_RELATED;
          } else {
            const ar = 2 * Math.PI * hash01(n.id);
            n.x = Math.cos(ar) * LAYOUT_RADIUS;
            n.y = Math.sin(ar) * LAYOUT_RADIUS;
          }
        }
      });
    }
    function seedCentroid(ids: string[]): { x: number; y: number } {
      let sx = 0,
        sy = 0,
        c = 0;
      ids.forEach((id) => {
        const d = nodeById[id];
        if (d) {
          sx += d.x;
          sy += d.y;
          c++;
        }
      });
      return c ? { x: sx / c, y: sy / c } : { x: 0, y: 0 };
    }
    function ghostSourceOf(ghostId: string): GNode | null {
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].kind === "related" && edges[i].b === ghostId)
          return nodeById[edges[i].a] || null;
      }
      return null;
    }

    // ── force sim ──
    function tick(a: number) {
      let i: number, j: number, n: GNode, e: GEdge, A: GNode, B: GNode;
      let dx: number, dy: number, d: number, d2: number, ux: number, uy: number, f: number;

      for (i = 0; i < nodes.length; i++) {
        A = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          B = nodes[j];
          dx = B.x - A.x;
          dy = B.y - A.y;
          d2 = dx * dx + dy * dy;
          if (d2 > REPULSION_MAX_D2) continue;
          if (d2 < 1) {
            d2 = 1;
            dx = 0.5 - hash01(A.id + B.id);
            dy = 0.5 - hash01(B.id + A.id);
          }
          d = Math.sqrt(d2);
          ux = dx / d;
          uy = dy / d;
          f = (REPULSION / d2) * a;
          A.vx -= ux * f;
          A.vy -= uy * f;
          B.vx += ux * f;
          B.vy += uy * f;
        }
      }

      for (i = 0; i < edges.length; i++) {
        e = edges[i];
        A = nodeById[e.a];
        B = nodeById[e.b];
        dx = B.x - A.x;
        dy = B.y - A.y;
        d = Math.hypot(dx, dy) || 0.01;
        const rest = e.kind === "related" ? REST_RELATED : REST_TAG;
        const k = e.kind === "related" ? K_RELATED : K_TAG;
        f = ((d - rest) / d) * k * a * 0.5;
        dx *= f;
        dy *= f;
        A.vx += dx;
        A.vy += dy;
        B.vx -= dx;
        B.vy -= dy;
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.vx -= n.x * CENTER_K * a;
        n.vy -= n.y * CENTER_K * a;
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.fx != null) {
          n.x = n.fx;
          n.y = n.fy!;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx *= VEL_DECAY;
        n.vy *= VEL_DECAY;
        n.x += n.vx;
        n.y += n.vy;
      }

      for (let it = 0; it < COLLIDE_ITERS; it++) {
        for (i = 0; i < nodes.length; i++) {
          A = nodes[i];
          for (j = i + 1; j < nodes.length; j++) {
            B = nodes[j];
            const min = A.r + B.r + COLLIDE_PAD;
            dx = B.x - A.x;
            dy = B.y - A.y;
            d = Math.hypot(dx, dy) || 0.01;
            if (d < min) {
              const push = (min - d) / 2;
              ux = dx / d;
              uy = dy / d;
              if (A.fx == null) {
                A.x -= ux * push;
                A.y -= uy * push;
              }
              if (B.fx == null) {
                B.x += ux * push;
                B.y += uy * push;
              }
            }
          }
        }
      }
    }

    function convergeSync(maxTicks: number) {
      let a = 1;
      for (let i = 0; i < maxTicks && a > ALPHA_MIN; i++) {
        tick(a);
        a *= 1 - ALPHA_DECAY;
      }
    }

    function captureRest() {
      if (restCaptured) return;
      nodes.forEach((n) => {
        n.bx = n.x;
        n.by = n.y;
        n.sd = seed(n.id);
      });
      computeTagAnchors();
      restCaptured = true;
      persist();
    }
    function ownerDocsOf(tagId: string): string[] {
      const owners: string[] = [];
      Object.keys(adjacency[tagId] || {}).forEach((k) => {
        const o = nodeById[k];
        if (o && o.type === "doc") owners.push(k);
      });
      return owners;
    }
    function anchorOf(owners: string[], live: boolean): { x: number; y: number } {
      let sx = 0,
        sy = 0,
        c = 0;
      owners.forEach((id) => {
        const d = nodeById[id];
        if (!d) return;
        sx += live ? d.x : d.bx;
        sy += live ? d.y : d.by;
        c++;
      });
      return c ? { x: sx / c, y: sy / c } : { x: center.x, y: center.y };
    }
    function computeTagAnchors() {
      tagAnchor = {};
      nodes.forEach((n) => {
        if (n.type !== "tag") return;
        const owners = ownerDocsOf(n.id);
        const a = anchorOf(owners, false);
        tagAnchor[n.id] = { owners, dx: n.bx - a.x, dy: n.by - a.y };
      });
    }

    // ── reload persistence (tab-scoped sessionStorage) ──
    function computeStoreKey(): string {
      const ids = nodes.map((n) => n.id).sort();
      return "kb-graph:v1:" + hash01(ids.join("\n"));
    }
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    function persist() {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        persistTimer = null;
        persistNow();
      }, 250);
    }
    function flushPersist() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      persistNow();
    }
    function persistNow() {
      if (!STORE_KEY) return;
      try {
        const rest: Record<string, [number, number]> = {};
        nodes.forEach((n) => {
          rest[n.id] = [Math.round(n.bx * 10) / 10, Math.round(n.by * 10) / 10];
        });
        const blob: StoredBlob = {
          rest,
          view: { zt: view.zt, pxt: view.pxt, pyt: view.pyt, auto: view.auto },
          tagsVisible,
          activeProject,
          selectedId,
        };
        window.sessionStorage.setItem(STORE_KEY, JSON.stringify(blob));
      } catch {
        /* private-mode / quota / disabled: silent no-op */
      }
    }
    function restoreState(): StoredBlob | null {
      if (!STORE_KEY) return null;
      let raw: string | null;
      try {
        raw = window.sessionStorage.getItem(STORE_KEY);
      } catch {
        return null;
      }
      if (!raw) return null;
      let blob: StoredBlob;
      try {
        blob = JSON.parse(raw) as StoredBlob;
      } catch {
        return null;
      }
      if (!blob || !blob.rest) return null;

      const rest = blob.rest;
      nodes.forEach((n) => {
        n.sd = seed(n.id);
        const p = rest[n.id];
        if (p && isFinite(p[0]) && isFinite(p[1])) {
          n.x = n.bx = p[0];
          n.y = n.by = p[1];
        } else {
          n.bx = n.x;
          n.by = n.y;
        }
      });
      computeTagAnchors();
      restCaptured = true;
      alpha = 0;
      simStarted = false;

      if (typeof blob.tagsVisible === "boolean") tagsVisible = blob.tagsVisible;
      activeProject =
        blob.activeProject != null && projectInk[blob.activeProject] != null
          ? blob.activeProject
          : null;
      return blob;
    }
    function syncLegendUI() {
      if (!elLegend) return;
      const sw = elLegend.querySelector<HTMLElement>(".kb-graph-switch");
      if (sw) {
        sw.classList.toggle("is-on", tagsVisible);
        sw.setAttribute("aria-pressed", tagsVisible ? "true" : "false");
      }
      elLegend.querySelectorAll<HTMLElement>(".kb-graph-legend__item").forEach((b) => {
        b.classList.toggle("is-on", b.getAttribute("data-project") === activeProject);
      });
    }

    // ── camera ──
    function visibleNodes(): GNode[] {
      return nodes.filter((n) => !isHidden(n));
    }
    function fit(snap: boolean) {
      const vis = visibleNodes();
      let z: number;
      if (!vis.length) {
        center.x = 0;
        center.y = 0;
        z = 1;
      } else {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        vis.forEach((n) => {
          if (n.x < minX) minX = n.x;
          if (n.x > maxX) maxX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.y > maxY) maxY = n.y;
        });
        center.x = (minX + maxX) / 2;
        center.y = (minY + maxY) / 2;
        const bw = Math.max(1, maxX - minX),
          bh = Math.max(1, maxY - minY);
        z = Math.min((W - 2 * FIT_PAD) / bw, (H - 2 * FIT_PAD) / bh);
        if (!isFinite(z) || z <= 0) z = 1;
        z = Math.max(FIT_Z_MIN, Math.min(FIT_Z_MAX, z));
      }
      view.fitZoom = z;
      view.zt = z;
      view.pxt = 0;
      view.pyt = 0;
      if (snap) {
        view.z = z;
        view.panX = 0;
        view.panY = 0;
      }
    }
    function toScreen(n: GNode): { x: number; y: number } {
      return {
        x: W / 2 + (n.x - center.x) * view.z + view.panX,
        y: H / 2 + (n.y - center.y) * view.z + view.panY,
      };
    }
    function toWorld(sx: number, sy: number): { x: number; y: number } {
      return {
        x: (sx - W / 2 - view.panX) / view.z + center.x,
        y: (sy - H / 2 - view.panY) / view.z + center.y,
      };
    }
    function displayZoom(): number {
      return view.z / (view.fitZoom || 1);
    }
    function clampPan() {
      const mx = (W * view.zt) / 2,
        my = (H * view.zt) / 2;
      view.pxt = Math.max(-mx, Math.min(mx, view.pxt));
      view.pyt = Math.max(-my, Math.min(my, view.pyt));
    }
    function zoomAbout(sx: number, sy: number, factor: number) {
      const z = Math.max(
        view.fitZoom * T.zoomMin,
        Math.min(view.fitZoom * T.zoomMax, view.zt * factor),
      );
      const wx = (sx - W / 2 - view.pxt) / view.zt + center.x;
      const wy = (sy - H / 2 - view.pyt) / view.zt + center.y;
      view.zt = z;
      view.pxt = sx - W / 2 - (wx - center.x) * z;
      view.pyt = sy - H / 2 - (wy - center.y) * z;
      view.auto = false;
      clampPan();
      if (reduceMotion) {
        view.z = view.zt;
        view.panX = view.pxt;
        view.panY = view.pyt;
      }
      scheduleDraw();
      persist();
    }

    // ── visibility (legend is a LENS, never a filter) ──
    function isHidden(n: GNode): boolean {
      if (n.type === "tag") return !tagsVisible;
      return false;
    }
    function edgeHidden(e: GEdge): boolean {
      if (e.kind === "tag" && !tagsVisible) return true;
      return isHidden(nodeById[e.a]) || isHidden(nodeById[e.b]);
    }
    function neighborhood(id: string): Record<string, boolean> {
      const keep: Record<string, boolean> = {};
      keep[id] = true;
      const adj = adjacency[id] || {};
      Object.keys(adj).forEach((k) => {
        keep[k] = true;
      });
      return keep;
    }
    function projectKeep(name: string): Record<string, boolean> {
      const keep: Record<string, boolean> = {};
      nodes.forEach((n) => {
        if (n.type === "doc" && n.project === name) keep[n.id] = true;
      });
      edges.forEach((e) => {
        if (keep[e.a]) keep[e.b] = true;
        if (keep[e.b]) keep[e.a] = true;
      });
      return keep;
    }
    function currentFocus(): string | null {
      const id =
        drag && drag.mode === "node" && drag.id ? drag.id : hoverId || selectedId;
      if (!id || !nodeById[id] || isHidden(nodeById[id])) return null;
      return id;
    }
    function computeKeep(focus: string | null): Record<string, boolean> | null {
      if (focus) return neighborhood(focus);
      if (activeProject != null) return projectKeep(activeProject);
      return null;
    }

    // ── labels (Strategy A′): quiet map + zoom ladder relative to fit ──
    function ladder(): number {
      return Math.max(0, Math.min(1, (displayZoom() - 1.1) / 0.25));
    }
    function labelTarget(
      n: GNode,
      keep: Record<string, boolean> | null,
      focus: string | null,
    ): number {
      if (keep && !keep[n.id]) return 0;
      if (focus && keep) return 1;
      if (n.type === "doc") return keep ? 1 : ladder();
      if (n.type === "missing") return ladder() * 0.9;
      return 0;
    }

    // ── kinematics ──
    function stepPositions(time: number) {
      const eP = reduceMotion ? 1 : EASE_POS;
      nodes.forEach((n) => {
        let tx: number, ty: number, k: number;
        if (drag && drag.mode === "node" && drag.id === n.id) {
          tx = drag.wx;
          ty = drag.wy;
          k = reduceMotion ? 1 : EASE_DRAG;
        } else if (n.type === "tag") {
          const a = tagAnchor[n.id],
            d = drift(n, time);
          if (a) {
            const p = anchorOf(a.owners, true);
            tx = p.x + a.dx + d.x;
            ty = p.y + a.dy + d.y;
          } else {
            tx = n.bx + d.x;
            ty = n.by + d.y;
          }
          k = eP;
        } else {
          const d2 = drift(n, time);
          tx = n.bx + d2.x;
          ty = n.by + d2.y;
          k = eP;
        }
        n.x += (tx - n.x) * k;
        n.y += (ty - n.y) * k;
      });
    }
    function stepAlphaLabelView(
      time: number,
      focus: string | null,
      keep: Record<string, boolean> | null,
    ) {
      const eA = reduceMotion ? 1 : EASE_ALPHA;
      nodes.forEach((n) => {
        const aT = keep ? (keep[n.id] ? 1 : T.dim) : 1;
        n.al += (aT - n.al) * eA;
        const lT = labelTarget(n, keep, focus);
        n.la += (lT - n.la) * eA;
      });
      const eV = reduceMotion ? 1 : EASE_VIEW;
      view.z += (view.zt - view.z) * eV;
      view.panX += (view.pxt - view.panX) * eV;
      view.panY += (view.pyt - view.panY) * eV;
    }

    // ── drawing ──
    function render(now?: number) {
      if (now === undefined) now = performance.now();
      const time = now / 1000;

      const settling = simStarted && alpha > ALPHA_MIN && !reduceMotion;
      if (settling) {
        tick(alpha);
        alpha *= 1 - ALPHA_DECAY;
        if (view.auto) fit(true);
        if (alpha <= ALPHA_MIN) {
          alpha = 0;
          if (view.auto) fit(true);
          captureRest();
        }
      } else {
        stepPositions(time);
      }

      const focus = currentFocus();
      const keep = computeKeep(focus);
      stepAlphaLabelView(time, focus, keep);
      frame(focus);
    }

    function frame(focus: string | null) {
      const c = ctx!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = T.canvas;
      c.fillRect(0, 0, W, H);
      const z = view.z;

      edges.forEach((e) => {
        if (edgeHidden(e)) return;
        const al = Math.min(nodeById[e.a].al, nodeById[e.b].al);
        if (al < 0.01) return;
        c.globalAlpha = al;
        const active = !!focus && (e.a === focus || e.b === focus) && al > T.dim + 0.05;
        drawEdge(e, z, active);
      });

      if (focus && nodeById[focus] && !isHidden(nodeById[focus])) {
        c.globalAlpha = nodeById[focus].al;
        drawHalo(nodeById[focus], z);
      }

      nodes.forEach((n) => {
        if (isHidden(n) || n.al < 0.01) return;
        c.globalAlpha = n.al;
        drawNode(n, z);
      });

      if (selectedId && nodeById[selectedId] && !isHidden(nodeById[selectedId])) {
        c.globalAlpha = nodeById[selectedId].al;
        drawRing(nodeById[selectedId], z);
      }

      nodes.forEach((n) => {
        if (isHidden(n)) return;
        const a = n.al * n.la;
        if (a < 0.02) return;
        drawLabel(n, z, n.type !== "doc", a);
      });

      c.globalAlpha = 1;
    }

    function drawEdge(e: GEdge, z: number, active: boolean) {
      const c = ctx!;
      const A = nodeById[e.a],
        B = nodeById[e.b];
      const pA = toScreen(A),
        pB = toScreen(B);
      const dx = pB.x - pA.x,
        dy = pB.y - pA.y,
        d = Math.hypot(dx, dy) || 1;
      const ux = dx / d,
        uy = dy / d;
      const rA = A.r * z,
        rB = B.r * z,
        arrow = T.arrow * z;
      const related = e.kind === "related";
      const x1 = pA.x + ux * rA,
        y1 = pA.y + uy * rA;
      const gap = related ? 3 * z + arrow : 1;
      const x2 = pB.x - ux * (rB + gap),
        y2 = pB.y - uy * (rB + gap);

      c.strokeStyle = active ? T.edgeActive : related ? T.edgeRelated : T.edge;
      c.lineWidth = (related ? T.edgeWRel : T.edgeW) * z;
      c.setLineDash(e.ghost ? T.dash.map((v) => v * z) : []);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      c.setLineDash([]);

      if (related) {
        const tipX = pB.x - ux * (rB + 3 * z),
          tipY = pB.y - uy * (rB + 3 * z);
        const bx = tipX - ux * arrow,
          by = tipY - uy * arrow;
        const wx = -uy * arrow * 0.48,
          wy = ux * arrow * 0.48;
        c.fillStyle = active ? T.edgeActive : T.edgeRelated;
        c.beginPath();
        c.moveTo(tipX, tipY);
        c.lineTo(bx + wx, by + wy);
        c.lineTo(bx - wx, by - wy);
        c.closePath();
        c.fill();
      }
    }

    function drawHalo(n: GNode, z: number) {
      const c = ctx!;
      const p = toScreen(n),
        r = n.r * z,
        R = r + T.haloBlur * 1.9 * z;
      const grad = c.createRadialGradient(p.x, p.y, Math.max(1, r * 0.5), p.x, p.y, R);
      grad.addColorStop(0, T.halo);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(p.x, p.y, R, 0, Math.PI * 2);
      c.fill();
    }

    function drawNode(n: GNode, z: number) {
      const c = ctx!;
      const p = toScreen(n),
        r = n.r * z;
      c.setLineDash([]);
      if (n.type === "doc") {
        const ink =
          projectInk[n.project ?? ""] != null
            ? T.projects[projectInk[n.project ?? ""]]
            : T.docFallback;
        c.fillStyle = ink || T.docFallback;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fill();
        if (T.cutout > 0) {
          c.strokeStyle = T.outline;
          c.lineWidth = T.cutout * z;
          c.beginPath();
          c.arc(p.x, p.y, r + (T.cutout * z) / 2, 0, Math.PI * 2);
          c.stroke();
        }
      } else {
        c.fillStyle = T.canvas;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = n.type === "missing" ? T.ghost : T.tag;
        c.lineWidth = T.strokeW * z;
        if (n.type === "missing") c.setLineDash(T.dash.map((v) => v * z));
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
      }
    }

    function drawRing(n: GNode, z: number) {
      const c = ctx!;
      const p = toScreen(n),
        r = n.r * z;
      c.strokeStyle = T.focus;
      c.lineWidth = T.focusW * z;
      c.beginPath();
      c.arc(
        p.x,
        p.y,
        r + (T.focusGap + T.focusW / 2 + (n.type === "doc" ? T.cutout : 0)) * z,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }

    function drawLabel(n: GNode, z: number, muted: boolean, a: number) {
      const c = ctx!;
      const p = toScreen(n),
        r = n.r * z;
      const isDoc = n.type === "doc";
      const size = (isDoc ? T.labelSize : T.labelSizeTag) * z;
      c.globalAlpha = a;
      c.font = (isDoc ? "500 " : "400 ") + size + "px " + T.font;
      c.textAlign = "center";
      c.textBaseline = "top";
      const y = p.y + r + T.labelGap * z;
      c.lineJoin = "round";
      c.strokeStyle = T.labelHalo;
      c.lineWidth = 3 * z;
      c.strokeText(n.title, p.x, y);
      c.fillStyle = muted ? T.labelMuted : T.label;
      c.fillText(n.title, p.x, y);
    }

    // ── animation ──
    function loop(now: number) {
      if (disposed) return;
      rafId = requestAnimationFrame(loop);
      if (document.hidden) return;
      render(now);
    }
    function scheduleDraw() {
      if (!reduceMotion) return;
      if (frameQueued) return;
      frameQueued = true;
      drawRafId = requestAnimationFrame((now) => {
        frameQueued = false;
        if (disposed) return;
        render(now);
      });
    }

    // ── chrome ──
    function resize() {
      W = host!.clientWidth || 1;
      H = host!.clientHeight || 1;
      dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      if (view.auto) fit(true);
      scheduleDraw();
    }

    // ── tooltip ──
    function updateTooltip(sx: number, sy: number) {
      if (!elTooltip) return;
      const n = hoverId ? nodeById[hoverId] : null;
      const lowZoom = displayZoom() < 0.6;
      if (!n || !lowZoom || isHidden(n)) {
        elTooltip.hidden = true;
        return;
      }
      let html = "";
      if (n.type === "doc") {
        const ink = projectInk[n.project ?? ""] != null ? projectInk[n.project ?? ""] + 1 : 1;
        html =
          '<span class="kb-graph-tooltip__chip" style="--chip: var(--kb-graph-project-' +
          ink +
          ')"></span>' +
          esc(n.title);
      } else if (n.type === "tag") {
        html =
          '<span class="kb-graph-tooltip__chip kb-graph-legend__chip--ring"></span>' +
          esc(n.title) +
          ' <span class="kb-graph-tooltip__kind">· tag · ' +
          docCount(n) +
          " docs</span>";
      } else {
        html =
          '<span class="kb-graph-tooltip__chip kb-graph-legend__chip--ghost"></span>' +
          esc(n.title) +
          ' <span class="kb-graph-tooltip__kind">· unresolved</span>';
      }
      elTooltip.innerHTML = html;
      elTooltip.hidden = false;
      const pad = 14;
      const tw = elTooltip.offsetWidth,
        th = elTooltip.offsetHeight;
      let x = sx + pad,
        y = sy + pad;
      if (x + tw > W) x = sx - pad - tw;
      if (y + th > H) y = sy - pad - th;
      elTooltip.style.left = Math.max(0, x) + "px";
      elTooltip.style.top = Math.max(0, y) + "px";
    }
    function docCount(tagNode: GNode): number {
      const keys = Object.keys(adjacency[tagNode.id] || {});
      let c = 0;
      keys.forEach((k) => {
        if (nodeById[k] && nodeById[k].type === "doc") c++;
      });
      return c;
    }

    // ── panel ──
    function esc(s: unknown): string {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => map[ch]);
    }
    function relLinkCount(id: string): number {
      let c = 0;
      edges.forEach((e) => {
        if (e.kind === "related" && (e.a === id || e.b === id)) c++;
      });
      return c;
    }
    // node.url is now the absolute S5 read route (/documents/{id}); no '../' prefix.
    function resolveUrl(url?: string): string {
      return url ? url : "#";
    }
    // tag pills navigate to the tag-filtered documents list (there is no /tags route).
    function tagHref(tag: string): string {
      return "/documents?tag=" + encodeURIComponent(tag);
    }

    function openPanel(n: GNode) {
      if (!elPanel) return;
      elPanel.classList.remove("kb-graph-panel--ghost");
      let html: string;
      if (n.type === "missing") {
        elPanel.classList.add("kb-graph-panel--ghost");
        const sources: string[] = [];
        edges.forEach((e) => {
          if (e.kind === "related" && e.b === n.id && nodeById[e.a])
            sources.push(nodeById[e.a].title);
        });
        html =
          '<div class="kb-graph-panel__eyebrow"><span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>Unresolved' +
          '<button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">' +
          closeGlyph() +
          "</button></div>" +
          '<h3 class="kb-graph-panel__title">' +
          esc(n.title) +
          "</h3>" +
          '<div class="kb-graph-panel__meta">' +
          (sources.length
            ? "linked from " + esc(sources.join(", "))
            : "unresolved link") +
          "</div>" +
          '<span class="kb-graph-panel__badge">no document yet · 문서 없음</span>';
      } else {
        const ink = (projectInk[n.project ?? ""] != null ? projectInk[n.project ?? ""] : 0) + 1;
        const tags = (n.tags || [])
          .map(
            (t) =>
              '<li><a class="kb-tag" href="' + tagHref(t) + '">' + esc(t) + "</a></li>",
          )
          .join("");
        const links = relLinkCount(n.id);
        html =
          '<div class="kb-graph-panel__eyebrow"><span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' +
          ink +
          ')"></span>' +
          esc(n.project || "") +
          '<button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">' +
          closeGlyph() +
          "</button></div>" +
          '<h3 class="kb-graph-panel__title">' +
          esc(n.title) +
          "</h3>" +
          '<div class="kb-graph-panel__meta">' +
          esc(n.date || "") +
          " · " +
          (n.tags || []).length +
          " tags · " +
          links +
          " links</div>" +
          (tags ? '<ul class="kb-graph-panel__tags">' + tags + "</ul>" : "") +
          '<a class="kb-graph-panel__read" href="' +
          resolveUrl(n.url) +
          '">Read the document →</a>';
      }
      elPanel.innerHTML = html;
      elPanel.hidden = false;
      const closeBtn = elPanel.querySelector<HTMLElement>(".kb-graph-panel__close");
      if (closeBtn) closeBtn.addEventListener("click", deselect);
    }
    function closePanel() {
      if (elPanel) {
        elPanel.hidden = true;
        elPanel.innerHTML = "";
      }
    }
    function select(id: string) {
      selectedId = id;
      const n = nodeById[id];
      if (n && (n.type === "doc" || n.type === "missing")) openPanel(n);
      else closePanel();
      scheduleDraw();
      persist();
    }
    function deselect() {
      selectedId = null;
      closePanel();
      scheduleDraw();
      persist();
    }

    // ── icons ──
    function closeGlyph(): string {
      return "✕";
    }
    function fitGlyph(): string {
      return (
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'd="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
      );
    }

    // ── legend ──
    function buildLegend(
      projects: { name: string; docs: number }[],
      tagCount: number,
      ghostCount: number,
    ) {
      if (!elLegend) return;
      let rows = '<div class="kb-graph-legend__head">Projects · 프로젝트</div>';
      projects.forEach((p, i) => {
        const ink = (i % 3) + 1;
        rows +=
          '<button class="kb-graph-legend__item" type="button" data-project="' +
          esc(p.name) +
          '">' +
          '<span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' +
          ink +
          ')"></span>' +
          '<span class="kb-graph-legend__name">' +
          esc(p.name) +
          "</span>" +
          '<span class="kb-graph-legend__count">' +
          (p.docs || 0) +
          "</span></button>";
      });
      rows += '<hr class="kb-graph-legend__rule">';
      rows +=
        '<div class="kb-graph-legend__row"><span class="kb-graph-legend__chip kb-graph-legend__chip--ring"></span>' +
        "Tags · 태그<span class=\"kb-graph-legend__count\">" +
        tagCount +
        "</span>" +
        '<button class="kb-graph-switch is-on" type="button" data-switch="tags" aria-label="Toggle tag visibility" aria-pressed="true"></button></div>';
      if (ghostCount > 0) {
        rows +=
          '<div class="kb-graph-legend__row"><span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>' +
          "Unresolved<span class=\"kb-graph-legend__count\">" +
          ghostCount +
          "</span></div>";
      }
      rows += '<div class="kb-graph-legend__note">Size = connections · 크기=연결 수</div>';
      elLegend.innerHTML = rows;
      elLegend.hidden = false;

      elLegend.querySelectorAll<HTMLElement>(".kb-graph-legend__item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const name = btn.getAttribute("data-project");
          activeProject = activeProject === name ? null : name;
          elLegend.querySelectorAll<HTMLElement>(".kb-graph-legend__item").forEach((b) => {
            b.classList.toggle(
              "is-on",
              b.getAttribute("data-project") === activeProject,
            );
          });
          scheduleDraw();
          persist();
        });
      });
      const sw = elLegend.querySelector<HTMLElement>(".kb-graph-switch");
      if (sw)
        sw.addEventListener("click", () => {
          tagsVisible = !tagsVisible;
          sw.classList.toggle("is-on", tagsVisible);
          sw.setAttribute("aria-pressed", tagsVisible ? "true" : "false");
          if (view.auto) fit(true);
          scheduleDraw();
          persist();
        });
    }

    // ── zoom buttons ──
    function buildZoom() {
      if (!elZoom) return;
      elZoom.innerHTML =
        '<button class="kb-graph-zoom__btn" type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button>' +
        '<button class="kb-graph-zoom__btn" type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out">−</button>' +
        '<button class="kb-graph-zoom__btn" type="button" data-zoom="fit" title="Fit" aria-label="Fit to view">' +
        fitGlyph() +
        "</button>";
      elZoom.hidden = false;
      elZoom.querySelectorAll<HTMLElement>(".kb-graph-zoom__btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const kind = btn.getAttribute("data-zoom");
          if (kind === "in") zoomAbout(W / 2, H / 2, 1.3);
          else if (kind === "out") zoomAbout(W / 2, H / 2, 1 / 1.3);
          else {
            view.auto = true;
            fit(reduceMotion);
            scheduleDraw();
            persist();
          }
        });
      });
    }

    // ── hit-testing ──
    function nodeAt(sx: number, sy: number): GNode | null {
      let best: GNode | null = null,
        bestD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (isHidden(n)) continue;
        const p = toScreen(n);
        const rr = Math.max(n.r * view.z + 4, 10);
        const d = Math.hypot(sx - p.x, sy - p.y);
        if (d <= rr && d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    }
    function localPoint(ev: PointerEvent | WheelEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }
    function clamp(v: number, lo: number, hi: number): number {
      return Math.max(lo, Math.min(hi, v));
    }

    // ── interactions ──
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") deselect();
    }
    function bindInteractions() {
      canvas!.addEventListener("pointerdown", (ev) => {
        if (ev.button != null && ev.button !== 0) return;
        const p = localPoint(ev);
        const n = nodeAt(p.x, p.y);
        try {
          canvas!.setPointerCapture(ev.pointerId);
        } catch {
          /* not all environments support pointer capture — ignore */
        }
        if (n) {
          drag = { mode: "node", id: n.id, wx: n.x, wy: n.y, moved: 0, px: p.x, py: p.y };
        } else {
          drag = { mode: "pan", id: null, wx: 0, wy: 0, moved: 0, px: p.x, py: p.y };
          view.auto = false;
        }
        scheduleDraw();
      });

      canvas!.addEventListener("pointermove", (ev) => {
        const p = localPoint(ev);
        if (drag) {
          drag.moved += Math.abs(p.x - drag.px) + Math.abs(p.y - drag.py);
          if (drag.mode === "pan") {
            view.pxt += p.x - drag.px;
            view.pyt += p.y - drag.py;
            clampPan();
            view.panX = view.pxt;
            view.panY = view.pyt;
          } else {
            const wpt = toWorld(clamp(p.x, 12, W - 12), clamp(p.y, 12, H - 12));
            drag.wx = wpt.x;
            drag.wy = wpt.y;
            const n = drag.id ? nodeById[drag.id] : null;
            if (n && simStarted && alpha > ALPHA_MIN && !reduceMotion) {
              n.fx = drag.wx;
              n.fy = drag.wy;
              n.x = drag.wx;
              n.y = drag.wy;
            }
            canvas!.style.cursor = "grabbing";
          }
          drag.px = p.x;
          drag.py = p.y;
          scheduleDraw();
        } else {
          const hit = nodeAt(p.x, p.y);
          const newHover = hit ? hit.id : null;
          if (newHover !== hoverId) {
            hoverId = newHover;
            scheduleDraw();
          }
          canvas!.style.cursor = hit ? "pointer" : "";
          updateTooltip(p.x, p.y);
        }
      });

      function endDrag() {
        if (!drag) return;
        const tap = drag.moved < 5;
        if (drag.mode === "node") {
          const n = drag.id ? nodeById[drag.id] : null;
          if (n && n.fx != null) {
            n.fx = null;
            n.fy = null;
          }
          if (tap) {
            if (selectedId === drag.id) deselect();
            else if (drag.id) select(drag.id);
          } else if (n) {
            const d = drift(n, performance.now() / 1000);
            n.bx = n.x - d.x;
            n.by = n.y - d.y;
            if (n.type === "tag") {
              const a = tagAnchor[n.id];
              if (a) {
                const p0 = anchorOf(a.owners, false);
                a.dx = n.bx - p0.x;
                a.dy = n.by - p0.y;
              }
            }
          }
        } else if (drag.mode === "pan" && tap) {
          deselect();
        }
        drag = null;
        canvas!.style.cursor = "";
        scheduleDraw();
        persist();
      }
      canvas!.addEventListener("pointerup", endDrag);
      canvas!.addEventListener("pointercancel", () => {
        if (drag && drag.mode === "node") {
          const n = drag.id ? nodeById[drag.id] : null;
          if (n && n.fx != null) {
            n.fx = null;
            n.fy = null;
          }
        }
        drag = null;
        canvas!.style.cursor = "";
      });
      canvas!.addEventListener("pointerleave", () => {
        if (!drag && hoverId) {
          hoverId = null;
          scheduleDraw();
        }
      });

      canvas!.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
          const p = localPoint(ev);
          const factor = Math.exp(
            -ev.deltaY * (ev.ctrlKey || ev.metaKey ? 0.01 : 0.0024),
          );
          zoomAbout(p.x, p.y, factor);
        },
        { passive: false },
      );

      host!.addEventListener("keydown", onKeyDown);
    }

    // ── scheme ──
    function observeScheme() {
      if (!window.MutationObserver) return;
      schemeObs = new MutationObserver(() => {
        T = readTokens();
        scheduleDraw();
      });
      const opts = { attributes: true, attributeFilter: ["data-md-color-scheme"] };
      schemeObs.observe(document.documentElement, opts);
      schemeObs.observe(document.body, opts);
      const appRoot = host!.closest("[data-md-color-scheme]");
      if (appRoot) schemeObs.observe(appRoot, opts);
    }

    // ── boot ──
    function start(d: KbGraph) {
      T = readTokens();
      buildModel(d);
      STORE_KEY = computeStoreKey();
      const restored = restoreState();

      const docNodes = nodes.filter((n) => n.type === "doc");
      if (!docNodes.length) {
        showEmpty("empty");
        return;
      }
      showEmpty("none");

      const projects = d.projects || [];
      const tagCount = nodes.filter((n) => n.type === "tag").length;
      const ghostCount = nodes.filter((n) => n.type === "missing").length;
      buildLegend(projects, tagCount, ghostCount);
      buildZoom();
      bindInteractions();
      observeScheme();
      if (restored) syncLegendUI();

      resize();
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => resize());
        ro.observe(host!);
      } else {
        window.addEventListener("resize", resize);
      }
      window.addEventListener("pagehide", flushPersist);

      if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => {
          if (disposed) return;
          scheduleDraw();
        });

      if (restored) {
        fit(true);
        if (
          restored.view &&
          restored.view.auto === false &&
          isFinite(restored.view.zt)
        ) {
          view.zt = restored.view.zt;
          view.pxt = restored.view.pxt;
          view.pyt = restored.view.pyt;
          view.z = view.zt;
          view.panX = view.pxt;
          view.panY = view.pyt;
          view.auto = false;
        }
        if (restored.selectedId && nodeById[restored.selectedId])
          select(restored.selectedId);
        if (reduceMotion) scheduleDraw();
        else rafId = requestAnimationFrame(loop);
      } else if (reduceMotion) {
        convergeSync(400);
        fit(true);
        captureRest();
        scheduleDraw();
      } else {
        alpha = 1;
        simStarted = true;
        rafId = requestAnimationFrame(loop);
      }
    }

    start(data);

    // ── teardown (the critical React-specific work) ──
    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (drawRafId) cancelAnimationFrame(drawRafId);
      if (ro) ro.disconnect();
      if (schemeObs) schemeObs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pagehide", flushPersist);
      host.removeEventListener("keydown", onKeyDown);
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
    };
  }, [data]);

  return (
    <div ref={hostRef} className="kb-graph">
      <canvas
        ref={canvasRef}
        className="kb-graph__canvas"
        aria-label={GRAPH.canvasLabel}
        role="img"
      />
      <div className="kb-graph__ui kb-graph-legend" hidden />
      <div className="kb-graph__ui kb-graph-zoom" hidden />
      <div className="kb-graph-tooltip" hidden />
      <div className="kb-graph__ui kb-graph-panel" hidden />
      {/* Hidden by first paint so a populated graph never flashes the empty state;
          the engine reveals it (showEmpty('empty')) only when there are no docs. */}
      <div className="kb-graph-empty" hidden>
        <svg
          className="kb-graph-empty__icon"
          viewBox="0 0 24 24"
          width={24}
          height={24}
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"
          />
        </svg>
        <div className="kb-graph-empty__title">{GRAPH.empty.title}</div>
        <div className="kb-graph-empty__sub">{GRAPH.empty.sub}</div>
      </div>
    </div>
  );
}
