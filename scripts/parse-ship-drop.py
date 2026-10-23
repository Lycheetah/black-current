#!/usr/bin/env python3
"""
PARSE-ONLY survey of the ship art drop.

⛔ THIS SCRIPT WRITES NO ASSETS AND COPIES NOTHING. It reads filenames and
   prints a table. That is deliberate: a parser that cannot write cannot
   corrupt the drop, so it is safe to run before any ruling has been made.

⭐⭐ THE FILENAME IS THE NAME. Mac names the ships from the art he generates.
   This script READS his names. It never authors one. Every alias below is
   sourced from his own spelling of the same word elsewhere in the same drop --
   never from a dictionary, never from a guess.

⛔ A filename that does not parse is reported UNRESOLVED and left alone.
   A guessed name is an invented name, and an invented name splits the roster.

Usage:
    python3 scripts/parse-ship-drop.py [SRC_DIR]
    python3 scripts/parse-ship-drop.py --json    # machine-readable, for ingest
"""

import json
import os
import re
import sys

DEFAULT_SRC = os.path.expanduser("~/Downloads/ship stuff for buble ships")

# ---------------------------------------------------------------------------
# CLASS -> HULL_LADDER tier.  The class word Mac typed IS the hull band, so the
# drop wires itself to the ladder already in js/fleet.js with zero balance
# invention.  Longest patterns first: "super battle frigate" must win over the
# bare "frigate", and "super battle fortiress" must not be eaten by it either.
# ---------------------------------------------------------------------------
CLASSES = [
    ("SUPER BATTLE FORTRESS", "TITAN", [
        r"super\s*battle\s*fort(?:i)?res+", r"battle\s*fort(?:i)?res+",
    ]),
    ("SUPER BATTLE FRIGATE", "FRIGATE", [
        r"super\s*battle\s*fri?ga?te?", r"super\s*battle\s*f[ir]+ga[t]?e",
        r"superbattlefrig\w*", r"super\s*battle\s*frig\w*",
    ]),
    # ⭐ LITERAL ALIASES ONLY, each one observed verbatim in the drop. A fuzzy
    #    regex here would be a guess machine, and a guess is an invented name.
    ("DREADNOUGHT", "BATTLESHIP", [
        r"dreadnought", r"dreanought", r"deadnought", r"dreadnouhgt",
        r"dreadnouhgt", r"dreadnought",
    ]),
    ("FLAGSHIP", "BATTLESHIP", [
        r"flagships", r"flagship", r"flagfship", r"flasgshio", r"flaghsip",
    ]),
    ("CITADEL", "TITAN", [r"citadel"]),
    ("TITAN", "TITAN", [r"titan[t]?"]),
    ("DESTROYER", "CRUISER", [r"destroyer"]),
    ("FIGHTER", "FRIGATE", [r"fighter"]),
    ("MOTHERSHIP", "TITAN", [r"mothe?r?sh?ip", r"motherhip"]),
    ("BATTLESHIP", "BATTLESHIP", [r"battleship"]),
    ("CRUISER", "CRUISER", [r"cruiser"]),
    ("FRIGATE", "FRIGATE", [r"frigate"]),
    ("ROOKIE", "FRIGATE", [r"rookie"]),
]

