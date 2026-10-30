#!/usr/bin/env python3
"""Build a reviewable candidate from tracked assets and referenced game code.

Tracked inputs come from the working tree, including local edits. New JS/CSS
must be referenced by index.html. Unselected art and symlinks never enter the
package. This command does not commit, push or publish anything.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def game_references(root):
    html = re.sub(r"<!--.*?-->", "", (root / "index.html").read_text(), flags=re.S)
    refs = re.findall(r'(?:src|href)="((?:js|css)/[^"?]+)(?:\?v=([^"&]+))?"', html)
    if not refs:
        raise ValueError("No game references found")
    tokens = {token for _, token in refs}
    if len(tokens) != 1 or not next(iter(tokens)):
        raise ValueError("Game references must share one nonempty cache token")
    for name, _ in refs:
        path = root / name
        if ".." in Path(name).parts or not path.is_file() or path.is_symlink():
            raise ValueError("Missing or linked game reference: " + name)
    return refs, next(iter(tokens))


def selected_art_inputs(root, manifest_name):
    path = root / manifest_name
    if not path.exists():
        return set()
    if path.is_symlink():
        raise ValueError("Linked faction manifest")
    manifest = json.loads(path.read_text())
    assets = manifest.get("assets", [])
    if manifest.get("v") != 1 or not isinstance(assets, list) or not 1 <= len(assets) <= 64:
        raise ValueError("Invalid selected faction kit")
    names, ids = {manifest_name}, set()
    for asset in assets:
        name = asset.get("path", "")
        if not isinstance(name, str) or not name.startswith("art/keyed/") or ".." in Path(name).parts:
            raise ValueError("Invalid selected faction asset path")
        source = root / name
        if not source.is_file() or source.is_symlink() or digest(source) != asset.get("sha256"):
            raise ValueError("Missing, linked or changed faction asset: " + name)
        if asset.get("id") in ids or name in names:
            raise ValueError("Duplicate faction asset")
        ids.add(asset.get("id"))
        names.add(name)
    return names


def faction_inputs(root):
    return selected_art_inputs(root, "art/faction-kit.json")


def build(root=ROOT):
    refs, token = game_references(root)
    version = json.loads((root / "package.json").read_text())["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?", version):
        raise ValueError("Unsafe release version")
    tracked = set(subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")) - {""}
    fixed = {"index.html", "art/manifest.json", "package.json", "package-lock.json",
             "scripts/build-single.py", "scripts/build-site.py"}
    selected = {p for p in tracked if p.startswith(("site/", "js/", "css/", "art/keyed/", "art/cael/"))}   # art/cael: art drops (js/art-drop.js)
    selected |= fixed | {name for name, _ in refs} | faction_inputs(root) | selected_art_inputs(root, "art/world-kit.json") | selected_art_inputs(root, "art/hostile-kit.json")
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip()
    output = root / "dist/release-candidate"
    if (root / "dist").is_symlink() or any((root / p).is_symlink() for p in
            ["dist/black-current.html", f"dist/black-current-{version}.html"]):
        raise ValueError("Refusing linked standalone outputs")
    if output.is_symlink() or (output.exists() and not (output / "build.json").is_file()):
        raise ValueError("Refusing to replace an unowned candidate directory")
    if output.exists():
        marker = json.loads((output / "build.json").read_text())
        if marker.get("version") != 1 or not isinstance(marker.get("files"), dict):
            raise ValueError("Invalid candidate ownership marker")
    with tempfile.TemporaryDirectory(prefix="black-current-candidate-") as temporary:
        stage = Path(temporary)
        for name in sorted(selected):
            source = root / name
            if not source.is_file() or any(p.is_symlink() for p in [source, *source.parents] if p != root.parent):
                raise ValueError("Missing or linked selected input: " + name)
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        game_references(stage)
        subprocess.run([sys.executable, "scripts/build-single.py"], cwd=stage, check=True)
        subprocess.run([sys.executable, "scripts/build-site.py"], cwd=stage, check=True)
        package = stage / ".site-build"
        manifest = json.loads((package / "build.json").read_text())
        manifest["release"] = {"version": version, "cache_token": token, "base_commit": head,
                               "state": "local working-tree candidate; not published"}
        (package / "build.json").write_text(json.dumps(manifest, indent=2) + "\n")
        # All generation completed before replacing the previous owned output.
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            shutil.rmtree(output)
        shutil.copytree(package, output)
        standalone = root / "dist/black-current.html"
        shutil.copy2(stage / "dist/black-current.html", standalone)
        versioned = root / f"dist/black-current-{version}.html"
        shutil.copy2(standalone, versioned)
    files = [p for p in output.rglob("*") if p.is_file()]
    incoming = [p for p in (root / "art/keyed").rglob("*") if p.is_file() and str(p.relative_to(root)) not in selected]
    receipt = {"release": manifest["release"], "selected_inputs": {p: digest(root / p) for p in sorted(selected)},
               "excluded_untracked_keyed_assets": len(incoming), "package_files": len(files),
               "package_bytes": sum(p.stat().st_size for p in files),
               "standalone": str(versioned.relative_to(root)), "standalone_sha256": digest(versioned)}
    receipt_dir = root / "shots/release-candidate"
    receipt_dir.mkdir(parents=True, exist_ok=True)
    (receipt_dir / "package.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({k: v for k, v in receipt.items() if k != "selected_inputs"}, indent=2))


if __name__ == "__main__":
    build()
