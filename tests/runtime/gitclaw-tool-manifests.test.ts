import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const toolFiles = [
  "tools/graphify.yaml",
  "tools/git-diff.yaml",
  "tools/rg-search.yaml",
  "tools/run-tests.yaml"
];

describe("Gitclaw tool manifests", () => {
  it.each(toolFiles)("keeps %s loadable by the declarative tool loader", async (toolFile) => {
    const manifest = parse(await readFile(toolFile, "utf8"));

    expect(manifest.name).toBeTypeOf("string");
    expect(manifest.description).toBeTypeOf("string");
    expect(manifest.input_schema).toMatchObject({ properties: expect.any(Object) });
    expect(manifest.implementation).toMatchObject({
      script: expect.stringMatching(/\.(mjs|js|sh)$/),
      runtime: expect.any(String)
    });
  });
});
