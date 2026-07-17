#!/usr/bin/env python3
"""End-to-end smoke for the installed ``knowledge`` CLI (P13.S5).

The sibling of ``scripts/onboarding_smoke.py``: where that drives the raw HTTP
surface, this drives the **installed** ``knowledge`` binary as a user's agent
would — one ``subprocess`` per command, under a throwaway ``XDG_CONFIG_HOME`` so it
never touches the operator's real ``~/.config/knowledge-kb``. It proves the whole
lifecycle end to end and, above all, that P13.S5's server-side ``/auth`` throttle
trips and the CLI surfaces the 429 cleanly.

What it drives and asserts, against a running local stack (``--base-url
http://localhost:8766``, tenant mode):

  1. ``init``      — signup -> project -> mint a ``vk_`` -> write the config seam
                     (0600, ``api.token=vk_...``), and the seam resolves as configured.
  2. ``projects``  — empty-state BEFORE the first save (``/api/projects`` is a
                     GROUP BY over documents, so a just-made project is absent).
  3. ``save``      — a document, 2 tags; capture its id.
  4. ``list``      — the saved id is listed.
  5. ``search``    — a unique token finds the document.
  6. ``read``      — the body round-trips byte-for-byte (frontmatter excluded).
  7. ``projects``  — the project is present now that it has a document.
  8. ``usage``     — works while the session is live.
  9. ``logout``    — revokes the session; leaves ``api.token`` alone.
 10. post-logout   — ``save``/``search`` STILL work on the non-expiring ``vk_``,
                     while ``usage`` fails (needs a session) — the two-token model,
                     visible from the terminal.
 11. the throttle  — hammer ``login`` with a wrong password from one IP: the first
                     attempts return the generic 401 (unknown-email and
                     wrong-password byte-identical — enumeration safety), then the
                     configured limit trips a **429** the CLI surfaces as a clean
                     ``error: HTTP 429 ...`` (not a hang, not a raw body).

Assumes the caller has already: brought up the stack (``docker compose up -d
postgres api``), migrated it (``docker compose exec -T api uv run alembic upgrade
head`` — the container form; the host has no DATABASE_URL route to postgres), and
installed the CLI (``uv tool install ./cli --reinstall`` — never ``--force``, uv
reuses the cached wheel). The throttle assertion expects a FRESH stack (an empty
in-process window); a re-run against the same long-lived ``api`` without a restart
sees residual counts — restart it (``docker compose restart api``) and re-run.

Style mirrors ``scripts/onboarding_smoke.py``: argparse, collect ALL failures,
exit non-zero with the list or print PASS.

Usage:
    python scripts/cli_smoke.py --base-url http://localhost:8766
    python scripts/cli_smoke.py --base-url ... --login-limit 20
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile

# The server-side per-IP throttle's production default (server/config.py
# auth_rate_limit()). The smoke does not force it low (that needs a container env,
# out of this slice's scope) — it hammers the real default, so a 429 is proven at
# the configured threshold on a fresh stack. Override with --login-limit if the
# stack runs a different KB_AUTH_RATE_LIMIT.
DEFAULT_LOGIN_LIMIT = 20


def _resolve_bin(explicit: str | None) -> str:
    """The installed ``knowledge`` binary, or a clear failure."""

    candidate = explicit or shutil.which("knowledge") or os.path.expanduser(
        "~/.local/bin/knowledge"
    )
    if not (os.path.isfile(candidate) and os.access(candidate, os.X_OK)):
        raise SystemExit(
            f"knowledge binary not found/executable at {candidate!r} — run "
            "`uv tool install ./cli --reinstall` first (never --force)."
        )
    return candidate


def run(base_url: str, knowledge_bin: str, login_limit: int, failures: list[str]) -> str:
    """Run the smoke; append failures. Returns a one-line summary."""

    base_url = base_url.rstrip("/")
    token_hex = secrets.token_hex(6)
    email = f"cli-smoke+{token_hex}@example.com"
    nobody = f"cli-smoke-nobody+{token_hex}@example.com"  # an account that never exists
    password = f"cli-smoke-pw-{token_hex}"  # >= 8 chars
    project = "cli-smoke"
    unique_word = f"clismoketoken{token_hex}"  # a single distinctive FTS token

    cfg_home = tempfile.mkdtemp(prefix="knowledge-cli-smoke-cfg-")
    work = tempfile.mkdtemp(prefix="knowledge-cli-smoke-work-")

    def cli(args: list[str], *, pw: str | None = None) -> tuple[int, str, str]:
        """One CLI invocation under the throwaway config home. Never touches ~/.config.

        The ambient ``KB_API_TOKEN`` / ``KB_API_BASE_URL`` are scrubbed on purpose:
        a stray ``KB_API_TOKEN`` is the server master bearer that writes to tenant
        #1's PUBLIC, git-pushed corpus — the smoke must ride its own ``vk_`` only.
        """

        env = os.environ.copy()
        for var in ("KB_API_TOKEN", "KB_API_BASE_URL", "KNOWLEDGE_PASSWORD"):
            env.pop(var, None)
        env["XDG_CONFIG_HOME"] = cfg_home
        if pw is not None:
            env["KNOWLEDGE_PASSWORD"] = pw
        proc = subprocess.run(
            [knowledge_bin, "--base-url", base_url, *args],
            cwd=work,  # a non-repo cwd: no .git, so nothing leaks the real repo name
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return proc.returncode, proc.stdout, proc.stderr

    try:
        # --- 1. init (signup -> project -> vk_ -> config seam) ----------------
        rc, out, err = cli(["init", "--email", email, "--project", project], pw=password)
        if rc != 0:
            failures.append(f"init: expected exit 0, got {rc}\nstdout:\n{out}\nstderr:\n{err}")
            return "aborted at init"
        if "KB_STATUS=configured" not in out:
            failures.append(f"init: output missing KB_STATUS=configured:\n{out}")
        cfg_file = os.path.join(cfg_home, "knowledge-kb", "config.json")
        if not os.path.isfile(cfg_file):
            failures.append(f"init: no config written at {cfg_file}")
        else:
            mode = stat.S_IMODE(os.stat(cfg_file).st_mode)
            if mode != 0o600:
                failures.append(f"init: config mode is {oct(mode)}, expected 0o600")
            data = json.loads(open(cfg_file, encoding="utf-8").read())
            api_token = (data.get("api") or {}).get("token") or ""
            if not api_token.startswith("vk_"):
                failures.append(f"init: api.token is not a vk_ key (got prefix {api_token[:4]!r})")
            if (data.get("api") or {}).get("base_url", "").rstrip("/") != base_url:
                failures.append(f"init: api.base_url != {base_url}: {data.get('api')}")

        # --- 2. projects empty-state (BEFORE the first save) ------------------
        rc, out, err = cli(["projects"])
        if rc != 0 or "no documents yet" not in out:
            failures.append(
                f"projects (empty-state): expected exit 0 + 'no documents yet', got "
                f"rc={rc}\nstdout:\n{out}\nstderr:\n{err}"
            )

        # --- 3. save ----------------------------------------------------------
        doc_path = os.path.join(work, "note.md")
        body = f"# CLI smoke {unique_word}\n\nA {unique_word} round-trip probe for P13.S5.\n"
        with open(doc_path, "w", encoding="utf-8") as handle:
            handle.write(body)
        rc, out, err = cli(
            ["save", doc_path, "--project", project, "--tag", "smoke", "--tag", "clitest"]
        )
        if rc != 0:
            failures.append(f"save: expected exit 0, got {rc}\nstdout:\n{out}\nstderr:\n{err}")
            return "aborted at save"
        match = re.search(r"id:\s*(\d+)", out)
        doc_id = match.group(1) if match else None
        if not doc_id:
            failures.append(f"save: no document id in output:\n{out}")

        # --- 4. list ----------------------------------------------------------
        rc, out, err = cli(["list", "--project", project])
        if rc != 0 or (doc_id and doc_id not in out):
            failures.append(
                f"list: expected exit 0 listing id {doc_id}, got rc={rc}\n{out}{err}"
            )

        # --- 5. search --------------------------------------------------------
        rc, out, err = cli(["search", unique_word, "--project", project])
        if rc != 0 or "result(s)" not in out or (doc_id and doc_id not in out):
            failures.append(
                f"search {unique_word!r}: expected exit 0 finding id {doc_id}, got "
                f"rc={rc}\n{out}{err}"
            )

        # --- 6. read round-trips byte-for-byte --------------------------------
        if doc_id:
            rc, out, err = cli(["read", doc_id])
            if rc != 0:
                failures.append(f"read {doc_id}: expected exit 0, got {rc}\n{err}")
            elif out.rstrip("\n") != body.rstrip("\n"):
                failures.append(
                    f"read {doc_id}: body did not round-trip\n--- got ---\n{out!r}\n"
                    f"--- want ---\n{body!r}"
                )

        # --- 7. projects present now ------------------------------------------
        rc, out, err = cli(["projects"])
        if rc != 0 or project not in out:
            failures.append(
                f"projects (present): expected exit 0 listing {project!r}, got "
                f"rc={rc}\n{out}{err}"
            )

        # --- 8. usage while the session is live -------------------------------
        rc, out, err = cli(["usage"])
        if rc != 0 or "documents saved" not in out:
            failures.append(f"usage (session live): expected exit 0 totals, got rc={rc}\n{out}{err}")

        # --- 9. logout (leaves api.token alone) -------------------------------
        rc, out, err = cli(["logout"])
        if rc != 0:
            failures.append(f"logout: expected exit 0, got {rc}\n{err}")

        # --- 10. post-logout: vk_ still works, session does not ---------------
        doc2 = os.path.join(work, "note2.md")
        with open(doc2, "w", encoding="utf-8") as handle:
            handle.write(f"# CLI smoke post-logout {unique_word}\n\nStill {unique_word}.\n")
        rc, out, err = cli(
            ["save", doc2, "--project", project, "--tag", "smoke", "--tag", "postlogout"]
        )
        if rc != 0:
            failures.append(
                f"save after logout (rides the vk_): expected exit 0, got {rc}\n{err}"
            )
        rc, out, err = cli(["search", unique_word, "--project", project])
        if rc != 0:
            failures.append(
                f"search after logout (rides the vk_): expected exit 0, got {rc}\n{err}"
            )
        rc, out, err = cli(["usage"])
        if rc == 0:
            failures.append(f"usage after logout: expected a non-zero exit (session gone), got 0\n{out}")
        elif "not logged in" not in err.lower() and "session" not in err.lower():
            failures.append(f"usage after logout: expected a session error, got:\n{err}")

        # --- 11. the throttle (the headline of this slice) --------------------
        _throttle_check(cli, email, nobody, login_limit, failures)

    finally:
        shutil.rmtree(cfg_home, ignore_errors=True)
        shutil.rmtree(work, ignore_errors=True)

    return (
        f"CLI onboarded {email} (project {project}, doc {doc_id}); lifecycle + "
        f"logout-survival + 429 throttle verified"
    )


def _classify_login(err: str) -> str:
    """A failed ``knowledge login``'s stderr -> '401' | '429' | 'other'."""

    low = err.lower()
    if "429" in err or "too many" in low:
        return "429"
    if "login failed" in low or "invalid email or password" in low:
        return "401"
    return "other"


