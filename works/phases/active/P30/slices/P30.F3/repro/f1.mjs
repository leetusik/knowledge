export default async (c) => {
  await c.login();
  const w = +(process.env.W ?? 390), pct = +(process.env.PCT ?? 200);
  await c.viewport(w,844,{mobile:true,dpr:2});
  for (const u of (process.env.U ?? "/@f3org/fixtures/books/fixture-guide/all-blocks").split(",")) {
    await c.goto(u); await c.sleep(1300); await c.eval(`document.documentElement.style.fontSize='${pct}%'`); await c.sleep(600);
    console.log(u, await c.eval(`(() => { const W=document.documentElement.clientWidth; const out=[]; for (const el of document.querySelectorAll('body *')) { const cs=getComputedStyle(el); if (cs.display==='none'||cs.visibility==='hidden') continue; const r=el.getBoundingClientRect(); if (r.width===0) continue; if (cs.position==='fixed') continue; if (r.right>W+0.5 || r.left<-0.5) { let clipped=false; for (let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p); if(o.overflowX!=='visible'||o.clipPath!=='none'||o.position==='fixed'){clipped=true;break;}} if(!clipped) out.push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ').slice(0,3).join('.')+' L'+Math.round(r.left)+' R'+Math.round(r.right)+' pos='+cs.position); } } return JSON.stringify({W, sw:document.documentElement.scrollWidth, out: out.slice(0,14)},null,1); })()`));
  }
};
