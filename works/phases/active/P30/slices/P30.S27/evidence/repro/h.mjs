// shared helpers for scenarios
export const rect = (c, sel) => c.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height, top: r.top, left: r.left}; })()`);
export const clickSel = async (c, sel) => { const r = await rect(c, sel); if (!r) throw new Error("no " + sel); await c.click(r.x, r.y); return r; };
// click a visible button/link/summary whose accessible name or text matches (string -> includes, RegExp)
export const findByText = (c, text, scope = "document") => c.eval(`(() => {
  const t = ${text instanceof RegExp ? text.toString() : JSON.stringify(text)};
  const m = (s) => t instanceof RegExp ? t.test(s) : s.includes(t);
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const els = [...(${scope}).querySelectorAll('a[href], button, input, summary, [role=button], [role=tab], [role=menuitem]')].filter(vis);
  const e = els.find((x) => m((x.getAttribute('aria-label') || x.innerText || '').replace(/\\s+/g, ' ').trim()));
  if (!e) return null; const r = e.getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2, name: (e.getAttribute('aria-label') || e.innerText).trim().slice(0,40) };
})()`);
export const clickText = async (c, text, scope) => { const r = await findByText(c, text, scope); if (!r) throw new Error("no text " + text); await c.click(r.x, r.y); return r; };
export const q = (c, js) => c.eval(`(() => { ${js} })()`);
export const cookieOf = (c, name) => c.eval(`(document.cookie.split('; ').find(x=>x.startsWith('${name}=')) ?? '')`);
export const API = "http://127.0.0.1:8911";
import { readFileSync } from "node:fs";
const SPD = process.env.SP;
export const tok = (who = "a") => JSON.parse(readFileSync(SPD + "/accts.json", "utf8"))[who].session;
export const api = async (method, path, body, who = "a") => {
  const r = await fetch(API + path, { method, headers: { authorization: "Bearer " + tok(who), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; }
};
export const clickTextS = async (c, text, scope = "document") => {
  await c.eval(`(() => { const t=${text instanceof RegExp ? text.toString() : JSON.stringify(text)}; const m=(s)=>t instanceof RegExp?t.test(s):s.includes(t); const e=[...(${scope}).querySelectorAll('a[href], button, summary, [role=button]')].find(x=>m((x.getAttribute('aria-label')||x.innerText||'').replace(/\\s+/g,' ').trim())); e?.scrollIntoView({block:'center',behavior:'instant'}); })()`);
  await c.sleep(250);
  return clickText(c, text, scope);
};