def _throttle_check(cli, email: str, nobody: str, login_limit: int, failures: list[str]) -> None:
    """Hammer ``login`` from one IP; prove the generic 401, then a 429 at the limit.

    Every attempt uses a WRONG password (>= 8 chars so the request is actually sent,
    not stopped client-side by the length check). The server-side throttle counts
    each attempt before the credential check, so a fresh window yields ``login_limit``
    generic 401s followed by a 429.
    """

    wrong = "wrong-password-not-real"  # >= 8 chars

    # First two attempts probe enumeration-safety: an unknown email and a real email
    # with a wrong password must produce a BYTE-IDENTICAL generic 401 through the CLI.
    _, _, err_unknown = cli(["login", "--email", nobody], pw=wrong)
    _, _, err_wrong = cli(["login", "--email", email], pw=wrong)
    kinds = [_classify_login(err_unknown), _classify_login(err_wrong)]
    if kinds == ["401", "401"] and err_unknown != err_wrong:
        failures.append(
            "throttle/enumeration: unknown-email and wrong-password 401s are NOT "
            f"byte-identical through the CLI:\n  unknown: {err_unknown.strip()!r}\n"
            f"  wrong:   {err_wrong.strip()!r}"
        )

    count_401 = kinds.count("401")
    got_429_at = None
    for idx, kind in enumerate(kinds, start=1):
        if kind == "429":
            got_429_at = idx
            break
        if kind == "other":
            failures.append(f"login attempt {idx}: unexpected CLI output:\n{[err_unknown, err_wrong][idx-1]}")

    attempt = 2
    cap = login_limit + 3
    last_429_err = ""
    while got_429_at is None and attempt < cap:
        attempt += 1
        _, _, err = cli(["login", "--email", email], pw=wrong)
        kind = _classify_login(err)
        if kind == "429":
            got_429_at = attempt
            last_429_err = err.strip()
        elif kind == "401":
            count_401 += 1
        else:
            failures.append(f"login attempt {attempt}: unexpected CLI output:\n{err}")
            break

    if got_429_at is None:
        failures.append(
            f"throttle: no 429 within {cap} login attempts (expected limit {login_limit}). "
            "The throttle may be inactive, or the window is pre-saturated from a prior "
            "run — restart the api container (docker compose restart api) and re-run."
        )
        return
    if count_401 == 0:
        failures.append(
            f"throttle: a 429 arrived on attempt {got_429_at} with no generic 401 first "
            "— the login window was pre-saturated (restart the api container and re-run); "
            "cannot prove the throttle passes the generic 401 through until it saturates."
        )
    if got_429_at <= login_limit:
        failures.append(
            f"throttle: 429 arrived at attempt {got_429_at}, at or before the configured "
            f"limit {login_limit} (expected the {login_limit + 1}th) — window pre-saturated, "
            "or the stack's KB_AUTH_RATE_LIMIT differs from --login-limit."
        )
    # A clean 429-derived error, not a hang or a raw body.
    if got_429_at is not None and "429" not in last_429_err:
        failures.append(f"throttle: the tripping error did not name HTTP 429:\n{last_429_err}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url", default="http://localhost:8766", help="running local stack base URL"
    )
    parser.add_argument(
        "--knowledge-bin",
        default=None,
        help="path to the installed knowledge binary (default: PATH, else ~/.local/bin/knowledge)",
    )
    parser.add_argument(
        "--login-limit",
        type=int,
        default=DEFAULT_LOGIN_LIMIT,
        help=(
            "the stack's KB_AUTH_RATE_LIMIT for the throttle assertion "
            f"(default {DEFAULT_LOGIN_LIMIT}, the server's production default)"
        ),
    )
    args = parser.parse_args()

    knowledge_bin = _resolve_bin(args.knowledge_bin)

    failures: list[str] = []
    try:
        summary = run(args.base_url, knowledge_bin, args.login_limit, failures)
    except subprocess.TimeoutExpired as exc:
        failures.append(f"a CLI command timed out: {exc}")
        summary = "aborted (timeout)"

    if failures:
        print(f"FAIL — {len(failures)} CLI invariant(s) violated ({args.base_url}):")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"PASS — {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
