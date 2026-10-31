"""Experimental, engine-neutral Tiberian Sun rules INI adapter.

Outputs a locally generated JSON planning artifact. It is NOT a playable
VanillaTD rules file or a copy of content licensed for redistribution.
"""
from __future__ import annotations

from pathlib import Path

CATEGORIES = {
    "vehicletypes": "vehicle",
    "infantrytypes": "infantry",
    "buildingtypes": "building",
    "aircrafttypes": "aircraft",
}
FIELDS = {
    "name", "image", "strength", "cost", "speed", "armor", "sight",
    "primary", "secondary", "techlevel", "owner", "prerequisite",
    "rot", "locomotor", "category", "deploysinto", "voxel",
}


def parse_ini(text: str) -> dict[str, dict[str, str]]:
    sections: dict[str, dict[str, str]] = {}
    section = None
    for lineno, line in enumerate(text.lstrip("\ufeff").splitlines(), 1):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith((";", "#")):
            continue
        if trimmed.startswith("[") and "]" in trimmed:
            name = trimmed[1:trimmed.index("]")].strip().lower()
            if not name:
                raise ValueError(f"empty section at line {lineno}")
            section = sections.setdefault(name, {})
        elif "=" in trimmed and section is not None:
            key, val = trimmed.split("=", 1)
            key = key.strip().lower()
            # Westwood INI files commonly use ';' for trailing comments.
            value = val.partition(";")[0].strip()
            if key:
                section[key] = value
    return sections


def convert_rules(text: str) -> dict:
    parsed = parse_ini(text)
    result = []
    missing = []
    for index_name, kind in CATEGORIES.items():
        types = parsed.get(index_name, {})
        if not types:
            missing.append(index_name)
        for _, name in types.items():
            name = name.strip()
            if not name:
                continue
            config = parsed.get(name.lower())
            if not config:
                missing.append(f"section:{name}")
                continue
            selected = {k: v for k, v in config.items() if k in FIELDS}
            unknown = sorted(k for k in config if k not in FIELDS)
            result.append({
                "id": name, "kind": kind, "properties": selected,
                "unsupported_keys": unknown,
                "requires_manual_rule_mapping": True,
            })
    return {
        "schema": "world-conquer-ti-rules-v1",
        "entities": result,
        "unresolved_sections": sorted(set(missing)),
        "warning": "Analysis-only normalized fields. Not valid VanillaTD gameplay rules; keep generated content private.",
    }


def from_file(filename: str | Path) -> dict:
    data = Path(filename).read_bytes()
    # Westwood mod INIs can use legacy Windows-1252 encodings.
    try:
        decoded = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = data.decode("cp1252")
    return convert_rules(decoded)
