---
doc_id: product
version: v0002
created_at: 2026-07-02T14:42:49+09:00
source: P1.REVIEW
summary: Personal knowledge base with two consumption tracks
previous: v0001_bootstrap
---

# Product

## Status

Scope confirmed by the operator through P2/P3 intents. Treat delivery details as durable but evolving as those phases execute.

## Summary

A personal knowledge base. Its content is a `docs/` tree of educational explainer documents written by the `/explain` skill (from the `bootstrap_agentic_workspace` repo) and browsed locally through a MkDocs Material viewer run via Docker. The same content is served through two consumption tracks: a public static site and a database-backed read/write/search API.

## Target Users

- The operator (owner and primary reader of the knowledge base).
- Coding agents writing knowledge via the `/explain` skill.

## Problem

- Knowledge is scattered across conversations and repos, with no durable, browsable, searchable home.

## Goals

- Publish the `docs/` tree publicly via GitHub Pages (Track 1).
- Provide a DB-backed read/write/search API to power a future personal web UI with hybrid search (Track 2).

## Non-Goals for Now

- The personal web UI itself.
- An embeddings pipeline (Track 2 leaves a `sqlite-vec` extension point, but no embeddings this cycle).
- Editing the `bootstrap_agentic_workspace` repo (the `/explain` update is handled there separately).

## Product Direction

Keep durable product truth here. Update by creating a new version under `docs/versions/product/`, not by patching old versions.

## Terminology

- `phase`: grouped unit of work under `works/phases/active/` or `works/phases/archived/`
- `slice`: concrete unit of work inside a phase
- `deferred job`: parked work under `works/deferred/` that does not affect active selection until promoted
