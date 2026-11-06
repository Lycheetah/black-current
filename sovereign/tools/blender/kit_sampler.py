"""Kit sampler: every architecture piece on one test deck, for review.
    /opt/blender-venv/bin/python tools/blender/kit_sampler.py   → out/kit_sampler.raw.glb"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import shipkit as k  # noqa: E402

k.reset()
k._mats.clear()
M = k.palette()
M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
k.box('deck', (140, 60, 2), (0, 0, -1), M['HULL'])
k.plane_kit('deck_kit', (0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (140, 60), M, count=40, h=1.6, seed=1)
k.hangar_bay('bay', (-52, 0, 0.2), (1, 0, 0), (0, 1, 0), (0, 0, 1), 18, 30, 6, M)
k.truss('truss', (-30, -20, 4), (-30, 22, 4), 4.0, M)
k.antenna_array('array', (-15, 0, 0), (0, 0, 1), 22, M, count=6, seed=3)
k.radiator_bank('rad', (2, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), 10, 26, 6, M, fins=14)
k.bridge_tower('bridge', (22, 0, 0), 14, 18, 20, M, decks=3, seed=4)
k.missile_cells('cells', (44, -12, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), 4, 6, 2.6, M)
k.sensor_dome('dome', (44, 16, 0), (0, 0, 1), 6, M)
k.finish(skip=('deck_kit', 'bay', 'truss', 'array', 'rad', 'bridge', 'cells', 'dome'))
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
print('tris', k.export(os.path.join(HERE, 'out', 'kit_sampler.raw.glb'), 4.0, False))