# ---------------------------------------------------------------------------
# FACTION aliases.  Order matters: the longer, more specific faction must be
# tested before the shorter one it contains, or "HUMAN AI GODS" is swallowed by
# "AI GODS" and "AI HUMAN SYMBIOTS SOLS" by "AI".
# ---------------------------------------------------------------------------
FACTIONS = [
    ("AI HUMAN SYMBIOTS SOLS", [r"ai\s*human\s*symbiots?\s*sols?"]),
    ("HUMAN AI GODS",          [r"human\s*ai\s*gods?", r"humn?a?i?gods?", r"humanai"]),
    ("HUMAN HUNTERS",          [r"human\s*hunters?"]),
    ("HYBRID FUSED HUNTERS",   [r"hybrid\s*fused\s*hunters?", r"hybridfusedhunters?",
                                r"hybrid\s*hunterr?", r"hybrid\s*fused"]),
    ("AI GODS",                [r"ai\s*gods?", r"aigods?", r"aigod"]),
    ("AI HUNTERS",             [r"ai\s*hunters?", r"aihunters?", r"aihunter"]),
    ("AMETHYST ANGELS",        [r"amethyst\s*angels?", r"amethystangel",
                                r"amyethest\s*angels?"]),
    ("BLACK HOLE",             [r"black\s*hole", r"blackhole"]),
    ("BLOODHUNTER",            [r"blood\s*hunter", r"bloodhunter"]),
    ("CRIMSON BLOOD",          [r"crimson\s*blood", r"crimsonblood"]),
    ("COSMIC DARKNESS",        [r"cosmic\s*darkness", r"cosmicdarkness"]),
    ("COSMIC LIGHT",           [r"cosmic\s*light", r"cosmiclig?[ht]+", r"cosmigli[gh]+t"]),
    ("COSMIC CALANTE",         [r"cosmic\s*calante", r"cosmiccalante"]),
    ("CHAOS",                  [r"chaos", r"chaso"]),
    ("PAGAN AI",               [r"pagan\s*ai+", r"paganai+"]),
    ("TECHNO ANGELS",          [r"techno?\s*angels?", r"technoangel", r"technangels?"]),
    ("SOV CORUPT",             [r"sov\s*corupt", r"sovcorupt", r"lycheetahsovcorupt"]),
    # ⭐ MAC'S RULING 2026-08-17: AMETHYST HUNTERS IS ITS OWN FACTION.
    #   *"if it clearly says that it definetly is"* — the filename is read
    #   literally. It is not a typo of AMETHYST ANGELS, and the parser must not
    #   "helpfully" fold it into one. Listed AFTER Amethyst Angels only because
    #   longest-match ordering needs it there, not because it is a fallback.
    ("AMETHYST HUNTERS",       [r"amethyst\s*hunters?"]),
    # ⭐ SAME RULING, EXTENDED: `ai destroyer` / `AiFlagship` / `AiTitan` clearly
    #   say "ai" and nothing more, so the faction is AI. Last in the list so
    #   every longer AI-prefixed faction (AI GODS, AI HUNTERS, AI HUMAN SYMBIOTS
    #   SOLS) wins the longest-match test before this can catch.
    #   ⚠ THIS ONE IS MY EXTENSION OF HIS RULE, NOT HIS OWN WORDS — flagged in
    #   the receipt so he can veto it without having to find it in the code.
    #   ⚠ `\b` ALONE MISSES THE CONCATENATED FORM: in "aiflagship" there is no
    #   word boundary after "ai", so `AiFlagship.jpg` fell through. The second
    #   pattern reads a lowercase letter as the boundary instead. It is safe
    #   because it matches only 2 chars, and longest-match hands "aigodcitadel"
    #   (5) and "aihunters" (9) to their own factions before this can catch.
    ("AI",                     [r"^\s*ai\b", r"^ai(?=[a-z])"]),
]

# Rows the parser must NOT silently resolve.  Mac rules on these; the script
# only reports that a ruling is owed.  ⭐ Both former entries are now RULED,
# so this is empty — kept because the next ambiguous drop will need it, and
# deleting the mechanism would mean the next guess goes unflagged.
AMBIGUOUS_NOTES = {}
BARE_AI_NOTE = ""


def norm(s):
    """Lowercase, strip extension, collapse separators. Nothing is dropped."""
    s = os.path.splitext(s)[0]
    s = s.replace("_", " ").replace("-", " ")
    s = re.sub(r"\(remake\)", " ", s, flags=re.I)
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def find_class(n):
    for name, tier, pats in CLASSES:
        for p in pats:
            m = re.search(p, n)
            if m:
                return name, tier, m.span()
    return None, None, None


def find_faction(n):
    best = None
    for name, pats in FACTIONS:
        for p in pats:
            m = re.search(p, n)
            if m:
                # longest match wins, so the specific faction beats the substring
                if best is None or (m.end() - m.start()) > best[2]:
                    best = (name, m.span(), m.end() - m.start())
    if best:
        return best[0], best[1]
    return None, None


