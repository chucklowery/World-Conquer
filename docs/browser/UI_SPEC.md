# Command interface — UI-A working specification

Original geometric design from the written milestone brief. No external media. This is a design-only session; do not change the renderer or pack. All dimensions below are engine pixels.

## Revised visual acceptance — blacksite tactical HUD

This section supersedes earlier heavy-bevel, riveted and teal/amber aesthetic guidance. Source: owner-supplied written design brief, 2026-11-23. All art is original. No external reference artwork, branded assets or third-party UI library is required.

- Semantic target RGB values are in tools/content/ui/design-tokens.json; they are not assigned engine indices. The earlier palette.json remains a provisional allocation experiment, not the visual authority. Quantize to the engine palette only after collision audit; measure contrast after quantization, including engine-generated gradients. No palette/pack changes in UI-A.
- Chrome-only approximate area targets: 70% deep neutral, 15% raised neutral, 8% text/borders, 5% crimson, 2% utility hues. Exclude tactical map and object art; review representative idle and active frames separately.
- Matte, clipped corners, 1–2 px strokes at 640×400, inset segmented lines, restrained localized highlights; no glossy bevels, decorative bolts, full-screen glow, heavy rust or visual noise. Optional grain 2–4% contrast modulation, radar-only scanlines, never behind text. At 1× remove details that compete with content.
- Shared chrome neutral; crimson marks active command states; cyan focus/data; amber caution; lime success. Aster radar cyan/ice; Forge radar crimson with cold white/amber readouts. No new per-house sidebar selection before UI-F.
- Text contrast >=4.5:1 on actual backgrounds, meaningful control boundaries/icons >=3:1 against adjacent surfaces. Disabled controls must remain distinguishable. White on bright crimson hover is not automatically acceptable: use a darker red fill and bright outline, or dark text if contrast passes. Use red as a signal rather than small text on dark panels unless tested.
- Buttons: distinct up/down/disabled and reflected toggle states using outline, inset position/glyph and value as well as hue. Use pictograms for commands. Menu action emphasis via clipped corners, crimson edge and high-contrast labels. Inputs and focus cues only where supported by existing engine code; no simulated controls or invented state.
- Radar: subdued offline glass versus active frame with sparse scanlines/technical ticks; retain map visibility and activation semantics. Cameos: one recognizable silhouette, dark neutral background, thin frame, no tiny labels. Clock: radial ghost ink per existing contract; silhouette remains legible. Ready/holding pip labels have distinct shapes.
- Power: three value/pattern-distinct states (solid, diagonal, cross) subject to palette quantization and actual frame clipping. Placement: distinguish allowed and blocked with different hatch geometry, not hue alone. Health: preserve code-drawn fill length and corners; segmentation/pattern changes require approved engine work; document any accessibility limitation rather than claim it fixed.
- Typography: original readable bitmap sans for body, compact squared uppercase labels where legible, tabular telemetry digits; no external webfont on engine canvas. The browser shell may use system sans/monospace in UI-E only. Keep existing engine glyph metrics and positions.
- Evidence: generate Aster, Forge and menu SVG previews at 1× and 2×; check actual engine screenshots at 1100 px in UI-B onward. Review contrast, clipping, active/disabled differentiation, radar readability, all three power states, placement, build progress, and text at native pixels. Assertions and screenshots must be recorded before claiming a phase complete. Browser shell CSS tokens are deferred to UI-E; no HTML HUD, additional navigation rail, telemetry panel or layout changes before UI-F approval.

## Verified draw contracts

