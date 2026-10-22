"""Generate the local CodeCraze registration QR code.

Replaces the runtime dependency on api.qrserver.com with a committed SVG.

Usage:
    python tools/make-qr.py

Destination is intentionally hard-coded to the existing public registration
form link used across the site. Do not change it without updating the pages.
"""

import os

import segno

DESTINATION = "https://forms.gle/vhYko4os3o6hY12L7"
OUT = "assets/img/codecrypt-qr.svg"

# Brand colours (see style.css custom properties).
DARK = "#062B4F"
LIGHT = "#FFFFFF"

os.makedirs(os.path.dirname(OUT), exist_ok=True)

qr = segno.make(DESTINATION, error="m", boost_error=False, micro=False)
matrix = [list(row) for row in qr.matrix]
size = len(matrix)
border = 4  # standard quiet zone, in modules

total = size + border * 2
runs = []
for y, row in enumerate(matrix):
    x = 0
    while x < size:
        if row[x]:
            start = x
            while x < size and row[x]:
                x += 1
            runs.append((start + border, y + border, x - start))
        else:
            x += 1

path = "".join(f"M{x} {y}h{w}v1h-{w}z" for x, y, w in runs)

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" \
width="{total * 8}" height="{total * 8}" role="img" \
aria-label="QR code linking to the CodeCraze registration form">
<title>CodeCraze registration QR code</title>
<rect width="{total}" height="{total}" fill="{LIGHT}"/>
<path d="{path}" fill="{DARK}" shape-rendering="crispEdges"/>
</svg>
"""

with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(svg)

print(f"wrote {OUT}")
print(f"  version   : {qr.version}")
print(f"error level: {qr.error}")
print(f"matrix     : {size}x{size} modules (+{border} quiet zone)")
print(f"modules    : {len(runs)} runs")
print(f"target     : {DESTINATION}")
