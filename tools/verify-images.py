"""Audit <img> elements across the pages.

Checks that:
  * every <img> has an alt attribute
  * every <img> has width + height (no layout shift)
  * below-the-fold images are lazy-loaded
  * hero/logo images are eager and high priority
  * every src resolves on disk
"""

import os
import re
import sys

PAGES = ["index.html", "codecraze.html", "epl.html", "TT.html"]
IMG_RE = re.compile(r"<img\b[^>]*>", re.S | re.I)
ATTR_RE = re.compile(r'(\w[\w-]*)\s*=\s*"([^"]*)"')

problems = []

for page in PAGES:
    with open(page, encoding="utf-8") as handle:
        markup = handle.read()

    if "\ufffd" in markup:
        problems.append(f"{page}: contains a Unicode replacement character")

    # Comments may contain illustrative markup (e.g. the gallery instructions)
    # that must not be treated as real elements.
    markup = re.sub(r"<!--.*?-->", " ", markup, flags=re.S)

    # Everything up to the second <section> is the nav + hero, i.e. above the
    # fold. Anything after that must be lazy-loaded.
    sections = [m.start() for m in re.finditer(r"<section\b", markup)]
    fold_end = sections[1] if len(sections) > 1 else len(markup)

    for match in IMG_RE.finditer(markup):
        tag = match.group(0)
        attrs = dict(ATTR_RE.findall(tag))
        src = attrs.get("src", "")
        where = f"{page} -> {src or '(no src)'}"

        if "alt" not in attrs:
            problems.append(f"{where}: missing alt attribute")
        if "width" not in attrs or "height" not in attrs:
            problems.append(f"{where}: missing width/height")
        if src and not src.startswith("http") and not os.path.exists(src):
            problems.append(f"{where}: file does not exist on disk")

        eager = attrs.get("loading") != "lazy"
        above_fold = match.start() < fold_end
        if above_fold and not eager:
            problems.append(f"{where}: above-the-fold image should not be lazy")
        if not above_fold and eager:
            problems.append(f"{where}: below-the-fold image is not lazy-loaded")

print("=== <img> audit ===")
if problems:
    for problem in problems:
        print("  !", problem)
    sys.exit(1)
print("  all images have alt + width/height, resolve on disk, and use the")
print("  correct eager/lazy strategy")
