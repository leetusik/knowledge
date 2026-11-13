Your client just got a `429` or a `503`. The server may also have told you when to come back, in a header called `Retry-After`. This chapter shows how to read that header, when to trust it, and how to fold it into a retry loop you can ship.

## Reader's task {#readers-task}

By the end you should be able to do three things:

1. **Parse** any `Retry-After` value into a number of seconds.
2. **Decide** how long to sleep, whether or not the header is there.
3. **Check** a retry loop against a short list of pitfalls.

## Background {#background}

> [!SKIP] Skip this if you already know 429 and 503
> A `429` is about *your* request rate. A `503` is the server saying it cannot handle the request. Both invite a later retry; the question is when.

**`429` and `503` say different things, and `Retry-After` can ride on both.** RFC 6585 defines `429` as the user having sent too many requests in a given amount of time, and says the response MAY include a `Retry-After` header indicating how long to wait before making a new request ([RFC 6585](#s-r1-found-02), httpwg.org). RFC 9110 says a server MAY send `Retry-After` on a `503` to suggest how long the client should wait before retrying ([RFC 9110](#s-r1-found-01), httpwg.org).

**The header is optional in both cases.** The word is MAY, so your client must have a plan for when it is absent. RFC 6585 goes further: servers are not required to use `429` at all, and may drop connections or take other steps instead ([RFC 6585](#s-r1-found-02)).

On a `503`, RFC 9110 reads the header as how long the service is expected to be unavailable to the client ([RFC 9110](#s-r1-found-01)). Responses with status `429` MUST NOT be stored by a cache ([RFC 6585](#s-r1-found-02)), so you will never get one replayed from a shared cache.

## Intuition {#intuition}

Think of `Retry-After` as the server telling you the earliest time worth knocking again. It is a hint about timing, not a promise that the retry will succeed.

```diagram #retry-flow
kind: flow
title: Deciding how long to wait after a 429 or 503
direction: right
nodes:
  - {id: resp, label: "429 or 503", shape: pill, tone: warn}
  - {id: has, label: "Retry-After present?", shape: box}
  - {id: parse, label: "Parse to seconds", sub: "integer or HTTP-date"}
  - {id: cap, label: "Cap the value", sub: "your own ceiling"}
  - {id: back, label: "Backoff with jitter", sub: "your own schedule", tone: muted}
  - {id: wait, label: "Sleep, then retry", shape: pill, tone: ok}
edges:
  - {from: resp, to: has}
  - {from: has, to: parse, label: yes}
  - {from: parse, to: cap}
  - {from: cap, to: wait}
  - {from: has, to: back, label: "no (or unparseable)", style: dashed}
  - {from: back, to: wait, style: dashed}
```

The rest of the chapter fills in each box.

## Worked example: parse, decide, wait {#worked-example}

### The two value forms {#value-forms}

```text title="Both examples from RFC 9110" #retry-after-examples
Retry-After: Fri, 31 Dec 1999 23:59:59 GMT
Retry-After: 120
```

**Your parser must accept two shapes.** The value is either an HTTP-date or a number of seconds to delay after receiving the response ([RFC 9110](#s-r1-found-01)). A seconds value is a non-negative decimal integer, so `120` is valid and `1.5` or `2m` are not ([RFC 9110](#s-r1-found-01)).

**The date form has three legal spellings.** A recipient that parses an HTTP field timestamp MUST accept all three HTTP-date formats, though senders MUST generate IMF-fixdate, and an HTTP-date is an instant in UTC ([RFC 9110](#s-r1-found-01)). Use a library date parser that handles all three, rather than one format string.

### A parser and a wait function {#code}

This is an illustration written for this chapter, not code from a library.

```python title="retry_after.py" #retry-after-py
import random
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

MAX_WAIT = 300.0  # your ceiling, in seconds


def parse_retry_after(value, now=None):
    """Return seconds to wait, or None if the header is missing or unusable."""
    if not value:
        return None
    value = value.strip()
    if value.isascii() and value.isdigit():      # delay-seconds: 1*DIGIT
        return float(value)
    try:                                          # otherwise an HTTP-date
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)  # HTTP-dates are UTC
    now = now or datetime.now(timezone.utc)
    return max(0.0, (when - now).total_seconds())


def wait_seconds(response, attempt, base=0.5):
    hinted = parse_retry_after(response.headers.get("Retry-After"))
    if hinted is not None:
        return min(hinted, MAX_WAIT)
    # no usable hint: capped exponential backoff with full jitter
    return random.uniform(0, min(MAX_WAIT, base * 2 ** attempt))
```

The structure matters more than the details. **Parse first, cap second, fall back third.** An unparseable value is treated like a missing one, so a malformed header can never crash the loop.

### Why cap the hint {#why-cap}

A server can send an hours-long delay. urllib3, a widely used Python HTTP library, limits any `Retry-After` larger than `retry_after_max` to that value, and its default is 21600 seconds ([urllib3 docs](#s-r1-prac-01), latest docs, accessed 2026-10-23). Pick a ceiling that fits your caller: a background job can sleep for hours, while a request-serving thread cannot.

### Backoff when there is no hint {#backoff}

urllib3 retries on 413, 429 and 503 when the header is present, by default, and its `Retry.sleep` uses the server's `Retry-After` if present and otherwise exponential backoff ([urllib3 docs](#s-r1-prac-01)). Its backoff is disabled by default (factor 0) ([urllib3 docs](#s-r1-prac-01)), so with the header absent you have to set a backoff yourself.

> [!NOTE]- Attributed advice on jitter
> The AWS Architecture Blog reports, from its own simulation of clients contending for a shared resource, that exponential backoff without jitter does more work and takes longer than jittered approaches, and says jittered backoff should be considered a standard approach for remote clients ([AWS Architecture Blog](#s-r1-prac-02)). That is AWS's finding about its own scenario, not a general proof for rate-limited HTTP APIs.

## The pre-ship checklist {#checklist}

Use this against your retry loop before you merge it.

- [ ] Both `Retry-After` forms parse: integer seconds and HTTP-date.
- [ ] A missing, empty or malformed header falls back to your own backoff instead of raising.
- [ ] The wait is capped at a ceiling you chose.
- [ ] Waits include jitter where many clients may retry together.
- [ ] Retries are bounded in number, not only in time.
- [ ] You do not blindly retry non-idempotent requests (below).

On that last item: RFC 9110's guidance on automatic retries says a client SHOULD NOT automatically retry a request with a non-idempotent method unless it knows the request is actually idempotent or can detect that the original was never applied, and SHOULD NOT automatically retry a failed automatic retry ([RFC 9110](#s-r1-found-01)). That text appears in the section on idempotent methods; read it as a caution for your design rather than a rule written specifically for `429` and `503`.

## Best practices & next steps {#best-practices}

**Where common practice lines up.** Honouring the header is built into urllib3: `respect_retry_after_header` and the 413/429/503 list ship in its `Retry` class, with a cap on large values ([urllib3 docs](#s-r1-prac-01)). Adding jitter to backoff is the approach AWS recommends for remote clients, on the strength of its own simulations ([AWS Architecture Blog](#s-r1-prac-02)).

**Where you must choose for yourself.** The standards leave the ceiling, the retry count and the fallback schedule to you ([RFC 9110](#s-r1-found-01), [RFC 6585](#s-r1-found-02)). The sample above picks 300 seconds and a half-second base as placeholders.

**Next steps:**

1. Port `parse_retry_after` to your language and unit-test it with `120`, an IMF-fixdate, both obsolete date formats, an empty string and garbage.
2. Replace any fixed `sleep(1)` retry with `wait_seconds`.
3. Log the hinted and the actual wait on every retry, so you can see whether servers are sending usable hints.
4. Add a retry budget (a maximum count per request) before you enable retries on non-idempotent calls.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-forms
    type: choice
    prompt: Which of these are valid `Retry-After` values? Select all that apply.
    options:
      - {id: a, text: "120"}
      - {id: b, text: "Fri, 31 Dec 1999 23:59:59 GMT"}
      - {id: c, text: "2m"}
      - {id: d, text: "1.5"}
    answer: [a, b]
    explain: The value is an HTTP-date or a non-negative decimal integer of seconds. Units like `2m` and fractions like `1.5` are not part of the grammar.
  - id: q-missing
    type: choice
    prompt: A server returns 503 with no `Retry-After`. What is the right reading?
    options:
      - {id: a, text: The response is malformed and should be discarded}
      - {id: b, text: "The header is optional, so the client needs its own backoff schedule"}
      - {id: c, text: The client must retry immediately}
    answer: [b]
    explain: RFC 9110 says the server MAY send the header on a 503, so its absence is normal.
  - id: q-cap
    type: recall
    prompt: Why should a client cap the wait it takes from `Retry-After`, and what does urllib3 do?
    answer: The value is the server's choice and can be very large, so the client bounds it to what its caller can tolerate. urllib3 limits larger values to `retry_after_max`, 21600 seconds by default.
  - id: q-formats
    type: cloze
    text: A recipient must accept {{three}} HTTP-date formats, but a sender must generate {{IMF-fixdate}}.
    explain: Two of the formats are obsolete but still must be parsed.
  - id: q-cache
    type: choice
    prompt: Can a shared cache store and replay a 429 response?
    options:
      - {id: a, text: "Yes, for as long as Retry-After says"}
      - {id: b, text: "No, a 429 response MUST NOT be stored by a cache"}
      - {id: c, text: "Only if the request was a GET"}
    answer: [b]
    explain: RFC 6585 states that responses with status 429 MUST NOT be stored by a cache.
```

## Sources {#sources-list}

```sources #sources
items:
  - id: s-r1-found-01
    title: "RFC 9110: HTTP Semantics"
    url: https://httpwg.org/specs/rfc9110.html
    publisher: IETF / HTTP Working Group
    date: "2022-06"
    accessed: 2026-10-23
  - id: s-r1-found-02
    title: "RFC 6585: Additional HTTP Status Codes"
    url: https://httpwg.org/specs/rfc6585.html
    publisher: IETF / HTTP Working Group
    date: "2012-04"
    accessed: 2026-10-23
  - id: s-r1-prac-01
    title: urllib3.util reference (Retry)
    url: https://urllib3.readthedocs.io/en/latest/reference/urllib3.util.html
    publisher: urllib3 project
    accessed: 2026-10-23
    note: Latest docs; older versions may lack retry_after_max.
  - id: s-r1-prac-02
    title: Exponential Backoff And Jitter
    url: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
    publisher: AWS Architecture Blog
    accessed: 2026-10-23
```
