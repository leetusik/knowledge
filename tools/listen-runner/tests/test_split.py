"""The Korean pre-split (mlx-audio 0.6.5 counts Hangul as zero, P41-sr.R5)."""
from listen_runner.split import packs, sentences, voice_inputs


def test_korean_sentence_boundaries():
    text = "오늘은 비가 왔다. 내일은 맑을까요? 정말 좋겠어요! 그럼 다시 만나요."
    assert sentences(text) == ["오늘은 비가 왔다.", "내일은 맑을까요?", "정말 좋겠어요!", "그럼 다시 만나요."]
    # packed up to the cap, never across it
    assert packs(text, max_chars=20) == ["오늘은 비가 왔다. 내일은 맑을까요?", "정말 좋겠어요! 그럼 다시 만나요."]


def test_long_korean_sentence_without_punctuation_is_broken_under_the_cap():
    text = " ".join(["아주 긴 문장이 마침표도 없이 계속 이어지고 있습니다"] * 8)
    out = voice_inputs(text, max_chars=100)
    assert len(out) > 1 and all(len(p) <= 100 for p in out)
    assert " ".join(out) == text


def test_english_passes_through_whole():
    text = "Listen reads this aloud. It is one segment, and mlx-audio splits it itself! Fine?"
    assert voice_inputs(text) == [text]
