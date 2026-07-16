# Bedside — Change Document · July 13, 2026

**Branch:** `redesign/monochrome-ui`  **Base commit:** `2275fa8`
Regenerated from the actual working-tree diff (`git diff --stat` / `git status` against `2275fa8`).

This batch turns the Fast-Log flow into a save-time escalation model, adds a real
notification center (inbox) with a nurse-owned resolution lifecycle, cleans up how the
Timeline reads and presents logs, and corrects the roster source of truth. Every UI claim
below is backed by a preview screenshot captured against the running dev server (mobile
390×844, `deviceScaleFactor: 2`). Behavior/data-only changes are called out explicitly as
having no screen.

---

## 1. Fast-Log / escalation flow — `LogShift.jsx`

**Escalation now fires on _save_, not on flag-pick.** Previously, choosing "Needs attention"
immediately ran the `EscalationFlow` (paging with a placeholder quote). Now picking the red
flag only surfaces a **passive emergency notice** plus the line _"The on-call nurse will be
notified when you save this entry."_ The actual page fires from `NotesSection.save`, carrying
the entry's real summary instead of a placeholder.

- **`EmergencyNotice`** (new): a white card (red used only as an accent — warning icon + thin
  border, per the monochrome system) that makes clear notifying the nurse is _not_ the same as
  immediate help. The hospice-correct first call — the **on-call nurse line** — is one tap
  away; **911 is present but secondary**, framed as the care plan's own emergency guidance
  (most patients here are on a comfort-care/DNR plan a 911 response can override).
- **Write-in status ("Other…")**: the Status list gains a final write-in row that reveals an
  inline text field (capped at 40 chars so the Timeline's "Currently: … in …" line stays on one
  row). A custom value tracks "custom or explicitly opened" locally rather than `value === opt`.
- **AI stays advisory.** The caregiver's flag is authoritative. When the AI reads the note more
  urgently than the chosen flag, an advisory card ("Bedside AI suggests …") offers its read with
  reasoning — accept or keep your own. Escalation follows the flag the caregiver **kept**, never
  the AI's read.
- **New fields stamped on save:** `escalatedAt` / `escalatedTo` (a human-kept red that paged the
  nurse), and — when the AI inferred red but the caregiver saved it lower — `aiUrgency`,
  `keptUrgency`, `aiUrgencyReason` (a passive disagreement, awareness not an alarm).

![Emergency notice + escalate-on-submit](screenshots/log-needs-attention.png)
_Picking "Needs attention" surfaces the passive emergency notice and the "notified when you
save" line — no page is sent yet._

![Write-in status](screenshots/log-other-status.png)
_Status → "Other…" reveals the inline custom-status field._

![AI stays advisory](screenshots/log-ai-suggestion.png)
_A note that reads more urgent than the kept flag surfaces the "Bedside AI suggests 'Needs
attention'" advisory card — "You flagged this 'Routine,' and that's what gets saved."_

_(The disagreement side of this — AI red, caregiver kept lower — shows on the Timeline as the
amber "flagged for review" badge; see Section 3.)_

---

## 2. Notification center + digest — `Notifications.jsx`, `VisitDigestModal.jsx`, `OnDutyHeader.jsx`, `App.jsx`

**New inbox** (`Notifications.jsx`, route `/inbox` in `App.jsx`) aggregates the two actionable
kinds of log entry: **escalations** (human-confirmed red that paged the nurse) and
**disagreements** (Bedside read red, caregiver logged lower). It is role-gated to nurse/family
(`canSeeMeds`); other roles see an access-limited placeholder.

- **`HouseholdContext`** gains `buildNotifications(logs, stateMap)` plus in-memory
  `notificationState` and the transitions `acknowledgeNotification` / `resolveNotification` /
  `markSeenByFamily`. Derived `notifications` and `unreadNotificationCount` are a single source
  of truth for the bell badge, the digest count, and the inbox.
- **`OnDutyHeader`**: the bell now navigates to `/inbox` and shows a role-gated **unread badge**.
- **`VisitDigestModal`**: the old "Needs you" action block is replaced by a glanceable **count
  that links to the inbox** (`onReview` → `onOpenInbox`); only genuinely-open
  (unacknowledged/unresolved) items are counted.

