#!/usr/bin/env node
// accent.mjs - what accent is this page missing?
//
//   node accent.mjs <ground> [ink] [more colours...]       diagnose and suggest
//   node accent.mjs <ground> [ink] ... --check <accent>    judge an accent you already picked
//   add --json for machine-readable output
//
// The FIRST colour is the page ground (background); list the ink (text) next, then any other
// colours already on the page. Hex only (#RGB or #RRGGBB).
import { hexToOklch, oklchToHex, contrast, deltaE, hueGap, warmth, hueName } from "./color.mjs";
import { analyse } from "./diagnose.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const ci = args.indexOf("--check");
const checkHex = ci >= 0 ? args[ci + 1] : null;
const palette = args.filter((a, i) => !a.startsWith("--") && !(ci >= 0 && i === ci + 1));
if (palette.length === 0) {
  console.error("usage: node accent.mjs <ground> [ink] [colours...] [--check <accent>] [--json]");
  process.exit(2);
}

/** Which label (near-black or white) reads best ON the accent, and how well. */
function label(hex) {
  const dark = contrast(hex, "#111111"), light = contrast(hex, "#FFFFFF");
  return dark >= light ? { text: "#111111", ratio: dark } : { text: "#FFFFFF", ratio: light };
}

/** The same hue moved in lightness until it passes `target` against the ground (for text/links). */
function textSafe(hex, ground, target = 4.5) {
  const c = hexToOklch(hex), g = hexToOklch(ground);
  const step = g.L > 0.5 ? -0.01 : 0.01;
  for (let L = c.L; L > 0.05 && L < 0.99; L += step) {
    const out = oklchToHex({ L, C: c.C, h: c.h });
    if (contrast(out, ground) >= target) return out;
  }
  return null;
}

function describe(hex, ground) {
  const o = hexToOklch(hex);
  const onGround = contrast(hex, ground);
  const lab = label(hex);
  return {
    hex, oklch: `oklch(${(o.L * 100).toFixed(1)}% ${o.C.toFixed(3)} ${o.h.toFixed(0)})`, hue: hueName(o.h),
    onGround: +onGround.toFixed(2),
    asFill: onGround >= 3 ? "ok as a button/shape (>= 3:1)" : "weak edge on the ground (< 3:1): give it a border or a darker/lighter neighbour",
    asText: onGround >= 4.5 ? "ok as text (>= 4.5:1)" : `not for body text; text-safe variant ${textSafe(hex, ground) ?? "none in gamut"}`,
    label: `${lab.text === "#FFFFFF" ? "white" : "near-black"} text on it (${lab.ratio.toFixed(1)}:1${lab.ratio < 4.5 ? ", too low for small text" : ""})`,
  };
}

const { colours, findings } = analyse(palette);
const ground = palette[0];

if (checkHex) {
  const a = hexToOklch(checkHex);
  const hues = colours.filter((c) => c.C >= 0.04);
  const nearest = Math.min(...colours.map((c) => deltaE(checkHex, c.hex)));
  const fills = findings.filter((f) => f.gap === "hue" ? a.C >= 0.1
    : f.gap === "temperature" ? Math.sign(warmth(a.h)) !== Math.sign(hues.reduce((s, c) => s + warmth(c.h) * c.C, 0)) && a.C >= 0.08
    : a.L > Math.min(...colours.map((c) => c.L)) && a.L < Math.max(...colours.map((c) => c.L)));
  const verdict = {
    ...describe(checkHex, ground),
    distinct: nearest >= 0.1 ? `yes (nearest palette colour ${nearest.toFixed(2)} away)` : `NO: only ${nearest.toFixed(2)} from a palette colour - it will read as more of the same`,
    fills: findings.map((f) => `${f.gap}: ${fills.includes(f) ? "filled" : "NOT filled"}`),
    sameHueAsPage: hues.some((c) => hueGap(c.h, a.h) < 25) ? "shares a hue with the page (fine for a mid-tone, weak as a pop)" : "a hue the page does not have",
  };
  console.log(json ? JSON.stringify(verdict, null, 1) : Object.entries(verdict).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("; ") : v}`).join("\n"));
  process.exit(0);
}

const report = {
  palette: colours.map((c) => `${c.hex} ${hueName(c.h)} L${c.L.toFixed(2)} C${c.C.toFixed(3)}`),
  findings: findings.map((f) => ({ gap: f.gap, says: f.says, picks: f.picks.map((p) => ({ ...describe(p.hex, ground), why: p.why })) })),
};
if (json) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }

console.log("Palette (first = ground):\n  " + report.palette.join("\n  "));
if (report.findings.length === 0) console.log("\nNothing missing: hue, temperature and tone are covered. An accent is optional - if you add one, keep it to one.");
report.findings.forEach((f, i) => {
  console.log(`\n${i + 1}. Missing ${f.gap.toUpperCase()}${i === 0 ? "  <- fix this first" : ""}\n   ${f.says}`);
  for (const p of f.picks) {
    console.log(`   ${p.hex}  ${p.oklch}  ${p.why}`);
    console.log(`      on ground ${p.onGround}:1 - ${p.asFill}; ${p.asText}; ${p.label}`);
  }
});