| Slot | Source (tiberiandawn/) | Frames actually referenced / constraints |
|---|---|---|
| SIDE1 / SIDE2 | sidebar.cpp:229–232,805–806 | frame 0, origins (480,158) and (480,276) at 640×400 |
| TABS | tab.cpp:111–162,255–267 | 0 normal, 1 highlighted; width 160, height 16 at high resolution |
| RADAR | radar.cpp:125–145,341–350; radar.h:135–136 | housing 160×140; inset 128×128 at offset (16,7); activated frame 22, last frame index 41 (42 minimum); exact per-frame meaning unverified |
| REPAIR / SELL / MAP | sidebar.cpp:278–289,350–359; shapebtn.cpp:130–145 | pressed/up/disabled or reflected toggle state; exact numeric enum and dimensions unverified |
| POWER / HPOWER | power.cpp:148,277–279 | frame 0 drain pointer; dimensions unverified |
| PWRBAR | power.cpp:208–209,241–267 | frames 0/1 empty, 2/3 normal, 4/5 low, 6/7 critical; lower piece offset 100 px |
| STRIP | sidebar.cpp:1161,1814–1815,1969–1972 | column ID filler; high-resolution blank slots intentionally not drawn over sidebar |
| CLOCK | sidebar.cpp:1162,1986–2025 | 0 unavailable, stage+1 progress; ghost draw with engine translucency table; maximum stage unverified |
| STRIPUP / STRIPDN | sidebar.cpp:1254–1261; sidebar.h:226–227 | button nominal 16×12 low / 32×24 high; exact frame enum unverified |
| Cameos | sidebar.h:216–217; sidebar.cpp:1150–1154,1973–1979 | 32×24 low, 64×48 high; high resolution disables remapper |
| Pips | sidebar.cpp:2008–2038 | PIP_READY and PIP_HOLDING are artwork, not active text calls; numeric frames unverified |
| MOUSE | mouse.cpp:95–114,137–168,272–274 | StartFrame/SmallFrame plus Frame/4; hotspots from MouseControl; full matrix unverified |
| TRANS.ICN | display.cpp:215; tools/content/placeholders.js:102–104 | generated 3 tiles, 24×24, clear 0 and blocked 2; verify cell draw before replacement |
| BTEXTURE | dialog.cpp:148 | tiled dialog fill; exact shape contract unverified |
| OPTIONS | goptions.cpp:570–571 | option and option+1; full range unverified |
| Fonts | init.cpp:217–238 | 6POINT, LED, VCR, GRAD6FNT, 8FAT, 12GREEN, 12GRNGRD plus FONT8/FONT3; glyph metrics and palette mapping unverified |
| Title | init.cpp:502,844,1025 | TitlePicture and PREPICK.CPS; exact image contracts unverified |

The shared sidebar is not selected by house. Radar uses PlayerPtr->ActLike and the house suffix (radar.cpp:341–350), so its asset can vary without changing engine code. New per-house sidebar selection belongs exclusively to UI-F.

## Coordinates

At 640×400 the sidebar starts x=480 (sidebar.cpp:182–184; sidebar.h:68). Tabs are 16 px high (tab.cpp:257–264); radar origin is (480,14), drawn at y=15, with inset at (496,21) for engine radar coordinates (radar.cpp:125–145,430). Sidebar Y=155 and build region starts y=181; four rows of 48 pixels. Column and power coordinates are refined in the follow-up audit below. Mockup geometry remains illustrative where asset dimensions are unresolved.

## Existing pack inventory

The following table is a snapshot of the original pack requirements, not a claim that provisional bounds are exact. Any provisional count, dimension, palette index or unused frame remains unverified. Low-resolution variants, other theaters, selection/health rendering and remaining dialog assets need additional source audit. Do not generate replacement assets for unresolved slots.