def parse(fname, folder):
    n = norm(fname)
    cls, tier, cspan = find_class(n)
    fac, fspan = find_faction(n)
    note = ""

    if fac in AMBIGUOUS_NOTES:
        note = AMBIGUOUS_NOTES[fac]

    # ⭐ THE ENEMY FOLDERS NAME BY LINE, NOT BY FACTION.
    #    "SavanahCruiser", "LIght4zBattleship", "superSunMotherhip" -- the text
    #    left over once the class word is removed IS the ship's name. Reading
    #    that remainder is reading HIS name; it is not authoring one. These are
    #    the COLLECTION LAW's stock: every one of them must be obtainable, so
    #    every one needs a name, and he already gave them one.
    is_enemy = folder.strip().lower() in ("enemy ships+ drones",
                                          "enemy mother ships")
    if is_enemy and cls and not fac:
        stem = (n[:cspan[0]] + " " + n[cspan[1]:]).strip()
        stem = re.sub(r"\s+", " ", stem)
        if stem:
            fac = stem.upper()          # his line name, read verbatim
            note = ""

    # ChatGPT's own export names carry no ship name at all. They are not
    # failures of the parser -- they are files Mac has not named yet.
    if re.match(r"^chatgpt image", n) or n == "image":
        note = "UNNAMED EXPORT -- Mac has not named this one yet"

    resolved = bool(fac and cls) and not note
    return {
        "file": fname,
        "folder": folder,
        "faction": fac,
        "class": cls,
        "tier": tier,
        "resolved": resolved,
        "note": note,
    }


def main():
    args = [a for a in sys.argv[1:] if a != "--json"]
    as_json = "--json" in sys.argv
    src = args[0] if args else DEFAULT_SRC

    if not os.path.isdir(src):
        print("SRC NOT FOUND: %s" % src, file=sys.stderr)
        return 2

    rows = []
    for dirpath, _dirnames, filenames in os.walk(src):
        # NOTE: one subfolder is literally named "enemy mother ships " WITH A
        # TRAILING SPACE. os.walk handles it; a hardcoded path string does not.
        rel = os.path.relpath(dirpath, src)
        folder = "" if rel == "." else rel
        for f in sorted(filenames):
            if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            rows.append(parse(f, folder))

    if as_json:
        print(json.dumps(rows, indent=2))
        return 0

    ok = [r for r in rows if r["resolved"]]
    bad = [r for r in rows if not r["resolved"]]

    print("=" * 78)
    print("SHIP DROP SURVEY -- PARSE ONLY, NOTHING WRITTEN, NOTHING COPIED")
    print("src: %s" % src)
    print("=" * 78)
    print("%d image files: %d resolved, %d need a ruling from Mac"
          % (len(rows), len(ok), len(bad)))
    print()

    by_fac = {}
    for r in ok:
        by_fac.setdefault(r["faction"], []).append(r)

    print("-" * 78)
    print("RESOLVED -- %d factions" % len(by_fac))
    print("-" * 78)
    for fac in sorted(by_fac):
        entries = sorted(by_fac[fac], key=lambda r: r["class"])
        print("\n%s  (%d)" % (fac, len(entries)))
        for r in entries:
            loc = ("  [%s]" % r["folder"]) if r["folder"] else ""
            print("    %-22s -> %-11s %s%s"
                  % (r["class"], r["tier"], r["file"], loc))

    print()
    print("-" * 78)
    print("UNRESOLVED -- %d.  NOT GUESSED. Mac rules on these." % len(bad))
    print("-" * 78)
    for r in sorted(bad, key=lambda r: r["file"]):
        loc = ("  [%s]" % r["folder"]) if r["folder"] else ""
        print("    %s%s" % (r["file"], loc))
        print("        faction=%s class=%s" % (r["faction"], r["class"]))
        if r["note"]:
            print("        ^ %s" % r["note"])

    print()
    print("-" * 78)
    print("TIER TOTALS (these select the HULL_LADDER multipliers in js/fleet.js)")
    print("-" * 78)
    tiers = {}
    for r in ok:
        tiers[r["tier"]] = tiers.get(r["tier"], 0) + 1
    for t in ("FRIGATE", "CRUISER", "BATTLESHIP", "TITAN"):
        print("    %-11s %d" % (t, tiers.get(t, 0)))
    print()
    print("NEXT: Mac rules on the UNRESOLVED rows. Only then does anything copy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
