"""Run with: python3 -m tools.ti_compat inspect <ZIP-or-directory>."""
import argparse
import json
import sys
import zipfile
from pathlib import Path

from .inspect import inspect
from .rules import from_file


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="python3 -m tools.ti_compat",
        description="Inspect local Tiberian Sun/Twisted Insurrection data without uploading or executing it.")
    commands = parser.add_subparsers(dest="command", required=True)
    inventory = commands.add_parser("inspect", help="Read-only ZIP or directory inventory")
    inventory.add_argument("source", help="The downloaded .zip or extracted installation directory")
    inventory.add_argument("--output", type=Path, help="Write a local JSON inventory (names only, no asset bytes)")
    convert = commands.add_parser("rules", help="Normalize loose TS-style rules to JSON for offline analysis")
    convert.add_argument("source", type=Path, help="Locally extracted Rules.ini or similar file")
    convert.add_argument("--output", type=Path, help="Write private normalized JSON with mod-authored values")
    args = parser.parse_args(argv)
    try:
        if args.command == "inspect":
            data = inspect(args.source)
            print(f"{data['source_type'].upper()}: {data['source_name']}")
            print(f"{data['files']} files, {data['total_uncompressed_bytes']:,} uncompressed bytes")
            for category, count in data["categories"].items():
                print(f"  {category}: {count}")
            print("This is not directly compatible with VanillaTD; no game assets were extracted.")
        else:
            data = from_file(args.source)
            print(f"Parsed {len(data['entities'])} listed game objects; "
                  f"{len(data['unresolved_sections'])} unresolved sections.")
            print("Rules conversion is analysis-only: no working VanillaTD import.")
        if args.output:
            if args.output.resolve() == Path(args.source).resolve():
                raise ValueError("Output must not overwrite the input")
            args.output.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(f"Private local report saved: {args.output}")
        else:
            print("Use --output <report.json> for full local details; do not commit the report or game assets.")
        return 0
    except (ValueError, OSError, UnicodeError, zipfile.BadZipFile, RuntimeError) as error:
        print(f"Input rejected: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
