"""Build Blender ship scripts into game models.

    /opt/blender-venv/bin/python tools/blender/build.py green_seed

Each tools/blender/ships/<name>.py defines META (name, hull) and build(kit).
Writes src/data/models/<META['name']>.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import shipkit  # noqa: E402

for name in sys.argv[1:]:
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, 'ships', name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    shipkit.reset()
    shipkit._mats.clear()
    mod.build(shipkit)
    out = os.path.join(ROOT, 'src', 'data', 'models', mod.META['name'])
    tris = shipkit.export(out, mod.META.get('tile', 4.0))
    print(f"blender model {mod.META['name']} · {os.path.getsize(out) // 1024} KB · {tris} triangles")
