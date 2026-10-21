import { SCROLLERS } from "./lib.mjs";
const urls = (process.env.URLS ?? "").split(",").filter(Boolean);
const vps = (process.env.VPS ?? "390x844,820x1180,1024x768,1440x900").split(",").map((v) => v.split("x").map(Number));
const dpr = Number(process.env.DPR ?? 1);
export default async (c) => {
  if (process.env.LOGIN) await c.login();
  for (const [w, h] of vps) {
    await c.viewport(w, h, { dpr, mobile: w < 700 });
    for (const u of urls) {
      const n0 = c.logs.length;
      await c.goto(u);
      await c.sleep(Number(process.env.WAIT ?? 600));
      const r = JSON.parse(await c.eval(SCROLLERS));
      const loc = await c.eval(`location.pathname + location.search`);
      const bad = r.sw > r.iw + 0 ? " HSCROLL" : "";
      console.log(`${w}x${h}@${dpr} ${u} -> ${loc} | ${r.h1 ?? r.title} | sw=${r.sw} iw=${r.iw} cw=${r.cw} sh=${r.sh} body=${r.bodyOY} html=${r.htmlOY}${bad} | scrollers: ${r.scrollers.join("; ") || "none"}`);
      for (const l of c.logs.slice(n0)) console.log("   LOG " + l);
    }
  }
};
