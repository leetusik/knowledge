import { clickText, clickSel, q, api, rect } from "./h.mjs";
const item = (id) => `document.getElementById('quiz--${id}')`;
const txt = (c, id) => c.eval(`${item(id)}.innerText.replace(/\\n+/g,' | ').slice(0,420)`);
const scrollTo = (c, id) => c.eval(`${item(id)}.scrollIntoView({block:'center', behavior:'instant'})`);
export default async (c) => {
  await c.login(); await c.viewport(1440,900);
  const U = "/@s27org/fixtures/books/fixture-guide/all-blocks";
  await c.goto(U); await c.sleep(1000);
  // single
  await scrollTo(c,"q-choice"); await c.sleep(300);
  let r = await rect(c, "#quiz--q-choice li:nth-of-type(2), #quiz--q-choice [role=radio]:nth-of-type(2), #quiz--q-choice button:nth-of-type(2)");
  const opts = await c.eval(`JSON.stringify([...${item("q-choice")}.querySelectorAll('button')].map(b=>({t:b.innerText.replace(/\\n/g,' ').slice(0,30), r:b.getAttribute('role'), p:b.getAttribute('aria-pressed')||b.getAttribute('aria-checked')})))`);
  console.log("single buttons", opts);
  await c.eval(`(() => { const b=${item("q-choice")}.querySelectorAll('button')[1]; b.__t=1; })()`);
  const b1 = await c.eval(`(() => { const b=${item("q-choice")}.querySelectorAll('button')[1].getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
  await c.click(b1.x, b1.y); await c.sleep(900);
  console.log("single after click:", await txt(c,"q-choice"));
  // multi: a, b, d then Check
  await scrollTo(c,"q-multi"); await c.sleep(300);
  for (const i of [0,1,3]) { const b = await c.eval(`(() => { const b=${item("q-multi")}.querySelectorAll('button')[${i}].getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()`); await c.click(b.x,b.y); await c.sleep(200); }
  console.log("multi selected:", await txt(c,"q-multi"));
  await q(c, `0`);
  const chk = await c.eval(`(() => { const b=[...${item("q-multi")}.querySelectorAll('button')].find(b=>/^Check/.test(b.innerText)); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await c.click(chk.x, chk.y); await c.sleep(900);
  console.log("multi after check:", await txt(c,"q-multi"));
  // recall
  await scrollTo(c,"q-recall"); await c.sleep(300);
  const sa = await c.eval(`(() => { const b=[...${item("q-recall")}.querySelectorAll('button')].find(b=>/Show answer/.test(b.innerText)); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await c.click(sa.x, sa.y); await c.sleep(500);
  console.log("recall revealed:", await txt(c,"q-recall"));
  const rb = await c.eval(`JSON.stringify([...${item("q-recall")}.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,' ')))`); console.log("recall buttons", rb);
  await c.shot("t5-recall.png");
};
