# Aqua — printable mascot

Files:

- `aqua-mascot.stl`: ready to import into Cura, PrusaSlicer, Bambu Studio or another slicer.
- `aqua-mascot.scad`: editable canonical model for OpenSCAD.
- `../../public/brand/aqua-mascot.svg`: matching two-dimensional brand artwork.

## Dimensions and orientation

The generated STL is approximately **62.7 × 85.3 × 9.6 mm**. The body is 8 mm thick and the eyes and smile use a 1.6 mm low relief.

Place the completely flat back on the build plate. The model is one colour, requires no supports and contains no separate or fragile parts.

Suggested FDM starting point:

- 0.20 mm layer height
- 3 perimeters
- 4 top and bottom layers
- 15% infill
- PLA or PETG
- no supports

The facial relief can be painted after printing or highlighted with a filament change near 8 mm.

## Regeneration

The dependency-free generator creates the checked-in STL:

```bash
python scripts/generate_aqua_stl.py
```

The generated STL represents the facial details as intersecting closed volumes, which mainstream slicers merge while slicing. For a strict CSG union or geometry edits, open `aqua-mascot.scad` in OpenSCAD and export it as STL.
