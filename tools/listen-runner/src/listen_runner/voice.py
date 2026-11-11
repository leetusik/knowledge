"""Ming-3.0 0.5B through mlx-audio: loaded once, lazily, and unloaded after a long idle.

The claim's ``voice`` and ``profile`` are inside every part key, so the runner renders
exactly the pair it knows and refuses any other (``Unsupported`` → the job's ``fail``).
"""
from __future__ import annotations

import gc
import time
from typing import Callable, Optional

import numpy as np

from .split import voice_inputs

# The claim's voice → mlx-audio's built-in Ming voice name.
VOICES = {"ming3-us_emma": "US_Emma"}
# The profiles this runner encodes to (B2's packaging pin; the server's KB_LISTEN_PROFILE).
PROFILES = {"ming3-0.5b/aac-lc-48k-mono"}
DEFAULT_MODEL = "mlx-community/Ming-3.0-tts-0.5B-bf16"


class Unsupported(Exception):
    """The claim asks for a voice or profile this runner cannot render."""


class Lost(Exception):
    """The lease was lost while rendering: drop the job without calling fail."""


def check_supported(voice: str, profile: str) -> str:
    if voice not in VOICES:
        raise Unsupported(f"this runner renders voice {sorted(VOICES)}, not {voice!r}")
    if profile not in PROFILES:
        raise Unsupported(f"this runner encodes profile {sorted(PROFILES)}, not {profile!r}")
    return VOICES[voice]


def lang_code(lang: str) -> str:
    # Ming adds a "Target language: Korean." line for ko; English is its default.
    return "ko" if (lang or "").lower().startswith("ko") else "en"


class Voice:
    def __init__(self, model_id: str = DEFAULT_MODEL, seed: int = 0):
        self.model_id = model_id
        self.seed = seed
        self._model = None
        self.last_used = time.monotonic()
        self.load_seconds: Optional[float] = None

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def load(self):
        if self._model is None:
            from huggingface_hub import snapshot_download
            from mlx_audio.tts.utils import load_model

            t0 = time.perf_counter()
            try:  # the weights are in the Hugging Face cache: load offline
                path = snapshot_download(self.model_id, local_files_only=True)
            except Exception:
                path = snapshot_download(self.model_id)
            self._model = load_model(path)
            self.load_seconds = time.perf_counter() - t0
        self.last_used = time.monotonic()
        return self._model

    def unload(self) -> None:
        if self._model is None:
            return
        self._model = None
        gc.collect()
        import mlx.core as mx

        mx.clear_cache()

    @property
    def sample_rate(self) -> int:
        return int(self.load().sample_rate)

    def peak_gb(self) -> float:
        import mlx.core as mx

        return round(mx.get_peak_memory() / 1e9, 2)

    def render(self, text: str, voice_name: str, lang: str, pack_pause_s: float,
               check: Callable[[], None]) -> np.ndarray:
        """One segment's speech (float32 mono, the model's rate). ``check`` runs between
        calls and raises ``Lost`` to abandon the job."""
        import mlx.core as mx

        m = self.load()
        sr = int(m.sample_rate)
        pieces: list[np.ndarray] = []
        inputs = voice_inputs(text)
        for i, piece in enumerate(inputs):
            check()
            mx.random.seed(self.seed)  # reseed per call: the voice stays steadier (R5)
            for r in m.generate(piece, voice=voice_name, lang_code=lang_code(lang), verbose=False):
                pieces.append(np.array(r.audio, dtype=np.float32).reshape(-1))
            if i < len(inputs) - 1 and pack_pause_s > 0:
                pieces.append(np.zeros(int(round(sr * pack_pause_s)), dtype=np.float32))
        self.last_used = time.monotonic()
        if not pieces:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate(pieces)
