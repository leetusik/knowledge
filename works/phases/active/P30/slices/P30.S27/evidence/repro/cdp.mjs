// P30.S20 live check driver: headless Chrome over CDP, a throwaway profile, real mouse,
// touch and keyboard events. Usage: node cdp20.mjs <scenario.mjs>
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9300 + Math.floor(Math.random() * 500);
const BASE = process.env.BASE ?? "http://127.0.0.1:3911";
const prof = process.env.PROFILE ?? mkdtempSync(join(process.env.SP ?? tmpdir(), "chrome-"));
const EXTRA = (process.env.CHROME_ARGS ?? "").split(" ").filter(Boolean);
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${prof}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1440,900",
  ...EXTRA,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i += 1) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    if (targets.find((t) => t.type === "page")) break;
  } catch {}
  await sleep(200);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const waiting = new Map();
const logs = [];
const posts = [];
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) {
    const { ok, no } = waiting.get(msg.id);
    waiting.delete(msg.id);
    if (msg.error) no(new Error(JSON.stringify(msg.error)));
    else ok(msg.result);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    logs.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === "Log.entryAdded") {
    logs.push(`log.${msg.params.entry.level}: ${msg.params.entry.text}`);
  } else if (msg.method === "Network.responseReceived" && msg.params.response.status >= 400) {
    logs.push(`http ${msg.params.response.status}: ${msg.params.response.url.replace(BASE, "")}`);
  } else if (msg.method === "Network.requestWillBeSent") {
    const r = msg.params.request;
    if (r.method !== "GET") posts.push(`${r.method} ${r.url.replace(BASE, "")} ${(r.postData ?? "").slice(0, 400)}`);
  }
});
const send = (method, params = {}) =>
  new Promise((ok, no) => {
    seq += 1;
    waiting.set(seq, { ok, no });
    ws.send(JSON.stringify({ id: seq, method, params }));
  });
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");

const ctx = {
  BASE,
  logs,
  posts,
  sleep,
  send,
  async goto(path) {
    await send("Page.navigate", { url: path.startsWith("http") ? path : BASE + path });
    for (let i = 0; i < 100; i += 1) {
      await sleep(150);
      const r = await ctx.eval("document.readyState");
      if (r === "complete") break;
    }
    await sleep(700);
  },
  async eval(expr) {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  },
  async mouse(type, x, y, extra = {}) {
    await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, ...extra });
  },
  async click(x, y) {
    await ctx.mouse("mouseMoved", x, y, { button: "none" });
    await ctx.mouse("mousePressed", x, y);
    await ctx.mouse("mouseReleased", x, y);
    await sleep(120);
  },
  async drag(x1, y1, x2, y2) {
    await ctx.mouse("mouseMoved", x1, y1, { button: "none" });
    await ctx.mouse("mousePressed", x1, y1);
    const n = 8;
    for (let i = 1; i <= n; i += 1)
      await ctx.mouse("mouseMoved", x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, { buttons: 1 });
    await ctx.mouse("mouseReleased", x2, y2);
    await sleep(250);
  },
  async key(key, opts = {}) {
    const code = opts.code ?? (key.length === 1 ? `Key${key.toUpperCase()}` : key);
    const vk = { Enter: 13, Escape: 27, Tab: 9, " ": 32, Backspace: 8 }[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
    const mods = (opts.meta ? 4 : 0) | (opts.ctrl ? 2 : 0) | (opts.shift ? 8 : 0) | (opts.alt ? 1 : 0);
    const text = opts.text ?? (key === "Enter" ? "\r" : key.length === 1 && !mods ? key : undefined);
    await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key, code, windowsVirtualKeyCode: vk, modifiers: mods, text });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await sleep(80);
  },
  async type(text) {
    await send("Input.insertText", { text });
    await sleep(80);
  },
  async viewport(w, h, opts = {}) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: opts.dpr ?? 1, mobile: !!opts.mobile });
    if (opts.touch !== undefined) await send("Emulation.setTouchEmulationEnabled", { enabled: !!opts.touch, maxTouchPoints: opts.touch ? 5 : 1 });
    await sleep(200);
  },
  async shot(file) {
    const r = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(file, Buffer.from(r.data, "base64"));
  },
  async login(email = process.env.EMAIL ?? "s27-member@example.com", password = "s27-live-pass-1") {
    const { existsSync, readFileSync } = await import("node:fs");
    const f = (process.env.SP ?? ".") + "/cookies-" + email + ".json";
    if (existsSync(f)) {
      for (const ck of JSON.parse(readFileSync(f, "utf8"))) {
        await send("Network.setCookie", { name: ck.name, value: ck.value, url: BASE, path: "/", httpOnly: ck.httpOnly, sameSite: ck.sameSite });
      }
      return;
    }
    await ctx.goto("/login");
    await ctx.eval(`(() => {
      const set = (n, v) => { const el = document.querySelector('input[name="' + n + '"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('email', ${JSON.stringify(email)}); set('password', ${JSON.stringify(password)});
      document.querySelector('button[type="submit"]').click(); return true; })()`);
    await sleep(2500);
    const all = (await send("Network.getCookies", { urls: [BASE] })).cookies;
    writeFileSync(f, JSON.stringify(all.filter((x) => !x.name.startsWith("kb_reader"))));
  },
  async pdf(file, opts = {}) {
    const r = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, ...opts });
    writeFileSync(file, Buffer.from(r.data, "base64"));
  },
  async cookie(name, value, url) {
    await send("Network.setCookie", { name, value, url: url ?? BASE, path: "/" });
  },
  async scheme(name) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: name }] });
    await sleep(200);
  },
  async fullshot(file) {
    const m = await send("Page.getLayoutMetrics");
    const h = Math.ceil(m.cssContentSize.height);
    const w = Math.ceil(m.cssContentSize.width);
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    writeFileSync(file, Buffer.from(r.data, "base64"));
  },
};

const scenario = await import(pathToFileURL(process.argv[2]).href);
let code = 0;
try {
  await scenario.default(ctx);
} catch (e) {
  console.log("SCENARIO ERROR", e.stack ?? e);
  code = 1;
}
console.log("--- console/CSP ---");
for (const l of logs) console.log(l);
console.log("--- writes ---");
for (const p of posts) console.log(p);
ws.close();
chrome.kill();
process.exit(code);
