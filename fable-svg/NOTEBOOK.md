# Notebook

A record of what this lab found, what went wrong, and what is still open, so that whoever works here next can start from it. Everything below refers to `build.js`, which generates every file in `lab/`.

## Findings

**A line in SVG is an idea first and a substance second.** The same `d` can be pencil, felt, wash or an emboss by changing only the filter it passes through (napkin 01). The exception is anything where the material depends on the path's own direction, like a dry brush. That has to be built as geometry (fifteen offset hairs with their own dash patterns), not as a filter.

**Snow, highlights and ghosts are the paper left alone.** The strongest whites came from not painting: an `evenodd` hole in a wash for a highlight or the sun, a `<mask>` to reserve snow on branches, and an emboss with no pigment for the ghost (04, 07).

**Mellan's line carries two signals** (08, 09). In his 1649 *Sudarium*, one spiral makes a whole face. Up close, the swelling of the line is shadow, but the lettering in the cloth is not darker: the line steps sideways over it. Width is light. Bend is shape. Both work in SVG, and bend alone is enough to make a figure appear (09).

**Width is local; spacing has memory** (11, a failure). I tried a third channel: constant width, no bend, tone carried only by how closely the turns lie. It destroys the picture. Crowding the line inside a dark eye pushes every later turn on that ray outward, so each dark spot drags a wake to the rim. Spacing is an integral, so its errors accumulate. Bend is the bounded version of the same thing: it crowds the turns on one side of a feature and spreads them on the other, so the line is back where it belongs afterwards. That is why 09 works and 11 does not.

**A ginkgo leaf can be grown from one rule** (10). Napkin 04 drew the veins as straight rays, which is wrong. Real veins fork in twos and almost never rejoin. `growVeins()` starts with two strands and marches outward; when two neighbours drift further apart than a limit, one forks into the gap, and neighbours nudge each other toward even spacing. Nothing else is specified. The fan fills itself: 2 strands, 114 forks, 116 veins.

**Two plain things can make a third that nobody drew.** Two sets of rings give moiré fans (06). A tree and a matrix give its shadow (07). A scene and a flip give its reflection (05).

## Recipes

These are the parts worth reusing. Names are the functions or filter ids in `build.js`.

| What | How | Where |
|---|---|---|
| Paper | `feTurbulence` (0.85, 4 octaves) as a height map for `feDiffuseLighting`, multiplied onto a flat tint. A second low-frequency turbulence displaces the sheet's edge for a deckle. | `frame()` |
| Emboss with no pigment | Height from alpha (`#press`) or luminance (`#pressL`), blurred about 1px, lit by `feDistantLight` at elevation 30 with `diffuseConstant` 1. Flat ground then comes out exactly mid-grey, and `mix-blend-mode: hard-light` treats mid-grey as "no change". | `frame()`, `pressed()`, `winter()` |
| Watercolour | Displace the shape with low-frequency noise for the edge. Rim = sharp copy minus 0.85 × a blurred copy (`feComposite arithmetic`). Multiply alpha by slow noise for pooling and fast noise for granulation. Layer with `multiply`. | `M.wash` |
| Graphite, crayon | Take the R channel of fractal noise as alpha with `feColorMatrix` (`k·R + b`), then `feComposite in`. `k` sets contrast, `b` sets coverage. | `M.pencil`, `M.crayon` |
| A hand | `feDisplacementMap` at scale 1 to 3 with noise around 0.03 to 0.05. Enough to stop a line being exact. | `M.hand` |
| Swelling line | `ribbon(points, width)` returns the outline of a stroke whose width changes along its length. SVG has no native equivalent. | tools |
| Small files | `compactPath()` writes relative steps at 0.1 precision and tracks the rounded pen, so error does not accumulate. About 7 bytes a point. Napkin 08 is 9,600 samples along the line, 19,000 points on its outline, in 140 kB. | tools |
| Tone from hatching | Compute darkness as a function of x,y. For each hatch direction, walk parallel lines and keep the runs where darkness exceeds that layer's threshold. | `egg()` |
| Cast shadow | `<use>` the same geometry through `matrix(1,0,-sx,-sy,sx·by,by·(1+sy))`, in a wash filter. `by` is the ground line. | `winter()` |
| Growth | `growVeins()` for anything that must fill a widening space by forking. The tree in 07 is a plain recursive `limb()` with a pull toward vertical. | `ginkgo()`, `winter()` |

