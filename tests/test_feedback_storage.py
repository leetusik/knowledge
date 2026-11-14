"""Feedback attachment storage: the local-disk backend stays inside its directory.

No database: runs on ``tmp_path``.
"""

from __future__ import annotations

import pytest

from server.feedback.storage import (
    LocalFilesystemAttachmentStorage,
    StorageError,
    StorageObjectNotFoundError,
    attachments_dir,
)


def test_round_trips_bytes_under_nested_keys(tmp_path):
    storage = LocalFilesystemAttachmentStorage(tmp_path / "att")
    storage.save("2026/11/shot.png", b"\x89PNG data")
    assert storage.load("2026/11/shot.png") == b"\x89PNG data"
    storage.save("2026/11/shot.png", b"v2")  # overwrite in place
    assert storage.load("2026/11/shot.png") == b"v2"
    assert [p.name for p in (tmp_path / "att" / "2026" / "11").iterdir()] == ["shot.png"]
    storage.delete("2026/11/shot.png")
    with pytest.raises(StorageObjectNotFoundError):
        storage.load("2026/11/shot.png")
    with pytest.raises(StorageObjectNotFoundError):
        storage.delete("2026/11/shot.png")


@pytest.mark.parametrize(
    "key",
    ["", "/etc/passwd", "../outside.png", "a/../../outside.png", "..", ".", "link/x.png"],
)
def test_refuses_keys_that_leave_the_directory(tmp_path, key):
    root = tmp_path / "att"
    storage = LocalFilesystemAttachmentStorage(root)
    (tmp_path / "elsewhere").mkdir()
    (root / "link").symlink_to(tmp_path / "elsewhere")  # a symlink out of the root
    (tmp_path / "outside.png").write_bytes(b"secret")

    for act in (lambda: storage.save(key, b"x"), lambda: storage.load(key),
                lambda: storage.delete(key)):
        with pytest.raises(StorageError):
            act()
    assert (tmp_path / "outside.png").read_bytes() == b"secret"
    assert list((tmp_path / "elsewhere").iterdir()) == []


def test_directory_comes_from_the_env(tmp_path, monkeypatch):
    monkeypatch.setenv("KB_FEEDBACK_ATTACHMENTS_DIR", str(tmp_path / "vol"))
    assert attachments_dir() == tmp_path / "vol"
    monkeypatch.setenv("KB_FEEDBACK_ATTACHMENTS_DIR", "")
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    assert attachments_dir() == tmp_path.resolve() / "data" / "feedback-attachments"