![Notification center](screenshots/inbox-list.png)
_The bell (unread badge "2") opens the inbox: a disagreement ("Flagged for review") and an
escalation ("Needs you · Owned by Priya Anand · on-call nurse")._

![Condensed digest](screenshots/digest-condensed.png)
_"Since your last visit" → the condensed digest: trends plus "2 items need your attention …
open inbox". (The live get-trends agent is degraded, so this shows the app's built-in offline
fallback for the trends, with the live notification count.)_

![Escalation detail — nurse](screenshots/escalation-detail-nurse.png)
_Opening the escalation as the nurse: "Owned by Priya Anand · on-call nurse" and the
Acknowledge → Resolve lifecycle entry point._

---

## 3. Timeline cleanup + presentation — `Timeline.jsx`

- **Remote-log sanitizer (display layer, remote rows only).** `sanitizeRemoteLogs` drops a
  Supabase row when it is (0) empty, (1) names a **retired alias** (`bee` / `anna`), (2) pairs a
  **calm tag with escalation prose** but has no escalation/disagreement metadata, or (3)
  **duplicates** an earlier row (same author + summary within ~5 min). Seed/in-memory logs never
  pass through here. Each drop is `console.warn`'d with id, author, urgency, a summary snippet,
  and the reason.
- **Author normalization.** `matchProfile` / `parseName` resolve an author in _any_ format
  ("Daniel V.", "Daniel Voss", "Daniel (family)") back to its profile for a photo, full name, and
  role; `cleanAuthorName` is the clean fallback for guests that match no profile. Result: every
  Timeline entry carries a photo/name/role.
- **`formatMedGiven`** now omits missing fields, so a partial record never renders the literal
  "undefined" (e.g. "morphine oral solution @ 20:20" with no dose/route/reason).
- **Presentation.** Removed the colored left rails. A resolved escalation gets a struck-through
  urgency badge + a green **"Resolved"** tag; escalations show an **"Owned by … · on-call nurse"**
  line; disagreements show a passive amber **"Bedside flagged this for review"** badge
  (nurse/primary-caregiver only); a handling note ("Reviewed by …") closes the loop.

![Timeline — nurse view](screenshots/timeline-nurse.png)
_Full timeline as Priya: author normalization (photo/name/role on every entry), the fixed
medication lines, no colored rails, and the amber "Bedside flagged this for review" disagreement
badge on the seeded Marcus (July 11) entry._

![Resolved tag on the Timeline](screenshots/timeline-resolved-tag.png)
_After resolving the seeded escalation in the inbox, the 2:04 AM entry carries a struck-through
"Needs attention" and a green "Resolved" tag (and the bell badge drops to "1")._

---

## 4. Roster / source of truth — `mockData.js`, `assets.js`, image assets

- **Priya's initials** `P` → `PA`; her canonical full name is `Priya Anand` (contacts /
  `escalatedTo`), first-name `Priya` on the sign-in profile.
- **Photo source corrected.** `assets.js` now imports `Daniel V. Photo.webp` (was
  `David V. Photo.webp`) and `Priya A. Photo.webp` (was `Priya C. Photo.webp`).
  - Deleted: `image assets/David V. Photo.webp`, `image assets/Priya C. Photo.webp`
  - Added: `image assets/Daniel V. Photo.webp`, `image assets/Priya A. Photo.webp`
- **Log-authorship rule** documented in `mockData.js`: a log `author` may only be an active
  profile that can sign in and author (Daniel, Priya, Marcus, or a guest volunteer) — **never** a
  directory-only contact (Grace Lin, Marisol Voss, James Whitfield, Dr. Sam Okafor).