## Traps

Each of these cost me a wrong render.

- **Filters work in linear RGB unless told otherwise.** Put `color-interpolation-filters="sRGB"` on every filter, or lighting and blending come out too bright and mid-grey is no longer neutral.
- **A group with `clip-path` is isolated.** Children with `mix-blend-mode` then blend against nothing, and a hard-light emboss turns into an opaque grey slab. Put the clip on the blending element itself.
- **Filter regions default to the bounding box.** A nearly horizontal path has almost no height, so its filter is clipped away. Use `filterUnits="userSpaceOnUse"` with the whole canvas.
- **Emboss saturates.** A tall, sharp step goes to pure black and white lines. Lower `surfaceScale` or blur the height more before lighting.
- **Radial displacement opens a hole at a spiral's centre.** Pushing the figure outward moves the start of the line. Push the background inward instead; the centre stays put.
- **A true reflection can land off the page.** The lamp in 05 is 236 units above the ground, so its mirror image was below the canvas. I compressed the reflection vertically to 45%.
- **Flat tone near a hatch threshold makes hard rectangles.** Keep background tone well clear of the layer thresholds, or add per-line jitter.
- **The mid-point of a `feTurbulence` channel is 0.5 but its spread is narrow.** Thresholding needs gains of 3 to 8, not 1.
- **To inspect detail, change the root `viewBox`.** Screenshots of a full napkin hide whether a swell is tapered or stepped.

## Unfinished

Open questions, roughly in the order I would take them.

1. **The egg is still stiff** (03). Its lines are straight and all one width. Two fixes are now available and untried together: hatch along the form (cross-contours of the egg instead of fixed angles), and let each hatch swell with `ribbon()`.
2. **Could spacing work after all?** Only if every crowding is paid back along the same ray. One idea: high-pass the tone along each ray before integrating, so each ray's count returns to the average. That may just reinvent bend.
3. **The ginkgo's base is too sparse.** Real veins are tightly packed from the stalk, and the outer ones curve along the lower edges. The fork cooldown makes the first few generations too regular. Real leaves also have occasional rejoining veins; the model has none.
4. **The name written by bend is rough.** About seven turns cross each letter in 08 and 09. Mellan had perhaps twenty-five. A finer pitch would help and would double the file size.
5. **Wash cannot bleed between two colours.** Each wash is its own filter. Two wet washes touching should run into each other; here they only overlap.
6. **The animations in 05 and 06 were only checked as still frames.**
7. **The tools are not a module.** `ribbon`, `compactPath`, `growVeins` and the `M.*` materials live inside `build.js`. They would be easier to build on in a file of their own.

## Sources

- Mellan's *Sudarium of Saint Veronica*: [Public Domain Review](https://publicdomainreview.org/collection/mellan-sudarium-of-saint-veronica), [Art Institute of Chicago](https://www.artic.edu/artworks/47146/the-sudarium-of-saint-veronica), [full-resolution scan](https://commons.wikimedia.org/wiki/File:Claude_Mellan_-_Face_of_Christ_-_WGA14764.jpg). The observation that the lettering is made by the line stepping sideways is my own reading of the scan.
- Ginkgo venation: [UC Museum of Paleontology](https://ucmp.berkeley.edu/seedplants/ginkgoales/ginkgomm.html), [Britannica](https://www.britannica.com/plant/ginkgophyte) (which notes that vein unions do sometimes occur), and a [leaf scan](https://commons.wikimedia.org/wiki/File:Gingo_biloba_leaves_scan.jpg) on Wikimedia Commons.
