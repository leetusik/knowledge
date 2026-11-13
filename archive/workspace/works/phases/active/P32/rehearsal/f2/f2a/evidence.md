# f2a: why it stopped (from the stream, `scratchpad/f2/runs/f2a/out.jsonl`, 887 KB; paths shortened to `<state>` = the run's scratch `XDG_STATE_HOME`)

- The lead's `knowledge:verifier` dispatch (`model: opus`, batch r1-b1) named
  `dossier: <state>/knowledge-kb/explain/20261023-1625-roman-empire-history` and
  `tools: <state>/knowledge-kb/explain` (the explain root), not `<state>/knowledge-kb/explain/tools` (`<TOOLS>`).
- The verifier then ran `python3 -I <state>/knowledge-kb/explain/pagetext.py <dossier>/pages/r1-b1/S-r1-web-02.html …`
  for each page (02, 03, 06, 07, 08, 09, 12, 13). The allow rule is `Bash(python3 -I <TOOLS>/pagetext.py *)`, so
  every call was denied ("Permission to use Bash has been denied").
- The verifier returned `failed: permissions`; the lead printed the stop block (`final-message.md`). Under the
  pre-F2 text (§3.2: "when the call it names is in a form its brief gives") a wrong folder was not named as the
  dispatch's error, so the lead took it as the session's. F2's revision names it.