| Asset | Pack size | Pack frame contract | Source |
|---|---|---|---|
| BTEXTURE.SHP | ?×? | unverified | tiberiandawn/dialog.cpp:148 |
| MOUSE.SHP | ?×? | unverified | tiberiandawn/init.cpp:267; tiberiandawn/mouse.cpp:270; tiberiandawn/mouse.cpp:274 |
| A10ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| A10ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| AFLDICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| AFLDICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| APCICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| APCICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| ARCOICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| ARTYICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| ARTYICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| ATOMICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| ATOMICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| ATWRICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| ATWRICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BARBICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BARBICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BGGYICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BGGYICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BIKEICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BIKEICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BIOICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BIOICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BOMBICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BOMBICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| BRIKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| BRIKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C10ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C10ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C17ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C17ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C1ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C1ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C2ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C2ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C3ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C3ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C4ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C4ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C5ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C5ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C6ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C6ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C7ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C7ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C8ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C8ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| C9ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| C9ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| CHANICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| CHANICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| CYCLICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| CYCLICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| DELPICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| DELPICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E1ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E1ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E2ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E2ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E3ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E3ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E4ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E4ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E5ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E5ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| E6ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| E6ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| EYEICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| EYEICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| FACTICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| FIXICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| FIXICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| FTNKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| FTNKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| GTWRICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| GTWRICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| GUNICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| GUNICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HANDICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HANDICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HARVICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HARVICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HBTN-DN2.SHP | 32×18 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp |
| HBTN-UP2.SHP | 32×18 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp |
| HCLOCK.SHP | 64×48 | provisional-upper-bound (bound 64) | tiberiandawn/sidebar.cpp:1159 |
| HELIICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HELIICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HMAP.SHP | 64×18 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp |
| HOSPICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HOSPICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HPADICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HPADICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HPOWER.SHP | 16×240 | provisional-upper-bound (bound 4) | tiberiandawn/power.cpp:148 |
| HPWRBAR.SHP | 16×8 | provisional-upper-bound (bound 16) | tiberiandawn/power.cpp:149 |
| HQICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HQICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| HRADAR.GDI | 160×136 | provisional-upper-bound (bound 64) | tiberiandawn/radar.cpp:348 |
| HREPAIR.SHP | 64×18 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp |
| HSELL.SHP | 64×18 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp |
| HSIDE1.SHP | 160×120 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp:226 |
| HSIDE2.SHP | 160×120 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp:229 |
| HSTRIP.SHP | 64×48 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp:1158 |
| HSTRIPDN.SHP | 32×24 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp:1251 |
| HSTRIPUP.SHP | 32×24 | provisional-upper-bound (bound 4) | tiberiandawn/sidebar.cpp:1251 |
| HTABS.SHP | 160×16 | provisional-upper-bound (bound 4) | tiberiandawn/tab.cpp |
| HTNKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| HTNKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| IONICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| IONICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| JEEPICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| JEEPICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| LTNKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| LTNKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MCVICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MCVICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MHQICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MHQICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MISSICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MLRSICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MLRSICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MOEBICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MOEBICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MSAMICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MSAMICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| MTNKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| MTNKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| NUK2ICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| NUK2ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| NUKEICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| NUKEICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| OBLIICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| OBLIICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| OPTIONS.SHP | 24×24 | provisional-upper-bound (bound 8) | tiberiandawn/goptions.cpp:570 |
| ORCAICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| ORCAICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| PROCICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| PROCICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| PYLEICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| PYLEICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| RMBOICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| RMBOICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| SAMICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| SAMICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| SBAGICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| SBAGICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| SELECT.SHP | 24×24 | provisional-upper-bound (bound 16) | tiberiandawn/object.cpp:1078 |
| SILOICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| SILOICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| STNKICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| STNKICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| TMPLICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| TMPLICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| TRANICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| TRANICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| TRANS.ICN | 24×24 | 3 (bound 3) | tiberiandawn/display.cpp:215; tiberiandawn/cell.cpp:1120 |
| V01ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V02ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V03ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V04ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V05ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V06ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V07ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V08ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V09ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V10ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V11ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V12ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V13ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V14ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V15ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V16ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V17ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V18ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V19ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V20ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V21ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V22ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V23ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V24ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V25ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V26ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V27ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V28ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V29ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V30ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V31ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V32ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V33ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V34ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V35ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V36ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| V37ICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| WEAPICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| WEAPICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |
| WOODICNH.SHP | 64×48 | 1 | tiberiandawn/sidebar.cpp:1166; tiberiandawn/bdata.cpp:3828; tiberiandawn/idata.cpp:1751; tiberiandawn/aadata.cpp:416 |
| WOODICNH.TEM | 64×48 | 1 | tiberiandawn/bdata.cpp:4198; tiberiandawn/idata.cpp:1794; tiberiandawn/aadata.cpp:724 |

