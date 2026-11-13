const probe = `(() => {
  const per=[...document.querySelectorAll('.qz-item')].map(it=>{ const v=(sel)=>{const a=[...it.querySelectorAll(sel)]; return a.filter(s=>getComputedStyle(s).visibility!=='hidden').length+'/'+a.length;};
    return (it.closest('[id^=quiz--]')?.id||it.id||'?').replace('quiz--','')+' st '+v('.qz-st')+' layers '+v('.qz-acts__layer'); });
  const cnt=document.querySelector('.qz__count'); 
  return JSON.stringify({per, count: cnt? getComputedStyle(cnt).visibility+':'+cnt.className : null});})()`;
export default async (c) => {
  await c.viewport(1440,900);
  for (const signed of [false,true]) {
    if (signed) await c.login(); else await c.send("Network.clearBrowserCookies");
    for (const u of ["all-blocks","write-lock"]) { await c.goto("/@f3org/fixtures/books/fixture-guide/"+u); await c.sleep(1500); console.log(signed?"in ":"out", u, await c.eval(probe)); }
  }
};
