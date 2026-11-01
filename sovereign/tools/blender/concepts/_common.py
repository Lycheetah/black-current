"""Shared shaping helpers for concept blockouts."""
import math


def ss(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bump(c, w, x):
    return math.exp(-((x - c) / w) ** 2)


def prow(t, length=0.07):
    """Closes a loft's nose into a rounded chisel instead of a flat cut."""
    return min(1.0, t / length) ** 0.5
