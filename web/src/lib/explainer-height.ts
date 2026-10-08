/**
 * The explainer height handshake — CHILD half.
 *
 * An HTML explainer is framed in a sandboxed OPAQUE-ORIGIN iframe (`allow-scripts`
 * without `allow-same-origin` — P16 pinned decision 1), so the parent can never read
 * the framed document's `scrollHeight` and size the frame itself. The frame's height
 * therefore has to be reported outward by the child, and the only channel an opaque
 * origin has is `postMessage`.
 *
 * The reporter below is injected into the relayed HTML by the BFF raw route rather
 * than authored into the `explain` skill's template: injection fixes every explainer
 * ALREADY saved (none of them carry a reporter) and keeps the three parity-guarded
 * `SKILL.md` copies untouched.
 *
 * It changes no privilege. The pinned CSP (`sandbox allow-scripts;
 * frame-ancestors 'self'`) carries no `script-src`, so an inline script is permitted
 * and already expected — the quiz JS is inline too. The script only posts numbers
 * outward; the parent (`explainer-frame.tsx`) validates the sender, the shape, and
 * clamps the value, so a hostile document can do no more than mis-size its own frame.
 *
 * Two messages travel parent-ward:
 *   - `kb-explainer-height` — the document's content height, so the frame can grow to
 *     it and the PAGE does the scrolling instead of the frame.
 *   - `kb-explainer-anchor` — a "Contents" link's target offset. A content-height
 *     frame has nothing left to scroll, so in-page anchors would otherwise be inert;
 *     the parent scrolls the real page to them instead.
 *
 * One travels child-ward:
 *   - `kb-explainer-request` — "re-send your height". The frame's `src` sits in the
 *     SSR HTML, so the child can load and post its first height BEFORE the parent
 *     island hydrates and attaches its listener; since the reporter dedupes
 *     (`last`), that missed first message would otherwise never be repeated and the
 *     frame would keep its CSS fallback height forever. The parent therefore asks
 *     again as soon as it can listen, and the reporter answers with the dedupe
 *     bypassed. Reproduced under CPU throttling on every article view before this
 *     existed (P25.F4).
 */

/** Marker the raw-route tests assert on, and a grep handle in a served document. */
export const HEIGHT_REPORTER_MARKER = "kb-explainer-height";

/**
 * The injected reporter, as source text.
 *
 * Measurement is deliberately VIEWPORT-INDEPENDENT: `documentElement.scrollHeight` is
 * floored by the frame's own height, so measuring it would ratchet — the parent grows
 * the frame, the taller frame reports the taller viewport, and the frame never shrinks
 * back. Body's own box has no such floor. Its margins (the template's
 * `body { margin: 2rem auto }`) collapse out of that box, so they are added back
 * explicitly rather than inferred.
 *
 * The box is read FRACTIONALLY (`getBoundingClientRect().height`) and the sum is
 * rounded UP once, at the end. `offsetHeight` and `scrollHeight` are integer-rounded,
 * so a body of 13,200.4766px read through them reports up to 0.5px LESS than the
 * content. At DPR 1 Chrome snaps that half-pixel away; at DPR 2 (a retina Mac) it
 * leaves a real 0.5px scroll range inside a correctly measured frame, which a classic
 * scrollbar draws as a full-height thumb and a wheel gesture can latch onto (P28.S10,
 * reading I; fixed in P28.F2). `scrollHeight` stays in the `max` for content that
 * overflows the body's own box.
 *
 * The root's HORIZONTAL SCROLLBAR is added on top: `innerHeight − clientHeight` of the
 * root (`documentElement`; `body` in quirks mode, where the spec moves the viewport
 * there). It is 0 with overlay scrollbars and 0 when nothing overflows sideways. When
 * scrollbars take layout space (Windows Chrome; a Mac set to "always show") and the
 * document is wider than its frame (a wide table or `pre`, a frame narrowed by a
 * side-docked DevTools), that bar sits inside the frame and eats ~15px of its height,
 * which left a 14px VERTICAL inner scroll range the wheel latched onto while the page
 * stayed put (P28.REVIEW, finding 1; fixed in P28.F3). The sideways scroll itself is
 * legitimate content behaviour and is left alone. The term cannot ratchet: whether the
 * bar exists depends on the frame's WIDTH, not its height. The one coupling — a
 * vertical bar narrowing the viewport just enough to overflow it — settles in two
 * posts (+bar, then −bar once the taller frame drops the vertical bar), never a loop.
 * A bar that APPEARS at a constant width without the body box changing (content wider
 * than a fixed-width body) is caught because the vertical bar it forces narrows the
 * root, so the `ResizeObserver` watches `documentElement` as well as `body`. One that
 * DISAPPEARS that way fires nothing at all; the frame is then up to one bar too tall —
 * blank space, never a scroll range — until the next trigger.
 *
 * Three things the measured behaviour of a sandboxed frame forced:
 *   - the debounce is a `setTimeout`, NOT `requestAnimationFrame`. A frame that is
 *     not being rendered — a hidden or background tab, an offscreen frame — runs no
 *     rAF callbacks at all, while timers still fire, so an rAF debounce would report
 *     nothing there. (In a visible tab the frame does run rAF — measured at P28.S10;
 *     the original P25 note that Chrome "never" runs it here was environment-bound.)
 *   - `budget` latches a runaway, and it is a budget PER VIEWPORT WIDTH. Nothing the
 *     `explain` template emits can trigger a runaway, but a document whose content
 *     height depends on the VIEWPORT height (a `100vh` block, `html { height: 100% }`)
 *     grows every time the parent applies the number we sent. That thrash happens at
 *     a CONSTANT width, so `budget` (300 posts) stops it there; the parent's clamp
 *     bounds it too. Legitimate reflow is the opposite case — it always arrives with
 *     a new width (a window drag, a side-docked DevTools splitter, a rail toggle) — so
 *     a width change re-arms the budget. Until P28.F2 the budget was for the frame's
 *     whole lifetime: ~5s of dragging below the body's measure spent it, and every
 *     later width change left the frame at a stale height, scrolling the document
 *     inside its own box until a reload (P28.S10, reading G).
 *   - a frame that has not been laid out yet (`innerWidth`/`innerHeight` 0 — seen on
 *     cold loads under CPU throttling and on client-side navigations) measures junk:
 *     margins only (64) or an unwrapped body (90,820). Nothing is posted from a 0×0
 *     viewport and no state is touched; `resize`, the `ResizeObserver` and `load`
 *     fire again once the frame has a size.
 *
 * The `kb-explainer-request` handler is the other half of that dedupe's cost: `last`
 * makes a height message that nobody was listening for unrecoverable, so a parent that
 * hydrated late gets one chance to ask again. It resets `last` so the answer goes out
 * even though the height has not changed, and it is the ONLY trigger that bypasses the
 * dedupe. Every other one (load, resize, ResizeObserver, fonts) posts any GROWTH, even
 * of 1px — a frame left 1px short is a 1px inner scroll range (P28.F3; until then every
 * change under 2px was dropped) — but a SHRINK only of 2px or more. Since a sub-2px
 * change can only ever move the frame up, a parent→child→parent oscillation between two
 * nearly equal heights is impossible, and a 1px-per-post creep is a runaway like any
 * other: viewport-dependent content, latched by the per-width budget. It also
 * grants exactly ONE post when the budget is spent — an un-wedge lever for the parent —
 * but never refills the budget: the parent asks at most twice per mount, so a runaway
 * stays bounded.
 */
