"""Assert the documented colour pairs meet WCAG 2.1 contrast minimums.

The palette itself is enforced by verify-palette.py; this script checks that
the way the palette is used stays readable: body copy, secondary text, accent
text, links, buttons and focus rings.

    python tools/verify-contrast.py
"""

import sys

AA_NORMAL = 4.5
AA_LARGE = 3.0
UI_COMPONENT = 3.0


def _channel(value):
    value = value / 255.0
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def luminance(colour):
    colour = colour.lstrip("#")
    red, green, blue = (int(colour[i : i + 2], 16) for i in (0, 2, 4))
    return (
        0.2126 * _channel(red)
        + 0.7152 * _channel(green)
        + 0.0722 * _channel(blue)
    )


def ratio(foreground, background):
    first, second = luminance(foreground), luminance(background)
    high, low = max(first, second), min(first, second)
    return (high + 0.05) / (low + 0.05)


CHARCOAL = "#111817"
OFF_WHITE = "#F0EDEE"
TEAL = "#2C666E"

CASES = [
    ("body copy: off-white on charcoal", OFF_WHITE, CHARCOAL, AA_NORMAL),
    ("secondary copy: off-white-dim on charcoal", "#C8C5C6", CHARCOAL, AA_NORMAL),
    ("muted copy: off-white-soft on charcoal", "#9A9899", CHARCOAL, AA_NORMAL),
    ("accent text: teal-400 on charcoal", "#6A9196", CHARCOAL, AA_NORMAL),
    ("large accent headings: teal-300 on charcoal", "#8FA9AD", CHARCOAL, AA_NORMAL),
    ("links and focus rings: teal-400 on charcoal", "#6A9196", CHARCOAL, UI_COMPONENT),
    ("primary button label: off-white on teal", OFF_WHITE, TEAL, AA_NORMAL),
    ("primary button hover: charcoal on teal-400", "#0C1110", "#6A9196", AA_NORMAL),
    ("polaroid caption: charcoal on off-white", CHARCOAL, OFF_WHITE, AA_NORMAL),
    ("large display text: charcoal on teal-300", CHARCOAL, "#8FA9AD", AA_LARGE),
]


def main():
    failures = []
    print(f"{'pair':<52}{'ratio':>7}  {'min':>5}  result")
    print("-" * 78)
    for label, foreground, background, minimum in CASES:
        value = ratio(foreground, background)
        ok = value >= minimum
        print(f"{label:<52}{value:>7.2f}  {minimum:>5.1f}  {'PASS' if ok else 'FAIL'}")
        if not ok:
            failures.append(label)

    # The approved teal is intentionally never used as text on charcoal: as a
    # fill it is fine, as a text colour it would fail. Record the reason so the
    # rule is not "fixed" later by accident.
    teal_on_charcoal = ratio(TEAL, CHARCOAL)
    print()
    print(
        f"note: approved teal on charcoal is {teal_on_charcoal:.2f}:1, so it is "
        "used for fills and borders only, never for text."
    )
    if teal_on_charcoal >= AA_NORMAL:
        print("warning: the note above is now stale — teal is readable as text.")

    if failures:
        print(f"\n{len(failures)} contrast check(s) failed")
        return 1
    print("\nOK: all documented colour pairs meet their WCAG minimums.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
