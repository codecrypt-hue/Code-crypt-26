"""Guard the approved three-colour palette.

The site is limited to:

    muted teal      #2C666E
    soft off-white  #F0EDEE
    deep charcoal   #111817

Everything else must be either one of those colours written with an alpha
channel, or a shade/tint blended from two of them (used for borders, raised
surfaces and readable secondary text). Two documented exceptions are allowed:
pure black/white in the print stylesheet and CSS masks, and the Tech Tiranga
tricolour bar, which is existing event content rather than decoration.

    python tools/verify-palette.py
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SOURCES = [
    "style.css",
    "script.js",
    "index.html",
    "codecraze.html",
    "epl.html",
    "TT.html",
]

APPROVED = {
    (44, 102, 110): "muted teal #2C666E",
    (240, 237, 238): "soft off-white #F0EDEE",
    (17, 24, 23): "deep charcoal #111817",
}

# Shades and tints blended from two approved colours.
DERIVED = {
    (12, 17, 16): "charcoal shade (charcoal-950)",
    (22, 30, 29): "charcoal shade (charcoal-850 / surface-2)",
    (27, 36, 35): "charcoal tint (charcoal-800 / surface)",
    (10, 14, 13): "near-black shadow shade of charcoal",
    (106, 145, 150): "teal tint (teal-400)",
    (143, 169, 173): "teal tint (teal-300)",
    (200, 197, 198): "off-white shade (off-white-dim)",
    (154, 152, 153): "off-white shade (off-white-soft)",
}

# Allowed only for print output and CSS masks (alpha channel only).
NEUTRAL_EXTREMES = {
    (0, 0, 0): "black (print text / CSS mask)",
    (255, 255, 255): "white (print background / flag centre band)",
}

# Allowed only on lines that carry the Tech Tiranga theme.
TRICOLOUR = {
    (226, 161, 60): "Tiranga saffron",
    (31, 158, 99): "Tiranga green",
}

LITERAL_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)")
HEX_RE = re.compile(r"^#([0-9a-fA-F]{3,8})$")
RGB_RE = re.compile(r"^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", re.I)


def parse_rgb(literal):
    hex_match = HEX_RE.match(literal)
    if hex_match:
        digits = hex_match.group(1)
        if len(digits) == 3:
            digits = "".join(c * 2 for c in digits)
        elif len(digits) == 4:
            digits = "".join(c * 2 for c in digits[:3])
        if len(digits) < 6:
            return None
        return tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))

    rgb_match = RGB_RE.match(literal)
    if rgb_match:
        return tuple(int(value) for value in rgb_match.groups())

    return None


def main():
    problems = []
    tricolour_hits = 0

    for relative in SOURCES:
        path = os.path.join(ROOT, relative)
        previous = ""
        with open(path, encoding="utf-8") as handle:
            for number, line in enumerate(handle, start=1):
                stripped = line.split("/*")[0]
                context = line + previous
                for literal in LITERAL_RE.findall(stripped):
                    rgb = parse_rgb(literal)
                    if rgb is None:
                        continue

                    if rgb in APPROVED or rgb in DERIVED or rgb in NEUTRAL_EXTREMES:
                        pass
                    elif rgb in TRICOLOUR:
                        if "theme-tt" not in context and "Tiranga" not in context:
                            problems.append(
                                f"{relative}:{number}: {literal} is a Tiranga "
                                "colour outside the Tech Tiranga theme"
                            )
                        else:
                            tricolour_hits += 1
                    else:
                        problems.append(
                            f"{relative}:{number}: {literal} is not part of the "
                            "approved palette"
                        )
                if stripped.strip():
                    previous = stripped

    # The three approved values must be declared verbatim in the stylesheet.
    with open(os.path.join(ROOT, "style.css"), encoding="utf-8") as handle:
        css = handle.read().lower()
    for value, name in APPROVED.items():
        literal = "#{:02x}{:02x}{:02x}".format(*value)
        if literal not in css:
            problems.append(f"style.css does not declare the approved colour {name}")

    if problems:
        print("Palette violations:")
        for problem in problems:
            print("  " + problem)
        return 1

    print("OK: every colour resolves to the approved palette.")
    print("  teal      #2C666E")
    print("  off-white #F0EDEE")
    print("  charcoal  #111817")
    print(f"  derived shades/tints used: {len(DERIVED)}")
    print(f"  Tiranga tricolour references: {tricolour_hits}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
