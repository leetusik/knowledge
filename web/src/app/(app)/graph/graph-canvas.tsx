"use client";

import { useEffect, useRef } from "react";

import { GRAPH } from "@/content";
import type { KbGraph, KbGraphNode } from "@/lib/knowledge/types";

// P28.S6 — the three graph stylesheets (`graph-tokens.css`, `graph.css`,
// `graph-r5.css`) are imported from `globals.css`, in that order, NOT from here.
// A component import compiles into a later document sheet than the globals
// chunk, which made round 05's sheet lose every same-selector tie to the record
// it layers on top of. See the note beside those three lines in `globals.css`.

/*
 * GraphCanvas (P12.S6) — a FAITHFUL port of the docs' `docs/javascripts/graph.js`
 * (a ~1130-line zero-dependency <canvas> force-sim renderer) into the app's first
 * `"use client"` canvas + rAF component. The proven CORE is intact — the
 * deterministic force sim (FNV-hash seeding, alpha cooling, the tick integrator,
 * collision relax), the draw grammar (DPR scaling, edges/halo/nodes/rings/labels),
 * and the full interaction model (pointer drag/pan/hover-neighbor-highlight, wheel
 * zoom {passive:false}, Escape, the legend project-lens + tag toggle, zoom buttons,
 * node-tap → info panel). Only the SHELL is adapted:
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
 * DELIBERATE DEVIATION from the port (P22 — label focus): the original's
 * "quiet-label ladder" is gone. It faded EVERY doc title in once display zoom passed
 * ~1.35x fit, and lit up a whole neighborhood of titles on hover — the "wall of
 * titles". `labelTarget()` is now selection-driven: a title targets 1 only for the
 * SELECTED node and for the single hovered/dragged node (`currentFocus()`), never for
 * a neighborhood, and 0 otherwise — so at most one title is painted at rest. The
 * hovered term stays because the DOM tooltip is a low-zoom fallback only
 * (`updateTooltip()` bails above 0.6x zoom), so it cannot carry hover-to-identify.
 * Node dimming (`computeKeep`), halo/ring/edge activation, `drawLabel()` and the
 * tooltip are all untouched; the existing `n.la` easing still does the fade.
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
  /** R05 §4.6 / P28.S1 — doc nodes only; `/@{org}/{project}/{slug}` or null. */
  canonicalPath?: string | null;
  date?: string;
  project?: string;
  tags: string[];
  /** R05 §4.5.1 — `related`-edge count, the landmark ranking key. */
  rel: number;
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
  // ── R05 §2 — the seven engine-read tokens this round adds ──
  fitPad: number;
  fitBias: number;
  restoreTol: number;
  offmapMin: number;
  labelZoom: number;
  labelCap: number;
  labelCapSm: number;
  docsShown: number;
}

/**
 * R05 §4.2 — the persisted view record. `v` is the shape version: a record written
 * by an older engine (no `v`, or a different one) is ignored WHOLE and the map
 * fits, which is also how a tab open across this deploy heals itself. `w`/`h` are
 * the plate's measured px at capture and `n` the node count; a restore happens only
 * when all three still match (§4.2's table), so a view captured on a desktop plate
 * is never replayed into a phone one.
 */
const STORE_VERSION = 2;

interface StoredBlob {
  v?: number;
  w?: number;
  h?: number;
  n?: number;
  rest?: Record<string, [number, number]>;
  view?: { zt: number; pxt: number; pyt: number; auto: boolean };
  tagsVisible?: boolean;
  activeProject?: string | null;
  /** R05 §4.6 — the tag lens, mutually exclusive with the project lens. */
  activeTag?: string | null;
  selectedId?: string | null;
  /** R05 §4.3 — the legend's collapse, default true. */
  legendOpen?: boolean;
}

/**
 * `publicBase` (R05 §4.6) — the anonymous route the visitor is already on
 * (`/@{org}` for the pretty public graph, `/graph/{org}` for the legacy UUID one).
 * Member pages pass nothing, and `publicBase == null` is what "this is the member
 * map" means everywhere below.
 */
