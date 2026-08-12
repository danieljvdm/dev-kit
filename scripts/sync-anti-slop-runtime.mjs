import { readFile, writeFile } from "node:fs/promises";

const generatedUrl = new URL("../.dev-kit/anti-slop-build/index.mjs", import.meta.url);
const runtimeUrl = new URL("../src/oxlint-plugin-anti-slop/runtime.js", import.meta.url);
const generated = await readFile(generatedUrl, "utf8");
const header =
  "// Bundled from the vendored anti-slop source at commit 9b80d9a5c317d3af94d88a577bdbde4d9a45f7be.\n";
const runtime = generated.replace(/^\/\/[#](?:end)?region.*\n/gmu, "");
const expected = `${header}${runtime}`;

if (process.argv.includes("--check")) {
  const current = await readFile(runtimeUrl, "utf8");

  if (current !== expected) {
    throw new Error("anti-slop runtime is stale; run `vp run anti-slop:bundle`");
  }
} else {
  await writeFile(runtimeUrl, expected);
}
