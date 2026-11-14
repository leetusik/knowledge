import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

// The app router runs on the React that Next vendors (next/dist/compiled/react-dom),
// not on the `react-dom` in package.json. The React canary vendored by Next 16.2.x
// drops a Suspense ping that arrives DURING a render while a transition is
// "suspended with delay": `pingSuspendedRoot` then neither restarts the render nor
// records the pinged lane, and `markRootSuspended` clears the ping. A server
// action's streamed Flight chunk can ping exactly that way, so on the production
// build the action's transition never commits: a minted key is created but never
// shown, and the next submit is swallowed. React #36134 records the lane instead
// (vendored from Next 16.3.0). This guard fails if the shipped Next goes back to
// the dropping form.
const require = createRequire(import.meta.url);
const nextDir = dirname(require.resolve("next/package.json"));
const DROPPING_FORM =
  /0 === \(executionContext & 2\) && prepareFreshStack\(root, 0\)/;

describe("vendored React records a ping that arrives during render", () => {
  for (const pkg of ["react-dom", "react-dom-experimental"]) {
    it(`${pkg} client production build`, () => {
      const source = readFileSync(
        join(
          nextDir,
          "dist/compiled",
          pkg,
          "cjs/react-dom-client.production.js",
        ),
        "utf8",
      );
      const start = source.indexOf("function pingSuspendedRoot(");
      expect(start).toBeGreaterThan(-1);
      const body = source.slice(
        start,
        source.indexOf("\nfunction ", start + 1),
      );
      expect(DROPPING_FORM.test(body), "drops a render-phase ping").toBe(false);
    });
  }
});
