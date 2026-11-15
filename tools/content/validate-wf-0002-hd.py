#!/usr/bin/env python3
"""Validate WF-0002 HD output and update its reproducible digest manifest."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[2]
directory = root / "game/content/wireframes/hd/WF-0002"
frames = [directory / f"{n:04d}.png" for n in range(36)]
assert all(p.is_file() for p in frames), "Missing one or more of 36 frames"
assert len(list(directory.glob("[0-9][0-9][0-9][0-9].png"))) == 36, "Unexpected numbered frames"
assert (directory / "Courier-C17-master.blend").is_file(), "Missing editable master"

digest = {}
images = []
for index, path in enumerate(frames):
    with Image.open(path) as source:
        assert source.size == (512, 512), f"Wrong dimensions: {path}"
        assert source.mode == "RGBA", f"Wrong mode: {path}"
        rgba = source.copy()
    alpha = rgba.getchannel("A")
    low, high = alpha.getextrema()
    assert low == 0 and high == 255, f"Transparent margin or silhouette missing: {path}"
    assert alpha.getbbox() is not None
    assert alpha.getpixel((0, 0)) == 0, f"Clipped sprite: {path}"
    assert any(0 < value < 255 for value in alpha.get_flattened_data()), f"No anti-aliasing: {path}"
    images.append(rgba)
    digest[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()

for first, second in [(0,8),(8,16),(16,24),(24,0),(32,33),(33,34),(34,35)]:
    assert ImageChops.difference(images[first].convert("RGB"), images[second].convert("RGB")).getbbox() is not None, (
        f"Distinct directions/ramp stages identical: {first}, {second}"
    )

manifest = {
    "asset": "WF-0002 / AIRCRAFT_CARGO / C17.SHP",
    "source": "tools/content/wf-0002-hd.py",
    "master": "Courier-C17-master.blend",
    "size": [512, 512],
    "frame_count": 36,
    "directions": list(range(32)),
    "ramp_stages": [32, 33, 34, 35],
    "status": "hd-review-draft",
    "sha256": digest,
}
(directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("WF-0002 HD validated: 36 RGBA 512x512 anti-aliased frames and editable master")
