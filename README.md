# accent-colour

A skill for AI coding agents (Claude Code, Codex and others that read `SKILL.md`) that picks an
accent colour the way a designer would: **don't add the colour you like, add the one the page is
missing.**

It comes with a small command-line tool (Node.js, no dependencies) that reads a palette, says which gap
it has - **no hue**, **one temperature only**, or **no mid-tone** - and ranks accents that fill it, with
WCAG contrast numbers and the right text colour to put on each.

```text
$ node scripts/accent.mjs "#F3F2EE" "#0D34B7"
Palette (first = ground):
  #F3F2EE yellow L0.96 C0.005
  #0D34B7 blue L0.41 C0.208

1. Missing TEMPERATURE  <- fix this first
   Every hue is cool (balance -0.82). One-temperature pages read generic; a warm accent opposite blue
   gives the eye a destination.
   #F9892B  oklch(73.9% 0.168 55)  warm orange
      on ground 2.17:1 - weak edge on the ground (< 3:1): give it a border or a darker/lighter
      neighbour; not for body text; text-safe variant #AC5700; near-black text on it (7.8:1)
   ...
```

## Install

Copy this folder into your agent's skills directory:

- Claude Code: `~/.claude/skills/accent-colour/`
- Codex: `~/.agents/skills/accent-colour/`

The agent will use it when you ask for an accent, a CTA colour, or why a palette feels flat.

## Use the tool directly

```bash
node scripts/accent.mjs <ground> [ink] [other colours...]          # diagnose and suggest
node scripts/accent.mjs <ground> [ink] ... --check <accent>        # judge an accent you picked
node scripts/accent.mjs <ground> [ink] ... --json                  # machine-readable
node scripts/test.mjs                                              # self-test
```

The first colour is the page background. Colours are hex (`#RGB` or `#RRGGBB`).

## How it decides

- **No hue** (only blacks, whites, greys): suggests vivid hues at the lightness where each is most
  saturated, ranked by how well they stand off the ground, leaning away from pure screen primaries.
- **One temperature** (chroma-weighted warmth clearly one-sided): suggests the other temperature near
  the complement of the main hue, the most clearly warm (or cool) first.
- **No mid-tone** (a lightness gap of 0.3 or more between the palette's colours): suggests a richer
  mid-tone in the leading hue.

Every suggestion is at least 0.1 apart from the existing colours in OKLab, so it reads as new.
Colour maths is OKLCH; contrast is WCAG 2.

The test suite checks the three palettes from the reel that inspired this (mauve + lavender ->
lavender chrome, cobalt + white -> sun orange, black + white -> acid lime): the tool finds the same
gap and puts a near match first.

## Credit and licence

Inspired by Charles Liu's short "stop picking accent colours just because you like them". This is an
independent implementation, not his skill.

MIT licence, see `LICENSE`.