Boot inventory: 12GREEN.FNT, 12GRNGRD.FNT, 6POINT.FNT, 8FAT.FNT, ATTRACT2.CPS, BTEXTURE.SHP, DEMOPIC.CPS, GRAD6FNT.FNT, HTITLE.PCX, LED.FNT, MOUSE.SHP, PREPICK.CPS, SCOREFNT.FNT, TITLE.CPS, VCR.FNT.

## Palette and handoff

Palette proposal is not an allocation in the shipped palette. Verify all consumers of each proposed index before UI-B. Engine cycling 32–38 and broader cycling bounds 16–63 (defines.h:1936–1943), score cycling 233–237 and terrain indices 112–115 (boot-colors.js) are excluded. Also exclude fixed engine colors and house remap 6–13. Text contrast and color-vision checks apply to proposed RGB values, not engine captures. No screenshot or CI acceptance is claimed in UI-A yet.

## Follow-up audit (2026-11-23)

- Credits: credits.cpp:108–112 uses TPF_GREEN12_GRAD in high resolution and TPF_6PT_GRAD in low resolution. UI-C owns 12GRNGRD.FNT and GRAD6FNT.FNT; LED.FNT is not the credit font.
- Radar: radar.cpp:472–473 draws MAX_RADAR_FRAMES (41) directly when offline but present. Minimum count is 42, not 41. Frame 0 absent, 1–21 initial activation, 22 active, 23–40 transition, 41 offline. Current HRADAR.GDI pack bound is 64; retain existing generated dimensions until actual coverage is verified. Radar housing logical bounds 160×140 are not the generated frame dimensions (160×136).
- Power: power.cpp:132–146 gives x=480, y=176, width=16, height=224. PWRBAR two pieces need coverage of the full gauge; the current provisional 16×8 frames are not proof of that coverage.
- Button enum: common/shapebtn.h:54–56 defines up=0, down=1, disabled=2. sidebar.cpp:347–359 positions repair at (484,160), sell (537,160), map (590,160); repair/sell reflect toggle state. Current 64×18 placeholders overlap the next button origin; exact replacement widths require validation.
- Strip positions: sidebar.cpp:214–220 gives spacing=(160−16−140)/3=1, column origins (497,182), (567,182). sidebar.cpp:1155 adds 3 px to art draw X, so cameo artwork starts x=500/570; hit targets start x=497/567. Scroll buttons y=373, up x=500/570, down x=532/602 assuming generated 32 px width (1251–1261).
- Clock: factory.h:117 defines STEP_COUNT=108; factory.cpp:626 and sidebar.cpp:2018–2025 draw stage+1 for incomplete production. Verify actual Completion implementation and any scaling before setting the frame count; the provisional 64-frame pack is not an exact contract. sidebar.cpp:1322–1323 identifies GREEN as ghost ink, LTGREY as target, intensity 180; _RETRIEVE loads TCLOCK.MRF (existing pack).
- Pips: object.cpp:1078–1085 loads SELECT.SHP and Hires_Retrieve PIPS.SHP (localized variants). defines.h:1748–1758 enumerates 0 empty, 1 full, 2 primary, 3 ready, 4 holding, 5 engineer, 6 civilian, 7 commando. techno.cpp:4443–4489 uses 3-pixel cargo spacing; UI-C owns ready/holding, UI-D remaining pip artwork. Frame dimensions for labels versus cargo need verification.
- Health and selection: techno.cpp:1011–1100 draws health by code, with BLACK outline and LTGREEN/YELLOW/RED thresholds 0x7F and 0x3F. Existing geometry must remain; segmented health geometry would require an approved engine change. SELECT.SHP loader does not establish that it draws selection brackets. Placement: cell.cpp:1120–1122 explicitly draws TRANS.ICN tiles 0 and 2; tile 1 is not referenced on that path.
- Remap: pack.js:13–29 and placeholders.js:32–33 identify engine band 176–191, in addition to fixed 0–15 and cycling 32–38. R05 authoring remaps are distinct from the engine palette. Proposed indices 216–228 are not allocated until all art consumers and nearest-colour translations are audited. No changes to boot-colors.js or pack.js in UI-A.

