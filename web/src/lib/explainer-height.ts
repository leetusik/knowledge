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
 * Two things the measured behaviour of a sandboxed frame forced:
 *   - the debounce is a `setTimeout`, NOT `requestAnimationFrame`. Chrome does not
 *     run rAF callbacks in an opaque-origin frame like this one — `DOMContentLoaded`
 *     and `load` fire, rAF never does — so an rAF debounce silently reports nothing
 *     and every explainer keeps the CSS fallback height;
 *   - `budget` latches a runaway. Nothing the `explain` template emits can trigger it,
 *     but a document whose content height depends on the VIEWPORT height (a `100vh`
 *     block, `html { height: 100% }`) grows every time the parent applies the number
 *     we sent. The clamp on the parent bounds it; this stops the thrash getting there.
 *
 * The `kb-explainer-request` handler is the other half of that dedupe's cost: `last`
 * makes a height message that nobody was listening for unrecoverable, so a parent that
 * hydrated late gets one chance to ask again. It resets `last` (never `budget` — a
 * runaway stays latched) so the answer goes out even though the height has not
 * changed, and it is the ONLY trigger that bypasses the dedupe; every other one
 * (load, resize, ResizeObserver, fonts) still needs a real ≥2px change, which is what
 * keeps a parent→child→parent feedback loop impossible.
 */
const REPORTER = `
(function () {
  if (window.parent === window) return;
  var last = -1, queued = false, budget = 300;
  function px(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function measure() {
    var b = document.body;
    if (!b) return 0;
    var s = window.getComputedStyle(b);
    return Math.ceil(
      Math.max(b.scrollHeight, b.offsetHeight) + px(s.marginTop) + px(s.marginBottom)
    );
  }
  function post() {
    queued = false;
    if (budget <= 0) return;
    var h = measure();
    if (h > 0 && Math.abs(h - last) >= 2) {
      budget--;
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
    schedule();
  });
  if (window.ResizeObserver && document.body) {
    new ResizeObserver(schedule).observe(document.body);
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
