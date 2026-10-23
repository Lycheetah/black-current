#!/usr/bin/env python3
"""Generate GROK_TONIGHT.md — the paste-from worksheet for the flagship run.

⛔ GROK_TONIGHT.md IS GENERATED. Never hand-edit it.
   ART_PROMPTS.md is the one authority. Edit there, re-run this.

   Extracts everything from the faction-roster header to EOF, so the
   worksheet cannot drift from the spec by construction.
"""
import pathlib, sys, datetime

SRC = pathlib.Path(__file__).resolve().parent.parent / "ART_PROMPTS.md"
OUT = SRC.parent / "GROK_TONIGHT.md"
MARK = "# 🜏 THE FOURTEEN — THE FACTION ROSTER"

text = SRC.read_text(encoding="utf-8")
i = text.find(MARK)
if i < 0:
    sys.exit(f"marker not found in {SRC.name}: {MARK!r}")

body = text[i:]
banner = (
    "<!-- GENERATED FILE — DO NOT EDIT -->\n"
    f"<!-- source: ART_PROMPTS.md · regenerate: python3 scripts/make-tonight-sheet.py -->\n"
    f"<!-- generated {datetime.date.today().isoformat()} -->\n\n"
    "> ⛔ **GENERATED — do not hand-edit.** `ART_PROMPTS.md` is the authority;\n"
    "> edit there and re-run `python3 scripts/make-tonight-sheet.py`.\n"
    "> This is the paste-from worksheet, not a second spec.\n\n"
    "---\n\n"
)
OUT.write_text(banner + body, encoding="utf-8")
print(f"WROTE {OUT.name}  {OUT.stat().st_size} bytes  ({body.count(chr(10))+1} lines)")
print(f"faction blocks: {sum(body.count(f'{n}. ') for n in range(1,15))} numbered entries found")