- **Seeded notification items** (both 2 days old, July 11) so the inbox, bell badge, and digest
  count are populated on a fresh load: one escalation (`log-esc-seed`, author "Lauren
  (volunteer)") and one disagreement (`log-dis-seed`, author "Marcus (volunteer)").

![Profile picker](screenshots/profile-picker.png)
_The "Who's logging in?" roster (app root, before sign-in): Ellie, Daniel Voss, Priya (Nurse),
Marcus, and a Guest Volunteer — each with the corrected photo/identity._

---

## What this means for the backend / data

- **New fields the frontend now stamps on log entries:** `escalatedAt`, `escalatedTo`,
  `aiUrgency`, `keptUrgency`, `aiUrgencyReason`. These are additive and optional — present only on
  escalations (the first two) and disagreements (the last three).
- **Client-side `log_entry` sanitizer + author normalization** run in the display layer on remote
  rows. Two asks for whatever generates/persists rows:
  1. **Keep `logged_by` to roster names** (active, sign-in-able profiles — never directory-only
     contacts or retired aliases), so author normalization resolves to a real photo/name/role.
  2. **Include `dose` / `route` / `reason` on medications**, so `formatMedGiven` renders a
     complete line instead of omitting fields.
- **Resolution state is in-memory only** (`notificationState`) — acknowledge/resolve/family-seen
  reset on reload, matching the app's existing mock approach (the logs themselves reset too).
- **No schema / contract-shape changes.** Everything above rides on the existing log / `ai_response`
  shape (optional extra keys) plus a display-layer sanitizer; nothing renames or removes an
  existing field.

---

## Recently added — nurse ownership + role-gated resolution

Ownership of a needs-attention flag is always explicit — **"Owned by Priya · on-call nurse"** —
and clinical closure is nurse-only:

- **Nurse:** full lifecycle — **Acknowledge → Resolve** (resolve requires a handling note),
  plus a "Review and respond" action that greys out once resolved.
- **Family:** **acknowledge-only** — an "Acknowledge — seen by family" action that records
  awareness _without_ touching the clinical status, plus "Call the nurse line". No Resolve.

![Escalation detail — family](screenshots/escalation-detail-family.png)
_The same escalation opened as Daniel Voss (family): same "Owned by Priya Anand · on-call nurse"
label, an "Acknowledge — seen by family" action, and no Resolve control._

_(The nurse-side owner label + Acknowledge → Resolve lifecycle is in Section 2's
`escalation-detail-nurse` shot.)_

---

## Not screenshotted (behavior / data-only)

These have no dedicated screen and are intentionally not forced into one:

- **Timeline legacy-log sanitizer** — a data-cleanup pass over remote rows; its effect is the
  clean timeline above, and it announces each drop via `console.warn`. Captured live during this
  run, e.g.:
  - `[Timeline] dropped remote log { author: "Renee O.", urgency: "yellow", reason: "retired-name reference" }`
  - `[Timeline] dropped remote log { author: "Daniel Voss", urgency: "red", summary: "Priya returned around 8:15pm and observed Bee's breathing…", reason: "retired-name reference" }`
  - `[Timeline] dropped remote log { author: "Priya", urgency: "yellow", summary: "Ellie fell while getting out of bed…", reason: "incoherent severity: calm tag over escalation prose" }`
- **Log-authorship roster rules / directory-only contacts** — a data rule (documented in
  `mockData.js`), enforced when generating rows; no screen.
- **The new stamped log fields** (`escalatedAt`, `escalatedTo`, `aiUrgency`, `keptUrgency`,
  `aiUrgencyReason`) — data, surfaced indirectly through the escalation/disagreement UI above.

---

## Files changed (`git diff --stat` vs `2275fa8`)

```
 web/src/App.jsx                          |   2 +
 web/src/assets.js                        |   4 +-
 web/src/components/OnDutyHeader.jsx      |  22 ++-
 web/src/components/VisitDigestModal.jsx  |  41 +++---
 web/src/image assets/David V. Photo.webp | Bin 115506 -> 0 bytes   (deleted)
 web/src/image assets/Priya C. Photo.webp | Bin 103102 -> 0 bytes   (deleted)
 web/src/mockData.js                      |  45 +++++-
 web/src/screens/LogShift.jsx             | 216 ++++++++++++++++++++++-----
 web/src/screens/Timeline.jsx             | 242 +++++++++++++++++++++++++++----
 web/src/state/HouseholdContext.jsx       |  76 ++++++++++
 10 files changed, 561 insertions(+), 87 deletions(-)
```

Untracked (new) files from the same work:

```
 web/src/screens/Notifications.jsx            (new inbox screen)
 web/src/image assets/Daniel V. Photo.webp    (added)
 web/src/image assets/Priya A. Photo.webp     (added)
```
