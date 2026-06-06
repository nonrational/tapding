import { defineConfig } from "vite";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Node 25 exposes localStorage as a built-in global but requires a valid
    // --localstorage-file to get a fully functional implementation (with .clear etc).
    // Without this, jsdom-environment tests that touch localStorage see a broken stub.
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: [
          `--localstorage-file=${path.join(os.tmpdir(), "vitest-localstorage.json")}`,
        ],
      },
    },
  },
});
