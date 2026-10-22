# Google Forms privacy — action required by the form owner

**Status: NOT FIXED.** The steps below have to be performed by someone with
edit access to the CodeCraze registration form. They have **not** been applied
from this repository, and this document does not claim the form is private.

---

## What is public right now

| Item | Value | State |
| --- | --- | --- |
| Form URL | <https://forms.gle/vhYko4os3o6hY12L7> | Publicly reachable |
| Response destination | A Google Sheets spreadsheet owned by a club account | Anyone with the link can view the collected responses |
| Data collected | Team name, team lead name, roll number, semester, section, **phone number**, and up to 4 team members' names + roll numbers | Contains personal data |

The form page itself does **not** currently show a "Summarize responses" link,
so responses appear to be restricted to the spreadsheet's own sharing
settings — but that was **not** verifiable without access to the form account.
Treat the responses as public until you have confirmed otherwise.

The QR code on the CodeCraze page (`assets/img/codecrypt-qr.svg`) points at
exactly this URL, so it is unchanged by this redesign.

---

## Step 1 — Restrict who can fill the form (recommended)

1. Open <https://forms.google.com> and sign in with the account that owns the
   form.
2. Open the CodeCraze form → **Settings** tab (the wrench/gear icon).
3. Tick **"Limit to 1 response"** (under *Responses*).
   - This makes the form require a signed-in Google account, which stops
     anonymous drive-by submissions.
   - It also links each response to the submitting account, so the spreadsheet
     records who filled it in.
4. Under **Responses → "Accepting responses"**, keep it **on** — public
   registration must stay open for students.
5. Optionally set **"Get email notifications for new responses"** off if the
   club does not want an inbox full of notifications; it has no privacy
   effect either way.

## Step 2 — Restrict who can see the responses

1. Still in the form editor, click the **Responses** tab → click the green
   **Link to Sheets** icon → **Create a new spreadsheet**.
   - Note the new spreadsheet's URL — this is the one that holds the data.
2. Open that spreadsheet and click **Share**.
3. Remove every person/group that should not see the raw responses.
4. **Do not** share it with "Anyone with the link". Keep sharing limited to
   the club's own Google account (and optionally the two faculty coordinators).
5. A safer pattern: let only one club member own the spreadsheet, and export
   the rows you actually need (team name + roll number) into a separate
   sheet that is shared more widely.

## Step 3 — Reduce what is collected (optional but recommended)

Phone numbers are the most sensitive field. If they are not strictly needed,
delete the **"Phone No."** question in the form editor. If they are needed for
event logistics, keep them only in the restricted spreadsheet (Step 2) and
never publish that spreadsheet.

## Step 4 — Turn off the "publish" extras

In **Settings → "Allow response editing"** leave it off. Also check
**Settings → *Presentation*** and remove any "collect email address" setting
you do not want.

## Step 5 — Verify

1. Open the form in a private/incognito window while signed out of Google.
   You should still be able to **submit** a response (registration stays
   public) but you should not be able to **view** the responses.
2. Open the response spreadsheet in an incognito window and confirm it asks
   for permission rather than showing the data.
3. Run a Google search for the form URL to confirm no indexable copy of the
   responses is exposed.

---

## If the form is edited later

Re-run `python tools/verify-qr.py` to confirm
`assets/img/codecrypt-qr.svg` still decodes to
`https://forms.gle/vhYko4os3o6hY12L7`. If the form URL ever changes, the QR
image must be regenerated with `python tools/make-qr.py` — the QR code is a
static file and will keep pointing at the old destination otherwise.
