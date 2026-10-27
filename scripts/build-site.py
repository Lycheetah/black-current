#!/usr/bin/env python3
"""Package the public site without altering game source or the HTML snapshot.

The playable directory always comes from this checkout's current index/js/css.
The standalone download is an explicitly labelled generated snapshot. No npm,
image processing, provider credentials or network is needed for this command.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_NAME = ".site-build"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def package(root=ROOT):
    root = Path(root).resolve()
    output = root / OUTPUT_NAME
    if output.is_symlink():
        raise ValueError("Refusing a linked site output directory.")
    required = ["site/index.html", "site/style.css", "site/assets/current.svg",
                "site/assets/gameplay.jpg", "index.html", "art/manifest.json",
                "dist/black-current.html"]
    for name in required:
        path = root / name
        if not path.is_file() or path.is_symlink():
            raise ValueError("Missing or linked site input: " + name)
    # Build into scratch first. A failed copy never destroys a working package.
    with tempfile.TemporaryDirectory(prefix=".site-package-", dir=root) as temporary:
        target = Path(temporary)
        for directory in ("site", "js", "css", "art/keyed"):
            source = root / directory
            for path in source.rglob("*"):
                if path.is_symlink():
                    raise ValueError("Site inputs cannot contain symbolic links.")
            destination = target if directory == "site" else target / "play" / directory
            shutil.copytree(source, destination, dirs_exist_ok=True)
        shutil.copy2(root / "index.html", target / "play/index.html")
        shutil.copy2(root / "art/manifest.json", target / "play/art/manifest.json")
        if (root / "art/faction-kit.json").exists():
            if (root / "art/faction-kit.json").is_symlink():
                raise ValueError("Linked faction art manifest")
            shutil.copy2(root / "art/faction-kit.json", target / "play/art/faction-kit.json")
        if (root / "art/world-kit.json").exists():
            if (root / "art/world-kit.json").is_symlink():
                raise ValueError("Linked world art manifest")
            shutil.copy2(root / "art/world-kit.json", target / "play/art/world-kit.json")
        (target / "download").mkdir()
        shutil.copy2(root / "dist/black-current.html", target / "download/black-current.html")
        (target / ".nojekyll").touch()
        manifest = {"version": 1, "play_source_sha256": digest(root / "index.html"),
            "standalone_sha256": digest(root / "dist/black-current.html"),
            "note": "play/ uses current source; download/ is the generated standalone snapshot.",
            "files": {str(p.relative_to(target)): digest(p) for p in sorted(target.rglob("*")) if p.is_file()}}
        (target / "build.json").write_text(json.dumps(manifest, indent=2) + "\n")
        if output.exists():
            if not (output / "build.json").is_file():
                raise ValueError("Existing output was not created by this packager; preserving it.")
            previous = json.loads((output / "build.json").read_text())
            if previous.get("version") != 1 or not isinstance(previous.get("files"), dict):
                raise ValueError("Existing output has no valid ownership marker; preserving it.")
            # Only this exact generated directory is replaced, never game source.
            shutil.rmtree(output)
        shutil.copytree(target, output)
    files = [p for p in output.rglob("*") if p.is_file()]
    print(json.dumps({"output": OUTPUT_NAME, "files": len(files),
        "bytes": sum(p.stat().st_size for p in files),
        "play_source_matches": digest(root / "index.html") == digest(output / "play/index.html"),
        "snapshot_matches": digest(root / "dist/black-current.html") == digest(output / "download/black-current.html")}))
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    package()
