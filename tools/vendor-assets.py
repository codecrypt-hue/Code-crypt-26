"""Vendor third-party assets locally so the site has no runtime third parties.

Downloads and self-hosts:
  * Font Awesome 6.5.0 Free -> CSS subset containing only the icons this site uses
  * Google Fonts (Fraunces, Archivo, IBM Plex Mono) -> latin subsets only

Every downloaded file's SHA-384 is recorded in assets/vendor/INTEGRITY.txt so
future maintainers can verify the vendored copies against upstream.

Usage:
    python tools/vendor-assets.py
"""

import hashlib
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FA_VERSION = "6.5.0"
FA_BASE = f"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{FA_VERSION}/"

# Font Awesome 7's free tier is a renamed icon set: 17 of the 60 icons this
# site uses are absent (fa-graduation-cap, fa-heart-pulse, fa-seedling and
# fa-file-lines have no equivalent at all, the rest were renamed to different
# glyphs). The brief requires existing icons to be preserved, so we vendor
# 6.5.0 - the exact version the site already ships - so every glyph renders
# identically while removing the third-party origin.
FA_VERSION_NOTE = (
    "Font Awesome 6.5.0 (free). Vendored because the 7.x free tier renames or "
    "drops 17 of the 60 icons this site uses; 6.5.0 is the version already in use."
)

GOOGLE_CSS = (
    "https://fonts.googleapis.com/css2"
    "?family=Fraunces:opsz,wght@9..144,600..900"
    "&family=Archivo:wght@400..800"
    "&family=IBM+Plex+Mono:wght@500;600"
    "&display=swap"
)
MODERN_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# The icons actually referenced by the four HTML pages.
FA_ICONS = set(
    """
    fa-arrow-left fa-arrow-right fa-arrow-right-long fa-bolt fa-book-open fa-brain
    fa-building-columns fa-calendar-check fa-calendar-days fa-camera fa-certificate
    fa-chalkboard-user fa-check-circle fa-chevron-down fa-chevron-up fa-circle-info
    fa-clipboard-check fa-clock fa-code fa-coins fa-drafting-compass fa-envelope
    fa-file-code fa-file-lines fa-fire fa-flag fa-git-alt fa-github fa-graduation-cap
    fa-handshake fa-heart-pulse fa-image fa-instagram fa-js fa-layer-group
    fa-lightbulb fa-linkedin-in fa-location-dot fa-lock fa-medal fa-microchip
    fa-palette fa-paw fa-pen-nib fa-people-group fa-plug fa-python fa-robot
    fa-sack-dollar fa-seedling fa-shield fa-shield-halved fa-ticket
    fa-triangle-exclamation fa-trophy fa-user fa-user-graduate fa-users fa-user-tie
    fa-video
    """.split()
)

# Only the two families this site actually renders.
FA_FONT_FACES = {
    "Font Awesome 6 Brands": "fa-brands-400.woff2",
    "Font Awesome 6 Free": "fa-solid-900.woff2",
}

# Unicode ranges we keep: latin + latin-ext.
KEEP_RANGES = ("U+0000-00FF", "U+0100-02BA")


