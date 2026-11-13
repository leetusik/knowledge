# Brief: 20261023-1058-honouring-retry-after-on-429-and-503
- subject: how an HTTP client should honour the Retry-After header on 429 and 503 responses · mode: general · run: quick
- reader: a backend developer who writes API clients · purpose: implement correct Retry-After handling in a client (parse both forms, decide when to retry, combine with backoff, cap)
- must-cover: none · leave-out: none
- trusted sources: none · lang: en · placement: loose (project http-clients, subject "HTTP clients")
- prior: none (checked after preflight) · open: reader's language/library unspecified; no depth stated
