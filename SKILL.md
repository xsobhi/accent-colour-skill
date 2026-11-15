---
name: accent-colour
description: >-
  Pick or review the accent colour of a web page, app screen, brand palette, poster or slide by finding the
  colour the design is MISSING (a hue, the other temperature, or a mid-tone) instead of the one you like.
  Use when choosing a primary/CTA/highlight/brand accent, when a palette looks flat, blended, muddy,
  generic or low-energy, when asked "what colour should the button/link/badge be", when adding a second
  colour to a black-and-white or one-colour design, or when checking an accent's contrast and label colour.
  Comes with a zero-dependency OKLCH tool that diagnoses a palette and ranks accents with WCAG contrast.
---

# Accent colour: add the one the page is missing

An accent is not decoration and not a favourite colour. It is the one colour the rest of the palette
lacks, so the eye has somewhere to land. Three gaps cover almost every case:

| The page is... | What it is missing | Example (before -> accent) |
|---|---|---|
| Only black, white and greys | **a hue** - one saturated colour, vivid enough to glow on the ground | black + white -> acid lime `#B8F01E` |
| All cool, or all warm | **the other temperature** - near the complement of its main hue | cobalt + studio white -> sun orange `#FF8A1E` |
| Two tones at the extremes, blending into one mood | **a mid-tone** in its leading hue, a little richer (the "chrome") | mauve taupe + pale lavender -> lavender chrome `#A584AD` |

If none of the three is missing, the page does not need a new colour. Leave it, or keep the accent it
already has.

## Workflow

1. **Collect what is really on the page**, in this order: the ground (main background), the ink (body
   text), then every other colour a viewer sees in quantity: brand colour, section backgrounds, and the
   dominant colours of large photos or illustrations. Sources: CSS custom properties and Tailwind theme
   (grep for `--`/`#` in the tokens file), the design file, or colours sampled from a screenshot.
   Ignore status colours (error red, success green): they are signals, not palette.
2. **Diagnose:**
   ```bash
   node <this skill>/scripts/accent.mjs "#ground" "#ink" "#other" ...
   ```
   The first finding is marked "fix this first". Each finding lists 1-4 candidates with their OKLCH
   values, contrast on the ground, whether they work as a fill or as text, and whether near-black or
   white text reads on them. Add `--json` for machine-readable output.
3. **Choose with meaning.** The candidates are directions, not final answers. Pick the one that fits the
   subject (music, finance, kids, luxury...) and the brand, then adjust hue by up to ~10 degrees if
   needed, keeping lightness and chroma about where the tool put them. Do not swap in a different
   favourite: re-run step 2 instead.
4. **Check your pick:**
   ```bash
   node <this skill>/scripts/accent.mjs "#ground" "#ink" ... --check "#accent"
   ```
   It must say the gap is `filled`, `distinct: yes`, and give a usable label colour.
5. **Spend it right** (see the rules below), in both light and dark themes: run the tool again with the
   dark ground first, keep the same hue and move lightness.
6. **Look at it.** Screenshot before and after. Squint (or blur the screenshot): the eye should land on
   the accent first, and only where you put it.

## Rules for using the accent

- **One accent.** Two accents fight; the second becomes noise. Status colours are not accents.
- **Spend it on the action and at most one other thing** (the primary button, the active state, a key
  number). If everything is accented, nothing is.
- **Fills vs text.** A vivid accent often fails as text on its own ground. Use the tool's "text-safe
  variant" for links and small text, and keep the vivid one for fills, shapes and large type.
- **Label colour comes from contrast, not taste.** Use the label the tool names (near-black on lime,
  orange and yellow; white on deep blue and violet), at >= 4.5:1 for button text.
- **Shapes need 3:1.** A button or icon below 3:1 against the ground needs a border, a shadow or a
  darker/lighter surface behind it (WCAG 1.4.11).
- **Avoid pure screen primaries** (`#00FF00`, `#FF00FF`, `#0000FF`): they read as defaults. The tool
  already leans off them.
- **A fixed brand accent stays.** If the brand dictates the accent, use the tool to see which gap it
  does NOT fill, and fix that with tone or contrast around it rather than adding a second hue.

## Notes and limits

- Colour maths is OKLCH (perceptual lightness, chroma, hue); contrast is WCAG 2 relative luminance.
  "Distinct" means at least 0.1 apart in OKLab, so the accent does not read as more of the same.
- The tool knows colour, not meaning: it will not know that red means danger in your product or that a
  client hates orange. That judgement is step 3.
- Large photos change the palette. Sample them; a warm photo can already supply the missing warmth.
- `node scripts/test.mjs` checks the tool against the three example palettes above.

Idea credit: Charles Liu's "add the colour the page is missing" reel. This skill and its tool are an
independent implementation.
