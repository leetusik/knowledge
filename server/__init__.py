"""kb-api: DB-backed document store + HTTP API for the knowledge base (Track 2).

docs/ stays canonical; this package indexes it into a disposable SQLite (FTS5)
store and (in later slices) owns the API write path. This slice adds no HTTP —
only config, the DB layer, the docs/-convention library, and reindex.
"""
