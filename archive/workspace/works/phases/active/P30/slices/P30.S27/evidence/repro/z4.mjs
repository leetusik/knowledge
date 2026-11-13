export default async (c) => {
  await c.login();
  await c.viewport(390,844,{mobile:false});
  await c.goto("/@s27org/fixtures/books/fixture-guide/all-blocks"); await c.sleep(1500);
  console.log(await c.eval(`(() => { const base=document.documentElement.scrollWidth; const test=(el)=>{ const d=el.style.display; el.style.display='none'; const sw=document.documentElement.scrollWidth; el.style.display=d; return sw; };
   let cur=document.querySelector('.rd-root'); const path=[]; for (let depth=0; depth<14; depth++) { let next=null; for (const ch of cur.children) { if (test(ch) < base) { next=ch; break; } } if (!next) break; const r=next.getBoundingClientRect(); path.push(next.tagName.toLowerCase()+'.'+String(next.className).split(' ').slice(0,3).join('.')+' w='+Math.round(r.width)+' right='+Math.round(r.right)+' after='+test(next)); cur=next; } return JSON.stringify({base, iw: innerWidth, path}); })()`));
  console.log(await c.eval(`JSON.stringify([...document.querySelectorAll('.an-rows, [data-an-tag], .an-mi, .an-rail, mark.an-m')].map(e=>[e.tagName+'.'+String(e.className).slice(0,20), Math.round(e.getBoundingClientRect().right), Math.round(e.getBoundingClientRect().width)]).slice(0,10))`));
};
