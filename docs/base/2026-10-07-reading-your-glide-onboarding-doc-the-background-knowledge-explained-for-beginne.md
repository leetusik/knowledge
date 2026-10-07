---
title: "Reading Your Glide Onboarding Doc — The Background Knowledge, Explained for Beginners"
date: 2026-10-07
tags:
  - onboarding
  - research-agent
  - data-pipeline
  - evaluation
source:
  project: base
  repo: base
---

# Reading Your Glide Onboarding Doc — The Background Knowledge, Explained for Beginners

> This is an educational write-up of the background you need to read `onboarding.docx`
> (「수강님 온보딩 안내: 계약 기간 업무와 평가 방식」, dated 2026-10-05) properly.
> Written for a novice programmer — every piece of jargon is explained as it appears.
> The sources of truth are the two documents themselves:
> `/Users/sugang/projects/glide/base/onboarding.docx` (what is expected of you and how you are scored)
> and `/Users/sugang/projects/glide/base/research_agent_roadmap.docx` (「글라이드 리서치 에이전트 로드맵」, the design).
> This file is a teaching companion, not the runbook. Where the two docs disagree, the docs win.

## 1. What it is

The onboarding doc is a short **contract of expectations** (a written agreement of what you will
deliver, by when, and how it will be judged). It covers your contract period, which ends on
**December 31**, and it is built around two projects:

| Project | Dates | What it is |
|---|---|---|
| Project 1 (프로젝트 1) | 10/7 – 11/3 (4 weeks) | Stage 1 of the research agent: global IB signals + weekly email |
| Project 2 (프로젝트 2) | 11/4 – 12/18 (~7 weeks) | Topic announced near the end of Project 1; **you** draft its scope |

The final evaluation is 12/21–22, and the written decision (convert to full-time / extend / end)
arrives on 12/24.

### Why does it feel hard to read?

Because it is written *on top of* the roadmap. Almost every noun in the Project 1 table —
`signals`, `entity_id`, `theme_id`, `evidence_ref`, `theme_alias`, "candidate theme", "backfill" —
is defined only in the roadmap. The onboarding doc assumes you already know three layers of
background:

1. **The product** — what the "research agent" is.
2. **The data model** — the tables and IDs everything is stored under.
3. **The engineering practices** — PRs, reviews, runbooks, secrets.

Plus a fourth layer that is just arithmetic: **the scoring system**. Sections 2–3 walk through
each layer.

## 2. Why it exists in this project

The doc says it directly: *"평가 기준을 미리 알아야 눈치가 아니라 실력으로 일할 수 있다"* —
if you know the grading rules in advance, you can work on skill instead of guessing what people
want. So the doc deliberately publishes:

- **what** you must deliver (6 required items, 4 optional),
- **who** you work with (대표 / Jake / Siun),
- **where** documents live (Google Drive vs. the GitHub repo),
- **how** you are scored (6 areas, 1–5 points, weighted).

Think of it like a course syllabus: the roadmap is the textbook, the onboarding doc is the
syllabus that says which chapters are on the exam and how the exam is graded.

## 3. How it works here

### 3.1 The product: what is a "research agent"?

Glide already has screens showing reports from **global investment banks** (**IB** — large
firms like Goldman Sachs or Jefferies that publish market research), each with an
**AI RESEARCH SUMMARY** (an LLM-written summary a human reads). The roadmap upgrades this in
three stages (단계):

- **Stage 0 (0단계)** — not a separate stage, just first-week prep: agree on shared IDs and tables.
- **Stage 1 (1단계)** — global IB dashboard + weekly email. **This is your Project 1.**
- **Stage 2** — Korean research product (Hankyung/Naver reports, analyst track records).
- **Stage 3** — connect news, global IB, and Korean research.

The key idea is **"signals on top of summaries" (요약 위에 신호)**. A summary is prose for
humans; a **signal** (신호) is a small structured record a computer can count: *which theme,
which direction, over what time span, how confident*. Count signals across many reports and you
can say "this theme is rising" or "the banks disagree about this theme" — which a pile of
summaries can't tell you.

### 3.2 The vocabulary of a signal

