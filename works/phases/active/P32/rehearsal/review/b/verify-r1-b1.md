# Verification: 20261023-1559-hsts-safe-rollout · r1-b1
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 15 · supported 15 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

Pages saved in pages/r1-b1/ (S-r1-foundations-01, S-r1-foundations-02, S-r1-practice-01; .html and .txt, fetched by curl, HTTP 200). `--check` on both findings files: every passage cited below found verbatim (the S-r1-practice-02/03 "NOT FOUND" lines are only because those pages are outside this batch and were not fetched).

## Records

### V-C-r1-foundations-01-1
- claim: C-r1-foundations-01
- source S-r1-foundations-02 · opened: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security (curl) · quote-match: exact · passage at P1 § "Description": found verbatim
- looked first: MDN says the browser checks an http URL's domain against its HSTS hosts list; on a match (or subdomain of an includeSubDomains host) it replaces the scheme with https, and port 80 becomes 443. RFC 6797 §8.3 (same RFC page, opened) says the same as MUST steps, including "any superdomain match with an asserted includeSubDomains directive".
- implied: http URL for a noted HSTS host, or a subdomain of one with includeSubDomains, is rewritten to https before loading.
- verdict: supported · reason: Every element is stated directly; RFC §8.3 gives rung-1 spec support in addition to the cited MDN passage.
- bar: met (descriptive, rung 1 MDN plus RFC 6797 §8.3) · independence: n/a (MDN cites the RFC) · currency: RFC 6797 page shows no "Updated by"/obsoleted notice; MDN is a living page
- counter: not run

### V-C-r1-foundations-02-1
- claim: C-r1-foundations-02
- source S-r1-foundations-02 · opened: MDN URL above (curl) · quote-match: exact · passage at P2 § "Description": found verbatim
- source S-r1-foundations-01 · opened: https://www.rfc-editor.org/rfc/rfc6797.html (curl) · quote-match: exact · passage at P6 § 12.1: found verbatim
- looked first: MDN's intro says the browser "will not allow the user to bypass secure connection errors, such as an invalid certificate". RFC §8.4 says the UA MUST terminate the connection on any secure-transport error for a Known HSTS Host; §12.1 says this is done with "no user recourse" (no dialog giving the option to proceed).
- implied: on a TLS error at an HSTS host, no click-through is offered.
- verdict: supported · reason: MDN P2 states the browser behaviour directly; RFC §8.4/§12.1 require it (§12.1 is implementation advice, "should").
- bar: met (descriptive, rung 1) · independence: n/a (MDN derives from the RFC) · currency: no later notice found on the page
- counter: not run

### V-C-r1-foundations-03-1
- claim: C-r1-foundations-03
- source S-r1-foundations-01 · opened: RFC URL above (curl) · quote-match: exact · P4 § 8.1 (line 704): found verbatim; P5 § 7.2 (line 656): found verbatim
- source S-r1-foundations-02 · opened: MDN URL above (curl) · quote-match: exact · P3 § "Description": found verbatim
- looked first: RFC §8.1 lists "If an HTTP response is received over insecure transport, the UA MUST ignore any present STS header field(s)"; §7.2 closes with "An HSTS Host MUST NOT include the STS header field in HTTP responses conveyed over non-secure transport." MDN gives the reason (stop a MITM from expiring or adding the header).
- implied: browsers ignore the header over HTTP; the RFC requires UAs to ignore it and forbids hosts from sending it over non-secure transport.
- verdict: supported · reason: All three parts are stated verbatim.
- bar: met (descriptive, rung 1 spec) · independence: n/a · currency: no notice on RFC page
- counter: not run

### V-C-r1-foundations-04-1
- claim: C-r1-foundations-04
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P1 § 6.1.1: found verbatim
- source S-r1-foundations-02 · MDN URL (curl) · quote-match: exact · P4 § "Expiration": found verbatim
- looked first: RFC §6.1.1 gives max-age as "number of seconds"; RFC §8.1 says it is a "time to live" relative to reception time of the header; MDN says each reception adds max-age to the current time.
- implied: max-age is in seconds, sets how long the host is a HSTS host; each header received resets expiry to now + max-age.
- verdict: supported · reason: Both halves are stated directly.
- bar: met (descriptive, rung 1) · independence: n/a · currency: n/a
- counter: not run

