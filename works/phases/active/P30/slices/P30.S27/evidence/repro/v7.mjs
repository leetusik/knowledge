export default async (c) => {
  await c.viewport(1440,900);
  await c.send("Network.clearBrowserCookies");
  await c.goto("/@s27org/fixtures/books/fixture-guide/all-blocks"); await c.sleep(800);
  // scroll to the sources section as an anonymous reader, then click the real top-bar Sign in
  await c.eval(`document.getElementById('sources-list').scrollIntoView({block:'start',behavior:'instant'})`); await c.sleep(2600);
  for (let i=0;i<4;i++){ await c.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:700,y:500,deltaX:0,deltaY:-60}); await c.sleep(40);} await c.sleep(600);
  const r = await c.eval(`(() => { const a=[...document.querySelectorAll('a[href^="/login"]')].find(a=>a.getBoundingClientRect().width>0 && a.getBoundingClientRect().top>=0 && a.closest('header, .rd-top, [class*=rd-top]')); const b=a?.getBoundingClientRect(); return a? {x:b.x+b.width/2,y:b.y+b.height/2, h:a.getAttribute('href')}:null; })()`);
  console.log("top Sign in:", JSON.stringify(r));
  await c.click(r.x, r.y); await c.sleep(1800);
  console.log("at:", await c.eval(`location.pathname+location.search`));
  await c.eval(`(() => { const set=(n,v)=>{const el=document.querySelector('input[name="'+n+'"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));}; set('email','s27-member@example.com'); set('password','s27-live-pass-1'); document.querySelector('button[type=submit]').click(); })()`);
  const s=[]; for (let i=0;i<10;i++){ await c.sleep(500); try { s.push(await c.eval(`location.pathname.split('/').pop()+location.hash+':'+Math.round(scrollY)`)); } catch { s.push('-'); } }
  console.log("after login samples:", s.join(" | "));
  console.log("target top:", await c.eval(`Math.round(document.getElementById('sources-list')?.getBoundingClientRect().top ?? -9999)`));
};
