// What is this palette missing? Each finding names the gap and proposes accents that fill it.
// Order matters: a page with no hue at all needs a hue before anything else; a page that is all
// cool (or all warm) needs the other temperature; a page whose colours sit at two lightness
// extremes needs the tone in between. The idea: add the colour the page is missing, not the one you like.
import { hexToOklch, oklchToHex, maxChroma, contrast, deltaE, hueGap, warmth, hueName } from "./color.mjs";

const CHROMATIC = 0.04;      // below this a colour reads as grey / black / white
const DISTINCT = 0.1;        // an accent must be at least this far (OKLab) from every palette colour
const ONE_SIDED = 0.5;       // |chroma-weighted warmth| above this = a one-temperature palette
// Hues of the screen's pure primaries/secondaries (red, yellow, green, cyan, blue, magenta in OKLCH).
// An accent sitting exactly on one reads as a default rather than a choice, so the search leans off them.
const PURE = [29, 110, 142, 195, 264, 328];
const defaultness = (h) => Math.max(...PURE.map((p) => Math.max(0, 1 - hueGap(h, p) / 20)));

/** Lightness where this hue reaches its most vivid sRGB chroma - where an accent is at its loudest. */
export function cusp(h) {
  let best = { L: 0.6, C: 0 };
  for (let L = 0.3; L <= 0.97; L += 0.01) {
    const C = maxChroma(L, h);
    if (C > best.C) best = { L, C };
  }
  return best;
}

function candidate(L, C, h, why) {
  const hex = oklchToHex({ L, C, h });
  return { hex, why, ...hexToOklch(hex) };
}

const vivid = (h, why, soften = 0.92) => { const c = cusp(h); return candidate(c.L, c.C * soften, h, why); };

export function analyse(hexes) {
  const colours = hexes.map((hex) => ({ hex, ...hexToOklch(hex) }));
  const ground = colours[0];
  const hues = colours.filter((c) => c.C >= CHROMATIC);
  const findings = [];

  if (hues.length === 0) {
    // Black, white and greys only: the page has no colour at all. Vivid hues that stand off the ground.
    const dark = ground.L < 0.5;
    const picks = [];
    for (let h = 0; h < 360; h += 5) {
      const c = vivid(h, "");
      const lift = Math.min(contrast(c.hex, ground.hex) / (dark ? 8 : 3), 1.2);
      picks.push({ ...c, score: c.C * lift * (1 - 0.35 * defaultness(h)) });
    }
    findings.push({
      gap: "hue",
      says: `Only neutrals (no colour above C ${CHROMATIC}). The page has contrast or calm but nothing that says "look here". Add ONE saturated hue, ${dark ? "bright enough to glow on the dark ground" : "deep enough to hold its own on the light ground"}.`,
      picks: spread(picks).map((p) => ({ ...p, why: `${hueName(p.h)} at its most vivid` })),
    });
  }

  if (hues.length > 0) {
    const w = hues.reduce((s, c) => s + warmth(c.h) * c.C, 0) / hues.reduce((s, c) => s + c.C, 0);
    const dom = hues.reduce((a, b) => (b.C > a.C ? b : a));
    if (Math.abs(w) > ONE_SIDED) {
      const want = w < 0 ? "warm" : "cool";
      const comp = (dom.h + 180) % 360;
      const poles = want === "warm" ? [55, 35, 75] : [250, 225, 200];
      const hs = [comp, ...poles.filter((p) => hueGap(p, comp) <= 60)];
      findings.push({
        gap: "temperature",
        says: `Every hue is ${w < 0 ? "cool" : "warm"} (balance ${w.toFixed(2)}). One-temperature pages read generic; a ${want} accent opposite ${hueName(dom.h)} gives the eye a destination.`,
        // Most clearly warm (or cool) first: that is what the page lacks.
        picks: hs.map((h) => vivid(h, h === comp ? `complement of ${hueName(dom.h)}` : `${want} ${hueName(h)}`))
          .sort((a, b) => (want === "warm" ? -1 : 1) * (warmth(a.h) - warmth(b.h))),
      });
    }
  }

  const byL = [...colours].sort((a, b) => a.L - b.L);
  let hole = { size: 0 };
  for (let i = 1; i < byL.length; i++) {
    const size = byL[i].L - byL[i - 1].L;
    if (size > hole.size) hole = { size, lo: byL[i - 1], hi: byL[i] };
  }
  if (hues.length > 0 && hole.size >= 0.3) {
    const lead = hues.reduce((a, b) => (b.C > a.C ? b : a));
    const L = (hole.lo.L + hole.hi.L) / 2;
    const maxC = Math.max(...hues.map((c) => c.C));
    findings.push({
      gap: "tone",
      says: `Nothing between L ${hole.lo.L.toFixed(2)} and ${hole.hi.L.toFixed(2)}: the colours sit at two extremes and blend into one mood. A mid-tone in the leading hue (${hueName(lead.h)}), a little richer than the rest, adds depth (the "chrome").`,
      picks: [candidate(L, maxC * 1.25, lead.h, `mid-tone ${hueName(lead.h)}`),
        candidate(L + 0.05, maxC * 1.6, (lead.h + 15) % 360, "warmer, richer mid-tone"),
        candidate(L - 0.05, maxC * 1.6, (lead.h + 345) % 360, "cooler, richer mid-tone")],
    });
  }

  for (const f of findings) f.picks = f.picks.filter((p) => colours.every((c) => deltaE(p.hex, c.hex) >= DISTINCT));
  return { colours, findings };
}

/** Best few picks whose hues are at least 40 degrees apart, so the list offers real choices. */
function spread(picks, n = 4) {
  const out = [];
  for (const p of [...picks].sort((a, b) => b.score - a.score)) {
    if (out.every((o) => hueGap(o.h, p.h) >= 40)) out.push(p);
    if (out.length === n) break;
  }
  return out;
}
