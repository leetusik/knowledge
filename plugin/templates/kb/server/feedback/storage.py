"""Feedback attachment storage (ported from vocky's ``storage/``).

``AttachmentStorage`` is the backend-neutral interface (``save``, ``load``,
``delete``); ``LocalFilesystemAttachmentStorage`` keeps each object as a file under
one root directory and refuses any key that is empty, absolute or resolves outside
that root, so no key can reach a file beside it. A write goes to a sibling temp
file and is moved into place with ``os.replace``, so a reader never sees half an
object. An S3-style backend can be added behind the same interface later.

The directory is ``KB_FEEDBACK_ATTACHMENTS_DIR`` (a named volume in production),
else ``KB_ROOT/data/feedback-attachments``. It is read here, at call time, until a
``server.config`` helper takes it over. Upload limits and MIME sniffing are the
route layer's, not this module's.
"""

from __future__ import annotations

import contextlib
import os
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path

from server import config

ATTACHMENTS_DIR_ENV = "KB_FEEDBACK_ATTACHMENTS_DIR"


class StorageError(RuntimeError):
    """Raised when an attachment object cannot be written, read, or deleted."""


class StorageObjectNotFoundError(StorageError):
    """Raised when a requested attachment object does not exist."""


class AttachmentStorage(ABC):
    """Backend-neutral interface for storing attachment bytes."""

    @abstractmethod
    def save(self, key: str, data: bytes) -> None:
        """Persist ``data`` under ``key``, overwriting any existing object."""

    @abstractmethod
    def load(self, key: str) -> bytes:
        """Return the bytes stored under ``key``.

        Raises ``StorageObjectNotFoundError`` when no object exists for ``key``.
        """

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove the object stored under ``key``.

        Raises ``StorageObjectNotFoundError`` when no object exists for ``key``.
        """


class LocalFilesystemAttachmentStorage(AttachmentStorage):
    """Store attachment bytes as files under a single root directory."""

    def __init__(self, root_dir: str | os.PathLike[str]) -> None:
        self._root = Path(root_dir).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def root(self) -> Path:
        """The resolved root directory."""

        return self._root

    def _resolve_key(self, key: str) -> Path:
        """Resolve ``key`` to a path inside the root, rejecting traversal."""

        if not key or os.path.isabs(key):
            raise StorageError(f"invalid storage key: {key!r}")

        candidate = (self._root / key).resolve()
        if not candidate.is_relative_to(self._root) or candidate == self._root:
            raise StorageError(f"storage key escapes root: {key!r}")

        return candidate

    def save(self, key: str, data: bytes) -> None:
        target = self._resolve_key(key)
        target.parent.mkdir(parents=True, exist_ok=True)

        fd, tmp_name = tempfile.mkstemp(dir=target.parent, prefix=".tmp-")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
            os.replace(tmp_name, target)
        except OSError as exc:
            with contextlib.suppress(OSError):
                os.unlink(tmp_name)
            raise StorageError(f"failed to write storage object: {key!r}") from exc

    def load(self, key: str) -> bytes:
        target = self._resolve_key(key)
        try:
            return target.read_bytes()
        except FileNotFoundError as exc:
            raise StorageObjectNotFoundError(f"storage object not found: {key!r}") from exc
        except OSError as exc:
            raise StorageError(f"failed to read storage object: {key!r}") from exc

    def delete(self, key: str) -> None:
        target = self._resolve_key(key)
        try:
            target.unlink()
        except FileNotFoundError as exc:
            raise StorageObjectNotFoundError(f"storage object not found: {key!r}") from exc
        except OSError as exc:
            raise StorageError(f"failed to delete storage object: {key!r}") from exc


def attachments_dir() -> Path:
    """``KB_FEEDBACK_ATTACHMENTS_DIR``, else ``KB_ROOT/data/feedback-attachments``."""

    override = os.environ.get(ATTACHMENTS_DIR_ENV)
    if override:
        return Path(override)
    return config.kb_root() / "data" / "feedback-attachments"


def get_attachment_storage() -> AttachmentStorage:
    """Return the configured attachment storage backend (creates the directory)."""

    return LocalFilesystemAttachmentStorage(attachments_dir())
