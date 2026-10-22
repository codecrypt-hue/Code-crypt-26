"""Verify the SHA-384 manifest for the vendored third-party assets.

`assets/vendor/INTEGRITY.txt` lists one `sha384-<hex>  <path>` line per
vendored file. This script recomputes every hash and compares it, so a
tampered or half-written vendor file is caught before deployment.

Run:  python tools/verify-integrity.py
"""

import hashlib
import os
import re
import sys

MANIFEST = os.path.join("assets", "vendor", "INTEGRITY.txt")
LINE_RE = re.compile(r"^sha384-([0-9a-f]{96})\s+(\S.*)$")


def sha384_of(path):
    digest = hashlib.sha384()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    if not os.path.exists(MANIFEST):
        print(f"FAIL: {MANIFEST} is missing")
        return 1

    problems = []
    checked = 0

    with open(MANIFEST, encoding="utf-8") as handle:
        for number, raw in enumerate(handle, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            match = LINE_RE.match(line)
            if not match:
                problems.append(f"{MANIFEST}:{number}: malformed manifest line")
                continue
            expected, path = match.group(1), match.group(2).strip()
            if not os.path.exists(path):
                problems.append(f"{path}: listed in the manifest but missing on disk")
                continue
            actual = sha384_of(path)
            checked += 1
            if actual != expected:
                problems.append(
                    f"{path}: hash mismatch\n      manifest {expected}\n      actual   {actual}"
                )

    print("=== vendored asset integrity ===")
    if problems:
        for problem in problems:
            print("  !", problem)
        return 1
    print(f"  all {checked} vendored files match their recorded SHA-384 hash")
    return 0


if __name__ == "__main__":
    sys.exit(main())
