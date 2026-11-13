export default async (c) => {
  await c.login();
  const sizes = (process.env.S ?? "335x581,390x844,320x480,360x640").split(",").map(s=>s.split("x").map(Number));
  const pcts = (process.env.P ?? "100,150,200").split(",").map(Number);
  for (const [w,h] of sizes) for (const pct of pcts) {
    await c.viewport(w,h,{mobile:false,dpr:2});
    await c.goto("/@f3org/fixtures/books/fixture-guide/legacy"); await c.sleep(1300);
    await c.eval(`document.documentElement.style.fontSize='${pct}%'`); await c.sleep(900);
    console.log(`${w}x${h} ${pct}%`, await c.eval(`(() => { const b=document.querySelector('.lg-bottom__bar'); const p=document.querySelector('.lg-page'); const de=document.documentElement; return JSON.stringify({tight:!!document.querySelector('.lg-tight'), barSH:b?.scrollHeight, barCH:b?.clientHeight, barOY:b&&getComputedStyle(b).overflowY, pageSH:de.scrollHeight, ih:innerHeight, sw:de.scrollWidth, stageH: Math.round(document.querySelector('.lg-stage')?.getBoundingClientRect().height)}); })()`));
  }
};
