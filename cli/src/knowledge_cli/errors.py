"""The one error type that means "tell the user this, plainly, and stop".

`ApiError` (client.py) is an HTTP fact and `ConfigError` (config.py) is a file
fact; neither is a *message*. `CliError` is the third kind: a condition the user
can act on, already worded for them. `main()` prints it and exits 1 — so raising
one is how any command bails out without inventing its own exit plumbing.

It lives in its own leaf module because both `main` and the command modules need
it, and `main` imports the command modules (so they cannot import back).
"""

from __future__ import annotations


class CliError(Exception):
    """A user-facing failure. The message is the whole contract — write it well."""