### V-C-r1-foundations-05-1
- claim: C-r1-foundations-05
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P2 § 6.1.2: found verbatim (line 580)
- looked first: RFC §6.1.2 defines includeSubDomains as a valueless directive; the MDN page (S-r1-foundations-02) adds that it applies to all subdomains of the host's domain.
- implied: valueless; policy applies to the host and any subdomains.
- verdict: supported · reason: "valueless directive" and "this HSTS Host as well as any subdomains of the host's domain name" are verbatim. Nuance only: MDN notes that an includeSubDomains policy on a subdomain (e.g. secure.example.com) does not cover its parent; the claim's wording ("its domain name") stays within that.
- bar: met (descriptive, rung 1 spec) · independence: n/a · currency: n/a
- counter: not run

### V-C-r1-foundations-06-1
- claim: C-r1-foundations-06
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P3 § 8.1 (line 695): found verbatim
- source S-r1-foundations-02 · MDN URL (curl) · quote-match: exact · P5 § "Expiration": found verbatim
- looked first: RFC §8.1 says a zero max-age makes the UA remove cached policy "including the includeSubDomains directive" if known, or not note the host; MDN says "By design, you cannot disable HSTS over insecure HTTP" and that it takes effect only after a secure request.
- implied: max-age=0 received over HTTPS deletes the stored policy (including includeSubDomains); not clearable over HTTP.
- verdict: supported · reason: The delete rule is in RFC; the "not over HTTP" part is in MDN P5 and follows from RFC §8.1 (headers over insecure transport are ignored).
- bar: met (descriptive, rung 1) · independence: n/a · currency: n/a
- counter: not run

### V-C-r1-foundations-07-1
- claim: C-r1-foundations-07
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P7 § 14.6: found verbatim (line 1339)
- source S-r1-foundations-02 · MDN URL (curl) · quote-match: exact · P10 § "Insecure HTTP requests": found verbatim
- looked first: MDN states the weakness that HSTS does not take effect before one secure connection with the header, that the initial request over http is vulnerable to network attacks, and "Preloading mitigates this problem". RFC §14.6 names it the Bootstrap MITM vulnerability.
- implied: first-contact http request is unprotected until a secure connection delivers the header; RFC's name for it; scope "not on a preload list".
- verdict: supported · reason: Stated directly in both; the preload-list scope is stated by MDN ("Preloading mitigates") and hstspreload.org.
- bar: met (descriptive, rung 1) · independence: n/a · currency: n/a
- counter: not run

### V-C-r1-foundations-10-1
- claim: C-r1-foundations-10
- source S-r1-foundations-02 · MDN URL (curl) · quote-match: exact · P9 § "Insecure HTTP requests": found verbatim
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P5 § 7.2: found verbatim
- looked first: MDN: redirect "should" be permanent (such as 301) with an https Location, must not carry the header, and "After the browser follows the redirect ... the response should include the Strict-Transport-Security header". RFC §7.2 (read beyond P5): "it SHOULD send an HTTP response message containing a status code indicating a permanent redirect, such as status code 301 ... Location ... URI scheme of 'https'"; §7.2 end: MUST NOT include STS over non-secure transport.
- implied: plain-HTTP requests get a permanent redirect to https, with no HSTS header on that redirect; the header goes on the HTTPS response.
- verdict: supported · reason: Every element is stated by MDN; RFC §7.2 also supports the redirect part directly (the researcher recorded the RFC as fit partial; it is stronger than that, via text at §7.2 start).
- bar: met (descriptive of what both documents advise; the claim is "should", which both sources themselves word as "should/SHOULD") · independence: n/a (MDN derives from RFC) · currency: n/a
- counter: not run

### V-C-r1-foundations-12-1
- claim: C-r1-foundations-12
- source S-r1-foundations-01 · RFC URL (curl) · quote-match: exact · P8 § 14.5: found verbatim (line 1334)
- looked first: RFC §14.5 lists "Inadvertent use of includeSubDomains" as a denial-of-service risk; text at lines 1334-1337.
- implied: with includeSubDomains, a subdomain lacking properly configured secure transport is unreachable from UAs holding the policy.
- verdict: supported · reason: Verbatim; the claim's "HTTPS" is the RFC's "secure transport".
- bar: met (descriptive, rung 1) · independence: n/a · currency: n/a
- counter: not run

### V-C-r1-practice-01-1
- claim: C-r1-practice-01
- source S-r1-practice-01 · opened: https://hstspreload.org/ (curl) · quote-match: exact · P1, P2 § "Deployment Recommendations": found verbatim (lines 14-15)
- looked first: the page's recommendation steps open with examining all subdomains for HTTPS, then add header with staged max-age.
- implied: first listed step is checking subdomains (nested; internal not publicly accessible included) work over HTTPS; attributed to hstspreload.org.
- verdict: supported · reason: "Examine all subdomains (and nested subdomains) ... works properly over HTTPS" is step one; the internal-subdomain note follows.
- bar: met (attributed form, rung 1; Chrome team about its own recommendations) · independence: n/a · currency: living page, accessed 2026-10-23
- counter: not run

