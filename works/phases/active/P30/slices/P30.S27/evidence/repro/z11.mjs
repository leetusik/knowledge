export default async (c) => {
  await c.login(); await c.viewport(390,844,{mobile:false});
  await c.goto("/@s27org/fixtures/books/fixture-guide/all-blocks"); await c.sleep(1500);
  const sw = () => c.eval(`document.documentElement.scrollWidth`);
  console.log("before", await sw());
  console.log(await c.eval(`(() => { const e=document.querySelector('.qz-vh'); const cs=getComputedStyle(e); return JSON.stringify({pos:cs.position,w:cs.width,h:cs.height,ov:cs.overflow,clip:cs.clip,clipPath:cs.clipPath,ws:cs.whiteSpace,m:cs.margin}); })()`));
  await c.eval(`(() => { const s=document.createElement('style'); s.textContent='.kb-ch .qz-vh{overflow:hidden !important}'; document.head.append(s); })()`);
  await c.sleep(300); console.log("with overflow:hidden on .qz-vh:", await sw());
};
