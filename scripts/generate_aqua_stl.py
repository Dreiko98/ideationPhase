"""Generate Aqua's printable ASCII STL without third-party dependencies.

The STL contains intersecting closed shells for the low-relief face. Modern
slicers union these volumes when slicing. The OpenSCAD source is the canonical
editable model and produces a strict boolean union when exported in OpenSCAD.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

Point3 = tuple[float, float, float]
Triangle = tuple[Point3, Point3, Point3]

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "3d" / "aqua-mascot.stl"


def cubic(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float], d: tuple[float, float], steps: int) -> list[tuple[float, float]]:
    points = []
    for index in range(steps):
        t = index / steps
        u = 1 - t
        points.append(
            (
                u**3 * a[0] + 3 * u**2 * t * b[0] + 3 * u * t**2 * c[0] + t**3 * d[0],
                u**3 * a[1] + 3 * u**2 * t * b[1] + 3 * u * t**2 * c[1] + t**3 * d[1],
            )
        )
    return points


def outline() -> list[tuple[float, float]]:
    svg = (
        cubic((50, 4), (45, 18), (18, 42), (14, 65), 20)
        + cubic((14, 65), (9, 91), (26, 108), (50, 108), 20)
        + cubic((50, 108), (74, 108), (91, 91), (86, 65), 20)
        + cubic((86, 65), (82, 42), (55, 18), (50, 4), 20)
    )
    # SVG y points down. Convert to millimetres with the rounded base at y=0.
    return [((x - 50) * 0.85, (108 - y) * 0.82) for x, y in svg]


def extrude_polygon(points: list[tuple[float, float]], height: float) -> list[Triangle]:
    triangles: list[Triangle] = []
    center = (sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points))
    count = len(points)
    for i in range(count):
        j = (i + 1) % count
        low_i, low_j = (*points[i], 0.0), (*points[j], 0.0)
        high_i, high_j = (*points[i], height), (*points[j], height)
        triangles.extend(
            (
                ((center[0], center[1], 0.0), low_j, low_i),
                ((center[0], center[1], height), high_i, high_j),
                (low_i, low_j, high_j),
                (low_i, high_j, high_i),
            )
        )
    return triangles


def cylinder(cx: float, cy: float, radius: float, bottom: float, top: float, segments: int = 24) -> list[Triangle]:
    triangles: list[Triangle] = []
    ring = [(cx + radius * math.cos(2 * math.pi * i / segments), cy + radius * math.sin(2 * math.pi * i / segments)) for i in range(segments)]
    for i in range(segments):
        j = (i + 1) % segments
        a, b = ring[i], ring[j]
        triangles.extend(
            (
                ((cx, cy, bottom), (b[0], b[1], bottom), (a[0], a[1], bottom)),
                ((cx, cy, top), (a[0], a[1], top), (b[0], b[1], top)),
                ((a[0], a[1], bottom), (b[0], b[1], bottom), (b[0], b[1], top)),
                ((a[0], a[1], bottom), (b[0], b[1], top), (a[0], a[1], top)),
            )
        )
    return triangles


def normal(triangle: Triangle) -> Point3:
    a, b, c = triangle
    u = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    v = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    raw = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    length = math.sqrt(sum(value * value for value in raw)) or 1
    return tuple(value / length for value in raw)  # type: ignore[return-value]


def write_stl(triangles: Iterable[Triangle]) -> None:
    with OUTPUT.open("w", encoding="ascii", newline="\n") as target:
        target.write("solid aqua_mascot\n")
        for triangle in triangles:
            nx, ny, nz = normal(triangle)
            target.write(f"  facet normal {nx:.6f} {ny:.6f} {nz:.6f}\n    outer loop\n")
            for x, y, z in triangle:
                target.write(f"      vertex {x:.6f} {y:.6f} {z:.6f}\n")
            target.write("    endloop\n  endfacet\n")
        target.write("endsolid aqua_mascot\n")


def main() -> None:
    triangles = extrude_polygon(outline(), 8.0)
    triangles += cylinder(-10, 33.6, 3.25, 7.6, 9.6)
    triangles += cylinder(10, 33.6, 3.25, 7.6, 9.6)
    for step in range(13):
        x = -9 + step * 1.5
        y = 21 - 0.055 * x * x
        triangles += cylinder(x, y, 1.45, 7.6, 9.6, 16)
    write_stl(triangles)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