### Cursor table (mouse.cpp:304–340)

Fields below reproduce the original engine table, not external media. Size is still unverified; current boot-pack.js:220 generates 16 frames at 16×16 and cannot satisfy the full table. UI-D must verify small-frame animation span and actual Extract_Shape behavior before generating.

| Cursor | Start | Count | Rate | Small | Hotspot X | Hotspot Y |
|---|---:|---:|---:|---:|---:|---:|
| MOUSE_NORMAL | 0 | 1 | 0 | 86 | 0 | 0 |
| MOUSE_N | 1 | 1 | 0 | -1 | 15 | 0 |
| MOUSE_NE | 2 | 1 | 0 | -1 | 29 | 0 |
| MOUSE_E | 3 | 1 | 0 | -1 | 29 | 12 |
| MOUSE_SE | 4 | 1 | 0 | -1 | 29 | 23 |
| MOUSE_S | 5 | 1 | 0 | -1 | 15 | 23 |
| MOUSE_SW | 6 | 1 | 0 | -1 | 0 | 23 |
| MOUSE_W | 7 | 1 | 0 | -1 | 0 | 13 |
| MOUSE_NW | 8 | 1 | 0 | -1 | 0 | 0 |
| MOUSE_NO_N | 130 | 1 | 0 | -1 | 15 | 0 |
| MOUSE_NO_NE | 131 | 1 | 0 | -1 | 29 | 0 |
| MOUSE_NO_E | 132 | 1 | 0 | -1 | 29 | 12 |
| MOUSE_NO_SE | 133 | 1 | 0 | -1 | 29 | 23 |
| MOUSE_NO_S | 134 | 1 | 0 | -1 | 15 | 23 |
| MOUSE_NO_SW | 135 | 1 | 0 | -1 | 0 | 23 |
| MOUSE_NO_W | 136 | 1 | 0 | -1 | 0 | 13 |
| MOUSE_NO_NW | 137 | 1 | 0 | -1 | 0 | 0 |
| MOUSE_NO_MOVE | 11 | 1 | 0 | 27 | 15 | 12 |
| MOUSE_CAN_MOVE | 10 | 1 | 0 | 26 | 15 | 12 |
| MOUSE_ENTER | 119 | 3 | 4 | 148 | 15 | 12 |
| MOUSE_DEPLOY | 53 | 9 | 4 | -1 | 15 | 12 |
| MOUSE_CAN_SELECT | 12 | 6 | 4 | -1 | 15 | 12 |
| MOUSE_CAN_ATTACK | 18 | 8 | 4 | 140 | 15 | 12 |
| MOUSE_SELL_BACK | 62 | 24 | 2 | -1 | 15 | 12 |
| MOUSE_SELL_UNIT | 154 | 24 | 2 | -1 | 15 | 12 |
| MOUSE_REPAIR | 29 | 24 | 2 | -1 | 15 | 12 |
| MOUSE_NO_REPAIR | 126 | 1 | 0 | -1 | 15 | 12 |
| MOUSE_NO_SELL_BACK | 125 | 1 | 0 | -1 | 15 | 12 |
| MOUSE_RADAR_CURSOR | 87 | 1 | 0 | 151 | 0 | 0 |
| MOUSE_ION_CANNON | 103 | 16 | 2 | -1 | 15 | 12 |
| MOUSE_NUCLEAR_BOMB | 96 | 7 | 4 | -1 | 15 | 12 |
| MOUSE_AIR_STRIKE | 88 | 8 | 2 | -1 | 15 | 12 |
| MOUSE_DEMOLITIONS | 122 | 3 | 4 | 127 | 15 | 12 |
| MOUSE_AREA_GUARD | 153 | 1 | 0 | 152 | 15 | 12 |
