"""Static verification for the Code Crypt site.

Checks that every local asset referenced by the HTML exists, that no inline
handlers / inline styles / third-party origins remain, that no personal phone
numbers survive, and that every Font Awesome class used is present in the
vendored subset.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

PAGES = ["index.html", "codecraze.html", "epl.html", "TT.html"]
problems = []
notes = []


def fail(msg):
    problems.append(msg)


def ok(msg):
    notes.append(msg)


# --------------------------------------------------------------------------
# 1. Local asset references resolve
# --------------------------------------------------------------------------
for page in PAGES:
    raw = open(page, encoding="utf-8").read()
    # HTML comments hold example markup that is not actually referenced.
    html = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    for attr, ref in re.findall(r'(src|href)="([^"]+)"', html):
        if ref.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:")):
            continue
        if attr == "href" and not ref.lower().endswith((".css", ".js", ".png", ".svg", ".jpg", ".jpeg", ".ico")):
            continue
        target = ref.split("#")[0].split("?")[0]
        if not target:
            continue
        if not os.path.exists(target):
            fail(f"{page}: missing local asset -> {ref}")

ok("all local asset references resolve")

# --------------------------------------------------------------------------
# 2. No inline event handlers, inline styles or inline scripts
# --------------------------------------------------------------------------
for page in PAGES:
    html = open(page, encoding="utf-8").read()
    for m in re.finditer(r'\son[a-z]+\s*=', html, re.I):
        fail(f"{page}: inline event handler {m.group(0).strip()!r}")
    if re.search(r'<style[\s>]', html, re.I):
        fail(f"{page}: inline <style> block")
    if re.search(r'<script(?![^>]*\bsrc=)[^>]*>', html, re.I):
        fail(f"{page}: inline <script> block")
    for m in re.finditer(r'\sstyle\s*=\s*"', html, re.I):
        fail(f"{page}: inline style attribute")

ok("no inline handlers, inline styles or inline scripts")

# --------------------------------------------------------------------------
# 3. No third-party origins at runtime
# --------------------------------------------------------------------------
ALLOWED_EXTERNAL = {"https://forms.gle/", "https://www.linkedin.com/", "https://www.instagram.com/"}
for page in PAGES:
    html = open(page, encoding="utf-8").read()
    for url in re.findall(r'https?://[^"\'\s)]+', html):
        if not any(url.startswith(p) for p in ALLOWED_EXTERNAL):
            fail(f"{page}: unexpected third-party origin -> {url}")

ok("no unexpected third-party origins")

# --------------------------------------------------------------------------
# 4. No personal phone numbers
# --------------------------------------------------------------------------
PHONE_PATTERNS = [
    r"tel:\+?\d{6,}",
    r"\+91[\s-]?\d{4,5}[\s-]?\d{4,5}",
    r"\b[6-9]\d{4}[\s-]?\d{5}\b",
]
for path in PAGES + ["script.js", "style.css"]:
    text = open(path, encoding="utf-8").read()
    for pat in PHONE_PATTERNS:
        for m in re.finditer(pat, text):
            fail(f"{path}: phone-number-like string -> {m.group(0)!r}")

ok("no phone numbers in source")

# --------------------------------------------------------------------------
# 5. Font Awesome icons used are present in the vendored subset
# --------------------------------------------------------------------------
fa_css = open("assets/vendor/font-awesome/fontawesome.css", encoding="utf-8").read()
fa_available = set(re.findall(r"\.fa-([a-z0-9-]+):before", fa_css))
used = set()
for page in PAGES:
    html = re.sub(r"<!--.*?-->", "", open(page, encoding="utf-8").read(), flags=re.S)
    for cls in re.findall(r'class="([^"]*\bfa-[^"]*)"', html):
        for c in cls.split():
            if c.startswith("fa-") and c not in ("fa-solid", "fa-brands", "fa-regular"):
                used.add(c[3:])
missing = sorted(used - fa_available)
if missing:
    fail(f"icons missing from vendored Font Awesome subset: {missing}")
else:
    ok(f"all {len(used)} Font Awesome icons used are in the vendored subset")

# --------------------------------------------------------------------------
# 6. Gallery slots preserved (8 placeholders)
# --------------------------------------------------------------------------
html = re.sub(r"<!--.*?-->", "", open("index.html", encoding="utf-8").read(), flags=re.S)
slots = len(re.findall(r'<div class="polaroid(?:[ "])', html))
if slots != 8:
    fail(f"expected 8 gallery slots, found {slots}")
else:
    ok("8 gallery slots preserved")

# --------------------------------------------------------------------------
# 7. CSP present on every page
# --------------------------------------------------------------------------
for page in PAGES:
    html = open(page, encoding="utf-8").read()
    if 'http-equiv="Content-Security-Policy"' not in html:
        fail(f"{page}: no CSP meta tag")
    if "unsafe-inline" in html or "unsafe-eval" in html or "*;" in html:
        fail(f"{page}: unsafe CSP directive present")
ok("CSP meta tag present and strict on every page")

# --------------------------------------------------------------------------
# 8. Accessibility basics
# --------------------------------------------------------------------------
for page in PAGES:
    html = open(page, encoding="utf-8").read()
    if "<html" not in html or 'lang="en"' not in html:
        fail(f"{page}: missing lang attribute")
    if "<noscript>" not in html:
        fail(f"{page}: missing <noscript> fallback")
    if "skip-link" not in html:
        fail(f"{page}: missing skip link")
    for m in re.finditer(r'<img(?![^>]*\balt=)[^>]*>', html):
        fail(f"{page}: <img> without alt attribute -> {m.group(0)[:70]}")
    if 'target="_blank"' in html and 'rel="noopener noreferrer"' not in html:
        fail(f"{page}: target=_blank without rel=noopener")

ok("skip links, noscript, lang, alt text and rel=noopener present")

# --------------------------------------------------------------------------
# 9. Team data preserved
# --------------------------------------------------------------------------
EXPECTED_TEAM = [
    "Dr. P.R. Anisha", "Ms. Hafsa Ihteshamuddin Ahmed", "Mudradi Pranavi",
    "Shreeja Kadarla", "Lalitya T", "Azra Jabeen", "Safa Fatima", "Atikha Ahmed",
    "Nitha Reddy", "Sanjana Vaddepally", "Gandhari Likhitha", "G.Rishitha Goud",
    "Mekalollu Nandika", "Vyshnavi Aluri", "Nagireddy Neha Reddy", "B.Bhumika Singh",
    "Thiruvaipati Harini", "Gangidi Sai Sree Pradyugna Reddy",
]
html = open("index.html", encoding="utf-8").read()
for name in EXPECTED_TEAM:
    if name not in html:
        fail(f"index.html: team member missing -> {name}")
ok(f"all {len(EXPECTED_TEAM)} team members preserved")

# --------------------------------------------------------------------------
# 10. Referenced member images all exist
# --------------------------------------------------------------------------
for ref in re.findall(r'<div class="dir-photo"><img src="([^"]+)"', html):
    if not os.path.exists(ref):
        fail(f"index.html: member photo missing -> {ref}")
ok("all member photos resolve on disk")

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------
print("PASS:")
for n in notes:
    print("  +", n)
if problems:
    print("\nFAIL:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("\nAll checks passed.")
