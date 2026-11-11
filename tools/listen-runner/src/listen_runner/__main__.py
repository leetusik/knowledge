"""The Listen runner: claim a job, render it with Ming-3.0 US_Emma, encode it to B2's
pin, upload it, then finish (or fail). One line per event to stdout; never the key,
never segment text.

    uv run --project tools/listen-runner python -m listen_runner [--once] [--env-file PATH]
"""
from __future__ import annotations

import argparse
import datetime as _dt
import os
import signal
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import api as _api
from .encode import EncodeError, encode_part, find_ffmpeg
from .split import looks_like_heading
from .voice import DEFAULT_MODEL, Lost, Unsupported, Voice, check_supported

HERE = Path(__file__).resolve().parents[2]  # tools/listen-runner
BACKOFF_MAX_S = 300.0


def log(event: str, **fields) -> None:
    ts = _dt.datetime.now().astimezone().isoformat(timespec="seconds")
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    print(f"{ts} {event} {extra}".rstrip(), flush=True)


def load_env_file(path: Path) -> None:
    """KEY=VALUE lines; the process environment wins over the file."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        if k and v and k not in os.environ:
            os.environ[k] = v


@dataclass
class Config:
    url: str
    key: str
    poll_s: float
    pause_s: float
    section_pause_s: float
    pack_pause_s: float
    idle_unload_s: float
    seed: int
    model: str
    ffmpeg: str | None

    def __repr__(self) -> str:  # never show the key
        return f"Config(url={self.url!r}, poll_s={self.poll_s})"

    @classmethod
    def from_env(cls) -> "Config":
        def f(name: str, default: float) -> float:
            raw = os.environ.get(name, "").strip()
            return float(raw) if raw else default

        url = os.environ.get("KB_LISTEN_URL", "").strip()
        key = os.environ.get("KB_LISTEN_KEY", "").strip()
        if not url or not key:
            raise SystemExit("KB_LISTEN_URL and KB_LISTEN_KEY must be set (tools/listen-runner/.env)")
        if not key.startswith("vk_"):
            raise SystemExit("KB_LISTEN_KEY must be an org-level vk_ key")
        return cls(
            url=url, key=key,
            poll_s=max(5.0, f("KB_LISTEN_POLL_S", 30.0)),
            pause_s=f("KB_LISTEN_PAUSE_S", 0.35),
            section_pause_s=f("KB_LISTEN_SECTION_PAUSE_S", 0.9),
            pack_pause_s=f("KB_LISTEN_SENTENCE_PAUSE_S", 0.1),
            idle_unload_s=f("KB_LISTEN_IDLE_UNLOAD_S", 1800.0),
            seed=int(f("KB_LISTEN_SEED", 0)),
            model=os.environ.get("KB_LISTEN_MODEL", "").strip() or DEFAULT_MODEL,
            ffmpeg=os.environ.get("KB_LISTEN_FFMPEG", "").strip() or None,
        )


class Heartbeat(threading.Thread):
    """Extends the lease while a job renders; a 409 or 404 sets ``lost``."""

    def __init__(self, api: _api.Api, job: str, every_s: float):
        super().__init__(daemon=True)
        self.api, self.job, self.every_s = api, job, every_s
        self.stop = threading.Event()
        self.lost = threading.Event()

    def run(self) -> None:
        while not self.stop.wait(self.every_s):
            try:
                r = self.api.heartbeat(self.job)
            except _api.NetworkError as e:
                log("heartbeat-error", job=self.job, error=str(e))
                continue
            if r.status in (404, 409):
                log("lease-lost", job=self.job, status=r.status)
                self.lost.set()
                return


class Awake:
    """Hold idle sleep off (``caffeinate -i``) only while a job renders."""

    def __enter__(self):
        try:
            self.p = subprocess.Popen(["/usr/bin/caffeinate", "-i", "-w", str(os.getpid())],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError:
            self.p = None
        return self

    def __exit__(self, *exc):
        if self.p is not None:
            self.p.terminate()
            try:
                self.p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.p.kill()
        return False


def is_section_start(seg: dict, prev: dict | None) -> bool:
    if prev is None:
        return False
    if "section" in seg and "section" in prev:  # if the claim ever carries it, it wins
        return seg["section"] != prev["section"]
    return looks_like_heading(seg.get("text", ""))


class Runner:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.api = _api.Api(cfg.url, cfg.key)
        self.voice = Voice(cfg.model, cfg.seed)
        self.ffmpeg = find_ffmpeg(cfg.ffmpeg)
        self.stopping = False

    # -- one job ------------------------------------------------------------
    def handle(self, job: dict) -> str:
        jid = job["job"]
        segs = job.get("segments") or []
        log("claimed", job=jid, part=job["part_key"][:12], lang=job.get("lang"), segments=len(segs),
            attempt=f"{job.get('attempt')}/{job.get('max_attempts')}", est_s=job.get("est_seconds"))
        try:
            voice_name = check_supported(job.get("voice", ""), job.get("profile", ""))
        except Unsupported as e:
            return self._fail(jid, str(e))
        hb = Heartbeat(self.api, jid, every_s=min(self.cfg.poll_s, max(5.0, job.get("lease_seconds", 600) / 4)))
        hb.start()
        try:
            with tempfile.TemporaryDirectory(prefix="kb-listen-") as tmp:
                try:
                    with Awake():
                        audio, seconds, sr, render_s = self._render(job, voice_name, hb)
                        data = encode_part(self.ffmpeg, audio, sr, Path(tmp))
                except Lost:
                    log("dropped", job=jid, reason="lease lost while rendering")
                    return "dropped"
                except EncodeError as e:
                    return self._fail(jid, f"encode failed: {e}")
                except Exception as e:  # render: never echo text, only the error's type
                    return self._fail(jid, f"render failed: {type(e).__name__}")
                total = float(sum(seconds))
                log("rendered", job=jid, seconds=f"{total:.2f}", render_s=f"{render_s:.1f}",
                    rtf=f"{render_s / max(total, 1e-6):.3f}", bytes=len(data), peak_gb=self.voice.peak_gb())
            if hb.lost.is_set():
                log("dropped", job=jid, reason="lease lost")
                return "dropped"
            return self._deliver(jid, job["part_key"], data, total, seconds)
        finally:
            hb.stop.set()

    def _render(self, job: dict, voice_name: str, hb: Heartbeat):
        def check():
            if hb.lost.is_set():
                raise Lost()

        t0 = time.perf_counter()
        if not self.voice.loaded:
            self.voice.load()  # once, lazily, at the first job (and after an idle unload)
            log("model-loaded", model=self.voice.model_id, load_s=f"{self.voice.load_seconds:.1f}")
            t0 = time.perf_counter()  # the RTF counts rendering, not the load
        sr = self.voice.sample_rate
        segs = job.get("segments") or []
        pieces: list[np.ndarray] = []
        seconds: list[float] = []
        for i, seg in enumerate(segs):
            speech = self.voice.render(seg.get("text", ""), voice_name, job.get("lang", "en"),
                                       self.cfg.pack_pause_s, check)
            n = len(speech)
            if i < len(segs) - 1:
                gap = self.cfg.section_pause_s if is_section_start(segs[i + 1], seg) else self.cfg.pause_s
                if looks_like_heading(seg.get("text", "")) and gap < self.cfg.section_pause_s:
                    gap = max(gap, (self.cfg.pause_s + self.cfg.section_pause_s) / 2)  # a beat after a heading
                pad = np.zeros(int(round(sr * gap)), dtype=np.float32)
                pieces += [speech, pad]
                n += len(pad)
            else:
                pieces.append(speech)
            seconds.append(n / sr)
        check()
        audio = np.concatenate(pieces) if pieces else np.zeros(0, dtype=np.float32)
        if len(audio) == 0:
            raise ValueError("no audio rendered")
        return audio, seconds, sr, time.perf_counter() - t0

    def _deliver(self, jid: str, part_key: str, data: bytes, total: float, seconds: list[float]) -> str:
        up = self.api.upload(part_key, data, total)
        if up.status in (200, 201):
            log("uploaded", job=jid, status=up.status, bytes=len(data))
        elif up.status == 409 and "already stored" in up.detail:
            log("uploaded", job=jid, status=409, note="already stored; the stored file stands")
        elif up.status == 409:
            log("dropped", job=jid, reason="no live lease on upload")
            return "dropped"
        else:
            return self._fail(jid, f"upload refused: HTTP {up.status}: {up.detail[:300]}")
        fin = self.api.finish(jid, total, seconds)
        if fin.status == 200:
            b = fin.body or {}
            log("finished", job=jid, seconds=b.get("seconds"), units=len(b.get("units") or []))
            return "finished"
        if fin.status in (404, 409):
            log("dropped", job=jid, reason=f"finish answered {fin.status}")
            return "dropped"
        return self._fail(jid, f"finish refused: HTTP {fin.status}")

    def _fail(self, jid: str, message: str) -> str:
        try:
            r = self.api.fail(jid, message)
            state = (r.body or {}).get("state") if r.status == 200 else f"HTTP {r.status}"
        except _api.NetworkError as e:
            state = f"unsent ({e})"
        log("failed", job=jid, state=state, reason=repr(message[:200]))
        return "failed"

    # -- the loop -----------------------------------------------------------
    def run(self, once: bool = False) -> int:
        log("start", server=self.cfg.url, poll_s=self.cfg.poll_s, once=once)
        backoff = 0.0
        while not self.stopping:
            try:
                r = self.api.claim()
            except _api.NetworkError as e:
                backoff = min(BACKOFF_MAX_S, max(self.cfg.poll_s, backoff * 2 or self.cfg.poll_s))
                log("claim-error", error=str(e), retry_s=int(backoff))
                if once:
                    return 1
                self._sleep(backoff)
                continue
            backoff = 0.0
            if r.status == 200 and r.body:
                try:
                    self.handle(r.body)
                except _api.NetworkError as e:  # mid-job: the lease expires and the job is claimed again
                    log("job-network-error", job=r.body.get("job"), error=str(e))
                    if not once:
                        self._sleep(self.cfg.poll_s)
                if once:
                    return 0
                continue  # look for the next job at once
            if r.status != 204:
                log("claim-refused", status=r.status, detail=r.detail[:200])
                if r.status in (401, 403):  # a bad key: say so, and wait long rather than exit-loop
                    if once:
                        return 2
                    self._sleep(BACKOFF_MAX_S)
                    continue
            if once:
                log("idle", note="no job")
                return 0
            if self.voice.loaded and time.monotonic() - self.voice.last_used > self.cfg.idle_unload_s:
                self.voice.unload()
                log("unloaded", idle_s=int(self.cfg.idle_unload_s))
            self._sleep(self.cfg.poll_s)
        log("stop")
        return 0

    def _sleep(self, s: float) -> None:
        end = time.monotonic() + s
        while not self.stopping and time.monotonic() < end:
            time.sleep(min(1.0, end - time.monotonic()))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="listen_runner", description=__doc__.split("\n\n")[0])
    ap.add_argument("--once", action="store_true", help="handle at most one job, then exit")
    ap.add_argument("--env-file", type=Path, default=HERE / ".env",
                    help="KEY=VALUE settings (default: tools/listen-runner/.env)")
    a = ap.parse_args(argv)
    load_env_file(a.env_file)
    runner = Runner(Config.from_env())

    def _stop(*_):
        runner.stopping = True

    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    return runner.run(once=a.once)


if __name__ == "__main__":
    sys.exit(main())