### V-C-r1-practice-02-1
- claim: C-r1-practice-02
- source S-r1-practice-01 · hstspreload.org (curl) · quote-match: exact · P3, P4, P5 § "Deployment Recommendations": found verbatim (lines 16-23)
- looked first: page lists 5 minutes / 1 week / 1 month stages with `includeSubDomains`, then the per-stage check instruction. It also suggests beta testing the first stages on a user group (not claimed).
- implied: 300 s, 604800 s, 2592000 s, each with includeSubDomains; check broken pages and metrics each stage; wait the full max-age before moving on.
- verdict: supported · reason: Header values and instructions verbatim; "(5 minutes)", "(1 week)", "(1 month)" given by the page.
- bar: met (attributed recommendation, rung 1) · independence: n/a · currency: living page
- counter: not run

### V-C-r1-practice-04-1
- claim: C-r1-practice-04
- source S-r1-practice-01 · hstspreload.org (curl) · quote-match: exact · P10 § "Submission Requirements": found verbatim
- looked first: Page lists valid certificate, HTTP-to-HTTPS redirect on same host if listening on port 80, all subdomains over HTTPS, and an HSTS header on the base domain with max-age at least 31536000, includeSubDomains and preload. It adds that older submissions (before 2017-10-11 / 2016-02-29) had lower max-age requirements (not claimed).
- implied: each listed requirement; "as of 2026-10-23".
- verdict: supported · reason: All requirements match; the claim's "on the base domain" is in the page's "Serve an HSTS header on the base domain for HTTPS requests".
- bar: met (descriptive, rung 1 for its own submission requirements) · independence: n/a · currency: page read 2026-10-23
- counter: not run

### V-C-r1-practice-05-1
- claim: C-r1-practice-05
- source S-r1-practice-01 · hstspreload.org (curl) · quote-match: exact · P12 § "Removal": found verbatim (line 65)
- looked first: page says inclusion cannot easily be undone; also says it will generally honor removal requests (line 66).
- implied: removal is possible; takes months to reach users via a Chrome update; no guarantees for other browsers.
- verdict: supported · reason: Verbatim.
- bar: met (descriptive, rung 1) · independence: n/a · currency: living page
- counter: not run

### V-C-r1-practice-06-1
- claim: C-r1-practice-06
- source S-r1-practice-01 · hstspreload.org (curl) · quote-match: exact · P9 § "Preloading HSTS": found verbatim (line 29)
- looked first: page says preload benefits are "minimal compared to the benefits provided by HSTS", and "While HSTS is recommended, HSTS preloading is not recommended"; it also describes the first-load problem preload solves and that submission is allowed if the operator still wants it.
- implied: attributed statement; Chrome and Safari auto-upgrade HTTP navigations regardless of HSTS; preloading helps only when upgrades fail under an active attacker.
- verdict: supported · reason: Each element is verbatim, and the claim keeps the attribution to hstspreload.org.
- bar: met for the attributed form (rung 1 supports "the preload list's operators say"); not usable in the chapter's own voice. The claim about what Chrome and Safari do is the Chrome team's report on a third party (Safari) and is vendor-about-itself in part. · independence: n/a · currency: living page; the sentence about "many browsers (Chrome, Safari)" is undated
- counter: not run

### V-C-r1-practice-07-1
- claim: C-r1-practice-07
- source S-r1-practice-01 · hstspreload.org (curl) · quote-match: exact · P7, P8 § "Preloading HSTS": found verbatim (line 28)
- looked first: page says Chrome keeps a built-in list of domains with a strong HSTS policy and HTTPS only, because the first load is unprotected; names Firefox, Safari, IE 11 and Edge as having lists based on Chrome's.
- implied: Chrome has a built-in list; Firefox, Safari, Edge have lists based on Chrome's.
- verdict: supported · reason: Verbatim (the claim omits IE 11, which is harmless).
- bar: below for the second half (rung 1 only for Chrome's own list; a statement about Firefox, Safari and Edge by the Chrome team is a third-party claim). MDN (S-r1-foundations-02, line 182 of its text) independently says "all browsers are using this preload list" and links Firefox's own list file; citing that passage would meet the bar for Firefox. · independence: hstspreload.org and MDN are different owners (Google, Mozilla) · currency: IE 11 is outdated; the claim does not use it
- counter: not run

## Counter-evidence
(none; no claim marked `main`, and the dispatch lists counter-evidence ids: none)

## Leads
- none
