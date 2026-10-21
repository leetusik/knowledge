export const SCROLLERS = `(() => {
  const out = [];
  const de = document.documentElement;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const oy = cs.overflowY, ox = cs.overflowX;
    const sy = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
    const sx = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;
    if (sy || sx) out.push((el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0,2).join('.')) + (sy ? ' Y' + (el.scrollHeight - el.clientHeight) : '') + (sx ? ' X' + (el.scrollWidth - el.clientWidth) : ''));
  }
  return JSON.stringify({ title: document.title, h1: document.querySelector('h1')?.innerText?.slice(0, 50) ?? null, iw: innerWidth, cw: de.clientWidth, sw: de.scrollWidth, sh: de.scrollHeight, ih: innerHeight, bodyOY: getComputedStyle(document.body).overflowY, htmlOY: getComputedStyle(de).overflowY, scrollers: out });
})()`;
