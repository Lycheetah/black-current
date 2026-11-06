"""Techno Angels parts: stained-glass crystal wings and halo arrays."""
import math

from _forge import fang


def pane_wing(k, M, root, span, chord, side, lift=0.4, panes=5, seed=1):
    """A crystal wing: a metal frame (leading spar, trailing rail, ribs) holding faceted glass panes."""
    x, y, z = root
    tip = (x + side * span * math.cos(lift), y - chord * 0.3, z + span * math.sin(lift))
    k.tube('pane_spar', [root, ((x + tip[0]) / 2, (y + tip[1]) / 2 + chord * 0.1, (z + tip[2]) / 2), tip], [chord * 0.06, chord * 0.05, chord * 0.02], M['TRIM'], bevel_res=1, ends=('flat', 'point'), res=3)
    for i in range(panes + 1):
        u = i / panes
        px, py, pz = x + (tip[0] - x) * u, y + (tip[1] - y) * u, z + (tip[2] - z) * u
        ln = chord * (1.0 - 0.55 * u)
        k.box('pane_rib', (chord * 0.04, ln, chord * 0.05), (px, py - ln / 2, pz), M['GOLD'] if i % 2 == 0 else M['TRIM'])
        if i < panes:
            u2 = (i + 0.5) / panes
            qx, qy, qz = x + (tip[0] - x) * u2, y + (tip[1] - y) * u2, z + (tip[2] - z) * u2
            ln2 = chord * (1.0 - 0.55 * u2)
            fang(k, 'pane', (qx, qy - ln2 * 0.05, qz), (qx, qy - ln2 * 0.95, qz), span / panes * 0.42, M['CRYSTAL'], sides=4)


def halo_array(k, M, c, R, n=3, tilt=0.35, nodes=8):
    """Nested halo rings at alternating tilts, with crystal nodes on the outer ring."""
    for j in range(n):
        rr = R * (1.0 - 0.18 * j)
        k.armour_ring('halo_ring', rr, R * 0.035, R * 0.08, c, M, rot=(math.pi / 2 - tilt * (1 if j % 2 else -1), 0.2 * j, 0), blocks=16, gap=0.18, glow=j == 0)
    for i in range(nodes):
        a = i / nodes * math.tau
        p = (c[0] + math.cos(a) * R, c[1], c[2] + math.sin(a) * R)
        fang(k, 'halo_node', p, (p[0] + math.cos(a) * R * 0.18, p[1], p[2] + math.sin(a) * R * 0.18), R * 0.05, M['CRYSTAL'], sides=6)
