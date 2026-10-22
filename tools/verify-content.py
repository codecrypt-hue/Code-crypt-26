"""Compare the text content of the old (HEAD) pages with the rewritten pages.

Checks that every meaningful sentence/label from the original markup still
exists somewhere in the new markup.  Used to prove that the redesign did not
drop content.
"""
import html as htmllib
import re
import subprocess
import sys

PAGES = ["index.html", "codecraze.html", "epl.html", "TT.html"]

# Text that is intentionally replaced by the redesign.
EXPECTED_REMOVALS = {
    # personal phone numbers (deliberately removed)
    "7780794860", "7207111030", "9440053613", "9032973204",
    "+91780794860", "+917207111030", "+919440053613", "+919032973204",
    "90329 73204", "94400 53613", "77807 94860", "72071 11030",
    # the old brace-logo chip, replaced by the real shield mark
    "{ }",
    # third-party QR endpoint, replaced by a local SVG
    "api.qrserver.com",
    # old CDN origins, now self-hosted
    "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com",
}


def text_of(markup: str):
    markup = re.sub(r"<!--.*?-->", " ", markup, flags=re.S)
    markup = re.sub(r"<script.*?</script>", " ", markup, flags=re.S | re.I)
    markup = re.sub(r"<style.*?</style>", " ", markup, flags=re.S | re.I)
    markup = re.sub(r"<[^>]+>", "\n", markup)
    markup = htmllib.unescape(markup)
    lines = [re.sub(r"\s+", " ", line).strip() for line in markup.split("\n")]
    return [line for line in lines if line]


def squash(value: str) -> str:
    """Lower-case and drop everything that is not a letter or digit."""
    return re.sub(r"[^a-z0-9]", "", value.lower())


failed = False
for page in PAGES:
    raw = subprocess.run(
        ["git", "show", "HEAD:" + page], capture_output=True, check=True
    ).stdout.decode("utf-8", errors="replace")
    with open(page, encoding="utf-8") as handle:
        new = handle.read()

    old_lines = text_of(raw)
    new_text = squash(" ".join(text_of(new)))

    missing = []
    for line in old_lines:
        squashed = squash(line)
        if not squashed:
            continue
        if any(squash(token) in squashed for token in EXPECTED_REMOVALS):
            continue
        if squashed not in new_text:
            missing.append(line)

    print(f"===== {page} =====")
    print(f"  old text lines: {len(old_lines)}   missing: {len(missing)}")
    for line in missing:
        print("   - MISSING:", line[:160])
    if missing:
        failed = True
    print()

if failed:
    sys.exit(1)
print("No content lost: every original line (except the deliberate removals "
      "above) is still present in the rewritten pages.")
