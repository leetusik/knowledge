## Background {#background}

You have a certificate, your site answers on `https://`, and port 80 redirects to it. That is most of the job, but it leaves one gap. The redirect only happens *after* the browser has already sent a request over plain HTTP. A visitor who types your bare domain, follows an old `http://` link or opens an old bookmark makes that unencrypted request first. For a site the browser does not yet know to treat as HTTPS-only, the HSTS specification, RFC 6797, warns that this first exchange "is vulnerable to various attacks" ([RFC 6797 §14.6](#s-r1-foundations-01)).

HTTP Strict Transport Security (HSTS) closes that gap. It is one response header that tells the browser: *from now on, never talk to this site over plain HTTP.* This chapter covers what the header makes the browser do, how to serve it correctly, and how to switch it on in stages so that a mistake cannot lock your visitors out for a year.

> [!SKIP] Skip this if you know what an on-path attacker is
> An *on-path* (or man-in-the-middle) attacker sits between the visitor and your server: a rogue Wi-Fi hotspot, for example. Such an attacker can read and rewrite anything sent over plain HTTP. HTTPS stops this, but only for requests that actually use HTTPS.

## What the header does {#what-it-does}

```http title="An HSTS response header"
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Once a browser has seen this header over HTTPS, it rewrites every `http://` URL for your domain to `https://` before sending anything.** Before loading an `http` URL, the browser checks the domain against its list of HSTS hosts. On a match it replaces the scheme with `https`, and it does the same for subdomains when the policy set `includeSubDomains` ([MDN](#s-r1-foundations-02)). The unencrypted first request never happens, so an attacker has nothing to intercept.

**The header also turns certificate warnings into hard stops.** On an HSTS host, a TLS error such as an invalid certificate gives the visitor no way to "click through" ([MDN](#s-r1-foundations-02)). The RFC describes this as the site "implicitly opting into the 'no user recourse' approach" ([RFC 6797 §12.1](#s-r1-foundations-01)). That is the security win: an attacker's fake certificate cannot be accepted by a hurried user. It is also the operational risk. If your own certificate expires, your visitors cannot click past the warning either.

Note what the header does *not* do. It does not change how the browser handles the response that carries it; it changes how the browser makes *future* requests ([MDN](#s-r1-foundations-02)). The scenario below, adapted from MDN's walkthrough, shows both effects.

```diagram #hsts-sequence
kind: sequence
title: A first visit teaches the browser; a later visit on hostile Wi-Fi is protected
actors:
  - {id: browser, label: Browser}
  - {id: server, label: example.com}
  - {id: attacker, label: Rogue Wi-Fi}
steps:
  - {from: browser, to: server, label: "GET http://example.com/ (first visit, plain HTTP)"}
  - {from: server, to: browser, label: "301 to https://example.com/ (no HSTS header here)"}
  - {from: browser, to: server, label: "GET https://example.com/"}
  - {from: server, to: browser, label: "200 with Strict-Transport-Security; includeSubDomains", note: "The browser now remembers example.com as an HSTS host"}
  - {from: browser, to: attacker, label: "Weeks later, http://login.example.com/ is sent as https", style: dashed}
  - {from: attacker, to: browser, label: "Fake certificate", style: dashed, note: "Certificate error, with no way to proceed"}
caption: The first exchange is still plain HTTP. Every later one is HTTPS, even for a subdomain the visitor never opened before.
```

**HSTS cannot protect the very first visit.** The browser learns the policy only after one secure connection that returns the header. Until then, an `http` request is exposed ([MDN](#s-r1-foundations-02); [RFC 6797 §14.6](#s-r1-foundations-01)). To cover that first visit, Chrome ships a built-in *preload list* of HTTPS-only domains. According to hstspreload.org, the other major browsers have preload lists based on Chrome's ([hstspreload.org](#s-r1-practice-01)). The section on [preloading](#preload) explains why that is a separate, much bigger commitment.

## The header, directive by directive {#the-header}

The header has one required directive and two optional ones.

| Directive | What it means | Required? |
|---|---|---|
| `max-age=<seconds>` | How long the browser treats your host as HSTS-only. Every response that carries the header restarts the clock: the expiry becomes *now + max-age*. | Yes |
| `includeSubDomains` | Takes no value; it applies the policy to the host **and every subdomain** of it. | No |
| `preload` | Asks to be added to the browser preload lists. It needs at least 1 year of max-age plus `includeSubDomains`, and it does nothing until you submit the domain. | No |

The first two rows are defined in RFC 6797 ([§6.1.1–6.1.2](#s-r1-foundations-01)), and MDN describes how the clock restarts ([MDN](#s-r1-foundations-02)). The `preload` requirements come from the preload list's own site ([hstspreload.org](#s-r1-practice-01)) and OWASP's note that the flag is only consent ([OWASP](#s-r1-practice-02)).

Because the clock restarts on every response, a regular visitor's policy keeps being pushed further into the future.

> [!NOTE]- Should subdomains send the header too?
> Yes, says MDN, even when the parent uses `includeSubDomains`. A browser may reach `www.example.com` through a direct link without ever loading `example.com`, so it never sees the parent's policy ([MDN](#s-r1-foundations-02)).

## Serving it correctly {#serving-it}

**Send the header only on HTTPS responses; browsers ignore it on plain HTTP.** RFC 6797 tells browsers to ignore the header when it arrives over insecure transport, and tells servers not to send it there ([RFC 6797 §7.2, §8.1](#s-r1-foundations-01)). Otherwise an attacker could inject a fake policy for a site, or strip a real one ([MDN](#s-r1-foundations-02)). Your port-80 side therefore does exactly one thing: it answers with a permanent redirect, such as a `301`, to the `https` URL, without the header. The HTTPS response that follows carries the header ([MDN](#s-r1-foundations-02)).

In nginx, that means one line in the HTTPS `server` block:

```nginx title="nginx: inside the server { listen 443 ssl; … } block"
add_header Strict-Transport-Security "max-age=300; includeSubDomains" always;
```

Two details in that line matter:

- **`always`.** Without it, nginx adds the header only to responses with codes 200, 201, 204, 206, 301, 302, 303, 304, 307 or 308. With it, every response gets the header, error pages included ([nginx docs](#s-r1-practice-03)).
- **Inheritance.** By default, a `location` block that defines its own `add_header` inherits *none* of the `add_header` lines from the outer `server` block ([nginx docs](#s-r1-practice-03)). Repeat the HSTS line there, or that location silently stops sending it.

The nginx line is one example; other servers and hosting platforms have their own setting for the same header.

**Checklist: serve it right**

- The header appears on HTTPS responses, error pages included.
- Plain-HTTP responses are a bare permanent redirect to `https`, with no HSTS header.
- Every block or route that sets its own headers still sends HSTS.

## Rolling it out safely {#rollout}

HSTS is easy to switch on and slow to switch off. A visitor who received `max-age=31536000` keeps your policy for a year, even if you delete the header tomorrow: a missing header leaves the stored policy in force until it expires ([MDN](#s-r1-foundations-02)). The safe rollout therefore keeps every mistake short-lived.

**Step 1: find every subdomain before you use `includeSubDomains`.** RFC 6797 is blunt about the risk: if any subdomain lacks properly configured HTTPS, it "will be rendered unreachable" for browsers that hold the policy ([RFC 6797 §14.5](#s-r1-foundations-01)). hstspreload.org's deployment advice starts here. Check that every subdomain works over HTTPS, nested ones and internal ones that are not public included ([hstspreload.org](#s-r1-practice-01)). Think of the `intranet.` box, the old `blog.` and the printer's admin page.

If you cannot vouch for every subdomain yet, start without `includeSubDomains`. The policy then protects only the host that sends it. OWASP notes the cost of that choice: it leaves open a broad range of cookie attacks from subdomains ([OWASP](#s-r1-practice-02)).

**Step 2: ramp max-age up in stages.** hstspreload.org recommends three stages, each with `includeSubDomains` ([hstspreload.org](#s-r1-practice-01)):

```diagram #ramp
kind: flow
title: The max-age ladder recommended by hstspreload.org
direction: right
nodes:
  - {id: check, label: Check every subdomain, sub: "HTTPS works everywhere", shape: pill}
  - {id: s1, label: "max-age=300", sub: 5 minutes, tone: series-1}
  - {id: s2, label: "max-age=604800", sub: 1 week, tone: series-2}
  - {id: s3, label: "max-age=2592000", sub: 1 month, tone: series-3}
edges:
  - {from: check, to: s1}
  - {from: s1, to: s2, label: "no breakage; waited 5 min"}
  - {from: s2, to: s3, label: "no breakage; waited 1 week"}
caption: At each stage, watch for broken pages and your traffic, fix what breaks, and wait the stage's full max-age before moving on.
```

At each stage, check for broken pages and watch your site's metrics. Fix what breaks, then wait the *full* max-age of the stage before you go on; in the last stage, that is a month ([hstspreload.org](#s-r1-practice-01)). OWASP's cheat sheet makes the same point with a one-day example "in case of mistakes during initial rollout" ([OWASP](#s-r1-practice-02)).

After the month stage, settle on a long-term value. hstspreload.org's own example header uses two years, `max-age=63072000` ([hstspreload.org](#s-r1-practice-01)).

**How to undo it.** Send `max-age=0` over HTTPS. The browser then deletes its stored policy for your host, `includeSubDomains` included ([RFC 6797 §8.1](#s-r1-foundations-01)). This works only when the browser makes an HTTPS request and receives that header; by design, you cannot switch HSTS off over plain HTTP ([MDN](#s-r1-foundations-02)). Undoing therefore requires a working HTTPS site, which is one more reason to keep the early stages short.

> [!IMPORTANT] Checklist: before each step up the ladder
> - Every subdomain, internal ones included, loads over HTTPS (or `includeSubDomains` is off).
> - No broken pages or traffic drop appeared during this stage.
> - You have waited at least the current stage's full max-age.
> - Your certificate renewal is automated or calendared: an expired certificate on an HSTS site is a hard outage.
> - You know your undo: `max-age=0`, served over HTTPS.

## Should you preload? {#preload}

Preloading puts your domain into the list that ships *inside* the browser, which closes the first-visit gap. The bar is high. To be accepted, a site must:

- serve a valid certificate;
- redirect HTTP to HTTPS on the same host;
- serve all subdomains over HTTPS;
- send, on the base domain, `max-age` of at least 31536000 (1 year) with both `includeSubDomains` and `preload` ([hstspreload.org](#s-r1-practice-01)).

**Getting off the list is slow.** Domains can be removed, but hstspreload.org says the change takes months to reach users through a Chrome update, with no guarantee for other browsers ([hstspreload.org](#s-r1-practice-01)). OWASP calls the consequences of the `preload` directive potentially permanent ([OWASP](#s-r1-practice-02)).

The list's own operators also question whether a typical site needs it. hstspreload.org states that Chrome and Safari already upgrade HTTP navigations to HTTPS regardless of a site's HSTS policy. In its view, preloading adds value only when those upgrades fail under an active attacker, and so "While HSTS is recommended, HSTS preloading is not recommended" ([hstspreload.org](#s-r1-practice-01)).

| Preload if… | Don't yet if… |
|---|---|
| You have run the full ladder and served a long max-age for a while without trouble | You are still on the ladder |
| You control every subdomain, internal ones included, and all serve HTTPS | Any subdomain is HTTP-only, or owned by another team or vendor |
| You accept that leaving the list takes months | You might ever need plain HTTP on any subdomain |

For a first site, the practical answer is usually "not yet": run the ladder, keep a long max-age, and revisit preloading later.

## Best practices & next steps {#best-practices}

The setup this chapter builds follows the published guidance. It ramps `max-age` up in short stages, which is hstspreload.org's recommended deployment and matches OWASP's advice to start short ([hstspreload.org](#s-r1-practice-01) — hstspreload.org; [OWASP](#s-r1-practice-02) — owasp.org). It sends the header only over HTTPS, with a plain redirect on port 80, as RFC 6797 and MDN require ([RFC 6797](#s-r1-foundations-01) — rfc-editor.org; [MDN](#s-r1-foundations-02) — developer.mozilla.org).

One choice may differ from the ladder: leaving `includeSubDomains` off until every subdomain is confirmed. That keeps an unknown subdomain reachable, at the cost OWASP describes for subdomain cookie attacks ([OWASP](#s-r1-practice-02) — owasp.org). Treat it as a waypoint, not the destination.

Next steps:

1. List every subdomain you own, including internal ones, and test each over HTTPS.
2. Ship `max-age=300` with `always`, confirm it on an error page, and start the ladder.
3. Automate certificate renewal before you reach the month stage.
4. Once you hold a long max-age without incident, decide on preloading with the table above.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-http-only
    type: choice
    prompt: "To be thorough, you add the HSTS header to your port-80 redirect *and* to your HTTPS pages. What does a browser do with the copy on the port-80 redirect?"
    options:
      - {id: a, text: "It stores the policy right away, which protects the very first visit"}
      - {id: b, text: "It ignores it, because the header only counts when received over HTTPS"}
      - {id: c, text: It stores it but gives it a shorter max-age}
      - {id: d, text: It refuses the redirect}
    answer: [b]
    explain: "Browsers ignore the header on plain HTTP; otherwise an attacker could inject or strip a policy. Only the HTTPS response sets it."
  - id: q-cert
    type: choice
    prompt: Your HSTS-enabled site's certificate expires overnight. What do returning visitors see?
    options:
      - {id: a, text: A warning they can click through as usual}
      - {id: b, text: The site loads over plain HTTP instead}
      - {id: c, text: A certificate error with no way to proceed}
    answer: [c]
    explain: "On an HSTS host, TLS errors cannot be clicked through, and the browser will not fall back to HTTP either. That is why certificate renewal belongs on the rollout checklist."
  - id: q-undo
    type: choice
    prompt: Visitors hold your policy with a one-month max-age, and you need to turn HSTS off. Which works?
    options:
      - {id: a, text: Delete the header from your server config}
      - {id: b, text: "Send max-age=0 on your HTTPS responses"}
      - {id: c, text: "Send max-age=0 on your plain-HTTP responses"}
    answer: [b]
    explain: "A missing header leaves the stored policy in force until it expires, and headers on plain HTTP are ignored. max-age=0 received over HTTPS makes the browser delete the policy."
  - id: q-subdomain
    type: recall
    prompt: "example.com sends includeSubDomains with a one-year max-age. The internal tool at intranet.example.com only serves plain HTTP. What happens for employees whose browsers hold the policy, and what should have happened before the rollout?"
    answer: "The browser forces HTTPS for intranet.example.com, which cannot serve it, so the tool is unreachable for them for up to a year. Every subdomain, internal ones included, should have been checked over HTTPS first, or includeSubDomains left off."
  - id: q-ramp
    type: cloze
    text: "On hstspreload.org's ladder, after moving from max-age=300 to max-age=604800, you should wait at least {{one week|1 week|7 days|a week}} before raising it to the one-month stage."
    explain: "hstspreload.org's advice is to fix any problems and then wait the full max-age of each stage before moving on: a week here, a month in the last stage."
  - id: q-first-visit
    type: recall
    prompt: Why can HSTS not protect a visitor's very first request to your site, and what closes that gap?
    answer: "The browser learns the policy only from an HTTPS response carrying the header, so a first http request goes out unprotected. A preload list built into the browser, such as Chrome's, covers it."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-foundations-01
    title: "RFC 6797: HTTP Strict Transport Security (HSTS)"
    url: https://www.rfc-editor.org/rfc/rfc6797.html
    publisher: IETF
    date: 2012-11
    accessed: 2026-10-23
  - id: s-r1-foundations-02
    title: Strict-Transport-Security header
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
    publisher: MDN Web Docs (Mozilla)
    accessed: 2026-10-23
  - id: s-r1-practice-01
    title: HSTS Preload List Submission
    url: https://hstspreload.org/
    publisher: Google Chrome
    accessed: 2026-10-23
  - id: s-r1-practice-02
    title: HTTP Strict Transport Security Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html
    publisher: OWASP
    accessed: 2026-10-23
  - id: s-r1-practice-03
    title: Module ngx_http_headers_module
    url: https://nginx.org/en/docs/http/ngx_http_headers_module.html
    publisher: nginx
    accessed: 2026-10-23
```
