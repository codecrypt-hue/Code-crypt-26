# Deployment guide

The site is a **pure static site** — no build step, no server, no database.
Any static host will serve it as-is.

```
index.html      codecraze.html   epl.html   TT.html
style.css       script.js        assets/js/init.js
assets/img/     assets/vendor/   *.jpeg     logo.png
```

---

## 1. Deploy to Cloudflare Pages (recommended free option)

1. Push this branch to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select `codecrypt-hue/codecrypt-hue.github.io`.
4. Build settings: **Framework preset = None**, **Build command = leave empty**,
   **Build output directory = `/`**.
5. Deploy, then in **Pages → Settings → Headers** add the rules from
   `deploy/_headers` (Cloudflare reads a `_headers` file from the output
   directory; copy it to the repository root so it is published).
6. Optionally attach the custom domain `codecrypt-hue.github.io` under
   **Pages → Custom domains** (requires the domain's DNS to point at
   Cloudflare — the `github.io` subdomain itself cannot be transferred, so
   this step is usually *not* available; see §4).

## 2. Deploy to Netlify

1. Netlify → **Add new site → Import an existing project** → pick the repo.
2. Build command: leave empty. Publish directory: `.`.
3. `deploy/_headers` is read automatically if copied to the repository root.

## 3. Deploy to Vercel

1. Vercel → **Add New Project** → import the repo.
2. Framework preset: **Other**. Build command: leave empty. Output directory: `.`.
3. Copy `deploy/vercel.json` to the repository root so the `headers` block is
   applied (Vercel also reads a `vercel.json` from the project root only).

## 4. The `codecrypt-hue.github.io` domain

GitHub Pages serves `https://codecrypt-hue.github.io/` from the repository
named `codecrypt-hue.github.io`. That subdomain **cannot be pointed at
Cloudflare, Netlify or Vercel**. If the site moves, one of these has to
happen:

| Option | Effect |
| --- | --- |
| Turn GitHub Pages off (Settings → Pages → Source: *None*) and serve the new host | `codecrypt-hue.github.io` stops resolving; the new host URL is used |
| Keep GitHub Pages as the primary and use the new host only for headers | Not possible — GitHub Pages does not let you set `frame-ancestors`, HSTS or a CSP response header |
| Stay on GitHub Pages | The `<meta>` CSP still applies; only `frame-ancestors` and `sandbox` are missing |

The `<meta>` Content-Security-Policy in every page is valid and enforced
today. The only directive that browsers ignore in a `<meta>` tag is
`frame-ancestors` (and `sandbox`), which is why `deploy/_headers` and
`deploy/vercel.json` exist.

## 5. Verify a deployment

```powershell
# 1. Every local asset resolves (no 404s).
python tools\verify-site.py

# 2. The security headers are present.
curl -sI https://<your-host>/ | Select-String -Pattern "content-security-policy|x-frame-options|strict-transport|x-content-type"

# 3. The CSP does not report violations (open the site, press F12, reload,
#    and check the Console for "Refused to ...").
```

## 6. Publishing checklist

- [ ] `git status` is clean and the branch has been reviewed.
- [ ] `python tools\verify-site.py` passes.
- [ ] The four pages open in a browser with **no console errors**.
- [ ] The Google Forms response spreadsheet is restricted (see
      `docs/GOOGLE-FORMS-PRIVACY.md`).
- [ ] `deploy/_headers` (or `deploy/vercel.json`) is copied to the publish
      root.
- [ ] The QR code still points at the live registration form
      (`python tools\verify-qr.py`).
