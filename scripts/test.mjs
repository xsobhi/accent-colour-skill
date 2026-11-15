// node scripts/test.mjs - the three palettes from Charles Liu's accent-colour reel, and the
// accents he added. The tool must find the same gap and put a near match first.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyse } from "./diagnose.mjs";
import { deltaE, hueGap, hexToOklch, contrast, oklchToHex } from "./color.mjs";

const cases = [
  { name: "blended (mauve taupe + pale lavender)", palette: ["#6B4547", "#D2B4DC"], gap: "tone", reel: "#A584AD", within: 0.06 },
  { name: "generic (studio white + cobalt)", palette: ["#F3F2EE", "#0D34B7"], gap: "temperature", reel: "#FF8A1E", within: 0.06 },
  { name: "low contrast (black + white)", palette: ["#0F1014", "#F2F2F0"], gap: "hue", reel: "#B8F01E", hueWithin: 15 },
];

let failed = 0;
const check = (label, fn) => {
  try { fn(); console.log(`ok   ${label}`); } catch (e) { failed++; console.log(`FAIL ${label}: ${e.message}`); }
};

for (const c of cases) {
  const { findings } = analyse(c.palette);
  check(`${c.name}: first gap is ${c.gap}`, () => assert.equal(findings[0]?.gap, c.gap));
  const first = findings[0]?.picks[0];
  check(`${c.name}: first pick ${first?.hex} is close to the reel's ${c.reel}`, () => {
    assert.ok(first, "no pick");
    if (c.within) assert.ok(deltaE(first.hex, c.reel) <= c.within, `deltaE ${deltaE(first.hex, c.reel).toFixed(3)}`);
    if (c.hueWithin) assert.ok(hueGap(first.h, hexToOklch(c.reel).h) <= c.hueWithin, `hue gap ${hueGap(first.h, hexToOklch(c.reel).h).toFixed(0)}`);
  });
  check(`${c.name}: every pick stands apart from the palette`, () => {
    for (const p of findings.flatMap((f) => f.picks)) for (const hex of c.palette) assert.ok(deltaE(p.hex, hex) >= 0.1, `${p.hex} vs ${hex}`);
  });
}

check("mauve + lavender is not called one-temperature (no green 'complement')", () =>
  assert.ok(!analyse(["#6B4547", "#D2B4DC"]).findings.some((f) => f.gap === "temperature")));
check("a balanced palette reports nothing missing", () =>
  assert.equal(analyse(["#F3F2EE", "#14141A", "#0D34B7", "#FF8A1E", "#7A7F99"]).findings.length, 0));
check("colour maths: hex -> OKLCH -> hex round-trips", () =>
  ["#6B4547", "#0D34B7", "#B8F01E", "#FFFFFF", "#000000"].forEach((h) => assert.equal(oklchToHex(hexToOklch(h)), h)));
check("contrast: black on white is 21:1", () => assert.equal(contrast("#000000", "#FFFFFF").toFixed(2), "21.00"));

const cli = fileURLToPath(new URL("./accent.mjs", import.meta.url));
check("--check on the reel's own answer says the gap is filled", () => {
  const out = execFileSync("node", [cli, "#F3F2EE", "#0D34B7", "--check", "#FF8A1E"], { encoding: "utf8" });
  assert.match(out, /temperature: filled/);
});
check("--json output parses", () => {
  const out = JSON.parse(execFileSync("node", [cli, "#0F1014", "#F2F2F0", "--json"], { encoding: "utf8" }));
  assert.equal(out.findings[0].gap, "hue");
});

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
