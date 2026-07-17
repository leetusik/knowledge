"""HTTP client for the knowledge API — the `/auth`, `/app` and `/api` planes.

Every call here is lifted from `scripts/onboarding_smoke.py`, the committed
post-deploy verifier that already drives this exact sequence against a live
instance. Nothing is invented: if the smoke does not prove a call, it is not
here.

The three planes and who may call them:

* ``/auth/*`` — no bearer (signup/login) or a session token (logout/me).
* ``/app/*``  — the **session token** only. A ``vk_`` key gets 401 here: every
  route is ``Depends(require_user)``.
* ``/api/*``  — the **``vk_`` key** (or a session token, or the legacy master
  bearer): ``server/api_auth.py:130-175`` resolves all three off the same
  ``Authorization: Bearer`` header, so the header and scheme never vary.

Two tokens, two lifetimes (D-P13-3): the session token expires in 30 days, the
``vk_`` key does not. Callers pass whichever the plane wants.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from . import __version__

# Identifies CLI traffic at the edge — the operator can tell it from a browser or
# the smoke. Mirrors vocky's smoke, which sets an explicit UA for the same reason.
USER_AGENT = f"knowledge-cli/{__version__}"

DEFAULT_TIMEOUT = 15


class ApiError(Exception):
    """A non-2xx response.

    ``detail`` is FastAPI's own ``{"detail": ...}`` when present — which is
    designed to be safe to surface (generic 401 that never distinguishes a bad
    email from a bad password; 404 rather than 403 for a cross-tenant id, so
    existence never leaks). Raw bodies are never carried: an unparseable body
    degrades to the status alone. Callers map ``status`` to a friendly message.
    """

    def __init__(self, status: int, detail: str = "") -> None:
        self.status = status
        self.detail = detail
        super().__init__(f"HTTP {status}: {detail}" if detail else f"HTTP {status}")


def _detail(response: httpx.Response) -> str:
    """FastAPI's ``detail`` field, or ``""``. Never a raw body.

    Until P13.S5 exposes the control plane at the edge, ``/auth/*`` and ``/app/*``
    404 into the mkdocs static site — an **HTML** body. That must degrade to the
    bare status here, not spray a web page through an error message.
    """

    try:
        payload = response.json()
    except ValueError:
        return ""
    if isinstance(payload, dict):
        detail = payload.get("detail")
        if isinstance(detail, str):
            return detail
        if detail is not None:
            # 422 carries a structured validation list — the server's own field
            # errors, safe to show and needed to explain e.g. the 2-5 tags rule.
            return json.dumps(detail)
    return ""


def _params(**values: Any) -> dict[str, Any]:
    """Query params with the unset ones dropped, so server defaults apply."""

    return {key: value for key, value in values.items() if value is not None}


class KnowledgeClient:
    """Thin typed wrappers over the three planes. Usable as a context manager."""

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token or None
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            # A redirect would silently re-send the bearer to wherever the edge
            # points; the smoke pins this too.
            follow_redirects=False,
            headers={"User-Agent": USER_AGENT},
            # `None` is httpx's own default, so this changes nothing at runtime; it
            # exists so tests can hand in an `httpx.MockTransport` and exercise the
            # real request path without a live server.
            transport=transport,
        )

    def __enter__(self) -> KnowledgeClient:
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        **kwargs: Any,
    ) -> Any:
        """One request core. Raises `ApiError` on any non-2xx; returns parsed JSON.

        `token` overrides the client's own for this call — the CLI holds a session
        token and a `vk_` key at once and picks per plane.
        """

        headers = {}
        bearer = token or self.token
        if bearer:
            headers["Authorization"] = f"Bearer {bearer}"
        response = self._client.request(method, path, headers=headers or None, **kwargs)
        if response.status_code >= 400:
            raise ApiError(response.status_code, _detail(response))
        if response.status_code == 204 or not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            raise ApiError(response.status_code, "response was not JSON") from None

    # --- /auth ------------------------------------------------------------
    # Note the asymmetry, which is real and load-bearing for callers:
    # signup returns `tenant` (singular), login returns `tenants` (a list).

    def auth_signup(self, email: str, password: str) -> Any:
        """POST /auth/signup -> 201 {token, user, tenant}. 409 if the email exists.

        `password` is min_length=8; the email is lowercased/stripped server-side.
        """

        return self._request("POST", "/auth/signup", json={"email": email, "password": password})

    def auth_login(self, email: str, password: str) -> Any:
        """POST /auth/login -> 200 {token, user, tenants[]}.

        401 is **generic** by design — it never says whether the email or the
        password was wrong. Preserve that when mapping it to a message.
        """

        return self._request("POST", "/auth/login", json={"email": email, "password": password})

    def auth_logout(self, token: str | None = None) -> Any:
        """POST /auth/logout -> 204. Idempotent."""

        return self._request("POST", "/auth/logout", token=token)

    def auth_me(self, token: str | None = None) -> Any:
        """GET /auth/me -> the caller's user + tenant."""

        return self._request("GET", "/auth/me", token=token)

    # --- /app (session token only; a vk_ key gets 401 here) ---------------

    def projects_list(self, token: str | None = None) -> Any:
        """GET /app/projects."""

        return self._request("GET", "/app/projects", token=token)

    def projects_create(self, name: str, token: str | None = None) -> Any:
        """POST /app/projects -> 201 {project}. No uniqueness check server-side."""

        return self._request("POST", "/app/projects", token=token, json={"name": name})

    def project_get(self, project_id: str, token: str | None = None) -> Any:
        """GET /app/projects/{id}. 404 for both missing and cross-tenant."""

        return self._request("GET", f"/app/projects/{project_id}", token=token)

    def credential_create(
        self,
        project_id: str,
        name: str | None = None,
        token: str | None = None,
    ) -> Any:
        """POST /app/projects/{id}/credentials -> 201 {credential, key}.

        `key` is the plaintext `vk_...` and is returned **once, ever** — the server
        stores only a hash. A caller that does not persist it here cannot get it
        back; it must be written to the config seam, never printed or logged.
        """

        body = {} if name is None else {"name": name}
        return self._request(
            "POST", f"/app/projects/{project_id}/credentials", token=token, json=body
        )

    def credential_list(self, project_id: str, token: str | None = None) -> Any:
        """GET /app/projects/{id}/credentials — metadata only, never the key."""

        return self._request("GET", f"/app/projects/{project_id}/credentials", token=token)

    def credential_revoke(
        self,
        project_id: str,
        credential_id: str,
        token: str | None = None,
    ) -> Any:
        """DELETE /app/projects/{id}/credentials/{cid} -> 204. Soft-revoke."""

        return self._request(
            "DELETE", f"/app/projects/{project_id}/credentials/{credential_id}", token=token
        )

    def usage(self, token: str | None = None) -> Any:
        """GET /app/usage -> {totals, daily_counts[30], projects[]}."""

        return self._request("GET", "/app/usage", token=token)

    def project_usage(self, project_id: str, token: str | None = None) -> Any:
        """GET /app/projects/{id}/usage -> {totals, credentials[]}. 404 if foreign."""

        return self._request("GET", f"/app/projects/{project_id}/usage", token=token)

    # --- /api (the vk_ key) -----------------------------------------------

    def document_create(
        self,
        *,
        title: str,
        markdown: str,
        project: str,
        tags: list[str],
        source_repo: str,
        date: str | None = None,
        slug: str | None = None,
        related: list[str] | None = None,
        overwrite: bool = False,
        commit: bool = True,
        co_authored_by: str | None = None,
        token: str | None = None,
    ) -> Any:
        """POST /api/documents -> 201 (the frozen consumer contract). Metered.

        `markdown` is the body **without** frontmatter, starting at the H1 — the
        API generates convention-exact frontmatter itself. `tags` must be **2-5**
        (`server/documents.py:61-62`, else 422). An existing doc is 409 unless
        `overwrite`. `project` is a free-form name checked only for convention
        (`main.py:396`) and never against the key's bound project, so callers
        should default it from config rather than let it drift.
        """

        body: dict[str, Any] = {
            "title": title,
            "markdown": markdown,
            "project": project,
            "tags": tags,
            "source_repo": source_repo,
            "overwrite": overwrite,
            "commit": commit,
        }
        if date is not None:
            body["date"] = date
        if slug is not None:
            body["slug"] = slug
        if related is not None:
            body["related"] = related
        if co_authored_by is not None:
            body["co_authored_by"] = co_authored_by
        return self._request("POST", "/api/documents", token=token, json=body)

    def document_list(
        self,
        *,
        project: str | None = None,
        tag: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        token: str | None = None,
    ) -> Any:
        """GET /api/documents -> {total, items[]}. `limit` 1-200 (default 50)."""

        return self._request(
            "GET",
            "/api/documents",
            token=token,
            params=_params(project=project, tag=tag, limit=limit, offset=offset),
        )

    def search(
        self,
        q: str,
        *,
        project: str | None = None,
        tag: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        token: str | None = None,
    ) -> Any:
        """GET /api/search -> {results[]}. Metered. `limit` 1-50 (default 10).

        A malformed FTS query is 400, not 422.
        """

        return self._request(
            "GET",
            "/api/search",
            token=token,
            params=_params(q=q, project=project, tag=tag, limit=limit, offset=offset),
        )