def get(url, ua=None):
    req = urllib.request.Request(url, headers={"User-Agent": ua or MODERN_UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def sha384(data):
    return "sha384-" + hashlib.sha384(data).digest().hex()


def write(rel_path, data):
    path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data)
    print(f"  wrote {rel_path}  ({len(data):,} bytes)")
    return rel_path


ICON_SELECTOR = re.compile(r"^\.fa-[a-z0-9-]+:before$")


def icon_name(selector):
    """'.fa-user:before' -> 'fa-user'"""
    return selector[1:-7]


def split_rules(css):
    """Yield (selector, body) pairs for top-level rules.

    At-rule blocks (@media, @supports, @keyframes) are yielded verbatim so
    they survive the subsetting step byte-for-byte.
    """
    out = []
    i = 0
    n = len(css)
    while i < n:
        brace = css.find("{", i)
        if brace == -1:
            break
        selector = css[i:brace].strip()
        # Find the matching close brace.
        depth = 1
        j = brace + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        body = css[brace + 1 : j - 1]
        out.append((selector, body))
        i = j
    return out


def build_font_awesome(manifest):
    print(f"Font Awesome {FA_VERSION}")
    css = get(FA_BASE + "css/all.min.css").decode("utf-8")

    rules = split_rules(css)

    # 1. Keep only the two @font-face rules we ship, woff2 only.
    kept_faces = []
    for selector, body in rules:
        if selector != "@font-face":
            continue
        for family, fname in FA_FONT_FACES.items():
            if f'font-family:"{family}"' not in body:
                continue
            if family.endswith("Brands") and "font-weight:400" not in body:
                continue
            if family.endswith("Free") and "font-weight:900" not in body:
                continue
            # Keep the woff2 only (drop the .ttf fallback). The font files sit
            # next to this stylesheet, so the URL stays relative to it.
            src = re.search(r"url\(\.\./webfonts/([^\)]+\.woff2)\)", body)
            if not src:
                continue
            new_src = f"src:url({src.group(1)}) format(\"woff2\")"
            new_body = re.sub(r"src:[^;}]*", new_src, body)
            kept_faces.append("@font-face{" + new_body + "}")
            break
    if len(kept_faces) != len(FA_FONT_FACES):
        raise SystemExit(f"FAIL: expected {len(FA_FONT_FACES)} font-face rules, got {len(kept_faces)}")

    # 2. Drop icon rules for icons this site does not use.
    kept, dropped = [], 0
    for selector, body in rules:
        if selector == "@font-face":
            continue
        if "content:" in body:
            selectors = [s.strip() for s in selector.split(",")]
            if all(ICON_SELECTOR.match(s) for s in selectors) and selectors:
                names = {icon_name(s) for s in selectors}
                if not (names & FA_ICONS):
                    dropped += 1
                    continue
        kept.append(selector + "{" + body + "}")

    css = "".join(kept_faces) + "\n" + "\n".join(kept) + "\n"
    print(f"  kept {len(FA_ICONS)} icons, dropped {dropped} unused icon rules")

    present = {"fa-" + n for n in re.findall(r"\.fa-([a-z0-9-]+):before", css)}
    missing = FA_ICONS - present
    if missing:
        raise SystemExit(f"FAIL: these icons are not in FA {FA_VERSION}: {sorted(missing)}")
    print(f"  verified all {len(FA_ICONS)} required icons present in subset")

    rel = write("assets/vendor/font-awesome/fontawesome.css", css.encode("utf-8"))
    manifest.append((rel, sha384(css.encode("utf-8"))))

    for fname in FA_FONT_FACES.values():
        data = get(FA_BASE + "webfonts/" + fname)
        rel = write(f"assets/vendor/font-awesome/{fname}", data)
        manifest.append((rel, sha384(data)))


def build_google_fonts(manifest):
    print("Google Fonts (latin + latin-ext subsets)")
    css = get(GOOGLE_CSS).decode("utf-8")

    blocks = [m.group(0) for m in
              re.finditer(r"/\*\s*([a-z0-9-]+)\s*\*/\s*@font-face\s*\{[^}]*\}", css)]
    if not blocks:
        raise SystemExit("FAIL: no @font-face rules returned by Google Fonts")

    out, seen = [], set()
    for block in blocks:
        subset = re.match(r"/\*\s*([a-z0-9-]+)\s*\*/", block).group(1)
        ur = re.search(r"unicode-range:\s*([^;}]*)", block)
        if ur and not any(r in ur.group(1) for r in KEEP_RANGES):
            continue
        urls = re.findall(r"url\(\s*(https://fonts\.gstatic\.com/[^)]+)\s*\)", block)
        if not urls:
            continue
        url = urls[0]
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        weight = re.search(r"font-weight:\s*([0-9]+)", block).group(1)
        local = f"{family.lower().replace(' ', '-')}-{weight}-{subset}.woff2"
        if local in seen:
            continue
        seen.add(local)
        data = get(url)
        rel = write(f"assets/vendor/fonts/{local}", data)
        manifest.append((rel, sha384(data)))
        out.append(re.sub(r"/\*.*?\*/\s*", "", block, flags=re.S).replace(url, f"../fonts/{local}"))

    header = (
        "/* Self-hosted latin subsets of Fraunces, Archivo and IBM Plex Mono.\n"
        "   Source: https://fonts.google.com/ - SIL Open Font License 1.1\n"
        "   Regenerate with: python tools/vendor-assets.py */\n"
    )
    body = header + "\n".join(out) + "\n"
    rel = write("assets/vendor/fonts/fonts.css", body.encode("utf-8"))
    manifest.append((rel, sha384(body.encode("utf-8"))))


def main():
    manifest = []
    build_font_awesome(manifest)
    build_google_fonts(manifest)

    lines = [
        "# SHA-384 integrity hashes for vendored third-party assets.",
        "# Regenerate with: python tools/vendor-assets.py",
        "#",
        f"# {FA_VERSION_NOTE}",
        "#",
    ]
    for name, digest in sorted(manifest):
        lines.append(f"{digest}  {name}")
    write("assets/vendor/INTEGRITY.txt", ("\n".join(lines) + "\n").encode("utf-8"))
    print("done")


if __name__ == "__main__":
    main()
