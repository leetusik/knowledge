---
format: native
syntax: 1
---
## Rate limits {#rate-limit}

A [token bucket](term:token-bucket) refills at a fixed rate, and each request takes a token.
When it is empty, the [*rate limit*](term:rate-limit) answers [429](term:http-429).
The [glossary](#glossary) lists every term; [this section](#rate-limit) is a heading id, not a term id.

- A [burst](term:burst) spends the tokens saved up while the client was idle.

> [!NOTE] Why a [bucket](term:token-bucket)
> It smooths traffic without a queue.

```figure #bucket
src: bucket.png
alt: A bucket with tokens dripping in at the top and requests drawing them out at the bottom.
caption: A [token bucket](term:token-bucket) refilling while requests drain it.
```

```quiz #check
items:
  - id: refill
    type: recall
    prompt: What does an empty [token bucket](term:token-bucket) answer?
    answer: 429, too many requests.
    explain: The [rate limit](term:rate-limit) holds until a token drips in.
```

```glossary #glossary
terms:
  - id: token-bucket
    term: Token bucket
    aliases: [bucket]
    short: A counter of tokens that refills at a fixed rate; each request takes one.
    long: The bucket holds at most its *capacity*, so a long idle spell saves up only that many requests.
  - id: rate-limit
    term: Rate limit
    short: The most requests a client may send in a window of time.
  - id: http-429
    term: "429"
    aliases: [Too Many Requests, HTTP 429]
    short: The status a server sends when a client is over its `rate limit`.
  - id: burst
    term: Burst
    short: Several requests at once, paid for with saved tokens.
```

## Sources {#sources-list}

- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585), section 4.
