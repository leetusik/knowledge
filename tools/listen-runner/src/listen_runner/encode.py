"""One part: a WAV at the voice's native rate, then B2's pinned ffmpeg command.

The command is P41-sr.B2's § Packaging "B3's exact command", verbatim: one fragmented
MP4 (empty moov, default-base-moof, no trailer, ~6 s fragments), AAC-LC mono 48 kbps
CBR from AudioToolbox (``aac_at``), at the input's rate (no ``-ar``). The server
refuses any other shape with a 422, so change nothing here without changing the
server's pin and ``KB_LISTEN_PROFILE``.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np


def find_ffmpeg(explicit: str | None = None) -> str:
    for c in (explicit, shutil.which("ffmpeg"), "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"):
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    raise FileNotFoundError("ffmpeg not found (set KB_LISTEN_FFMPEG)")


def write_wav(path: Path, audio: np.ndarray, sample_rate: int) -> None:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767.0).round().astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.tobytes())


def pinned_command(ffmpeg: str, wav: Path, out: Path) -> list[str]:
    return [
        ffmpeg, "-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", str(wav),
        "-map", "0:a:0", "-ac", "1",
        "-c:a", "aac_at", "-aac_at_mode", "cbr", "-b:a", "48k", "-map_metadata", "-1", "-fflags", "+bitexact",
        "-f", "mp4", "-movflags", "+empty_moov+default_base_moof+skip_trailer", "-frag_duration", "6000000",
        str(out),
    ]


class EncodeError(Exception):
    pass


def encode_part(ffmpeg: str, audio: np.ndarray, sample_rate: int, workdir: Path) -> bytes:
    wav = workdir / "part.wav"
    out = workdir / "part.m4a"
    write_wav(wav, audio, sample_rate)
    r = subprocess.run(pinned_command(ffmpeg, wav, out), capture_output=True, text=True)
    if r.returncode != 0 or not out.exists():
        last = (r.stderr.strip().splitlines() or ["no output"])[-1][:200]
        raise EncodeError(f"ffmpeg exited {r.returncode}: {last}")
    return out.read_bytes()
