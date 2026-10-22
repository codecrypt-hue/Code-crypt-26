"""Run every verification script in this folder and summarise the result.

    python tools/verify-all.py

Each checker exits 0 on success and 1 on failure, so this script is safe to
wire into CI or a pre-deploy hook.
"""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CHECKS = [
    ("verify-site.py", "asset references, CSP, inline handlers, a11y, team data"),
    ("verify-content.py", "no original copy lost in the rewrite"),
    ("verify-images.py", "alt text, dimensions, lazy/eager loading"),
    ("verify-integrity.py", "SHA-384 hashes of the vendored third-party assets"),
    ("verify-qr.py", "the registration QR code still decodes to the live form"),
    ("verify-palette.py", "only the approved teal / off-white / charcoal colours"),
    ("verify-contrast.py", "documented colour pairs meet WCAG contrast minimums"),
]


def main():
    results = []
    for script, purpose in CHECKS:
        path = os.path.join(HERE, script)
        if not os.path.exists(path):
            results.append((script, purpose, "MISSING", ""))
            continue
        process = subprocess.run(
            [sys.executable, path], cwd=ROOT, capture_output=True, text=True
        )
        status = "PASS" if process.returncode == 0 else "FAIL"
        detail = (process.stdout or process.stderr).strip().splitlines()
        results.append((script, purpose, status, detail[-1] if detail else ""))

    width = max(len(row[0]) for row in results)
    print("=" * (width + 30))
    print("Code Crypt — verification summary")
    print("=" * (width + 30))
    for script, purpose, status, detail in results:
        print(f"  {status}  {script.ljust(width)}  {purpose}")
        if status == "FAIL":
            for line in detail.splitlines():
                print(f"          {line}")
    print("=" * (width + 30))

    failed = [row for row in results if row[2] != "PASS"]
    if failed:
        print(f"{len(failed)} check(s) FAILED")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