export function GraphCanvas({
  data,
  publicBase,
  projectIds,
}: {
  data: KbGraph;
  publicBase?: string;
  /**
   * R05 §6.3 — project mode's foot is drawn with `/documents?project={id}` and
   * `/projects/{id}`, and BOTH need a project UUID: the documents filter is
   * parsed as a UUID server-side, so a name would 422. `/app/graph`'s `projects`
   * carry only `{name, docs}`, so the member page supplies the map from the
   * `listProjects` call it can make in parallel — no new endpoint, and §4.4's
   * "no new fetch" still holds for the ROWS, which come from the payload. Absent
   * (or a name it does not know) simply drops that one link. Public pages pass
   * nothing: a stranger has no member foot at all.
   */
  projectIds?: Record<string, string>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const dock = dockRef.current;
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
    let schemeMql: MediaQueryList | null = null;

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
    /*
     * R05 §4.2 + the D26 off-frame defect. The shipped fit was
     * `FIT_PAD = 64` px on every side and `z = clamp(0.5, …, 1.5)`, and the FLOOR
     * is what put the operator's wires off the plate: measured on a corpus shaped
     * like theirs (33 docs / 100 tag hubs / 6 projects) the content rests
     * 1432 x 1866 world units, so a 1121 x 658 plate needs z = 0.284 and a
     * 322 x 416 phone plate needs z = 0.135 — both below the 0.5 floor, which the
     * clamp then RAISED, guaranteeing overflow that grows as the plate shortens.
     * The fixed 64px pad compounded it: on a 322px phone plate it ate 40% of the
     * width before a single node was drawn.
     *
     * So the pad is now `--kb-graph-fit-pad` (8% of the plate per side, §2's own
     * token, which is proportional by construction) and the floor is a degenerate
     * guard only. The CEILING stays: a two-node map should not be blown up to fill
     * a desktop plate, and 1.5 is the shipped value, unchanged.
     */
    const FIT_Z_FLOOR = 0.01,
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
        // R05 §2 — read through the SAME getComputedStyle as every other token.
        fitPad: pxf("--kb-graph-fit-pad", 0.08),
        fitBias: pxf("--kb-graph-fit-bias", 0.38),
        restoreTol: pxf("--kb-graph-restore-tol", 0.02),
        offmapMin: pxf("--kb-graph-offmap-min", 0.15),
        labelZoom: pxf("--kb-graph-label-zoom", 1.6),
        labelCap: pxf("--kb-graph-label-cap", 8),
        labelCapSm: pxf("--kb-graph-label-cap-sm", 4),
        docsShown: pxf("--kb-graph-docs-shown", 5),
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
    const elRecenter = host.querySelector<HTMLElement>(".kb-graph-recenter");
    const emptyDefaultHTML = elEmpty ? elEmpty.innerHTML : "";

    /**
     * R05 §4.8 — the plate's three states, all inside `.kb-graph-empty`, all with
     * the page frame intact above them. The map never borrows the page-level
     * editorial state.
     */
    function showEmpty(
      mode: "none" | "empty" | "load" | "failed",
      detail?: string,
    ) {
      if (!elEmpty) return;
      elEmpty.classList.remove("kb-graph-empty--load");
      if (mode === "none") {
        elEmpty.hidden = true;
        return;
      }
      if (mode === "empty") {
        // The designed block is already in the JSX; §4.8 adds one primary action.
        elEmpty.innerHTML =
          emptyDefaultHTML +
          '<div class="kb-graph-empty__actions">' +
          '<a class="kb-appbtn kb-appbtn--primary kb-appbtn--sm" href="/documents">' +
          esc(GRAPH.empty.action) +
          "</a></div>";
      } else if (mode === "load") {
        elEmpty.classList.add("kb-graph-empty--load");
        elEmpty.innerHTML =
          '<div class="kb-graph-skel"><span class="kb-graph-skel__dot"></span></div>' +
          // §5 keeps this one inline, beside the engine's other bilingual micro-copy.
          '<div class="kb-graph-empty__sub">Drawing the map · 지도를 그리는 중</div>';
      } else {
        elEmpty.innerHTML =
          '<div class="kb-graph-empty__title">' +
          esc(GRAPH.failed.title) +
          "</div>" +
          '<div class="kb-graph-empty__sub">' +
          esc(GRAPH.failed.sub) +
          "</div>" +
          '<div class="kb-graph-empty__actions">' +
          '<button class="kb-appbtn kb-appbtn--primary kb-appbtn--sm" type="button" data-graph-retry>' +
          esc(GRAPH.failed.retry) +
          "</button>" +
          '<a class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm" href="/documents">' +
          esc(GRAPH.failed.back) +
          "</a></div>" +
          (detail
            ? '<div class="kb-graph-empty__detail">' + esc(detail) + "</div>"
            : "");
        const retry = elEmpty.querySelector<HTMLElement>("[data-graph-retry]");
        if (retry)
          retry.addEventListener("click", () => window.location.reload());
      }
      elEmpty.hidden = false;
    }

    // ── state ──
    let nodes: GNode[] = [];
    let edges: GEdge[] = [];
    let nodeById: Record<string, GNode> = {};
    let adjacency: Record<string, Record<string, boolean>> = {};
    const projectInk: Record<string, number> = {};
    let activeProject: string | null = null;
    /** R05 §4.6 — the tag lens; mutually exclusive with `activeProject`. */
    let activeTag: string | null = null;
    /** R05 §4.3 — the legend body's collapse, persisted, default open. */
    let legendOpen = true;
    /** R05 §4.4 — which mode the panel is currently showing. */
    let panelMode: "none" | "node" | "project" = "none";
    /** R05 §4.5.1 — the always-labelled hub set, recomputed on payload + tier. */
    let landmarks: Record<string, boolean> = {};
    /** R05 §4.2 — the plate tier at the last fit; a crossing re-fits. */
    let plateTier: "sm" | "md" | "lg" | null = null;
    /** R05 §4.1.3 — the plate measured 0; the initial fit is still owed. */
    let firstFitPending = false;
    /** R05 §4.2 — the recenter pill is never evaluated on first paint. */
    let offMapArmed = false;
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
          // Doc nodes only; `tag`/`missing` never carry the key (P28.S1's note).
          canonicalPath: n.canonical_path ?? null,
          date: n.date,
          project: n.project,
          tags: n.tags || [],
          rel: 0,
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
        // R05 §4.5.1 — the landmark ranking key, counted once instead of by an
        // O(edges) scan per node per recompute.
        if (e.kind === "related") {
          if (nodeById[e.a]) nodeById[e.a].rel++;
          if (nodeById[e.b]) nodeById[e.b].rel++;
        }
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
          v: STORE_VERSION,
          // R05 §4.2 — the plate the view was CAPTURED at, and the node count it
          // was captured over. A restore is only legal when both still hold.
          w: W,
          h: H,
          n: nodes.length,
          rest,
          view: { zt: view.zt, pxt: view.pxt, pyt: view.pyt, auto: view.auto },
          tagsVisible,
          activeProject,
          activeTag,
          selectedId,
          legendOpen,
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
      // R05 §4.2 "Version mismatch — ignore the whole record and fit()". This is
      // also what heals a tab left open across a deploy: a v1 record has no `v`.
      if (blob.v !== STORE_VERSION) return null;

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
      if (typeof blob.legendOpen === "boolean") legendOpen = blob.legendOpen;
      activeProject =
        blob.activeProject != null && projectInk[blob.activeProject] != null
          ? blob.activeProject
          : null;
      // R05 §4.6 — the tag lens is mutually exclusive with the project lens, so a
      // record carrying both (impossible to write, but cheap to survive) keeps the
      // project one.
      activeTag =
        activeProject == null &&
        blob.activeTag != null &&
        nodeById["tag:" + blob.activeTag]
          ? blob.activeTag
          : null;
      return blob;
    }

    /**
     * R05 §4.2 — may the stored VIEW be replayed into the plate we have now? The
     * selection, the lens and the tag switch are restored either way; only the
     * camera is conditional, because a camera captured on a wide plate is exactly
     * what put the map off the frame on a narrow one.
     */
    function viewRestorable(blob: StoredBlob): boolean {
      if (!blob.view) return false;
      if (blob.n !== nodes.length) return false;
      if (!blob.w || !blob.h || !W || !H) return false;
      const tol = T.restoreTol;
      return (
        Math.abs(blob.w - W) / W <= tol && Math.abs(blob.h - H) / H <= tol
      );
    }
    /**
     * R05 §4.3 — the legend and the dock are two renderings of ONE state, so every
     * mutation goes through here rather than through whichever control was clicked.
     * A lens lit in the legend is lit in the dock.
     */
    function syncLegendUI() {
      const roots: HTMLElement[] = [];
      if (elLegend) roots.push(elLegend);
      if (dock) roots.push(dock);
      roots.forEach((root) => {
        root.querySelectorAll<HTMLElement>(".kb-graph-switch").forEach((sw) => {
          sw.classList.toggle("is-on", tagsVisible);
          sw.setAttribute("aria-pressed", tagsVisible ? "true" : "false");
        });
        root
          .querySelectorAll<HTMLElement>(
            ".kb-graph-legend__item, .kb-graph-dock__item[data-project]",
          )
          .forEach((b) => {
            const on = b.getAttribute("data-project") === activeProject;
            b.classList.toggle("is-on", on);
            // §6.5: the unlit siblings of a lit lens carry `is-off`.
            b.classList.toggle("is-off", activeProject != null && !on);
            if (b.tagName === "BUTTON" && b.hasAttribute("aria-pressed"))
              b.setAttribute("aria-pressed", on ? "true" : "false");
          });
      });
      if (elLegend) {
        const toggle = elLegend.querySelector<HTMLElement>(
          ".kb-graph-legend__toggle",
        );
        if (toggle)
          toggle.setAttribute("aria-expanded", legendOpen ? "true" : "false");
      }
      // The public panel's tag pills are the tag lens's only UI (§4.6).
      if (elPanel)
        elPanel.querySelectorAll<HTMLElement>("button.kb-tag").forEach((b) => {
          b.setAttribute(
            "aria-pressed",
            b.getAttribute("data-tag") === activeTag ? "true" : "false",
          );
        });
    }

    /**
     * R05 §4.4 / §4.6 — one entry point for both lenses, so "lighting one clears
     * the other" and the panel's second mode can never disagree with the map.
     */
    function setLens(kind: "project" | "tag", name: string | null) {
      if (kind === "project") {
        activeProject = name;
        if (name != null) activeTag = null;
      } else {
        activeTag = name;
        if (name != null) activeProject = null;
      }
      // No re-fit: a lens DIMS, it never hides, so the content extent is unchanged
      // (§4.2's table re-fits on the tag SWITCH, which does change it).
      syncLegendUI();
      scheduleDraw();
      persist();
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
        // R05 §4.2 — "a margin of `--kb-graph-fit-pad` (8%) of the plate on every
        // side", i.e. PROPORTIONAL: the usable box is (1 - 2 x pad) of the plate.
        const usable = Math.max(0, 1 - 2 * T.fitPad);
        z = Math.min((W * usable) / bw, (H * usable) / bh);
        if (!isFinite(z) || z <= 0) z = 1;
        // Ceiling only. See FIT_Z_FLOOR's note: the old floor was the D26 defect.
        z = Math.max(FIT_Z_FLOOR, Math.min(FIT_Z_MAX, z));
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
    /** R05 §0 — the plate tiers the overlays switch on: < 34rem · 34–52rem · >= 52rem. */
    function tierOf(widthPx: number): "sm" | "md" | "lg" {
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const w = widthPx / rem;
      return w < 34 ? "sm" : w < 52 ? "md" : "lg";
    }

    /**
     * R05 §4.5.1 — the always-on landmark labels: the top N doc nodes by
     * `related`-link count, N = `--kb-graph-label-cap` (8) on a medium or large
     * plate and `-cap-sm` (4) on a small one. Ties break by date, newest first, so
     * the set is stable across renders. Recomputed on payload change and on a tier
     * change — never per frame.
     */
    function computeLandmarks() {
      const cap = Math.max(
        0,
        Math.round(plateTier === "sm" ? T.labelCapSm : T.labelCap),
      );
      const docs = nodes.filter((n) => n.type === "doc");
      docs.sort((a, b) => {
        if (b.rel !== a.rel) return b.rel - a.rel;
        const da = a.date || "",
          db = b.date || "";
        if (da !== db) return da < db ? 1 : -1;
        return a.id < b.id ? -1 : 1;
      });
      landmarks = {};
      docs.slice(0, cap).forEach((n) => {
        landmarks[n.id] = true;
      });
    }

    /**
     * R05 §4.2 "Off-map" — the share of DOC nodes whose centre lies inside the
     * plate. Below `--kb-graph-offmap-min` the recenter pill appears; at or above
     * it, it hides. Never on first paint, because first paint always fits.
     */
    function updateOffMap() {
      if (!elRecenter) return;
      const docs = nodes.filter((n) => n.type === "doc" && !isHidden(n));
      if (!docs.length) {
        elRecenter.hidden = true;
        return;
      }
      let inside = 0;
      docs.forEach((n) => {
        const p = toScreen(n);
        if (p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H) inside++;
      });
      elRecenter.hidden = inside / docs.length >= T.offmapMin;
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
    /**
     * R05 §4.6 — the TAG lens: the same mechanism as the project lens, keyed on a
     * tag instead. Doc nodes carrying the tag keep full ink (and so does the tag's
     * own hub and their edges to it); everything else drops to `--kb-graph-dim`.
     */
    function tagKeep(tag: string): Record<string, boolean> {
      const keep: Record<string, boolean> = {};
      const hub = "tag:" + tag;
      if (nodeById[hub]) keep[hub] = true;
      nodes.forEach((n) => {
        if (n.type === "doc" && (n.tags || []).indexOf(tag) >= 0) keep[n.id] = true;
      });
      return keep;
    }
    function computeKeep(focus: string | null): Record<string, boolean> | null {
      if (focus) return neighborhood(focus);
      if (activeProject != null) return projectKeep(activeProject);
      if (activeTag != null) return tagKeep(activeTag);
      return null;
    }

    /*
     * ── labels ──
     * R05 §4.5 SUPERSEDES P22's selection-only rule, here and only here. P22's
     * rule stays as the base (the selected node and the single hovered/dragged
     * one), and the round adds three more label sources:
     *   1. landmarks — the top `--kb-graph-label-cap` docs by related-link count,
     *      always, so the map is readable before anyone touches it;
     *   2. zoom — above `--kb-graph-label-zoom` (1.6) EVERY doc node;
     *   3. tag hubs above display zoom 1.2, in `--kb-graph-label-muted`
     *      (`drawLabel`'s `muted` argument already keys off the node type);
     *      unresolved nodes label only on hover or selection.
     * §4.5.5: a dimmed node's label dims WITH it, which is why the old hard
     * `keep && !keep[n.id] -> 0` gate is gone — `frame()` already paints a label at
     * `n.al * n.la`, so the lens alpha carries through instead of erasing it.
     */
    function labelTarget(n: GNode, focus: string | null): number {
      if (n.id === selectedId || n.id === focus) return 1;
      const dz = displayZoom();
      if (n.type === "doc") {
        if (dz >= T.labelZoom) return 1;
        return landmarks[n.id] ? 1 : 0;
      }
      if (n.type === "tag") return dz >= 1.2 ? 1 : 0;
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
        const lT = labelTarget(n, focus);
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

      // R05 §4.2 "Off-map": evaluated once the camera has SETTLED, so an eased
      // zoom does not flash the pill on its way to a view that is perfectly fine.
      if (
        offMapArmed &&
        !settling &&
        !drag &&
        Math.abs(view.z - view.zt) < 1e-3 &&
        Math.abs(view.panX - view.pxt) < 0.5 &&
        Math.abs(view.panY - view.pyt) < 0.5
      )
        updateOffMap();
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
    /**
     * R05 §4.1 + §4.2's resize rows. Three behaviours the shipped `resize()` did
     * not have:
     *  - §4.1.3 a plate that measures 0 never fits; the initial fit is deferred to
     *    the first non-zero size (a hidden tab, a `display:none` ancestor, or the
     *    `(app)` route transition all produce one);
     *  - §4.2 a resize INSIDE a tier keeps the zoom and translates so the content
     *    centroid stays at the same fraction of the plate — re-fitting on every
     *    ResizeObserver callback is what made a window drag feel like a reset;
     *  - §4.2 a resize ACROSS a tier boundary (34rem / 52rem) re-fits, because the
     *    overlays have just changed shape underneath the map.
     */
    function resize() {
      const prevW = W,
        prevH = H;
      const rawW = host!.clientWidth,
        rawH = host!.clientHeight;
      W = rawW || 1;
      H = rawH || 1;
      dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";

      // §4.1.3 — never fit on a zero-sized plate; owe the fit instead.
      if (!rawW || !rawH) {
        firstFitPending = true;
        scheduleDraw();
        return;
      }

      const tier = tierOf(W);
      const tierChanged = plateTier !== null && tier !== plateTier;
      const first = plateTier === null || firstFitPending;
      plateTier = tier;
      if (first || tierChanged) computeLandmarks();

      if (first) {
        firstFitPending = false;
        if (view.auto) fit(true);
      } else if (view.auto) {
        // An auto view is a fitted view; keep it fitted, tier or no tier.
        fit(true);
      } else if (tierChanged) {
        view.auto = true;
        fit(true);
      } else if (prevW && prevH) {
        // §4.2 "Resize inside a tier": keep the zoom, hold the centroid at the
        // same fraction of the plate. The centroid sits at (W/2 + pan) today, so
        // the same fraction of the new plate is (W'/2 + pan') — i.e. the pan
        // scales with the plate, which is exactly the translation below.
        view.pxt *= W / prevW;
        view.pyt *= H / prevH;
        clampPan();
        view.panX = view.pxt;
        view.panY = view.pyt;
      }
      scheduleDraw();
      persist();
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

    /**
     * R05 §4.6 + the phase's `canonical_path` decision — the ONE read-link builder.
     * Member: `/documents/{id}`, unchanged. Public: the document's own pretty path
     * `/@{org}/{project}/{slug}`, falling back to `/documents/{id}` when the server
     * emitted `null` (a slug-less tenant, an empty project/slug, or a superseded
     * duplicate). `canonical_path` ALREADY starts with `/@{org}`, so `publicBase`
     * is never prefixed onto it — §4.6's literal `{publicBase}/documents/{id}` is
     * not a route this app has (`/@{org}/documents/{id}` resolves as project
     * "documents" and 404s), which the phase recorded rather than editing the
     * signed round.
     */
    function readHref(n: GNode): string {
      if (!publicBase) return resolveUrl(n.url);
      return n.canonicalPath || resolveUrl(n.url);
    }

    /**
     * R05 §4.6 — "If the payload does not distinguish public documents, treat every
     * node in a public payload as public". `/app/graph` carries no visibility field
     * (P28.S1 confirmed none was added), and the public endpoint already filters to
     * public projects, so this is `true` today for every node. The gate below is
     * built and correct; it lights the moment the payload gains a marker. Recorded
     * as a record gap rather than invented around.
     */
    function isPublicDoc(_n: GNode): boolean {
      return true;
    }

    /**
     * §6.4's gate. The `?next=` value is the document's own public read path, NOT
     * §6.4's literal `{publicBase}/documents/{id}` — same repair as `readHref`, for
     * the same reason: a `next` that 404s after login is not a return address.
     * `safeNextPath` (P28.S5) accepts exactly this shape: one leading slash, no
     * origin, no backslash.
     */
    function gateHref(n: GNode): string {
      return "/login?next=" + encodeURIComponent(readHref(n));
    }

    /** §4.6 — member tag pills are links; public ones are tag-lens buttons. */
    function tagPillsHTML(tags: string[]): string {
      if (!tags.length) return "";
      const pills = tags
        .map((t) =>
          publicBase
            ? '<li><button class="kb-tag" type="button" data-tag="' +
              esc(t) +
              '" aria-pressed="' +
              (activeTag === t ? "true" : "false") +
              '">' +
              esc(t) +
              "</button></li>"
            : '<li><a class="kb-tag" href="' +
              tagHref(t) +
              '">' +
              esc(t) +
              "</a></li>",
        )
        .join("");
      return '<ul class="kb-graph-panel__tags">' + pills + "</ul>";
    }

    /** Binds whatever interactive parts the freshly written panel HTML contains. */
    function bindPanel() {
      if (!elPanel) return;
      const closeBtn = elPanel.querySelector<HTMLElement>(".kb-graph-panel__close");
      if (closeBtn) closeBtn.addEventListener("click", deselect);
      elPanel.querySelectorAll<HTMLElement>("button.kb-tag").forEach((b) => {
        b.addEventListener("click", () => {
          const t = b.getAttribute("data-tag");
          setLens("tag", activeTag === t ? null : t);
        });
      });
    }

    /**
     * R05 §4.4 — the panel's project mode: the project's documents, newest first,
     * `--kb-graph-docs-shown` (5) of them, drawn from the graph payload the page
     * already has. No new endpoint and no new fetch. Ties break by title so the
     * list is stable. Counts are §4.4's: doc nodes in the project, and `related`
     * edges with BOTH ends in it.
     */
    function openProjectPanel(name: string) {
      if (!elPanel) return;
      elPanel.classList.remove("kb-graph-panel--ghost");
      elPanel.classList.add("kb-graph-panel--project");
      const ink = (projectInk[name] != null ? projectInk[name] : 0) + 1;
      const docs = nodes.filter((n) => n.type === "doc" && n.project === name);
      const inProject: Record<string, boolean> = {};
      docs.forEach((n) => {
        inProject[n.id] = true;
      });
      const links = edges.filter(
        (e) => e.kind === "related" && inProject[e.a] && inProject[e.b],
      ).length;
      const shown = docs
        .slice()
        .sort((a, b) => {
          const da = a.date || "",
            db = b.date || "";
          if (da !== db) return da < db ? 1 : -1;
          return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
        })
        .slice(0, Math.max(0, Math.round(T.docsShown)));

      const rows = shown
        .map(
          (n) =>
            '<li><a class="kb-graph-panel__doc" href="' +
            readHref(n) +
            '"><span class="kb-graph-panel__doctitle">' +
            esc(n.title) +
            '</span><span class="kb-graph-panel__docmeta">' +
            esc(n.date || "") +
            " · " +
            (n.tags || []).length +
            " tags</span></a></li>",
        )
        .join("");

      // §4.6 — the member foot opens the project; a stranger has no documents list
      // and no project route, so the round gives them no foot at all.
      const projectId = projectIds ? projectIds[name] : undefined;
      const foot = publicBase
        ? ""
        : '<div class="kb-graph-panel__foot">' +
          (projectId
            ? '<a class="kb-graph-panel__read" href="/documents?project=' +
              encodeURIComponent(projectId) +
              '">' +
              esc(GRAPH.project.all) +
              "</a>"
            : "") +
          (projectId
            ? '<a class="kb-graph-panel__read" href="/projects/' +
              encodeURIComponent(projectId) +
              '">' +
              esc(GRAPH.project.open) +
              "</a>"
            : "") +
          "</div>";

      elPanel.innerHTML =
        '<div class="kb-graph-panel__eyebrow"><span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' +
        ink +
        ')"></span>' +
        esc(GRAPH.project.eyebrow) +
        '<button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">' +
        closeGlyph() +
        "</button></div>" +
        '<h3 class="kb-graph-panel__title">' +
        esc(name) +
        "</h3>" +
        '<div class="kb-graph-panel__count">' +
        esc(
          GRAPH.project.count
            .replace("{docs}", String(docs.length))
            .replace("{links}", String(links)),
        ) +
        "</div>" +
        (rows
          ? '<ul class="kb-graph-panel__list">' + rows + "</ul>"
          : '<p class="kb-graph-panel__empty">' +
            esc(GRAPH.project.empty) +
            "</p>") +
        foot;
      elPanel.hidden = false;
      panelMode = "project";
      bindPanel();
    }

    function openPanel(n: GNode) {
      if (!elPanel) return;
      elPanel.classList.remove("kb-graph-panel--ghost");
      elPanel.classList.remove("kb-graph-panel--project");
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
        const tags = tagPillsHTML(n.tags || []);
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
          tags +
          // §4.6 — the read affordance, or §6.4's gate in its place.
          (isPublicDoc(n)
            ? '<a class="kb-graph-panel__read" href="' +
              readHref(n) +
              '">Read the document →</a>'
            : '<div class="kb-graph-panel__gate"><span>Members only · 비공개 문서</span>' +
              '<a href="' +
              gateHref(n) +
              '">Sign in to read →</a></div>');
      }
      elPanel.innerHTML = html;
      elPanel.hidden = false;
      panelMode = "node";
      bindPanel();
    }
    function closePanel() {
      if (elPanel) {
        elPanel.hidden = true;
        elPanel.innerHTML = "";
        elPanel.classList.remove("kb-graph-panel--project");
      }
      panelMode = "none";
    }
    function select(id: string) {
      selectedId = id;
      const n = nodeById[id];
      if (n && (n.type === "doc" || n.type === "missing")) {
        // §4.4 — selecting a node while a lens is lit switches the panel to node
        // mode and LEAVES the lens lit.
        openPanel(n);
        parkForSheet(n);
      } else closePanel();
      scheduleDraw();
      persist();
    }
    function deselect() {
      selectedId = null;
      // §4.4 — `Esc` (and the close button) closes the panel; the lens stays.
      closePanel();
      scheduleDraw();
      persist();
    }

    /**
     * R05 §4.7.1 — on a SMALL plate the panel is a bottom sheet, so a node selected
     * behind it would be invisible. Pan (never zoom) so the selected node sits at
     * `--kb-graph-fit-bias` (0.38) of the plate height, in the clear part above the
     * sheet. On a medium or large plate the panel floats beside the map and nothing
     * moves.
     */
    function parkForSheet(n: GNode) {
      if (plateTier !== "sm") return;
      const target = H * T.fitBias;
      const p = toScreen(n);
      view.pyt += target - p.y;
      view.auto = false;
      clampPan();
      if (reduceMotion) view.panY = view.pyt;
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
    /** §6.2's caret. */
    function caretGlyph(): string {
      return (
        '<svg class="kb-graph-legend__caret" width="12" height="12" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
      );
    }

    /**
     * R05 §4.3 — the legend's head is now a `<button aria-expanded>` and everything
     * it used to render sits in a `.kb-graph-legend__body` the CSS folds. The rows,
     * the rule, the tag row, the unresolved row and the note are UNCHANGED, and so
     * is their copy.
     */
    function buildLegend(
      projects: { name: string; docs: number }[],
      tagCount: number,
      ghostCount: number,
    ) {
      if (!elLegend) return;
      let rows = "";
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
      elLegend.innerHTML =
        '<button class="kb-graph-legend__toggle" type="button" aria-expanded="' +
        (legendOpen ? "true" : "false") +
        '">Projects · 프로젝트' +
        caretGlyph() +
        "</button>" +
        '<div class="kb-graph-legend__body">' +
        rows +
        "</div>";
      elLegend.hidden = false;

      const toggle = elLegend.querySelector<HTMLElement>(
        ".kb-graph-legend__toggle",
      );
      if (toggle)
        toggle.addEventListener("click", () => {
          legendOpen = !legendOpen;
          syncLegendUI();
          persist();
        });
      bindLensControls(elLegend);
    }

    /**
     * R05 §4.3 — the dock: the SAME control set, below the plate, at a thumb-sized
     * target. It is rendered always and CSS shows it only at `kbmain < 40rem`, and
     * both sets are bound to the same state through `setLens` / `syncLegendUI`, so
     * a lens lit in one is lit in the other. §6.5's markup, exactly.
     */
    function buildDock(
      projects: { name: string; docs: number }[],
      tagCount: number,
      ghostCount: number,
    ) {
      if (!dock) return;
      let html = '<div class="kb-graph-dock__scroll">';
      projects.forEach((p, i) => {
        const ink = (i % 3) + 1;
        html +=
          '<button class="kb-graph-dock__item" type="button" data-project="' +
          esc(p.name) +
          '" aria-pressed="false">' +
          '<span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-' +
          ink +
          ')"></span>' +
          esc(p.name) +
          '<span class="kb-graph-legend__count">' +
          (p.docs || 0) +
          "</span></button>";
      });
      html +=
        '<span class="kb-graph-dock__item">' +
        '<span class="kb-graph-legend__chip kb-graph-legend__chip--ring"></span>Tags · 태그' +
        '<span class="kb-graph-legend__count">' +
        tagCount +
        "</span>" +
        '<button class="kb-graph-switch is-on" type="button" data-switch="tags" ' +
        'aria-label="Toggle tag visibility" aria-pressed="true"></button></span>';
      if (ghostCount > 0) {
        html +=
          '<span class="kb-graph-dock__item">' +
          '<span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>Unresolved' +
          '<span class="kb-graph-legend__count">' +
          ghostCount +
          "</span></span>";
      }
      html +=
        '</div><p class="kb-graph-dock__note">Size = connections · 크기=연결 수</p>';
      dock.innerHTML = html;
      dock.hidden = false;
      bindLensControls(dock);
    }

    /** One binding for both control sets — §4.3's "bound to the same state". */
    function bindLensControls(root: HTMLElement) {
      root
        .querySelectorAll<HTMLElement>(
          ".kb-graph-legend__item, .kb-graph-dock__item[data-project]",
        )
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const name = btn.getAttribute("data-project");
            if (activeProject === name) {
              // §4.4 — the lit control: in project mode it turns the lens off and
              // closes the panel; in node mode it brings project mode BACK.
              if (panelMode === "project") {
                setLens("project", null);
                closePanel();
              } else {
                openProjectPanel(name!);
              }
            } else {
              setLens("project", name);
              if (name) openProjectPanel(name);
            }
            scheduleDraw();
            persist();
          });
        });
      root.querySelectorAll<HTMLElement>(".kb-graph-switch").forEach((sw) => {
        sw.addEventListener("click", () => {
          tagsVisible = !tagsVisible;
          syncLegendUI();
          if (view.auto) fit(true);
          scheduleDraw();
          persist();
        });
      });
    }

    /**
     * R05 §4.2 / §6.6 — the recenter pill. Its button calls the SAME `fit()` the
     * zoom stack's third button calls; there is one Fit in the engine.
     */
    function fitNow() {
      view.auto = true;
      fit(reduceMotion);
      scheduleDraw();
      persist();
    }
    function buildRecenter() {
      if (!elRecenter) return;
      elRecenter.innerHTML =
        // §5 keeps this bilingual pair inline with the engine's other micro-copy.
        "Off the map · 지도 밖입니다" +
        '<button type="button" class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm">Fit</button>';
      elRecenter.hidden = true;
      const btn = elRecenter.querySelector<HTMLElement>("button");
      if (btn) btn.addEventListener("click", fitNow);
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
          else fitNow();
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
    function rereadScheme() {
      T = readTokens();
      scheduleDraw();
    }
    function observeScheme() {
      /*
       * R05 §4.9 — the only engine change the dark round needs. `graph-r5.css` §7
       * re-declares the slate graph set on `.kb-app[data-kb-scheme="auto"]` inside
       * `@media (prefers-color-scheme: dark)`, and that media query flips with the
       * OS while the tab is open — but no ATTRIBUTE changes, so the existing
       * MutationObserver never fires and the map keeps the light inks in a dark
       * console. `matchMedia` on the same query, feeding the same re-read, is what
       * makes it re-ink.
       */
      if (window.matchMedia) {
        schemeMql = window.matchMedia("(prefers-color-scheme: dark)");
        if (schemeMql.addEventListener)
          schemeMql.addEventListener("change", rereadScheme);
        else if (schemeMql.addListener) schemeMql.addListener(rereadScheme);
      }
      if (!window.MutationObserver) return;
      schemeObs = new MutationObserver(rereadScheme);
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

      /*
       * R05 §4.1.2 — size the canvas BEFORE the early return. The shipped order
       * called `showEmpty("empty")` and returned before `resize()` had ever run,
       * so a plate that later received data painted into a zero-sized backing
       * store. The ResizeObserver registration moves up with it, for the same
       * reason: an empty plate that is resized (or first measured) must still be
       * correctly sized when data arrives.
       */
      resize();
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => resize());
        ro.observe(host!);
      } else {
        window.addEventListener("resize", resize);
      }
      window.addEventListener("pagehide", flushPersist);

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
      buildDock(projects, tagCount, ghostCount);
      buildZoom();
      buildRecenter();
      bindInteractions();
      observeScheme();
      syncLegendUI();

      if (document.fonts && document.fonts.ready)
        document.fonts.ready.then(() => {
          if (disposed) return;
          scheduleDraw();
        });

      if (restored) {
        /*
         * R05 §4.2, "First paint, stored record": the camera is replayed ONLY into
         * a plate of the size it was captured in (within `--kb-graph-restore-tol`)
         * and over the same node count. Otherwise the stored VIEW is ignored and
         * the map fits — the selection, the lens and the tag switch are restored
         * either way, which `restoreState()` has already done. This is the row
         * that makes "narrow the window past 52rem and reload → the map fits
         * instead of restoring" true (acceptance check 6), and it is the reason a
         * desktop camera can no longer be replayed onto a phone plate.
         */
        fit(true);
        const canRestore = viewRestorable(restored);
        if (
          canRestore &&
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
        const sel = restored.selectedId;
        if (sel && nodeById[sel]) {
          selectedId = sel;
          const n = nodeById[sel];
          if (n.type === "doc" || n.type === "missing") {
            openPanel(n);
            // Do not fight a camera we just replayed; park only into a fresh fit.
            if (!canRestore) parkForSheet(n);
          }
        } else if (activeProject != null) {
          // §4.4 — a lens that survives the reload brings its panel back with it.
          openProjectPanel(activeProject);
        }
        syncLegendUI();
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
      // §4.2 — "Never show it on first paint": the pill is only evaluated once the
      // first fit is behind us.
      offMapArmed = true;
    }

    /*
     * R05 §4.8's FAILED row is written for an engine that fetches its own payload;
     * this one receives `data` as a prop from a server component, so "the fetch
     * rejects" is caught by the route's error boundary long before the engine
     * runs, and §9's collected-edits table says `graph/page.tsx` does not change.
     * What CAN still fail here is the model build over a malformed payload, and
     * that is exactly the case §4.8 wants kept out of the page-level editorial
     * state: the plate reports it, the page frame stays.
     */
    try {
      start(data);
    } catch (err) {
      showEmpty(
        "failed",
        "GET /app/graph · " + (err instanceof Error ? err.name : "error"),
      );
    }

    // ── teardown (the critical React-specific work) ──
    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (drawRafId) cancelAnimationFrame(drawRafId);
      if (ro) ro.disconnect();
      if (schemeObs) schemeObs.disconnect();
      if (schemeMql) {
        if (schemeMql.removeEventListener)
          schemeMql.removeEventListener("change", rereadScheme);
        else if (schemeMql.removeListener)
          schemeMql.removeListener(rereadScheme);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("pagehide", flushPersist);
      host.removeEventListener("keydown", onKeyDown);
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
    };
  }, [data, publicBase, projectIds]);

  return (
    <>
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
        {/* R05 §6.6 — the off-map recenter pill; the engine fills and reveals it. */}
        <div className="kb-graph-recenter" hidden />
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
      {/*
        R05 §4.3 / §6.5 — the dock is a SIBLING of the plate, in the page flow, so
        the reading order is map → controls (§7). It is rendered at every width and
        CSS reveals it only at `kbmain < 40rem`; the engine fills it with the same
        control set the legend carries, bound to the same state.
      */}
      <div ref={dockRef} className="kb-graph-dock" hidden />
    </>
  );
}
