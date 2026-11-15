"""Read-only inventory of locally supplied Twisted Insurrection / TS packages.

This tool never extracts assets, executes a bundled program, or transmits data.
MIX parsing is limited to a bounded header inspection, not content decoding.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import BinaryIO
import os
import struct
import zipfile

KINDS = {
    ".mix": "archive",
    ".ini": "rules",
    ".map": "scenario",
    ".mpr": "scenario",
    ".vxl": "voxel",
    ".hva": "voxel_animation",
    ".shp": "sprite",
    ".tmp": "terrain",
    ".pal": "palette",
    ".aud": "audio",
    ".wav": "audio",
    ".ogg": "audio",
    ".mp3": "audio",
    ".vqa": "movie",
    ".pcx": "image",
    ".png": "image",
    ".bmp": "image",
    ".zip": "nested_archive",
    ".exe": "native_program",
    ".dll": "native_program",
}
MAX_ENTRIES = 100_000
MAX_MIX_HEADER = 16


def clean_name(name: str) -> str:
    """Normalize separators and reject unsafe paths even though we don't extract."""
    if not name or "\x00" in name:
        raise ValueError("empty or NUL-containing entry path")
    normalized = name.replace("\\", "/")
    parts = normalized.split("/")
    if (normalized.startswith("/") or any(p in ("", ".", "..") for p in parts)
            or ":" in parts[0]):
        raise ValueError(f"unsafe entry path: {name!r}")
    return normalized


def mix_header(data: bytes, file_size: int) -> dict:
    """Recognize classic and RA/TS-family MIX headers without extracting entries.

    New-format encrypted indexes cannot be enumerated without a separate
    licensed/local archive reader; do not imply filename contents are known.
    """
    if len(data) < 6 or file_size < 6:
        return {"format": "unknown"}
    first = struct.unpack_from("<H", data)[0]
    if first:
        count, payload = struct.unpack_from("<HI", data)
        header_len = 6 + count * 12
        if count > 0 and header_len + payload <= file_size:
            return {"format": "classic", "entries": count, "encrypted": False}
        return {"format": "unknown"}
    if len(data) < 10 or file_size < 10:
        return {"format": "unknown"}
    flags, count, payload = struct.unpack_from("<HHI", data, 2)
    if flags & ~3:
        return {"format": "unknown"}
    if flags & 2:
        return {"format": "ra_ts_encrypted", "encrypted": True,
                "checksum": bool(flags & 1), "entries": None}
    header_len = 10 + count * 12
    if count > 0 and header_len + payload <= file_size:
        return {"format": "ra_ts", "encrypted": False,
                "checksum": bool(flags & 1), "entries": count}
    return {"format": "unknown"}


def classify(path: str, size: int, header: bytes = b"") -> dict:
    suffix = Path(path).suffix.lower()
    entry = {"path": path, "bytes": size, "extension": suffix,
             "kind": KINDS.get(suffix, "other")}
    if suffix == ".mix":
        entry["mix"] = mix_header(header, size)
    return entry


def from_zip(source: Path) -> list[dict]:
    result = []
    with zipfile.ZipFile(source) as archive:
        members = archive.infolist()
        if len(members) > MAX_ENTRIES:
            raise ValueError("ZIP has too many entries for safe inspection")
        for info in members:
            if info.is_dir():
                continue
            name = clean_name(info.filename)
            # ZIP symlinks may point outside the archive. Ignore entirely.
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError(f"ZIP symlink is not accepted: {name}")
            header = b""
            if Path(name).suffix.lower() == ".mix":
                with archive.open(info) as item:
                    header = item.read(MAX_MIX_HEADER)
            result.append(classify(name, info.file_size, header))
    return result


def from_directory(source: Path) -> list[dict]:
    result = []
    for base, dirs, files in os.walk(source, followlinks=False):
        dirs[:] = sorted(d for d in dirs if not (Path(base) / d).is_symlink())
        for filename in sorted(files):
            path = Path(base) / filename
            if path.is_symlink() or not path.is_file():
                continue
            relative = clean_name(path.relative_to(source).as_posix())
            if len(result) >= MAX_ENTRIES:
                raise ValueError("Directory has too many files for safe inspection")
            size = path.stat().st_size
            header = b""
            if path.suffix.lower() == ".mix":
                with path.open("rb") as file:
                    header = file.read(MAX_MIX_HEADER)
            result.append(classify(relative, size, header))
    return result


def inspect(source: str | Path) -> dict:
    source = Path(source).expanduser()
    if source.is_dir():
        entries = from_directory(source)
        source_type = "directory"
    elif source.is_file() and zipfile.is_zipfile(source):
        entries = from_zip(source)
        source_type = "zip"
    else:
        raise ValueError("Provide an extracted directory or ZIP file (not a game EXE)")
    entries.sort(key=lambda e: e["path"].lower())
    categories = dict(sorted(Counter(e["kind"] for e in entries).items()))
    extensions = dict(sorted(Counter(e["extension"] for e in entries).items()))
    mixes = [e for e in entries if e["kind"] == "archive"]
    lower_names = {Path(e["path"]).name.lower() for e in entries}
    return {
        "schema": "world-conquer-ti-inventory-v1",
        "source_name": source.name, "source_type": source_type,
        "files": len(entries), "total_uncompressed_bytes": sum(e["bytes"] for e in entries),
        "categories": categories, "extensions": extensions,
        "entry_inventory": entries,
        "hints": {
            "loose_rules_ini": "rules.ini" in lower_names,
            "loose_art_ini": "art.ini" in lower_names,
            "maps_detected": categories.get("scenario", 0),
            "mix_archives_detected": len(mixes),
            "encrypted_mix_archives": sum(e["mix"].get("encrypted", False) for e in mixes),
            "requires_ts_specific_engine_support": True,
            "direct_vanillatd_compatibility": False,
        },
        "limitations": [
            "This inventory never decodes MIX archive contents.",
            "TS-era voxels, terrain, maps and rules are not directly compatible with VanillaTD.",
            "File names and sizes do not establish a license to redistribute assets.",
            "This report contains locally observed file names, but no asset bytes.",
        ],
    }