Each signal extracted from a report has these fields (from the roadmap's extraction step):

| Field | Meaning | Example values |
|---|---|---|
| `theme_raw` | the theme as the report worded it | "AI data-center spend" |
| `theme_canonical` / `theme_id` | the standard theme it maps to | an ID from `theme_taxonomy` |
| `stance` (입장) | the direction of the view | `bull` (positive) / `bear` (negative) / `neutral` |
| `horizon` (기간) | the time span the view is about | `short` / `mid` / `long` |
| `confidence` | how sure the extractor is | below 0.6 → sent to the review queue |
| `evidence_ref` | *where* in the report the claim is | a paragraph tag like `p2_para1` |
| `entities` | companies mentioned | mapped to `entity_id`s |

Two rules surprise beginners:

- **One sentence can make two signals.** "Short-term bearish, long-term bullish" becomes two
  signals with different horizons.
- **Disagreement only counts within the same horizon.** A bank that is short-term bear and one
  that is long-term bull are *not* in disagreement (불일치) — they're talking about different time spans.

The appendix says a 1–2 score in "domain understanding" means confusing
**stance · horizon · revision** (리비전 — a change to an analyst's target price or rating, which
matters mostly in Stage 2). So those three words are worth knowing cold.

### 3.3 The data model: IDs and tables

A **table** is like a spreadsheet tab in a database; a **schema** is the list of its columns and
their types. A **key** (or **primary key**) is the column that uniquely identifies each row.

The whole roadmap hinges on two IDs being agreed **once**, in week 1:

- **`entity_id`** — one ID per company, in `market:ticker` form, e.g. `KRX:005930` (Samsung
  Electronics) or `NASDAQ:NVDA`. The market prefix exists because bare tickers collide
  (e.g. `1810` and `7974` are Hong Kong / Tokyo numeric codes). Korean codes are always
  **6-character strings**: read `005930` as a number and it becomes `5930`, and every join breaks.
- **`theme_id`** — one ID per standard theme, from the **theme dictionary** (테마 사전).

Why so strict? Because Stage 3's "connect three sources" is then just a **join** (a database
operation that matches rows from two tables by a shared column). Agree on IDs now, and Stage 3
is a query; disagree, and Stage 3 is a rewrite.

The tables you will co-design with Jake:

| Table | Role |
|---|---|
| `entity` | company master — one row per stock |
| `theme_taxonomy` | the standard themes, each with `status`: `active` / `candidate` / `retired` |
| `theme_alias` | alternate spellings → `theme_id`; `source` is `seed` (initial) or `reviewed` (a human approved it) |
| `signals` | every signal from every source, in one format |
| `theme_trend` | weekly aggregates: rising / cooling / disagreement |
| `email_log` | what was sent and how it performed (opens, clicks) |
| `predictions`, `outcomes`, `scores`, `entity_theme` | Stage 2–3 tables (track records, theme links) |

### 3.4 The pipeline: how a report becomes an email

A **pipeline** is a chain of automated steps where each step's output is the next one's input.

```
 Global IB house pages (Goldman Sachs, Jefferies, …)
        │  weekly scrape; skip already-seen URL + title hash
        ▼
 reports  (house, title, issued_at taken from metadata — never guessed, url)
        │  split into paragraphs, tag each: p2_para1 …
        ├──────────► AI RESEARCH SUMMARY   (existing prompt — must not change)
        │
        ▼  a second, separate LLM call per report
 signal JSON: theme_raw, stance, horizon, confidence, evidence_ref, entities
        │  theme mapping: alias dictionary → embedding similarity → else "candidate"
        ▼
★ signals  (entity_id + theme_id + evidence_ref + url filled by the rules)
        │
        ├──► theme_trend ──► dashboard (rising · cooling · disagreement)
        ├──► customer email, Monday 07:00 KST ──► email_log
        └──► operator review mail, Friday (candidates, low-confidence, failed sources)
                  └─ accept / merge / ignore ──► theme_alias (source = reviewed)
```

The ★ line is the heart of Project 1: required item #2 says exactly this — `signals` with
`entity_id·theme_id·evidence_ref·url` filled "규칙대로" (by the Stage 0 rules). Everything
downstream (dashboard, emails, Stage 3) only works if that row is right.

A few words from the picture:

- **Backfill (백필)** — running the pipeline over *past* data, not just new data. Trends need at
  least 8 weeks of history, so you extract **6 months** of old reports before launch.
- **Embedding similarity** — turning text into a list of numbers so "similar meaning" becomes
  "nearby numbers"; used when the alias dictionary has no exact match.
- **Review queue (검토 큐)** — a list of items a human must check: low-confidence signals, and
  reports where the summary's tone and the signal's stance disagree.
- **Candidate theme** — a new theme the system found but no human has approved yet; the Friday
  operator mail is where it gets accepted (편입), merged (병합), or ignored (무시).
- **"No impact on the AI summary" (기존 AI 요약 무영향)** — required item #3. Signal extraction is
  a *separate* LLM call precisely so the existing summary prompt and output stay identical.

### 3.5 The accuracy check: what "20건 검증" means

Required item #1 is to set **accuracy thresholds** (정확도 기준값) for theme mapping and stance
judgment, plus a procedure for checking a **weekly sample of 20** (주간 표본 20건): pick 20 signals,
have a human judge whether each theme and stance is correct, and compute the percentage. The
roadmap's example targets are **theme mapping 90%, stance 85%**, but the real values are set
after looking at samples — and the CEO (대표) approves them. This number is the gate for "is
the pipeline good enough?", so it comes first (week 1).

### 3.6 The engineering practices

- **Repository (저장소)** — the GitHub project `research-agent`, holding `schema/`, `pipelines/`,
  `prompts/`, `taxonomy/`, and `docs/tables/` + `docs/runbooks/`.
- **PR (pull request)** — a proposed change that others review before it is merged.
- **`main` branch + branch protection** — `main` is the official version; protection means a PR
  can't merge without ≥1 approval. **CODEOWNERS** (a GitHub file naming who must review which
  folders) makes Jake review your code and you review Jake's — the doc's **cross review (교차 리뷰)**.
