# Original artwork attribution and distribution boundary

Every R05 source vector in `source/` was newly designed for World-Conquer
with ChatGPT assistance on 2026-11-14; the project owner may redistribute and
modify these assets under **CC0-1.0** to the extent any rights subsist.
No third-party artwork, commercial game sprites, logos, shape archives, audio,
or extracted palettes were used as inputs. The color palette, silhouettes,
faction names, and R05 art identifiers are newly created for this project.

The initial authoring source is the checked-in SVG for each asset, plus
`palette.json` and `roster.json`. `tools/content/r05.js` deterministically
rasterizes those vectors at native battle size and produces an RGBA atlas,
tactical indexed SHP, PAL, gallery, and file-level integrity metadata.
The generated files inherit the source's CC0-1.0 designation. Source SVG
metadata is not an assertion of authorship over any engine code.

These are **new R05 art IDs**, not accepted R00 simulation entity IDs or
drop-in replacements for legacy class filenames. The data registry must map
them at integration time; it must not silently inherit old class semantics.
