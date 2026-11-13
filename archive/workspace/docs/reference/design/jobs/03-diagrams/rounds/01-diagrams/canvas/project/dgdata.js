/* Canvas only, never built: the diagram specimens (job 03-diagrams). Every block below is a `diagram` block's body,
   exactly as an author writes it in a chapter. Facts about knowledge come from the maintainer guide (chapter 2, on
   origin/main) and from P29's contracts (phase.md, S2 and S3); the AI, English and Tidewater numbers are samples
   written for this canvas, and every caption that shows them says so. The specimen book below holds them in the
   library's real shape, so the reader flow can show each one inside a chapter. */
(function () {
  "use strict";
  var DG = window.DG, RD = window.RD;
  var S = (DG.SAMPLES = {});

  /* ---------------- flow ---------------- */
  S["write-path"] = [
    "kind: flow",
    "title: The write path, and where the response goes",
    'caption: "Everything the caller waits for is local disk and SQLite; the push and the embedding run after the `201`. From [the maintainer guide, chapter 2](chapter:maintainer-guide/internals#the-write-path)."',
    "direction: right",
    "groups:",
    '  - {id: request, label: "In the request, under the write lock", nodes: [validate, archive, write, landing, index, upsert, commit]}',
    '  - {id: worker, label: "After the response, on the publish worker", nodes: [push, embed]}',
    "nodes:",
    '  - {id: validate, label: Validate the inputs, sub: "takes the write lock", at: [0, 0]}',
    '  - {id: write, label: Write the file, sub: "byte-exact frontmatter", at: [0, 1]}',
    '  - {id: index, label: Add the Recent bullet, sub: "docs/index.md", at: [0, 2]}',
    '  - {id: archive, label: Archive the current body, at: [1, 0], tone: muted}',
    '  - {id: landing, label: Create the landing page, at: [1, 1], tone: muted}',
    '  - {id: upsert, label: Upsert the row, sub: "durably saved here", at: [1, 2], tone: accent}',
    '  - {id: commit, label: Scoped git commit, sub: "touched paths only", at: [2, 2]}',
    '  - {id: push, label: Push, sub: "fetch, rebase, non-force push", at: [3, 1]}',
    '  - {id: embed, label: Embed, sub: "for semantic search", at: [3, 2]}',
    "edges:",
    "  - {from: validate, to: write}",
    '  - {from: validate, to: archive, label: re-publish, style: dashed}',
    "  - {from: archive, to: write, style: dashed}",
    "  - {from: write, to: index}",
    '  - {from: write, to: landing, label: first document, style: dashed}',
    "  - {from: landing, to: index, style: dashed}",
    "  - {from: index, to: upsert}",
    "  - {from: upsert, to: commit}",
    '  - {from: commit, to: push, label: "201 goes out"}',
    "  - {from: push, to: embed}"
  ].join("\n");

  S["retry"] = [
    "kind: flow",
    "title: A lost response, read back before any retry",
    'caption: "A timed-out write is not evidence of failure: read the document back once, then retry at most once. Blind retrying is how a duplicate, or an unwanted v2, is born."',
    "direction: right",
    "nodes:",
    '  - {id: publish, label: Agent publishes, shape: pill}',
    '  - {id: api, label: Write path, sub: "POST /api/documents"}',
    '  - {id: saved, label: "201: saved", shape: pill, tone: ok}',
    '  - {id: read, label: Read the document back, at: [1, 1]}',
    '  - {id: there, label: It is there, sub: "done, no retry", shape: pill, tone: ok, at: [1, 2]}',
    "edges:",
    "  - {from: publish, to: api}",
    '  - {from: api, to: saved, label: answered}',
    '  - {from: api, to: read, label: "timed out", tone: warn}',
    '  - {from: read, to: there, label: found}',
    '  - {from: read, to: publish, label: "missing: retry once", style: dashed}'
  ].join("\n");

  S["layers"] = [
    "kind: flow",
    "title: Who talks to whom, in layers",
    'caption: "The browser never holds a token: it talks only to the web app\'s server, which calls the API server to server. The MCP service forwards the caller\'s bearer as it is. How it all runs in production is in [the shipping chapter](chapter:maintainer-guide/shipping)."',
    "direction: down",
    "groups:",
    '  - {id: clients, label: Clients, nodes: [reader, agent]}',
    '  - {id: servers, label: Servers, nodes: [web, mcp]}',
    '  - {id: api, label: "The API: one FastAPI process", nodes: [content, accounts]}',
    '  - {id: disk, label: Storage, nodes: [files, sqlite, postgres]}',
    "nodes:",
    '  - {id: reader, label: A reader, sub: "browser", shape: pill, at: [0, 0]}',
    '  - {id: agent, label: A coding agent, sub: "MCP client", shape: pill, at: [0, 2]}',
    '  - {id: web, label: Web app server, sub: "sealed session cookie", at: [1, 0]}',
    '  - {id: mcp, label: MCP service, at: [1, 2]}',
    '  - {id: content, label: Content plane, at: [2, 0]}',
    '  - {id: accounts, label: Accounts plane, at: [2, 2]}',
    '  - {id: files, label: "docs/ and git", shape: store, tone: store, at: [3, 0]}',
    '  - {id: sqlite, label: SQLite, sub: "FTS5 · WAL", shape: store, tone: store, at: [3, 1]}',
    '  - {id: postgres, label: Postgres, shape: store, tone: store, at: [3, 2]}',
    "edges:",
    '  - {from: reader, to: web, label: sealed cookie}',
    '  - {from: agent, to: mcp, label: bearer}',
    '  - {from: web, to: content, label: "bearer, server to server", tone: warn}',
    '  - {from: mcp, to: content, label: "the caller\'s bearer", tone: warn}',
    "  - {from: web, to: accounts}",
    '  - {from: files, to: sqlite, label: "reindex()", style: dashed}',
    "  - {from: content, to: files}",
    "  - {from: accounts, to: postgres}"
  ].join("\n");

  S["tables"] = [
    "kind: flow",
    "title: Four of the reader-state tables",
    'caption: "Key fields only. A card comes from a quiz\'s first attempt or from a highlight marked *Review this*; its logs and its card go when the annotation is deleted. Every table also cascades from `users` and `tenants`; the full list is in [the reader-state contract](chapter:knowledge/reader-state)."',
    "direction: right",
    "nodes:",
    '  - {id: attempts, label: quiz_attempts, shape: entity, at: [0, 0], fields: [id, user_id, unit, block_id, item_id, "item_type", "response jsonb", correct, attempt]}',
    '  - {id: annotations, label: reader_annotations, shape: entity, at: [1, 1], fields: [id, user_id, unit, block_id, "quote jsonb?", "note?", "anchor_status"]}',
    '  - {id: cards, label: review_cards, shape: entity, tone: accent, at: [0, 1], fields: [id, user_id, unit, "source (quiz|highlight)", "item_id?", "annotation_id?", status, due, stability]}',
    '  - {id: logs, label: review_logs, shape: entity, at: [1, 0], fields: [id, card_id, user_id, rating, reviewed_at, scheduled_days]}',
    "edges:",
    '  - {from: attempts, to: cards, label: "first attempt seeds", style: dashed}',
    '  - {from: annotations, to: cards, label: "annotation_id, cascade"}',
    '  - {from: logs, to: cards, label: "card_id, cascade"}'
  ].join("\n");

  S["reindex"] = [
    "kind: flow",
    "title: Rebuilding the database from the files",
    'caption: "No node is placed: the steps flow down in order. `reindex()` runs at every boot; [the layers drawing](#layers) shows where it sits."',
    "direction: down",
    "nodes:",
    '  - {id: files, label: "Every .md and .html under docs/", shape: store, tone: store}',
    '  - {id: read, label: "read_document()", sub: "frontmatter, body and format"}',
    '  - {id: upsert, label: "upsert_document()", sub: "tenant from the path"}',
    '  - {id: prune, label: Delete the rows no file backs}',
    '  - {id: report, label: ReindexReport, sub: "indexed and removed", shape: pill}',
    "edges:",
    "  - {from: files, to: read}",
    "  - {from: read, to: upsert}",
    '  - {from: upsert, to: read, label: next file}',
    '  - {from: upsert, to: prune, label: "all files seen"}',
    "  - {from: prune, to: report}"
  ].join("\n");

  S["long-labels"] = [
    "kind: flow",
    "title: Long labels and sub lines wrap inside their node",
    'caption: "A label wraps at about 18 characters, a sub line at about 22, and the node grows to hold them; nothing is cut."',
    "direction: right",
    "nodes:",
    '  - {id: a, label: "Superseded bodies are archived as files under .versions/", sub: "the document_versions table is a projection of them"}',
    '  - {id: b, label: "A history feature that stored bodies only in SQLite", sub: "would be erased by the next boot reindex", tone: bad}',
    '  - {id: c, label: "publish_worker_failed_after_response_pending_count", sub: "one long identifier, broken at its underscores"}',
    "edges:",
    '  - {from: a, to: b, label: "never instead of"}',
    '  - {from: b, to: c, style: dashed}'
  ].join("\n");

  /* ---------------- state ---------------- */
  S["chapter-states"] = [
    "kind: state",
    "title: A chapter's state, for one reader",
    "direction: right",
    "initial: unopened",
    "nodes:",
    '  - {id: unopened, label: Unopened, sub: "no row yet"}',
    '  - {id: started, label: Started}',
    '  - {id: finished, label: Finished, tone: accent}',
    "edges:",
    '  - {from: unopened, to: started, label: first open}',
    '  - {from: started, to: finished, label: "end reached, or Mark as finished"}',
    '  - {from: finished, to: started, label: Mark as unread}'
  ].join("\n");

  S["card-states"] = [
    "kind: state",
    "title: A review card's status",
    'caption: "A card starts on a quiz item\'s first attempt. A surviving item whose type changed resets its card, logs kept; a retired item retires its card for good, because ids are never reused."',
    "direction: right",
    "initial: active",
    "final: retired",
    "nodes:",
    '  - {id: active, label: Active, sub: "in the queue", at: [0, 0]}',
    '  - {id: suspended, label: Suspended, sub: "out of the queue", at: [1, 0], tone: muted}',
    '  - {id: retired, label: Retired, sub: "kept with its logs", at: [0, 1]}',
    "edges:",
    '  - {from: active, to: suspended, label: the reader suspends it}',
    '  - {from: suspended, to: active, label: the reader unsuspends it}',
    '  - {from: active, to: active, label: "type changed: reset"}',
    '  - {from: active, to: retired, label: item id retired}',
    '  - {from: suspended, to: retired, label: item id retired}'
  ].join("\n");

  /* ---------------- sequence ---------------- */
  S["bridge"] = [
    "kind: sequence",
    "title: The legacy bridge, between the reader and a framed explainer",
    'caption: "The bridge script, about 1 KB, does exactly three things. The reader checks every message\'s source and shape before it acts."',
    "actors:",
    "  - {id: reader, label: Reader page}",
    "  - {id: frame, label: Framed explainer}",
    "steps:",
    '  - {from: reader, to: frame, label: "restore {anchor | fraction}", note: "Sent once, on load."}',
    '  - {from: frame, to: reader, label: "scroll {fraction, anchor}", note: "Throttled. anchor is the nearest preceding element id."}',
    '  - {from: reader, to: reader, label: "save the position"}',
    '  - {from: frame, to: reader, label: "navigate {href}"}',
    '  - {from: reader, to: reader, label: "validate, then route"}'
  ].join("\n");

  S["publish-seq"] = [
    "kind: sequence",
    "title: One publish, end to end",
    'caption: "Six actors. The `201` leaves before any network work; the push and the embedding wait on the publish worker\'s queue."',
    "actors:",
    "  - {id: agent, label: Coding agent}",
    "  - {id: mcp, label: MCP service}",
    "  - {id: api, label: FastAPI}",
    "  - {id: sqlite, label: SQLite}",
    "  - {id: git, label: Git repository}",
    "  - {id: worker, label: Publish worker}",
    "steps:",
    "  - {from: agent, to: mcp, label: publish}",
    '  - {from: mcp, to: api, label: "POST /api/documents"}',
    '  - {from: api, to: api, label: "validate, take the write lock, write the file"}',
    '  - {from: api, to: sqlite, label: upsert the row}',
    '  - {from: api, to: git, label: scoped commit}',
    '  - {from: api, to: mcp, label: "201", style: dashed}',
    '  - {from: api, to: worker, label: "queue push and embed", note: "The push task takes the same write lock itself."}',
    '  - {from: mcp, to: agent, label: saved, style: dashed}'
  ].join("\n");

  /* ---------------- stack ---------------- */
  S["stack-plain"] = [
    "kind: stack",
    "title: knowledge, from the reader down to the disk",
    'caption: "Read top to bottom, from whoever asks down to the disk. The browser reaches the API only through the web app\'s server."',
    "layers:",
    '  - {label: Clients, items: [readers in a browser, coding agents]}',
    '  - {label: Servers, items: ["web app server, a sealed-cookie BFF", "MCP service, a thin proxy"]}',
    '  - {label: "The API, one FastAPI process", items: [content plane, accounts plane, one uvicorn worker], tone: accent}',
    '  - {label: Storage, items: ["docs/<project>/<date>-<slug>.md in git", SQLite with FTS5 and WAL, Postgres], tone: store}'
  ].join("\n");

  S["stack-nested"] = [
    "kind: stack",
    "title: Why the server runs one worker",
    'caption: "Each layer holds the next. The write lock is a plain `threading.Lock` inside the process, so a second worker would not see it."',
    "nested: true",
    "layers:",
    '  - {label: The API container, items: [behind the nginx edge]}',
    '  - {label: One uvicorn worker, items: [never scale workers]}',
    '  - {label: One FastAPI app, items: [content plane, accounts plane]}',
    '  - {label: One WRITE_LOCK, items: [threading.Lock, not reentrant], tone: accent}'
  ].join("\n");

  /* ---------------- timeline ---------------- */
  S["position-writes"] = [
    "kind: timeline",
    "title: When the reader's position is written",
    'caption: "A sample session. The position is written 2 s after scrolling stops and at most every 15 s while reading, plus one beacon on `pagehide`."',
    "axis: {unit: seconds, from: 0, to: 60, ticks: [0, 10, 20, 30, 40, 50, 60]}",
    "lanes:",
    "  - label: Scrolling",
    '    bars: [{from: 0, to: 6, label: scroll}, {from: 14, to: 40, label: keeps scrolling}, {from: 46, to: 48, label: a short scroll}]',
    "  - label: Timers",
    '    bars: [{from: 6, to: 8, label: "2 s", tone: muted}, {from: 8, to: 23, label: "15 s cap", tone: series-2}, {from: 23, to: 38, label: "15 s cap", tone: series-2}, {from: 38, to: 53, label: "15 s cap", tone: series-2}, {from: 40, to: 42, label: "2 s", tone: muted}, {from: 48, to: 50, label: "2 s", tone: muted}]',
    "  - label: Writes",
    '    marks: [{at: 8, label: PUT}, {at: 23, label: PUT}, {at: 38, label: PUT}, {at: 42, label: PUT}, {at: 50, label: PUT}, {at: 57, label: beacon}]'
  ].join("\n");

  /* ---------------- chart ---------------- */
  S["survey"] = [
    "kind: chart",
    "type: bar",
    "title: Today's figures, by kind",
    'caption: "126 figures in 37 explainers, sorted by count. The dashed line is the mean."',
    "x: {label: Kind, categories: [flow, chart, timeline, architecture, sequence, annotated, stack, comparison, state, ER, UI mock, matrix, tree]}",
    "y: {label: Figures, min: 0}",
    "series:",
    "  - {name: Figures, values: [36, 14, 13, 11, 10, 10, 8, 6, 6, 4, 4, 3, 1]}",
    "rules:",
    '  - {at: 9.7, label: "mean 9.7"}'
  ].join("\n");

  S["grouped"] = [
    "kind: chart",
    "type: bar",
    "title: Cards reviewed per week, by deck",
    'caption: "Sample numbers for an English study plan, written for this canvas. The dashed line is the weekly goal."',
    "x: {label: Week, categories: [W1, W2, W3, W4, W5]}",
    "y: {label: Cards, min: 0}",
    "series:",
    "  - {name: Phrasal verbs, values: [120, 140, 95, 160, 150]}",
    "  - {name: Idioms, values: [60, 85, 70, 90, 110]}",
    "  - {name: Collocations, values: [40, 55, 80, 75, 95]}",
    "rules:",
    '  - {at: 100, label: "goal 100"}'
  ].join("\n");

  S["line"] = [
    "kind: chart",
    "type: line",
    "title: Recall by days since the last review",
    'caption: "Sample numbers for an English study plan, written for this canvas. The dashed line is the mean of all three."',
    "x: {label: Days since the last review, numeric: {from: 3, to: 30}}",
    "y: {label: Recalled (%), min: 50, max: 100}",
    "series:",
    "  - {name: Phrasal verbs, values: [97, 95, 93, 92, 90, 89, 87, 86, 85, 84]}",
    "  - {name: Idioms, values: [95, 91, 87, 84, 81, 78, 76, 74, 72, 70]}",
    "  - {name: Collocations, values: [98, 97, 96, 95, 94, 93, 93, 92, 91, 91]}",
    "rules:",
    '  - {at: 88.6, label: "mean 88.6"}'
  ].join("\n");

  S["interval"] = [
    "kind: chart",
    "type: interval",
    "title: Time to answer, by quiz type",
    'caption: "Sample numbers, written for this canvas. Each bar runs from the fastest to the slowest answer; the mark is the median."',
    "x: {label: Quiz type, categories: [choice, cloze, recall]}",
    "y: {label: Seconds, min: 0, max: 60}",
    "series:",
    "  - {name: Seconds, values: [[4, 9, 21], [7, 15, 34], [12, 26, 55]]}"
  ].join("\n");

  S["negative"] = [
    "kind: chart",
    "type: bar",
    "title: Change in study hours, month on month",
    'caption: "Sample numbers, written for this canvas. Bars below the zero line are months with fewer hours than the month before."',
    "x: {label: Month, categories: [Jan, Feb, Mar, Apr, May, Jun]}",
    "y: {label: Hours, min: -6, max: 8}",
    "series:",
    "  - {name: Change, values: [4, -3, 6, -5, 2, -1]}"
  ].join("\n");

  S["long-cats"] = [
    "kind: chart",
    "type: bar",
    "title: Hours this month against last, by subject",
    'caption: "Sample numbers, written for this canvas. Long subject names take the horizontal layout, so no label overlaps another."',
    "x: {label: Subject, categories: [Machine learning foundations, Business English for meetings, Personal finance basics, Statistics refresher, 영어 발음 교정]}",
    "y: {label: Change in hours}",
    "series:",
    "  - {name: Change, values: [6, -3, 2, -5, 3]}"
  ].join("\n");

  /* 200 points: a training-loss curve (sample) */
  (function () {
    var v = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 200; i++) v.push(Math.round((0.35 + 2.1 * Math.exp(-i / 38) + (rnd() - 0.5) * 0.12 * Math.exp(-i / 120)) * 100) / 100);
    S["points-200"] = [
      "kind: chart",
      "type: line",
      "title: Training loss over 200 steps",
      'caption: "Sample numbers for an AI study notebook, written for this canvas: 200 points, the limit for one diagram."',
      "x: {label: Step, numeric: {from: 1, to: 200}}",
      "y: {label: Loss, min: 0}",
      "series:",
      "  - {name: Loss, values: [" + v.join(", ") + "]}",
      "rules:",
      '  - {at: 0.4, label: "target 0.4"}'
    ].join("\n");
  })();

  /* ---------------- Korean ---------------- */
  S["ko-write"] = [
    "kind: flow",
    "title: 쓰기 경로와 응답이 나가는 곳",
    'caption: "호출자가 기다리는 것은 로컬 디스크와 SQLite뿐입니다. 푸시와 임베딩은 `201` 응답 뒤에 실행됩니다."',
    "direction: right",
    "groups:",
    '  - {id: request, label: "요청 안에서, 쓰기 잠금을 쥔 채", nodes: [validate, write, upsert, commit]}',
    '  - {id: worker, label: "응답 뒤에, 발행 워커에서", nodes: [push, embed]}',
    "nodes:",
    '  - {id: validate, label: 입력 검증, sub: "쓰기 잠금을 잡습니다", at: [0, 0]}',
    '  - {id: write, label: 파일 쓰기, sub: "바이트 단위로 같은 머리말", at: [0, 1]}',
    '  - {id: upsert, label: 행 갱신, sub: "여기서 영구 저장됩니다", at: [0, 2], tone: accent}',
    '  - {id: commit, label: 범위를 좁힌 git 커밋, sub: "건드린 경로만 스테이징", at: [1, 2]}',
    '  - {id: push, label: 푸시, sub: "가져오기, 리베이스, 강제 없는 푸시", at: [2, 1]}',
    '  - {id: embed, label: 임베딩, sub: "의미 검색을 위해", at: [2, 2]}',
    "edges:",
    "  - {from: validate, to: write}",
    "  - {from: write, to: upsert}",
    "  - {from: upsert, to: commit}",
    '  - {from: commit, to: push, label: "201 응답이 나감"}',
    '  - {from: push, to: embed, label: "그다음 작업"}'
  ].join("\n");

  S["ko-long"] = [
    "kind: flow",
    "title: 긴 한국어 라벨은 낱말 단위로 줄을 바꿉니다",
    'caption: "한국어 라벨은 어절 중간에서 끊기지 않고(keep-all), 노드가 그 높이만큼 자랍니다."',
    "direction: right",
    "nodes:",
    '  - {id: a, label: "다시 발행할 때만 현재 본문을 보관합니다", sub: ".versions/ 아래 파일로 남깁니다"}',
    '  - {id: b, label: "SQLite에만 본문을 두는 버전 기록 기능", sub: "다음 부팅 때 reindex가 지웁니다", tone: bad}',
    "edges:",
    '  - {from: a, to: b, label: "이렇게 만들지 마세요", style: dashed}'
  ].join("\n");

  /* ---------------- near the limits: an invented project (Tidewater) ---------------- */
  (function () {
    var cols = ["Ingest", "Stations", "Solver", "Cache", "API", "Delivery"];
    var names = [
      ["NOAA feed", "UKHO feed", "BOM feed", "Gauge uploads", "Manual entry", "Feed scheduler", "Retry queue", "Raw archive", "Dead letters", "Feed health"],
      ["Station registry", "Datum table", "Gauge calibrations", "Time zones", "Station merge", "Outlier filter", "Gap filler", "Readings store", "Station search", "Station audit"],
      ["Constituent fit", "Harmonic model", "Surge model", "Residuals", "Model registry", "Backfill runner", "Solver jobs", "Model checks", "Solver logs", "Prediction writer"],
      ["Prediction cache", "Cache warmer", "Tile cache", "Expiry sweeper", "Cache stats", "Hot stations", "Cold storage", "Cache keys", "Eviction log", "Cache health"],
      ["Tide table API", "Alerts API", "Stations API", "Auth gate", "Rate limiter", "Request log", "Webhooks", "API keys", "Usage meter", "Status page"],
      ["Table renderer", "PDF tables", "Alert sender", "Email digests", "SMS gateway", "Widget embed", "Chart images", "CSV export", "Map tiles", "Push notices"]
    ];
    var nodes = [], edges = [], groups = [];
    cols.forEach(function (g, c) {
      var ids = [];
      names[c].forEach(function (nm, r) {
        var id = "n" + c + "_" + r;
        ids.push(id);
        var shape = /store|archive|cache$|table$|registry|Cold storage|Dead letters/i.test(nm) ? "store" : (c === 0 && r < 4 ? "pill" : "box");
        nodes.push("  - {id: " + id + ", label: \"" + nm + "\", at: [" + r + ", " + c + "]" + (shape !== "box" ? ", shape: " + shape : "") + (r === 0 && c === 2 ? ", tone: accent" : "") + "}");
      });
      groups.push("  - {id: g" + c + ", label: " + g + ", nodes: [" + ids.join(", ") + "]}");
    });
    /* edges: down each column, then across to the next column, with a few longer ties */
    for (var c = 0; c < 6; c++) {
      for (var r = 0; r < 9; r++) edges.push("  - {from: n" + c + "_" + r + ", to: n" + c + "_" + (r + 1) + "}");
      if (c < 5) for (var r2 = 0; r2 < 10; r2 += 2) edges.push("  - {from: n" + c + "_" + r2 + ", to: n" + (c + 1) + "_" + r2 + (r2 === 0 ? ", label: feeds" : "") + "}");
    }
    edges.push("  - {from: n1_7, to: n2_0, style: dashed}", "  - {from: n2_9, to: n3_0, label: writes}", "  - {from: n3_0, to: n4_0}", "  - {from: n4_1, to: n5_2, style: dashed}",
      "  - {from: n0_6, to: n0_0, label: retry, style: dashed}", "  - {from: n4_3, to: n4_7, style: dashed}");
    S["limits-map"] = [
      "kind: flow",
      "title: Tidewater, every service",
      'caption: "An invented project, drawn near the limits: 60 nodes and ' + edges.length + ' edges in six layers. It scrolls in its own box at every width."',
      "direction: right",
      "groups:"
    ].concat(groups, ["nodes:"], nodes, ["edges:"], edges).join("\n");
  })();

  (function () {
    var st = ["Port Alder", "Gull Rock", "Saltmarsh Quay", "Kestrel Point", "Old Harbour", "Brine Flats", "Cape Moss", "Heron Bay", "North Mole", "Weir End", "Sandpiper Cut", "Ebb Light"];
    var lanes = st.map(function (s, i) {
      var a = (i * 7) % 18, b = a + 4 + (i % 5) * 2, c = Math.min(29, b + 3 + (i % 3)), d = Math.min(30, c + 2 + (i % 4));
      var bars = "{from: " + a + ", to: " + b + ", label: backfill}, {from: " + c + ", to: " + d + ", label: " + (i % 3 === 0 ? "re-fit, tone: series-2" : "check, tone: series-3") + "}";
      var marks = i % 4 === 1 ? ", marks: [{at: " + Math.min(29, b + 1) + ", label: gauge swap}]" : "";
      return "  - {label: \"" + s + "\", bars: [" + bars + "]" + marks + "}";
    });
    S["limits-lanes"] = [
      "kind: timeline",
      "title: Backfill windows, twelve stations",
      'caption: "An invented project at the lane limit: twelve lanes on one axis."',
      "axis: {unit: days, from: 0, to: 30, ticks: [0, 5, 10, 15, 20, 25, 30]}",
      "lanes:"
    ].concat(lanes).join("\n");
  })();

  /* ---------------- the tones ---------------- */
  (function () {
    var T = DG.TONES;
    var nodes = T.map(function (t, i) { return "  - {id: t" + i + ", label: \"" + t + "\", at: [" + Math.floor(i / 4) + ", " + (i % 4) + "], tone: " + t + "}"; });
    var edges = [];
    for (var i = 0; i < T.length - 1; i++) if (i % 4 !== 3) edges.push("  - {from: t" + i + ", to: t" + (i + 1) + ", label: \"" + T[i] + "\", tone: " + T[i] + "}");
    for (var j = 0; j < T.length - 4; j += 4) edges.push("  - {from: t" + (j + 3) + ", to: t" + (j + 7 < T.length ? j + 7 : T.length - 1) + ", label: \"" + T[j + 3] + "\", tone: " + T[j + 3] + "}");
    S["tones-flow"] = ["kind: flow", "title: Every tone, as a node and an edge", 'caption: "Each node and each edge carries its tone\'s name, so the colour is never the only sign."', "direction: right", "nodes:"].concat(nodes, ["edges:"], edges).join("\n");
    S["tones-stack"] = ["kind: stack", "title: Every tone, as a layer", "layers:"].concat(T.map(function (t) { return "  - {label: \"" + t + "\", items: [fill, stroke, ink], tone: " + t + "}"; })).join("\n");
    var fam = [["Neutrals", T.slice(0, 2)], ["Roles", T.slice(2, 7)], ["Series", T.slice(7)]];
    S["tones-bars"] = ["kind: timeline", "title: Every tone, as a bar", "axis: {unit: steps, from: 0, to: 12, ticks: [0, 3, 6, 9, 12]}", "lanes:"].concat(fam.map(function (f) {
      return "  - {label: " + f[0] + ", bars: [" + f[1].map(function (t, i) { return "{from: " + (i % 2) * 6 + ", to: " + ((i % 2) * 6 + 6) + ", label: \"" + t + "\", tone: " + t + "}"; }).join(", ") + "]}";
    })).join("\n");
    S["tones-lines"] = ["kind: chart", "type: line", "title: The six series tones, as lines", 'caption: "Each line has its own dash and its name at its end."', "x: {label: Step, numeric: {from: 1, to: 8}}", "y: {label: Value, min: 0, max: 70}", "series:"].concat(
      [1, 2, 3, 4, 5, 6].map(function (k) { var b = 10 * k; return "  - {name: series-" + k + ", values: [" + [b - 4, b, b - 2, b + 3, b + 1, b + 5, b + 2, b + 4].join(", ") + "], tone: series-" + k + "}"; })).join("\n");
    S["tones-chart"] = ["kind: chart", "type: bar", "title: The six series tones, as grouped bars", "x: {label: Group, categories: [A, B, C]}", "y: {label: Value, min: 0}", "series:"].concat(
      [1, 2, 3, 4, 5, 6].map(function (k) { return "  - {name: series-" + k + ", values: [" + [3 + k, 9 - k, 5 + (k % 3)].join(", ") + "]}"; })).join("\n");
  })();

  /* A small flow for the figure-row item (a third of the column) */
  S["row-item"] = [
    "kind: flow",
    "title: Resume, in three steps",
    'caption: "By anchor when it exists, else by fraction."',
    "direction: down",
    "nodes:",
    '  - {id: open, label: Open the chapter, shape: pill}',
    '  - {id: anchor, label: Anchor in this version?}',
    '  - {id: land, label: Land there}',
    "edges:",
    "  - {from: open, to: anchor}",
    "  - {from: anchor, to: land, label: yes}"
  ].join("\n");

  /* ---------------- the specimen book ---------------- */
  /* a figure's id is fig-<name>; the heading above it keeps the plain name, so the two never collide */
  function fence(id) { return "```diagram #fig-" + id + "\n" + S[id] + "\n```"; }
  function noCaption(id) { return "```diagram #fig-" + id + "\n" + S[id].split("\n").filter(function (l) { return l.indexOf("caption:") !== 0; }).join("\n") + "\n```"; }
  var BOOK = "specimens", P = BOOK + "/";
  var chapters = [
    { key: "flow", title: "Flow: pipelines, loops, layers and tables", summary: "Every flow the diagram block draws, from the write path to the reader-state tables.", src: [
      "## A pipeline in two lanes {#pipeline}", "The write path is a pipeline, and its response sits in the middle of it. The first lane runs inside the request; the second runs after the `201` has gone out.", fence("write-path"),
      "## A loop {#loop}", "A loop sends the reader back to an earlier step. The way back runs round the outside, dashed, and never through a node.", fence("retry"),
      "## Layers and shapes {#layers}", "Groups drawn across the whole width are layers. A pill is someone acting, a box is a step or a service, and a cylinder is a store.", fence("layers"),
      "## Tables {#tables}", "An entity is a table: its name on a band, then one field per row in the code face.", fence("tables"),
      "## No node placed {#auto}", "When no node carries a position, the nodes flow in the block's direction, one after another.", fence("reindex"),
      "## Long labels {#long}", "Labels wrap inside their node. A single long word breaks at its underscores or slashes.", fence("long-labels")
    ] },
    { key: "state-sequence", title: "State and sequence", summary: "States with a start, an end and a transition to itself, and two sequences: notes and steps to itself, and six actors with their replies.", src: [
      "## Chapter states {#chapter-states}", "A chapter has three states for each reader. This drawing has no caption, so the figure ends with the drawing.", noCaption("chapter-states"),
      "## A start, an end, and a state to itself {#card-states}", "A state diagram marks where it starts with a dot and an arrow, and where it ends with a double border. A transition back to the same state is drawn as a loop above it, and two transitions between one pair run side by side, each label on its own outer side.", fence("card-states"),
      "## The legacy bridge {#bridge}", "A sequence reads top to bottom, one row per step. A note sits under its step on a folded card, and a step from an actor to itself loops back to its own lifeline. No message here answers another, so none is dashed.", fence("bridge"),
      "## Six actors {#six-actors}", "A reply is dashed: the `201` answers the request, and *saved* answers the agent. At six actors a sequence is wider than the column on a phone, so it scrolls in its own box.", fence("publish-seq")
    ] },
    { key: "stack-timeline", title: "Stack and timeline", summary: "Layers that sit on each other, layers that hold each other, and time on one axis.", src: [
      "## A stack {#stack}", "A stack is read top to bottom.", fence("stack-plain"),
      "## Nested {#nested}", "A nested stack draws each layer inside the one before it.", fence("stack-nested"),
      "## A timeline {#timeline}", "A bar has a start and an end on the axis; a mark is a single moment, drawn as a diamond on a dashed line.", fence("position-writes")
    ] },
    { key: "charts", title: "Charts: bar, line and interval", summary: "Every chart type, with rules, negative values, long labels and 200 points.", src: [
      "## One series {#survey}", "Thirteen categories take the horizontal layout: each kind gets its own row, its count at the end of its bar.", fence("survey"),
      "## Several series {#grouped}", "Grouped bars carry a pattern each and a key above the chart, so a series is never told apart by colour alone.", fence("grouped"),
      "## Lines {#line}", "Each line has its own dash and its name at its end.", fence("line"),
      "## Intervals {#interval}", "An interval runs from a low to a high value, with an optional middle mark.", fence("interval"),
      "## Below zero {#negative}", "Bars below zero hang from the zero line, which is drawn darker than the grid.", fence("negative"),
      "## Long category names {#long-cats}", fence("long-cats"),
      "## 200 points {#points}", fence("points-200")
    ] },
    { key: "korean", title: "Korean labels", summary: "Korean node and edge labels, long labels and sub lines, in an English chapter and in its Korean translation.", src: [
      "## The write path {#ko-write}", "Every label in this flow is Korean. Hangul takes Pretendard inside the interface face, and a label never breaks inside a word.", fence("ko-write"),
      "## Long labels {#ko-long}", "A long Korean label wraps only between words, and its node grows to hold it.", fence("ko-long")
    ], ko: { title: "다이어그램 속의 한국어", summary: "한국어 노드 라벨과 화살표 라벨, 긴 라벨과 보조 줄.", src: [
      "## 쓰기 경로 {#ko-write}", "노드와 화살표의 라벨이 모두 한국어인 흐름도입니다.", fence("ko-write"),
      "## 긴 라벨 {#ko-long}", "긴 한국어 라벨은 어절 사이에서만 줄을 바꿉니다.", fence("ko-long")
    ] } },
    { key: "limits", title: "Near the limits", summary: "Sixty nodes, twelve lanes and two hundred points.", src: [
      "## Sixty nodes {#limits-map}", "A drawing this large keeps its legible size and scrolls sideways in its own box, at every width.", fence("limits-map"),
      "## Twelve lanes {#limits-lanes}", fence("limits-lanes")
    ] },
    { key: "tones", title: "The thirteen tones", summary: "Every tone as a node, an edge, a layer, a bar and a line.", src: [
      "## Nodes and edges {#tones-flow}", fence("tones-flow"),
      "## Layers {#tones-stack}", fence("tones-stack"),
      "## Bars {#tones-bars}", fence("tones-bars"),
      "## Lines {#tones-lines}", fence("tones-lines"),
      "## Grouped bars {#tones-chart}", fence("tones-chart")
    ] }
  ];
  RD.books[BOOK] = { title: "Diagrams, kind by kind", project: "knowledge", chapters: chapters.map(function (c) { return P + c.key; }) };
  chapters.forEach(function (c, i) {
    var v = { title: c.title, summary: c.summary, date: "20 Oct 2026", src: c.src.join("\n\n") };
    var variants = { en: { newest: 1, versions: { 1: v } } };
    if (c.ko) variants.ko = { newest: 1, versions: { 1: { title: c.ko.title, summary: c.ko.summary, date: "20 Oct 2026", src: c.ko.src.join("\n\n") } } };
    RD.docs[P + c.key] = { book: BOOK, key: c.key, n: i + 1, format: "native", variants: variants };
  });
  DG.SPECIMENS = chapters.map(function (c) { return P + c.key; });
})();
