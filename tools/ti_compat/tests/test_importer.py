"""Synthetic fixtures only; never commit or fetch the real mod assets."""
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools.ti_compat.inspect import clean_name, inspect, mix_header
from tools.ti_compat.rules import convert_rules, parse_ini


def classic_mix():
    return struct.pack("<HI", 1, 4) + struct.pack("<III", 0x12345678, 0, 4) + b"TEST"


def ts_mix():
    return b"\x00\x00" + struct.pack("<HHI", 0, 1, 4) + struct.pack(
        "<III", 0x12345678, 0, 4) + b"TEST"


class InventoryTests(unittest.TestCase):
    def test_header_families(self):
        a = classic_mix()
        b = ts_mix()
        self.assertEqual(mix_header(a[:16], len(a))["format"], "classic")
        self.assertEqual(mix_header(b[:16], len(b))["format"], "ra_ts")
        self.assertEqual(mix_header(b"\0\0\2\0", 20)["format"], "unknown")
        encrypted = b"\0\0\2\0" + b"\0" * 12
        self.assertTrue(mix_header(encrypted, len(encrypted))["encrypted"])
        self.assertEqual(mix_header(b"not-a-mix", 100)["format"], "unknown")

    def test_zip_inventory_does_not_extract(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp, "Twisted_Insurrection.zip")
            with zipfile.ZipFile(archive, "w") as f:
                f.writestr("Game/ecache42.mix", ts_mix())
                f.writestr("Game/rules.ini", "[VehicleTypes]\n1=BIKE\n")
                f.writestr("Game/vehicles/HARV.vxl", b"voxels")
                f.writestr("Game/vehicles/HARV.hva", b"transforms")
                f.writestr("Game/mission.map", b"[Basic]\n")
                f.writestr("Game/game.exe", b"binary")
            result = inspect(archive)
            self.assertEqual(result["files"], 6)
            self.assertEqual(result["categories"]["voxel"], 1)
            self.assertEqual(result["categories"]["voxel_animation"], 1)
            self.assertEqual(result["categories"]["scenario"], 1)
            self.assertFalse(result["hints"]["direct_vanillatd_compatibility"])
            self.assertEqual(result["entry_inventory"][0]["mix"]["format"], "ra_ts")
            self.assertFalse(Path(tmp, "Game").exists())

    def test_directory_and_bad_zip_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "game"
            folder.mkdir()
            (folder / "art.ini").write_text("[Art]\n", encoding="utf8")
            self.assertTrue(inspect(folder)["hints"]["loose_art_ini"])
            badzip = root / "unsafe.zip"
            with zipfile.ZipFile(badzip, "w") as f:
                f.writestr("../escape.ini", "hello")
            with self.assertRaisesRegex(ValueError, "unsafe"):
                inspect(badzip)
            with self.assertRaises(ValueError):
                clean_name("/absolute.txt")

    def test_non_zip_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "game.exe"
            bad.write_bytes(b"MZ")
            with self.assertRaisesRegex(ValueError, "ZIP"):
                inspect(bad)


class RulesTests(unittest.TestCase):
    def test_synthetic_ts_to_neutral_entities(self):
        sample = """; synthetic rules
[VehicleTypes]
0=HARV
1=BIKE
[HARV]
Name=Harvester
Strength=600
Cost=1400 ; commentary
Image=HARV
Locomotor={123}
WeedCapacity=56
[BIKE]
Name=Attack Bike
Speed=10
Primary=BikeGun
[InfantryTypes]
0=E1
"""
        parsed = parse_ini(sample)
        self.assertEqual(parsed["harv"]["cost"], "1400")
        converted = convert_rules(sample)
        self.assertEqual(len(converted["entities"]), 2)
        self.assertEqual(converted["entities"][0]["properties"]["strength"], "600")
        self.assertIn("weedcapacity", converted["entities"][0]["unsupported_keys"])
        self.assertIn("section:E1", converted["unresolved_sections"])
        self.assertTrue(converted["entities"][0]["requires_manual_rule_mapping"])


if __name__ == "__main__":
    unittest.main()
