import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), "../../custom_components/entitymap/frontend");
const ENTRY = "entitymap-panel.js";

function listModules(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "vendor" ? [] : listModules(path);
    }

    return entry.name.endsWith(".js") ? [path] : [];
  });
}

const importsOf = (path) =>
  [...readFileSync(path, "utf8").matchAll(/(?:from|import)\s*\(?\s*"(\.{1,2}\/[^"]+)"/g)].map((m) =>
    resolve(dirname(path), m[1])
  );

describe("panel modules", () => {
  describe("GIVEN every module the browser can load", () => {
    const modules = listModules(FRONTEND);

    describe("WHEN relative imports that point at a missing file are collected", () => {
      let missing;

      before(() => {
        missing = modules.flatMap((path) =>
          importsOf(path).filter((target) => !existsSync(target)).map((target) => `${relative(FRONTEND, path)} -> ${relative(FRONTEND, target)}`)
        );
      });

      it("THEN every import resolves to an existing file", () => {
        assert.deepEqual(missing, []);
      });
    });

    /*
     * `node --check` parses these files as scripts, so a syntax error inside a
     * class body can slip through it. Importing them as modules cannot.
     */
    describe("WHEN each one is imported as an ES module", () => {
      const failures = [];

      before(async () => {
        for (const path of modules.filter((path) => relative(FRONTEND, path) !== ENTRY)) {
          try {
            await import(pathToFileURL(path).href);
          } catch (error) {
            failures.push(`${relative(FRONTEND, path)}: ${error.message}`);
          }
        }
      });

      it("THEN none of them fails to load", () => {
        assert.deepEqual(failures, []);
      });
    });
  });

  describe("GIVEN the feature folders", () => {
    const features = ["panel", "graph", "findings", "detail", "hierarchy"];

    describe("WHEN the entry point source is read", () => {
      let entry;

      before(() => {
        entry = readFileSync(join(FRONTEND, ENTRY), "utf8");
      });

      it("THEN it includes the stylesheet of every feature, so no view renders unstyled", () => {
        for (const feature of features) {
          assert.match(entry, new RegExp(`from "\\./${feature}/styles\\.js"`), `${feature} styles not composed`);
        }
      });
    });
  });
});
