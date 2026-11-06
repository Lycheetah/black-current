"""Human Hunters parts: industrial hardware that says working ship, not warship-from-a-kit."""
import math


def container_stack(k, M, base, cols, rows, levels, size, seed=1, X=(1, 0, 0)):
    """Stacked shipping containers: corrugated sides (thin ribs), end doors, mixed colours, a few gaps."""
    import random
    rnd = random.Random(seed)
    w, l, h = size
    x0, y0, z0 = base
    for c in range(cols):
        for r in range(rows):
            for v in range(levels):
                if v and rnd.random() < 0.25:
                    continue
                cx, cy, cz = x0 + (c - (cols - 1) / 2) * w * 1.04, y0 + (r - (rows - 1) / 2) * l * 1.03, z0 + h * (v + 0.5)
                mat = M['GOLD'] if rnd.random() < 0.3 else (M['HULL'] if rnd.random() < 0.6 else M['TRIM'])
                k.box('container', (w, l, h), (cx, cy, cz), mat)
                for q in range(6):
                    for sd in (-1, 1):
                        k.box('container_rib', (w * 0.04, l * 0.03, h * 0.86), (cx + sd * w * 0.51, cy - l * 0.42 + q * l * 0.17, cz), M['TRIM'])
                k.box('container_door', (w * 0.9, l * 0.02, h * 0.86), (cx, cy + l * 0.505, cz), M['TRIM'])


def smokestack(k, M, base, r, h):
    """A tall exhaust stack: banded, with a vent cap and a glowing throat."""
    x, y, z = base
    k.cylinder('stack', r, h, (x, y, z + h / 2), M['TRIM'], segs=12, rot=(0, 0, 0), r2=r * 0.85)
    for i in range(3):
        k.cylinder('stack_band', r * 1.08, h * 0.04, (x, y, z + h * (0.25 + i * 0.25)), M['GOLD'] if i == 1 else M['HULL'], segs=12, rot=(0, 0, 0))
    k.cylinder('stack_cap', r * 1.15, h * 0.06, (x, y, z + h * 1.0), M['HULL'], segs=12, rot=(0, 0, 0))
    k.cylinder('stack_glow', r * 0.7, h * 0.02, (x, y, z + h * 1.035), M['GLOW'], segs=12, rot=(0, 0, 0))


def piston(k, M, a, b, r):
    """A hydraulic ram between two points: cylinder, chrome rod, end clevises."""
    k.tube('piston_body', [a, tuple(a[i] + (b[i] - a[i]) * 0.3 for i in range(3)), tuple(a[i] + (b[i] - a[i]) * 0.6 for i in range(3))], [r] * 3, M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
    k.tube('piston_rod', [tuple(a[i] + (b[i] - a[i]) * 0.6 for i in range(3)), tuple(a[i] + (b[i] - a[i]) * 0.8 for i in range(3)), b], [r * 0.5] * 3, M['GOLD'], bevel_res=1, ends=('flat', 'flat'), res=1)
    for p in (a, b):
        k.box('clevis', (r * 2.4, r * 2.4, r * 2.4), p, M['HULL'])


def chevrons(k, M, center, w, l, n, axis='y'):
    """A strip of hazard chevrons: alternating gold and dark blocks."""
    x, y, z = center
    for i in range(n):
        f = -0.5 + (i + 0.5) / n
        pos = (x, y + f * l, z) if axis == 'y' else (x + f * w, y, z)
        size = (w, l / n * 0.98, w * 0.08) if axis == 'y' else (w / n * 0.98, l, l * 0.08)
        k.box('chevron', size, pos, M['GOLD'] if i % 2 == 0 else M['TRIM'])
