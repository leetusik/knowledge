/**
 * P30.S25 — the legacy bridge (`09-legacy-and-print` *The bridge (S2)*; P29 *Legacy
 * path*): the one script the raw relays splice into a relayed html explainer, in place of
 * the retired height reporter. About 1 KB, and it does exactly three things:
 *
 *  1. it posts `{kb: "legacy", v: 1, type: "scroll", fraction, anchor}`, throttled, where
 *     `anchor` is the id of the nearest preceding `h2`/`h3` (the drawn rule) and
 *     `fraction` is how far through the document it is (1 when it cannot scroll). The
 *     first post waits for the document's `load`: measured while the frame is still
 *     being laid out, a long document can read as "cannot scroll" (1, the end), which
 *     would finish a member's chapter on open (found live);
 *  2. it honours the parent's `{type: "restore", anchor?, fraction?}`: by anchor when the
 *     document has that id, else by fraction; then it posts where it landed;
 *  3. it intercepts link clicks: an `http(s)` link to another host opens a new tab with
 *     `noopener`; a link to this host posts `{type: "navigate", href}` (path, query and
 *     hash) for the parent to validate and route; an `#anchor` link stays in the frame.
 *
 * It grants the document nothing. It runs inside the same sandbox as the document's own
 * inline script (the relay's CSP has no `script-src`), it accepts messages only from
 * `window.parent`, and the parent judges everything it sends (`./messages.ts`). Opened
 * top-level (Print · new tab), it does nothing. Outbound `targetOrigin` is `"*"`: the
 * parent's origin cannot be named from an opaque origin, and nothing it posts is secret.
 */

/** A grep handle in a served document, and what the relay tests assert on. */
export const LEGACY_BRIDGE_MARKER = "kb-legacy-bridge";

const BRIDGE = `(function(){var P=window.parent;if(!P||P===window)return;var E=document.scrollingElement||document.documentElement,t=0;
function post(m){m.kb="legacy";m.v=1;try{P.postMessage(m,"*")}catch(x){}}
function max(){return E.scrollHeight-window.innerHeight}
function frac(){var m=max();return m>1?Math.min(1,Math.max(0,E.scrollTop/m)):1}
function anchor(){var a=null,h=document.querySelectorAll("h2[id],h3[id]");for(var i=0;i<h.length;i++){if(h[i].getBoundingClientRect().top<=24)a=h[i].id;else break}return a&&a.length<=200?a:null}
function send(){t=0;post({type:"scroll",fraction:frac(),anchor:anchor()})}
function later(){if(!t)t=setTimeout(send,120)}
addEventListener("scroll",later,{passive:true});addEventListener("resize",later);addEventListener("load",later);
addEventListener("message",function(e){if(e.source!==P)return;var d=e.data;if(!d||d.kb!=="legacy"||d.v!==1||d.type!=="restore")return;
var el=typeof d.anchor==="string"&&d.anchor?document.getElementById(d.anchor):null,y=null;
if(el)y=el.getBoundingClientRect().top+E.scrollTop-12;else if(typeof d.fraction==="number"&&d.fraction>=0&&d.fraction<=1)y=d.fraction*max();
if(y!==null)window.scrollTo({top:Math.max(0,Math.round(y)),behavior:"instant"});send()});
document.addEventListener("click",function(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var u;try{u=new URL(a.href,location.href)}catch(x){return}
if(u.protocol!=="http:"&&u.protocol!=="https:")return;
if(u.host===location.host){if(u.pathname===location.pathname&&u.search===location.search&&u.hash)return;e.preventDefault();post({type:"navigate",href:u.pathname+u.search+u.hash})}
else{e.preventDefault();window.open(u.href,"_blank","noopener")}},true);
if(document.readyState==="complete")later()})();`;

const SCRIPT_TAG = `<script data-${LEGACY_BRIDGE_MARKER}>${BRIDGE}</script>`;

/** The bridge's size in bytes, for the record (the round asks for about 1 KB). */
export const LEGACY_BRIDGE_BYTES = new TextEncoder().encode(BRIDGE).length;

const BODY_CLOSE = /<\/body\s*>/gi;

/**
 * Splice the bridge into a relayed explainer document, before the LAST `</body>` (so it
 * runs after the document's own inline script, and a `</body>` quoted inside a `<pre>`
 * is not mistaken for the real one). A document with no `</body>` gets it appended,
 * which parsers hoist into the body. A literal slice, never `String.replace` (whose
 * replacement string would interpret `$&` and friends).
 */
export function injectLegacyBridge(html: string): string {
  let at = -1;
  for (const match of html.matchAll(BODY_CLOSE)) at = match.index;
  if (at < 0) return html + SCRIPT_TAG;
  return html.slice(0, at) + SCRIPT_TAG + html.slice(at);
}
