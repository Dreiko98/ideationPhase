/*
  GOTA — Aqua printable mascot
  Finished size: approximately 64 x 86 x 9.6 mm
  Printing: place the flat back on the build plate; no supports required.
  Suggested FDM settings: 0.20 mm layers, 3 walls, 15% infill.
*/

$fn = 64;

body_points = [
  [0,86],[-3,75],[-17,62],[-28,48],[-31,34],[-34,13],[-20,0],
  [0,-1],[20,0],[34,13],[31,34],[28,48],[17,62],[3,75]
];

module body() {
  linear_extrude(height=8)
    polygon(points=body_points);
}

module eye(x) {
  translate([x,31,7.6]) cylinder(h=2, r=3.25);
}

module smile() {
  // A restrained embossed arc made from overlapping round segments.
  for (x=[-9:-1.5:7.5]) {
    y = 18 - 0.055*x*x;
    translate([x,y,7.6]) cylinder(h=2, r=1.45);
  }
}

union() {
  body();
  eye(-10);
  eye(10);
  smile();
}
