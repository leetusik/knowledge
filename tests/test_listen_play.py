"""Listen's audio delivery (P41-sr.B2) — the core guarantees only.

1. **Range:** a made part is served through its unit with byte ranges (``206`` with
   ``Content-Range``, ``416`` past the end), and only to a caller who may read its
   document; an upload that is not the pinned packaging is refused with a reason.
2. **The playlist:** ``EVENT`` with a discontinuity between two made parts, stopping
   before an unmade one; making the rest only appends lines and ``EXT-X-ENDLIST``,
   under the same URL; the timeline adds the very durations the ``EXTINF`` lines
   carry.
3. **The fragment index from bytes** (no Postgres): the synthetic fixture (half a
   second of sine, then silence, in the pinned packaging) indexes to its byte ranges
   and durations; other shapes are refused.

1 and 2 are Postgres-gated through B1's ``listen`` fixture, so they skip without a
disposable ``KB_TEST_DATABASE_URL``.
"""

from __future__ import annotations

import hashlib
import posixpath
import re
from pathlib import Path
from uuid import uuid4

import pytest

from server.listen_mp4 import PackagingError, index_part

from tests.test_documents_api import _signup, documents_client  # noqa: F401
from tests.test_listen import listen  # noqa: F401

PART = (Path(__file__).parent / "fixtures" / "listen" / "part.m4a").read_bytes()


def _upload(c, r, key: str, data: bytes):
    return c.put(
        f"/api/listen/parts/{key}", content=data,
        headers={**r, "Content-Type": "audio/mp4",
                 "X-Content-SHA256": hashlib.sha256(data).hexdigest()},
    )


def _make(listen, count: int) -> None:
    """The runner's round trip for the next ``count`` parts, in reading order."""

    c, r = listen.client, listen.r
    for _ in range(count):
        job = c.post("/api/listen/jobs/claim", headers=r).json()
        assert _upload(c, r, job["part_key"], PART).status_code == 201
        done = c.post(f"/api/listen/jobs/{job['job']}/finish", headers=r,
                      json={"segment_seconds": [1.0] * len(job["segments"])})
        assert done.status_code == 200, done.text


def _state(listen) -> dict:
    return listen.client.get("/app/listen/state", headers=listen.h, params=listen.body).json()


def test_part_is_served_with_byte_ranges(listen):
    c, h = listen.client, listen.h
    job = c.post("/api/listen/jobs/claim", headers=listen.r).json()
    wrong = PART.replace(b"mvex", b"free")  # a progressive MP4, not the fragmented pin
    refused = _upload(c, listen.r, job["part_key"], wrong)
    assert refused.status_code == 422 and "not the pinned packaging" in refused.json()["detail"]
    assert _upload(c, listen.r, job["part_key"], PART).status_code == 201
    assert c.post(f"/api/listen/jobs/{job['job']}/finish", headers=listen.r, json={}).status_code == 200

    play = _state(listen)["play"]
    base = posixpath.dirname(play["playlist"])
    uri = next(x for x in c.get(play["playlist"], headers=h).text.splitlines()
               if x and not x.startswith("#"))
    url = f"{base}/{uri}"
    res = c.get(url, headers={**h, "Range": "bytes=0-99"})
    assert res.status_code == 206 and res.content == PART[:100]
    assert res.headers["content-range"] == f"bytes 0-99/{len(PART)}"
    assert res.headers["content-type"] == "audio/mp4"
    assert res.headers["accept-ranges"] == "bytes" and res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["cache-control"].startswith("private, max-age=")
    assert c.get(url, headers={**h, "Range": f"bytes={len(PART)}-"}).status_code == 416

    # The one 404: a part not made yet, and a stranger to this private project.
    assert c.get(url.replace("/0.m4a", "/1.m4a"), headers=h).status_code == 404
    stranger, _ = _signup(c, f"stranger-{uuid4()}@example.com")
    assert c.get(url, headers={**stranger, "Range": "bytes=0-99"}).status_code == 404
    assert c.get(play["playlist"], headers=stranger).status_code == 404


def test_playlist_grows_by_appending_only(listen):
    c, h = listen.client, listen.h
    _make(listen, 2)  # parts 1 and 2 of 4
    play = _state(listen)["play"]
    first = c.get(play["playlist"], headers=h)
    assert first.status_code == 200
    assert first.headers["content-type"].startswith("application/vnd.apple.mpegurl")
    assert first.headers["cache-control"] == "no-store"
    text = first.text
    assert "#EXT-X-PLAYLIST-TYPE:EVENT" in text and "#EXT-X-START:TIME-OFFSET=0" in text
    assert "#EXT-X-ENDLIST" not in text
    assert text.count("#EXT-X-MAP:") == 2 and text.count("#EXT-X-DISCONTINUITY") == 1
    uris = [x for x in text.splitlines() if x and not x.startswith("#")]
    assert sorted({u.rsplit("/", 1)[1] for u in uris}) == ["0.m4a", "1.m4a"]  # not part 3

    _make(listen, 2)
    state = _state(listen)
    assert state["play"] == play  # the same units play: the same URL
    done = c.get(play["playlist"], headers=h).text
    assert done.startswith(text) and done.endswith("#EXT-X-ENDLIST\n")
    assert done.count("#EXT-X-DISCONTINUITY") == 3

    # One time axis: the timeline adds the EXTINF durations, as the state's len does.
    extinf = [round(float(x) * 1_000_000) for x in re.findall(r"#EXTINF:([0-9.]+),", done)]
    timeline = c.get(play["timeline"], headers=h).json()
    assert round(timeline["len"] * 1_000_000) == sum(extinf) and timeline["complete"] is True
    entry = timeline["entries"][0]
    per_part = sum(extinf) // 4
    assert [round(p["start"] * 1_000_000) for p in entry["parts"]] == [0, per_part, 2 * per_part,
                                                                       3 * per_part]
    assert entry["segments"][0]["start"] == 0 and entry["segments"][-1]["start"] < timeline["len"]
    assert abs(state["len"] - timeline["len"]) < 0.002


def test_fragment_index_from_bytes():
    index = index_part(PART)
    assert (index.sample_rate, index.channels, index.timescale) == (44100, 1, 44100)
    assert index.init == 692
    assert [(f.offset, f.size, f.samples) for f in index.fragments] == [(692, 5351, 259),
                                                                        (6043, 460, 44)]
    # 259 AAC frames of 1024 samples at 44.1 kHz; the last frame is trimmed in trun.
    assert [f.duration_us for f in index.fragments] == [6013968, 1009252]
    assert index.init + sum(f.size for f in index.fragments) == len(PART)

    for bad, reason in [
        (PART.replace(b"mvex", b"free"), "not a fragmented MP4"),
        (PART[:-100], "overruns"),
        (b"RIFF" + bytes(60), "does not start with ftyp"),
    ]:
        with pytest.raises(PackagingError, match=reason):
            index_part(bad)
