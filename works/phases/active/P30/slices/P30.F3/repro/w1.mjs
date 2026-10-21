const B="/@f3org/fixtures/books/fixture-guide";
const URLS = [B+"/all-blocks", B+"/write-lock", B+"/write-lock?lang=ko", B, B+"/legacy", "/@f3org/fixtures/books/fixture-guide/all-blocks?v=1", "/review"];
export default async (c) => {
  await c.login();
  for (const [w,h] of [[390,844],[360,740],[430,932]]) {
    await c.viewport(w,h,{mobile:true,dpr:2});
    for (const pct of [100,150,200]) {
      const row=[];
      for (const u of URLS) {
        await c.goto(u); await c.sleep(1300); await c.eval(`document.documentElement.style.fontSize="${pct}%"`); await c.sleep(500);
        row.push(await c.eval(`document.documentElement.scrollWidth`));
      }
      console.log(`${w}x${h} root ${pct}%  scrollWidth [all-blocks, write-lock, ko?, book, legacy, v1, review]:`, row.join(" "));
    }
  }
};
