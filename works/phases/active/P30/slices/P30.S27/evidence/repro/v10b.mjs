export default async (c) => {
  await c.login();
  await c.viewport(1440,900);
  for (let n=0;n<5;n++) {
  await c.goto("/@s27org/fixtures/books/fixture-guide/all-blocks"); await c.sleep(800);
  const r = await c.eval(`(() => { const a=document.createElement('a'); a.href='/@s27org/fixtures/books/fixture-guide/write-lock#a-later-addition'; a.textContent='TESTLINK'; a.id='testlink'; a.style.cssText='position:fixed;left:20px;top:100px;z-index:99999;background:#ff0;padding:8px'; document.body.append(a); const b=a.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
  await c.click(r.x,r.y); await c.sleep(3000);
  console.log("plain anchor click ->", await c.eval(`location.pathname.split('/').pop()+location.hash`), "y:", await c.eval(`Math.round(scrollY)`), "target top:", await c.eval(`Math.round(document.getElementById('a-later-addition')?.getBoundingClientRect().top ?? -9999)`));
  }
};
