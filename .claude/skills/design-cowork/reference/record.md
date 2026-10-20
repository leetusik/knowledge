# design-cowork — the design record

## The design record — the on-disk contract (schema 2)

The design lives **in the repo, as plain files**, under **`docs/reference/design/`**: one fixed root,
durable and outside `works/`, so an apply phase reads it long after the design phase archives. The
engine's `design-*` commands write the machine-readable parts, and `design-check` enforces the rest.

```
docs/reference/design/
├── design.json                    # the project and its Design System record   design-init / design-system
├── bar.md                         # the operator's standing design rules         you
├── .type/                         # the canvas type's runtime and references: local only, git-ignored
├── waves/
│   └── P9.S4/brief.md             # what a wave's jobs share                     you
└── jobs/
    └── 01-inbox/                  # one job per surface: NN-slug
        ├── job.json               # the job, its canvas url/version/manifest     design-open / design-canvas / design-close
        ├── canvas/project/        # the job's canvas tree, published as is     the drafter
        │   ├── canvas.json        #   the board index
        │   ├── Main.dc.html       #   the entry Page; one .dc.html per board
        │   └── ds/<ns>/           #   the system cache: local only, never committed or sent from disk
        └── rounds/
            └── 01-inbox/          # rounds number inside the job: NN-slug
                ├── round.json     # status, critique, publish, read-back, words   design-open / -canvas / -readback / -close
                ├── handoff.md     # the job's delta on the wave brief       you
                ├── result.md      # verdict, ## Summary, ## Build           the drafter
                ├── critique-NN.md # one per critic pass                     the critic
                ├── judge-NN.md    # a ruling on pass NN's escalated items   the judge
                ├── feedback.md    # the operator's words, comments, edits   you
                ├── SIGNOFF.md     # the operator's literal words            design-close / design-sign
                └── canvas/project/# the snapshot at close                   design-close
```

- **`design.json`**: `schema` 2, `id`, `name`, and `system` (`artifact`, `namespace`, `version`,
  `source`, `files`), all null until the first system sync.
- **`bar.md`**: the operator's own standing design rules, beyond the bar the drafter ships with (*The
  handoff*). You maintain it; `design-check` never reads it.
- **`job.json`**: `job`, `slice`, `title`, `canvas` (`url`, `version`, `published`, and the optional
  `system`: the system version the last publish installed, absent on a job published before v60, and
  `manifest`: `{project/<path>: bytes}` of what the last publish sent, absent before v61) and
  `status`, `open → signed → implemented`. A signed job reopens on its next round; an implemented one refuses
  a new round, and its canvas record is history.
- **`round.json`**: `round`, `slice`, `status` (`open → signed | superseded`), `critique` (absent
  reads as `off`), `supersedes` (the job's previous round), `signoff_words`, `canvas_version`, and
  from v61 `published` (the canvas version this round last published) and `readback` (`version`,
  `base`, `result`, `files`, `removed`, `at`: the last read-back, against the publish `base`).
- **`waves/<slice>/brief.md`**: what a wave's jobs share (*The wave brief*); each round's handoff
  names it on a `brief:` line, and `design-check` requires it to exist.
- **One drafter output per round: `result.md`**, its verdict block (with `open_items:`), a
  `## Summary` of 1 KB or less (`design-check` warns past it) and `## Build`, what the mockup builder
  and the build slices read (a signed round needs it). A round opened before v61 keeps its
  `build-prompt.md`, which serves as its `## Build`.
- **Repo-relative paths only.** `design-check` flags `/Users/`, `/home/`, `/private/`, `/tmp/`,
  `/var/folders/`, `~/` and `C:\` in an open round's text files, `job.json`, `round.json`, the wave
  briefs and the canvas tree (`ds/` aside): a problem while open, a warning once closed.
- **At most one round is open per job.** Rounds of different jobs, a wave's, are open at once.
  Address a round as `<job>/<round>` (a bare round id works when it is unique).
- **A closed round is immutable.** Its snapshot is what the build reads; never edit it.
- **The canvas tree's rules are the drafter's** (its `## The canvas tree` and `## The working
  canvas`), and `design-check <job>` enforces them. What you need from them:
  - **Board titles carry the reading order.** Every board title starts `NN · ` and the numbers form
    `01..N` as a set (`01 · Page — Inbox`, …, `05 · Component — Message row`); `canvas.json` `order`
    is z-order, never reading order.
  - **References stay inside the canvas.** A `src`, `href` or `url()` names a relative path inside
    `project/` (`ds/<ns>/…` and another board included), `#`, `data:`, `https://`, `/_blob/` or a
    `{{hole}}`; never `http://`, `//`, an absolute path or a `..` out of `project/`.
  - Any HTML under the design root outside a job's canvas tree or a round snapshot is a stray.
- **Who writes what.** You: `bar.md`, the wave briefs, `handoff.md`, `feedback.md`, and the `.type/`
  and `ds/<ns>/` caches. The drafter: the job's `canvas/project/` (minus `ds/`) and the round's
  `result.md`. The critic: its `critique-NN.md` and `judge-NN.md`. The engine: `design.json`,
  `job.json`, `round.json`, an operator's in-app edits copied in (`design-readback --apply`),
  `SIGNOFF.md` and the snapshots. The mockup span and the build slices only read the record.

**The commands** (`python3 scripts/workflow.py <command> --help` has the detail):

| command | what it does |
|---|---|
| `design-init [--id I] [--name N]` | writes `design.json` (schema 2); refuses a schema-1 manifest |
| `design-system --artifact U --namespace NS --version V [--source S] [--files a,b]` | records the synced Design System |
| `design-open --slug S --slice P<N>.S<n> [--title T] [--new-job \| --job J] [--critique L]` | opens a job's next round; no flag = the slice's only job (or its first); `--new-job` adds a wave job; `--job` names one once the slice has two |
| `design-check [<job>]` | checks the record (one job, or all); warnings exit 0, problems exit 1 |
| `design-canvas <job> [--url U] [--version V] [--implemented]` | records the canvas url, each published version (with its size manifest, and on the open round), and a built job |
| `design-publish-plan <job>` | read-only: prints the publish call as JSON `{url, root, file_path, files}` |
| `design-preview <job> --runtime R [--out D] [--board B] [--phone] [--click] [--phone-click] [--states-only] [--contact-sheet] [--strict]` | renders the canvas locally with the type's real runtime; screenshots, measured checks and the WCAG checks (non-text contrast, reflow and overprint at 320 px and 200% text, keyboard); ends `self_check=pass\|fail`; keeps the render in the git-ignored `.preview/<job>/<round>/` |
| `design-readback <job> (--listing F\|- \| --fetched D [--apply])` | compares a canvas listing with the publish manifest and names what to fetch; then diffs the fetched files, and copies them in |
| `design-close <job>/<round> (--words "…" \| --superseded) [--canvas-version V]` | snapshots and closes the round; `--words` needs a settled read-back since the publish, the round's `## Build` and a passing `design-check`, and generates `SIGNOFF.md` |
| `design-sign --slice S --words "…"` | signs every job presented at the stop (each open round with a recorded publish), all or nothing |
| `design-migrate [--to 2] [--apply]` | moves a legacy record aside, unchanged; a dry run unless `--apply` |
