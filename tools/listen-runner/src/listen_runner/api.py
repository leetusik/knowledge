"""B1's runner API (``/api/listen/…``), over the standard library's urllib.

The key travels only in the Authorization header and is never logged or put in an
exception message.
"""
from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional

USER_AGENT = "kb-listen-runner/0.1"


@dataclass
class Reply:
    status: int
    body: Any  # parsed JSON, or None

    @property
    def detail(self) -> str:
        if isinstance(self.body, dict):
            return str(self.body.get("detail", ""))
        return ""


class NetworkError(Exception):
    """The server could not be reached (connection refused, DNS, timeout, a 5xx)."""


class Api:
    def __init__(self, base_url: str, key: str, timeout: float = 60.0):
        self.base = base_url.rstrip("/")
        self._key = key
        self.timeout = timeout

    def __repr__(self) -> str:  # never show the key
        return f"Api({self.base!r})"

    def _call(self, method: str, path: str, body: Optional[bytes] = None,
              headers: Optional[dict[str, str]] = None, timeout: Optional[float] = None) -> Reply:
        h = {"Authorization": f"Bearer {self._key}", "User-Agent": USER_AGENT}
        if headers:
            h.update(headers)
        req = urllib.request.Request(self.base + path, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as r:
                status, raw = r.status, r.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            raise NetworkError(f"{method} {path}: {type(e).__name__}") from None
        if status >= 500:
            raise NetworkError(f"{method} {path}: HTTP {status}")
        try:
            parsed = json.loads(raw) if raw else None
        except ValueError:
            parsed = None
        return Reply(status, parsed)

    def _json(self, method: str, path: str, payload: Any = None) -> Reply:
        data = None if payload is None else json.dumps(payload).encode()
        hdr = {"Content-Type": "application/json"} if data is not None else {}
        return self._call(method, path, data, hdr)

    def claim(self) -> Reply:
        return self._json("POST", "/api/listen/jobs/claim")

    def heartbeat(self, job: str) -> Reply:
        return self._call("POST", f"/api/listen/jobs/{job}/heartbeat", timeout=30)

    def upload(self, part_key: str, data: bytes, seconds: float) -> Reply:
        return self._call("PUT", f"/api/listen/parts/{part_key}", data, {
            "Content-Type": "audio/mp4",
            "X-Content-SHA256": hashlib.sha256(data).hexdigest(),
            "X-Audio-Seconds": f"{seconds:.6f}",
        }, timeout=300)

    def finish(self, job: str, seconds: float, segment_seconds: list[float]) -> Reply:
        return self._json("POST", f"/api/listen/jobs/{job}/finish",
                          {"seconds": round(seconds, 6), "segment_seconds": [round(s, 6) for s in segment_seconds]})

    def fail(self, job: str, error: str) -> Reply:
        return self._json("POST", f"/api/listen/jobs/{job}/fail", {"error": error[:2000]})