const REPORTER = `
(function () {
  if (window.parent === window) return;
  var BUDGET = 300;
  var last = -1, lastW = -1, queued = false, budget = BUDGET, grant = false;
  function px(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function measure() {
    var b = document.body;
    if (!b) return 0;
    var s = window.getComputedStyle(b);
    var root = document.compatMode === 'BackCompat' ? b : document.documentElement;
    var bar = root ? Math.max(0, window.innerHeight - root.clientHeight) : 0;
    return Math.ceil(
      Math.max(b.getBoundingClientRect().height, b.scrollHeight) +
        px(s.marginTop) + px(s.marginBottom)
    ) + bar;
  }
  function post() {
    queued = false;
    var w = window.innerWidth, vh = window.innerHeight;
    if (!(w > 0) || !(vh > 0)) return;
    if (w !== lastW) { lastW = w; budget = BUDGET; }
    if (budget <= 0 && !grant) return;
    var h = measure();
    if (h > 0 && (h > last || last - h >= 2)) {
      if (budget > 0) budget--;
      grant = false;
      last = h;
      window.parent.postMessage({ type: 'kb-explainer-height', height: h }, '*');
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(post, 16);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || typeof d !== 'object' || d.type !== 'kb-explainer-request') return;
    last = -1;
    grant = true;
    schedule();
  });
  if (window.ResizeObserver && document.body) {
    var ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    if (document.documentElement) ro.observe(document.documentElement);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule).catch(function () {});
  }
  function offsetOf(el) {
    return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
  }
  function jump(el) {
    window.parent.postMessage({ type: 'kb-explainer-anchor', top: offsetOf(el) }, '*');
  }
  function target(hash) {
    var id = (hash || '').replace(/^#/, '');
    if (!id) return null;
    try { id = decodeURIComponent(id); } catch (e) {}
    return document.getElementById(id) || document.getElementsByName(id)[0] || null;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var node = e.target;
    var a = node && node.closest ? node.closest('a[href^="#"]') : null;
    if (!a) return;
    var el = target(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    jump(el);
  }, true);
  window.addEventListener('hashchange', function () {
    var el = target(window.location.hash);
    if (el) jump(el);
  });
})();
`;

const SCRIPT_TAG = `<script>${REPORTER}</script>`;

const BODY_CLOSE = /<\/body\s*>/gi;

/**
 * Splice the height reporter into a relayed explainer document.
 *
 * It goes before the LAST `</body>` so it runs after the document's own inline
 * script has wired the quiz, and so a `</body>` quoted inside a `<pre>` (an explainer
 * about HTML is not hypothetical) is not mistaken for the real one. A document with no
 * `</body>` at all gets the script appended, which parsers hoist into the body just
 * the same.
 *
 * A literal slice rather than `String.replace`: the replacement form would interpret
 * `$&`/`` $` ``/`$1` inside the script source, so the day someone puts a `$` in the
 * reporter it would silently corrupt every served document.
 */
export function injectHeightReporter(html: string): string {
  let at = -1;
  for (const match of html.matchAll(BODY_CLOSE)) at = match.index;
  if (at < 0) return html + SCRIPT_TAG;
  return html.slice(0, at) + SCRIPT_TAG + html.slice(at);
}
