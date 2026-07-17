"use client";

import { useEffect, useRef } from "react";

import { GRAPH_MOTIF, type MotifInk, type MotifNode } from "@/content/marketing";

// GraphMotif — a FAITHFUL STATIC render of the knowledge graph for the landing.
// It reuses the app renderer's drawing grammar (graph-canvas.tsx): the same
// node / cutout-rim / hollow-tag-ring / dashed-ghost / related-arrow / focus-halo
// / offset-selection-ring / haloed-label vocabulary and the same live token read
// (getComputedStyle of the scheme-resolved --mkt-* inks) — but posed to the ONE
// designed composition instead of a force sim. No animation, no interaction, no
// persistence; it draws once and redraws on resize + scheme change. The floating
// info panel + bottom-left legend are JSX overlays (see feature-graph.tsx).

interface Tokens {
  inkTeal: string;
  inkBronze: string;
  inkPlum: string;
  edge: string;
  edgeActive: string;
  tag: string;
  ghost: string;
  focus: string;
  halo: string;
  label: string;
  labelMuted: string;
  outline: string;
  font: string;
}

const FIT_PAD = 30; // world padding around the composition (screen px)
const DIM_ALPHA = 0.42;

export function GraphMotif() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, edges } = GRAPH_MOTIF;
    const byId: Record<string, MotifNode> = {};
    nodes.forEach((n) => (byId[n.id] = n));

    let disposed = false;
    let W = 0;
    let H = 0;
    let scale = 1;
    let ox = 0;
    let oy = 0;

    function readTokens(): Tokens {
      const cs = getComputedStyle(host!);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      return {
        inkTeal: v("--mkt-ink-teal") || "#0f6f66",
        inkBronze: v("--mkt-ink-bronze") || "#8a6a2a",
        inkPlum: v("--mkt-ink-plum") || "#764f6c",
        edge: v("--mkt-graph-edge") || "#7c7362",
        edgeActive: v("--mkt-graph-edge-active") || "#0f6f66",
        tag: v("--mkt-graph-tag") || "#5c5347",
        ghost: v("--mkt-graph-ghost") || "#7f7666",
        focus: v("--mkt-graph-focus") || "#0a544e",
        halo: v("--mkt-graph-halo") || "rgba(15,111,102,.22)",
        label: v("--mkt-graph-label") || "#26211c",
        labelMuted: v("--mkt-graph-label-muted") || "#5c5347",
        outline: v("--mkt-graph-outline") || "#efe9db",
        font: v("--font-source") || "sans-serif",
      };
    }

    function inkOf(t: Tokens, ink?: MotifInk): string {
      return ink === "bronze" ? t.inkBronze : ink === "plum" ? t.inkPlum : t.inkTeal;
    }

    function fit() {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      nodes.forEach((n) => {
        minX = Math.min(minX, n.x - n.r);
        maxX = Math.max(maxX, n.x + n.r);
        minY = Math.min(minY, n.y - n.r);
        maxY = Math.max(maxY, n.y + n.r);
      });
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);
      scale = Math.min((W - 2 * FIT_PAD) / bw, (H - 2 * FIT_PAD) / bh);
      if (!isFinite(scale) || scale <= 0) scale = 1;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      ox = W / 2 - cx * scale;
      oy = H / 2 - cy * scale;
    }

    const sx = (n: MotifNode) => n.x * scale + ox;
    const sy = (n: MotifNode) => n.y * scale + oy;

    function draw() {
      if (disposed) return;
      const t = readTokens();
      const dpr = window.devicePixelRatio || 1;
      W = host!.clientWidth || 1;
      H = host!.clientHeight || 1;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      fit();

      // Edges — dim first, then the active teal neighborhood (with arrowheads).
      edges.forEach((e) => {
        if (e.active) return;
        drawEdge(t, e.a, e.b, false, e.ghost, DIM_ALPHA);
      });
      edges.forEach((e) => {
        if (!e.active) return;
        drawEdge(t, e.a, e.b, true, e.ghost, 1);
      });

      // Focus halo behind the selected node.
      const focus = nodes.find((n) => n.focus);
      if (focus) drawHalo(t, focus);

      // Nodes — dim, then the neighborhood.
      nodes.forEach((n) => n.dim && drawNode(t, n, DIM_ALPHA));
      nodes.forEach((n) => !n.dim && drawNode(t, n, 1));

      // Offset selection ring on the focus doc.
      if (focus) drawRing(t, focus);

      // Labels — the focused neighborhood only (quiet map).
      nodes.forEach((n) => {
        if (n.dim || !n.label) return;
        drawLabel(t, n, n.type !== "doc");
      });
    }

    function drawEdge(
      t: Tokens,
      aId: string,
      bId: string,
      active: boolean,
      ghost: boolean | undefined,
      alpha: number,
    ) {
      const A = byId[aId];
      const B = byId[bId];
      if (!A || !B) return;
      const c = ctx!;
      const ax = sx(A),
        ay = sy(A),
        bx = sx(B),
        by = sy(B);
      const dx = bx - ax,
        dy = by - ay;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d,
        uy = dy / d;
      const rA = A.r * scale,
        rB = B.r * scale;
      const arrow = 5 * scale;
      const gap = active ? 3 * scale + arrow : 1;
      const x1 = ax + ux * rA,
        y1 = ay + uy * rA;
      const x2 = bx - ux * (rB + gap),
        y2 = by - uy * (rB + gap);

      c.globalAlpha = alpha;
      c.strokeStyle = active ? t.edgeActive : t.edge;
      c.lineWidth = (active ? 1.75 : 1) * scale;
      c.setLineDash(ghost ? [4 * scale, 4 * scale] : []);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      c.setLineDash([]);

      if (active) {
        const tipX = bx - ux * (rB + 3 * scale),
          tipY = by - uy * (rB + 3 * scale);
        const baseX = tipX - ux * arrow,
          baseY = tipY - uy * arrow;
        const wx = -uy * arrow * 0.48,
          wy = ux * arrow * 0.48;
        c.fillStyle = t.edgeActive;
        c.beginPath();
        c.moveTo(tipX, tipY);
        c.lineTo(baseX + wx, baseY + wy);
        c.lineTo(baseX - wx, baseY - wy);
        c.closePath();
        c.fill();
      }
      c.globalAlpha = 1;
    }

    function drawHalo(t: Tokens, n: MotifNode) {
      const c = ctx!;
      const px = sx(n),
        py = sy(n);
      const r = n.r * scale;
      const R = r + 8 * 1.9 * scale;
      const grad = c.createRadialGradient(px, py, Math.max(1, r * 0.5), px, py, R);
      grad.addColorStop(0, t.halo);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(px, py, R, 0, Math.PI * 2);
      c.fill();
    }

    function drawNode(t: Tokens, n: MotifNode, alpha: number) {
      const c = ctx!;
      const px = sx(n),
        py = sy(n);
      const r = n.r * scale;
      c.globalAlpha = alpha;
      c.setLineDash([]);
      if (n.type === "doc") {
        c.fillStyle = inkOf(t, n.ink);
        c.beginPath();
        c.arc(px, py, r, 0, Math.PI * 2);
        c.fill();
        // cutout rim (reads the node off the plate)
        c.strokeStyle = t.outline;
        c.lineWidth = 1.5 * scale;
        c.beginPath();
        c.arc(px, py, r + (1.5 * scale) / 2, 0, Math.PI * 2);
        c.stroke();
      } else {
        // hollow: fill with the plate, then stroke the ring
        c.fillStyle = t.outline;
        c.beginPath();
        c.arc(px, py, r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = n.type === "ghost" ? t.ghost : t.tag;
        c.lineWidth = 1.5 * scale;
        if (n.type === "ghost") c.setLineDash([4 * scale, 4 * scale]);
        c.beginPath();
        c.arc(px, py, r, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
      }
      c.globalAlpha = 1;
    }

    function drawRing(t: Tokens, n: MotifNode) {
      const c = ctx!;
      const px = sx(n),
        py = sy(n);
      const r = n.r * scale;
      c.strokeStyle = t.focus;
      c.lineWidth = 2 * scale;
      c.beginPath();
      c.arc(px, py, r + (2 + 1 + 1.5) * scale, 0, Math.PI * 2);
      c.stroke();
    }

    function drawLabel(t: Tokens, n: MotifNode, muted: boolean) {
      if (!n.label) return;
      const c = ctx!;
      const px = sx(n),
        py = sy(n);
      const r = n.r * scale;
      const size = (n.type === "doc" ? 12.5 : 11) * Math.max(0.85, Math.min(1.2, scale));
      c.font = (n.type === "doc" ? "500 " : "400 ") + size + "px " + t.font;
      c.textAlign = "center";
      c.textBaseline = "top";
      const y = py + r + 6 * scale;
      c.lineJoin = "round";
      c.strokeStyle = t.outline;
      c.lineWidth = 3;
      c.strokeText(n.label, px, y);
      c.fillStyle = muted ? t.labelMuted : t.label;
      c.fillText(n.label, px, y);
    }

    draw();

    let ro: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => draw());
      ro.observe(host);
    } else {
      window.addEventListener("resize", draw);
    }

    let schemeObs: MutationObserver | null = null;
    if (window.MutationObserver) {
      schemeObs = new MutationObserver(() => draw());
      const opts = {
        attributes: true,
        attributeFilter: ["data-md-color-scheme"],
      };
      schemeObs.observe(document.documentElement, opts);
      const scoped = host.closest("[data-md-color-scheme]");
      if (scoped) schemeObs.observe(scoped, opts);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) draw();
      });
    }

    return () => {
      disposed = true;
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", draw);
      if (schemeObs) schemeObs.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="mkt-graph-canvas" aria-hidden />
    </div>
  );
}
