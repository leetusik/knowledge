"""Test hygiene: never let an ambient Gemini key make the suite hit the network.

The embedding feature keys off GOOGLE_API_KEY / GEMINI_API_KEY (config.py). If the
developer's shell exports one (e.g. right after the P4.S6 live smoke), an unguarded
test would try a real embed. This autouse fixture strips those vars for every test;
a test that exercises embeddings opts back in explicitly AND monkeypatches
``embeddings.embed_texts`` with a fake — so no test ever calls the API.
"""
import pytest


@pytest.fixture(autouse=True)
def _no_ambient_gemini_key(monkeypatch):
    for var in ("GOOGLE_API_KEY", "GEMINI_API_KEY", "GEMINI_EMBEDDING_MODEL"):
        monkeypatch.delenv(var, raising=False)
