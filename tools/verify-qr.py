"""Verify that assets/img/codecrypt-qr.svg really encodes the expected URL.

This parses the SVG that is committed to the repository (not an in-memory
copy), rebuilds the module matrix, rasterises it and decodes it with an
independent QR reader. If this passes, the SVG on disk scans correctly.

Usage:
    python tools/verify-qr.py
"""

import re
import sys

import numpy as np
from PIL import Image

SVG = "assets/img/codecrypt-qr.svg"
EXPECTED = "https://forms.gle/vhYko4os3o6hY12L7"


def parse_svg(path):
    """Return (module_matrix, total_modules) reconstructed from the SVG."""
    with open(path, encoding="utf-8") as fh:
        svg = fh.read()

    viewbox = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
    if not viewbox:
        raise SystemExit("FAIL: no viewBox in SVG")
    total = int(viewbox.group(1))

    d = re.search(r'<path d="([^"]+)"', svg)
    if not d:
        raise SystemExit("FAIL: no path element in SVG")

    matrix = [[0] * total for _ in range(total)]
    for x, y, w in re.findall(r"M(\d+) (\d+)h(\d+)", d.group(1)):
        for dx in range(int(w)):
            matrix[int(y)][int(x) + dx] = 1
    return matrix, total


def rasterise(matrix, total, scale=8, pad=4):
    size = (total + pad * 2) * scale
    img = Image.new("L", (size, size), 255)
    px = img.load()
    for y in range(total):
        for x in range(total):
            if matrix[y][x]:
                for dy in range(scale):
                    for dx in range(scale):
                        px[(x + pad) * scale + dx, (y + pad) * scale + dy] = 0
    return img


def main():
    matrix, total = parse_svg(SVG)
    img = rasterise(matrix, total)

    try:
        import cv2
    except ImportError:
        print("SKIP: opencv not installed - cannot decode")
        print("      pip install opencv-python-headless")
        return 2

    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(np.array(img))
    if not data:
        print("FAIL: QR could not be decoded from the committed SVG")
        return 1
    if data != EXPECTED:
        print(f"FAIL: decoded {data!r}, expected {EXPECTED!r}")
        return 1

    print("OK: assets/img/codecrypt-qr.svg decodes correctly")
    print(f"    -> {data}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
