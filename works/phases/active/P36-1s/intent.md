# Intent — P36-1s

- Captured at: 2026-10-30T17:01:57+09:00
- Origin: operator

## Original Input (verbatim)

> and one big feature for the reader. I want to add hermes chat agent. pc will see the chatbot side by side of it's content, hide available, and tablet and phone will be able to chat with drawer.user can ask general question about the document, and ask about speicifc lines by adding those as contexts. a agent, can access to my project folder(only document related folders), so that it can really look up the codebase, and doing all this kind of stuff. including web search. gonna use claude api key. using opus model with mid effort. any detail to confirm? you can suggest how would the agent work in general man.

Answers to the five decisions proposed back:

> 1. the hermes agent opensource software.
> 2. a. and idk if it's necessary to copy find a better way if no way, then just ok.
> 3. as your recommendation for now, later maybe paid users. but later.
> 4. yes
> 5. yes
> go

Confirmation of the name, objective, scope, design style and mockup default:

> yes

## Confirmed Intent (refined + clarified)

Add **Hermes**, a chat agent, to the reader, built on the open-source **Hermes Agent** (Nous Research, MIT) and running on the server, never in the browser.

- **Where it shows.** On desktop, a side panel beside the document's content that the reader can hide (the choice is remembered). On tablet and phone, a drawer.
- **What the reader asks.** General questions about the document, and questions about specific lines: the reader selects text in the document and adds it to the chat as context (several excerpts may be attached to one question). The "add as context" action sits with the reader's existing selection actions.
- **What the agent can look at.**
  - the document itself (the current chapter and its book), and the knowledge base (other documents and search), under the reader's own visibility rules;
  - the code repositories behind the document's project, **read-only**, and only those "document related" repos: never anything else on the machine. Secrets (`.env`, keys) stay unreadable;
  - the web (search and fetch).
  It has no tool that writes anything and no shell.
- **Model.** Claude Opus 5.5 at medium effort, on the operator's own Claude API key, held as a server secret.
- **Answers.** Grounded and cited: a link back to the passage in the document (scrolls the reader there), a code location with its snippet, or a web link. The agent's steps (searched, read, fetched) are visible while it works, and a question can be stopped.
- **Who can use it.** Only signed-in members of the org that owns the document (today, the operator). It is hidden on public and anonymous views, because it reads private code and spends the operator's key. Paid or other users come later, not in this phase.
- **Chats.** Saved per user per document, so the reader can come back to a thread; a "new chat" starts a fresh one.
- **Which documents.** Native books and markdown documents get the full feature. Legacy HTML explainers get whole-document questions only (no line selection).
- **Code access without copies, if possible.** Before settling on server-side copies of the repos, look for a better way (for example reading files on demand from GitHub at the cited commit, or a clone that fetches file contents only when read). If there is no better way, read-only copies on the server are fine.
- **Hermes must fit.** Confirm first that Hermes Agent can run as a server behind the reader, use Opus 5.5 with medium effort, have its shell and write tools turned off, stay confined to the allowed repos, and keep each user's chats separate. If it cannot be confined safely, stop and ask the operator before going further; the suggested fallback is to keep the Hermes name on a chat built directly on the Claude API.
- **Spend.** The feature calls a paid API; anything that spends against the key during the build is planned with the operator first, with the calls and a rough cost. Rough estimate given: $0.10–0.50 a question, up to about $1 for a deep dig through code.

Out of scope: paid or other users, any write tool, line selection on legacy HTML explainers.

## Clarifications Resolved

- Q: Is "Hermes" just the agent's name, or the Nous Research Hermes Agent open-source software? — A: the Hermes Agent open-source software.
- Q: Where does the agent read the operator's code — (a) server-side read-only repos per project, (b) a connector on the operator's Mac, (c) dev runtime only? — A: (a), but find a better way than copying the repos if one exists; if not, copies are OK.
- Q: Who gets the chat? Recommended: only signed-in members of the org that owns the document, hidden on public/anonymous views. — A: as recommended for now; paid users maybe later.
- Q: Are chats saved per user per document? — A: yes.
- Q: Native books and markdown documents get the full feature, legacy HTML explainers whole-document questions only? — A: yes.
- Q: Design style and mockup — `build-after`, canvas sign-off with a mockup on request? — A: yes.
- Q: Hermes searches the web through its own backends, not Anthropic's; which one: the free keyless rotation, Firecrawl (500 free credits a month), Brave (2,000 free queries a month) or a self-hosted SearXNG? — A: "I'll take brave." (2026-10-30). Brave is search-only, so fetching a page's content needs a second backend, chosen at the Hermes fit check; the Brave key (`BRAVE_SEARCH_API_KEY`) is the operator's to provide.

## Design Style

`build-after`: the backend groundwork (Hermes fit, code access, saved chats) does not wait on the visuals, and the chat's look is one connected surface (panel, drawer, context chips, the selection-bar action) that should be designed whole before any of it is built, and the build fits in this phase.
Mockup: on request

## Notes

- Hermes Agent: <https://github.com/NousResearch/hermes-agent>. Its providers doc shows a native Anthropic provider on an API key, default model `claude-sonnet-4-6` (<https://hermesagent.org.cn/en/docs/integrations/providers>); its serving-behind-a-web-app story was not found in a quick search: part of the fit check.
- Production runs on the hi2vi box (`knowledge.hi2vi.com`); the operator's project folders on the Mac are not there, which is why code access is server-side.
- The reader's selection bar (Highlight, Note, Review this) is in `web/src/components/reader/annotations.tsx`.
