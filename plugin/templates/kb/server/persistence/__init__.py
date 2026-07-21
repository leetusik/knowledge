"""Postgres accounts-plane persistence: declarative base, ORM models, async engine.

The control plane (accounts/tenancy/projects/credentials/sessions) lives in
Postgres via async SQLAlchemy 2.0. This is separate from the content plane's
disposable SQLite (``server/db.py``); the two never share a connection.
"""
