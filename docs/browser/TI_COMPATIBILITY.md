# Twisted Insurrection compatibility track (experimental)

**Goal:** Explore a local-only pathway from selected Tiberian Sun/Twisted
Insurrection resources to World-Conquer. This is **not** a working Tiberian
Sun engine, a full Twisted Insurrection port, or a playable mission yet.

## Permission and scope

The Twisted Insurrection team's [ModDB FAQ](https://www.moddb.com/mods/twisted-insurrection)
states that its proprietary assets may be used privately but may **not** be
reused or redistributed in a public project without explicit permission.
Their release is listed as CC BY-NC-ND 4.0. Do not assume that free download
equals a modding/redistribution license.

The official [0.9 full package](https://www.moddb.com/mods/twisted-insurrection/downloads/twisted-insurrection-09-full-version)
is a ZIP containing the standalone Tiberian Sun-based game and cutscenes. We
have **not** inspected its actual file contents; file names mentioned below
are conventions of the engine family, not a verified package inventory.

All inspection/conversion here runs **on the user's own computer**, with no
downloads, network requests, untrusted executable launches or copies of
media files to CI. Never commit mod assets or generated content containing
proprietary mod values. A license grant is needed before distributing
converted work or shipping mod assets through World-Conquer.

## Step 1 — locally inspect the download (no extraction required)

From the repository root:

~~~sh
python3 -m tools.ti_compat inspect "/path/to/Twisted_Insurrection.zip"
python3 -m tools.ti_compat inspect "/path/to/Twisted_Insurrection.zip" \
    --output "/tmp/ti-inventory.json"
~~~

Or inspect a directory after extracting the ZIP locally (do not execute
bundled EXEs). Output reports list file names, sizes and categories only.
MIX inspection recognizes classic / RA-TS-family unencrypted / encrypted
headers. It does **not** extract archives or enumerate files inside MIX.

The inspector uses bounded reads and refuses traversal paths in ZIP entries.
It never runs programs included in the download.

## Step 2 — normalize loose rule definitions for private analysis

When a local, user-extracted Rules.ini or equivalent is available:

~~~sh
python3 -m tools.ti_compat rules "/path/to/Rules.ini" \
    --output "/tmp/ti-rules-private.json"
~~~

This reads a subset of Westwood INI structure, inventories declared
infantry, vehicles, buildings and aircraft, and normalizes a few common
fields (health, speed, cost, art reference, weapons) into an engine-neutral
analysis schema. The report preserves mod-authored values and must remain
private. It does **not** produce functioning VanillaTD game entities.

INI files embedded inside MIX must first be extracted with an appropriate
user-side tool. This inspector does not extract them.

## Step 3 — required adapters (not implemented yet)

| Component | Current status | Work required |
|---|---|---|
| MIX package | Header identification only | Read authorized local entries and encrypted indexes |
| Rules.ini / Art.ini | Preliminary neutral rules summary | Engine-specific unit, prerequisite, weapon, art lookup and AI mappings |
| VXL + HVA | Inventory only | Voxel rendering or offline sprite conversion with palette/normal fidelity |
| SHP / PAL | Inventory only | TS sprite decoding, team-color and animation support |
| TMP terrain | Inventory only | Tiberian Sun terrain tile geometry and lighting |
| MAP missions | Inventory only | TS scenario packs, triggers, scripting and mission semantics |
| AUD / WAV / VQA | Inventory only | Browser audio/video and codecs |
| Game EXE / DLL | Intentionally ignored | Not suitable for WebAssembly asset import |

For first visible progress, select one authorized SHP + palette or VXL +
HVA pair once available, establish provenance and permission, and implement
a **private** rendering prototype. Do not treat it as a playable mission.

### Why this is a separate track

VanillaTD is still the Tiberian Dawn engine. Twisted Insurrection targets
Tiberian Sun, whose sprites/voxels, terrain, missions and rules differ.
Porting the complete mod is a major engine effort, not an archive rename.
The existing VanillaTD and GDI mission importer remain unchanged.

## Tests

~~~sh
python3 -m unittest discover -s tools/ti_compat/tests -v
~~~

Only synthetic ZIP/MIX/INI fixtures are used in tests and CI. No mod files,
media, or generated rules reports are published as artifacts.
