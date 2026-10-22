# Git history cleanup — plan only, **NOT executed**

The four personal phone numbers that were published on the site have been
removed from the current working tree. They are still present in the Git
history of the public repository. This document describes how to purge them
**if and only if** the club approves it.

> **Nothing in this document has been run.** No history rewrite, no force
> push, no deletion of any remote branch has been performed.

---

## 1. What is in the history

Measured with `git grep` across all 46 commits on `main`:

| Phone number | Commits containing it | First commit |
| --- | --- | --- |
| `7780794860` | 1 | `9eeeda8` (current HEAD) |
| `7207111030` | 1 | `9eeeda8` (current HEAD) |
| `9440053613` | 34 | `d6c3fd8` |
| `9032973204` | 34 | `d6c3fd8` |

They live in `TT.html` and `epl.html`.

## 2. What a history rewrite can and cannot do

**Can do:**

- Remove the numbers from every commit in the rewritten history.
- Make the rewritten commits the ones GitHub serves to visitors.
- Break the link between a person's phone number and their name.

**Cannot do:**

- Erase the numbers from **existing clones** of the repository (forks,
  mirrors, a colleague's laptop, a CI cache).
- Remove them from **GitHub's fork network** — forks of a public repository
  keep pointing at the original commit objects, and GitHub retains unreachable
  objects for a while.
- Remove copies that were already **downloaded, screenshotted, cached by a
  search engine, or archived** by the Wayback Machine / archive.today.
- Undo the fact that the numbers were public since 24 April 2026.

The realistic goal is: **make the published history clean, then treat the
numbers as "already exposed" and ask the four people whether they want them
changed.** Changing the exposed phone numbers is the part that actually
protects the people involved; the rewrite is hygiene.

## 3. Prerequisites

- [ ] Club approval (an explicit "yes" to rewriting history).
- [ ] `git-filter-repo` installed. It is **not** currently available in this
      environment.

  ```powershell
  python -m pip install --user git-filter-repo
      # then make sure the user scripts bin dir is on PATH, e.g.
      $env:Path += ";$(python -c "import site; print(site.USER_BASE)")\Scripts"
      git filter-repo --version     # expect: git-filter-repo 2.x.x
      ```

  Alternative without installing anything: `git-filter-branch` is bundled with
  Git but is slow and discouraged. `bfg` is a third-party Java tool. Both are
  acceptable, `git filter-repo` is preferred.

## 4. Back up first — mandatory

```powershell
# 1. Full clone backup of the current state, including all refs.
git clone --mirror https://github.com/codecrypt-hue/codecrypt-hue.github.io.git C:\backups\codecrypt-mirror.git

# 2. Or, a plain bundle of everything reachable:
git bundle create C:\backups\codecrypt-all.bundle --all

# 3. Record the current commit id so the rewrite can be rolled back:
git rev-parse HEAD        # 9eeeda8...
```

Keep at least one of these off the machine and off any cloud sync folder
until the rewrite has been verified.

## 5. The rewrite (run on a clean clone, not on the live working copy)

```powershell
git clone --mirror https://github.com/codecrypt-hue/codecrypt-hue.github.io.git codecrypt-rewrite.git
cd codecrypt-rewrite.git

# Replace the phone numbers with a redaction marker in every blob of every commit.
git filter-repo --replace-text replacements.txt --force
```

`replacements.txt` (UTF-8, one rule per line):

```
literal:7780794860==>REDACTED-PHONE
literal:7207111030==>REDACTED-PHONE
literal:9440053613==>REDACTED-PHONE
literal:9032973204==>REDACTED-PHONE
```

`--replace-text` rewrites file contents in **all** commits and keeps the
commit structure, authors and dates.

## 6. Verify before pushing

```powershell
# Nothing should match any of the four numbers any more.
git rev-list --all | ForEach-Object { git grep -l -E "7780794860|7207111030|9440053613|9032973204" $_ }

# The current tree must still contain the redesigned site.
git show HEAD --stat

# The rewritten history must have the same number of commits.
git rev-list --all --count
```

Also diff the rewritten tree against the backup to confirm only the intended
lines changed:

```powershell
git --git-dir=C:\backups\codecrypt-mirror.git show 9eeeda8 > old-index.html
git show HEAD:index.html > new-index.html
Compare-Object (Get-Content old-index.html) (Get-Content new-index.html)
```

## 7. Push (only after approval)

```powershell
git push --force --mirror origin
```

This **rewrites the public history**. Anyone who cloned the repository will
get an error the next time they pull, and they will have to re-clone or run
`git fetch origin && git reset --hard origin/main`.

### Safer alternative that avoids the force push

Instead of rewriting history, **archive the repository and start a fresh one**:

1. Create a new, empty repository with the same name is not possible while the
   old one exists — so rename or delete the old repository first (this
   unpublishes the old history from GitHub's UI, but the objects may persist
   in forks and caches).
2. Push the single clean commit from the current working tree.

The trade-off: the old commit SHAs remain resolvable in forks, but GitHub's
"Commits" view for the main repository becomes clean immediately.

## 8. Recommended, lowest-risk first step

Do **none** of the above until the club has agreed. The numbers have already
been public for months; the exposure window is what it is. In the meantime:

1. Remove the numbers from the live site (done in this branch).
2. Ask the four people whether they want their public numbers replaced with
   something else (e.g. a club e-mail address). **This is the change that
   actually protects them.**
3. Decide on the history rewrite afterwards, once the current numbers are
   already known to be stale.

---

## Related, still-open items

- Making the repository **private** does not unpublish
  `https://codecrypt-hue.github.io/` — GitHub Pages for a free public
  repository is served from the `main`/`master` branch and remains public
  even if the source repository is later made private, unless Pages is
  switched off.
- The `codecrypt-hue.github.io` GitHub Pages site cannot be pointed at a
  different host. Moving to Cloudflare Pages / Netlify / Vercel means the
  Pages site must be disabled (or the repository renamed) so the same
  `codecrypt-hue.github.io` URL is not served twice.