- **Table spec (테이블 명세서)** — per table: columns, keys, data source, update cadence, which
  job fills it, which screen reads it. Updated **in the same PR** as any schema change.
- **Runbook (런북)** — a step-by-step "how to operate this" document. Yours must cover three operations:
  - **rerun (재실행)** — run a job again after it failed;
  - **backfill** — fill in historical data;
  - **rollback (롤백)** — undo a bad change and return to the last good state.
  You must perform each **yourself at least once**.
- **Secrets** — tokens and API keys (passwords for programs) live only in **GitHub Secrets** or
  server **environment variables** (settings the server injects at run time), never in a
  notebook or the repo. That's why the week-1 checklist says to strip the token from the
  Hankyung scraper before moving it to `pipelines/`.
- **Source of truth for prompts** — the repo. Google Docs only hold *why* a prompt changed and
  the validation result, with a link to the repo.

### 3.7 The scoring system, as arithmetic

Each project is scored on 6 areas, 1–5 points each, then weighted:

| Area | Weight |
|---|---|
| 1. Delivery | 35% |
| 2. Quality & principles | 20% |
| 3. Co-ownership & collaboration | 15% |
| 4. Documentation & operability | 10% |
| 5. Judgment & communication | 15% |
| 6. Domain understanding & learning | 5% |

**3 points = the baseline expected of a full-time hire.** Worked example: scoring 4 on Delivery
and 3 everywhere else gives `0.35×4 + 0.65×3 = 1.40 + 1.95 = 3.35`.

The final score is `0.4 × Project 1 + 0.6 × Project 2`. If Project 1 = 3.2 and Project 2 = 3.7:
`0.4×3.2 + 0.6×3.7 = 1.28 + 2.22 = 3.50`. Conversion is offered only if **all three** hold:

1. final score **≥ 3.5**;
2. **every** Project 2 area **≥ 3** (one weak area blocks it, whatever the average);
3. the five rules of section 5 (꼭 지켜 주세요) were kept.

And for Project 2, the bar for "3" itself rises: same results **with less help**.

## 4. Trade-offs and alternatives

### Why is the schedule so tight, and what am I allowed to do about it?

The roadmap packs Stages 1 *and* 2 plus a Stage 3 beta into 4 weeks; the onboarding doc
narrows your Project 1 to the Stage 1 slice (signals, emails, table co-ownership). Even so, it
admits *"로드맵 일정 자체가 빠듯합니다"*. The doc's answer is explicit: proposing to cut scope or
reorder work to protect the required items **is scored as good judgment, not a penalty**
(area 5, where 4 points = "proposed scope/order changes yourself and kept the required items").

### Why "design together" instead of "build alone, then explain"?

Building alone is faster in week 1 and slower forever after: only one person can fix it at 3 a.m.
Co-design, specs, cross review, and Friday walkthroughs (where **you explain first**) trade some
speed for a system two people can operate — which is literally what area 4's 5-point bar
describes ("a newcomer can run the pipeline from the docs alone").

### Why does honesty outrank points?

The section 5 rules sit *outside* the score: share validation results as they are, even below
the bar; report mistakes immediately. Delays outside your control are not penalized — but log
them in the decision record (결정 기록). A hidden mistake costs more than a reported one.

> **The lesson in one sentence:** the onboarding doc is a syllabus for the roadmap — learn the
> signal vocabulary (stance, horizon, evidence_ref), protect the ★ `signals` row, and remember
> that early, honest communication is itself one of the things being graded.

## Mini-glossary

- **Signal (신호)** — a structured record of one view in a report: theme, stance, horizon, confidence, evidence.
- **Stance (입장)** — direction of a view: bull, bear, or neutral.
- **Horizon (기간)** — time span of a view: short, mid, or long.
- **Revision (리비전)** — a change in an analyst's target price or rating (mainly Stage 2).
- **evidence_ref** — the paragraph tag (e.g. `p2_para1`) showing where a signal came from.
- **entity_id** — the one company ID, `market:ticker`, e.g. `KRX:005930`.
- **theme_id** — the one standard-theme ID from the theme dictionary.
- **Theme alias (테마 별칭)** — an alternate wording that maps to a `theme_id`.
- **Candidate theme** — a newly found theme awaiting human accept/merge/ignore.
- **Global IB** — large international investment banks publishing research.
- **Backfill (백필)** — running a pipeline over historical data.
- **Pipeline** — a chain of automated processing steps.
- **Join** — matching rows from two tables on a shared column.
- **Schema** — the column definition of a database table.
- **Review queue (검토 큐)** — items set aside for a human to check.
- **PR (pull request)** — a proposed code change, reviewed before merging.
- **Branch protection** — a rule that blocks merging to `main` without approval.
- **CODEOWNERS** — a GitHub file naming required reviewers per folder.
- **Runbook (런북)** — step-by-step operating instructions (rerun, backfill, rollback).
- **Rollback (롤백)** — reverting to the last known-good state.
- **GitHub Secrets** — encrypted storage for keys and tokens used by automation.
- **Decision record (결정 기록)** — the shared spreadsheet logging what was decided and why.
