# Bedside — Build Spec

**A privacy-first handoff tool for hospice volunteer care.**
Built for the MLH × DigitalOcean "AI for Social Good" Hackathon, San Francisco, July 10–11, 2026.

> **Status:** This is the corrected, authoritative spec. It supersedes earlier drafts.
> Earlier documents contained an incorrect DigitalOcean base URL and an outdated summarizer prompt — both are fixed here.
> Every future Claude Code session should read this file first.

---

## 1. What we're building

Bedside replaces the paper binder left at a hospice patient's bedside with a mobile-first web app.

When someone is dying at home, volunteer sitters give the primary family caregiver a few hours of respite. Continuity between shifts — what medication was given, how the patient's mood changed, what soothed them — currently lives in a handwritten notebook. It gets lost, it's illegible, and nobody can be alerted if something's wrong.

Bedside digitizes that handoff without adding friction or exposing health data. A volunteer speaks a rambling voice note; a DigitalOcean Gradient AI agent restructures it into a clean, categorized handoff with an **AI-inferred urgency flag** — and, on a red flag, decides on its own to escalate to the on-call nurse.

**One-line pitch:** Voice-to-structured-handoff already exists — for paid nurses in enterprise EMRs and paid agency aides. Bedside brings it to the people hospice actually runs on but nobody builds for: unpaid volunteers and family, with the AI inferring urgency from the note instead of asking a human to guess.

---

## 2. Why hospice specifically (the moat)

These are structural facts, not opinions — which is what makes the position defensible.

1. **Volunteers are federally mandated.** 42 CFR 418.78 requires that volunteers provide at least 5% of total patient-care hours. Hospice is the *only* Medicare benefit that legally requires unpaid, non-clinical people at the bedside. Every competitor is built for *paid* staff — they structurally cannot serve this user.
2. **The clinical/non-clinical line is legally hard.** Volunteers cannot administer medication or make clinical judgments. Certified EMRs (MatrixCare, Axxess, Homecare Homebase) therefore *cannot hold* a note like "listened to music, seemed calmer." We're not competing with the EMR — we fill a gap it's legally prohibited from filling.
3. **Continuity IS the care.** In hospice, comfort is the entire goal, and comfort depends on knowing what worked an hour ago. High-stakes information held by rotating, low-training people is exactly the gap AI structuring solves.

### Competitive position (know this cold)

| Category | Players | Why they can't follow us |
|---|---|---|
| Enterprise clinical handoff | Handoff AI, Corti, Abridge, Dragon Copilot | Built for licensed nurses behind enterprise logins |
| Paid home-care AI notes | voize, ShiftCare "Care Signals" | Built for paid agency aides |
| Nearest neighbor | **Sagebeam** | QR + voice + urgency — but paid caregivers, aging-in-place, **caregiver-picked** urgency, account-based family side, no grounded care-plan Q&A, no hospice framing |
| Pre-launch | CaregivrAI | Waitlist, account-based, general senior care; its voice creates calendar events, not a synthesized handoff |
| Red herring | Sensi.ai | Passive 24/7 audio surveillance sold to agencies — a microphone, not a person authoring a handoff |

**Do not claim novelty on the mechanic.** Voice-to-handoff ships today. Name Sagebeam yourself before a judge does. Our four defensible axes, in order:
1. Hospice + unpaid volunteer/family (structural, legal, unoccupied)
2. **AI-inferred** urgency vs. Sagebeam's human-picked urgency
3. Care-plan-grounded RAG Q&A (nobody has this)
4. ~~No-login QR~~ — *demote; Sagebeam has it too*

---

## 3. Users and access

**Two sides, four roles.**

| Role | Needs | Access |
|---|---|---|
| **Volunteer sitter** (primary user) | Orientation on arrival, fast logging, voice note | Comfort/task info only — **no clinical detail** |
| **Family caregiver** | Peace of mind during respite, who's on shift, history | Full care plan + timeline; logs against the plan |
| **RN case manager** | Receives the handoff; reviews trends | Everything; uniquely can *change* the plan |
| **Hospice aide** | Task-scoped view | Narrower than a volunteer — no medication screen at all |

**The insight worth saying out loud:** Family and RN are both *wide*; Patient and Aide are both *narrow but along opposite axes*. And every role can **log against** the plan — only the RN can **change** the plan. That log-vs-authorize distinction is the access model.

**Auth:** QR code identifies the **household**. Role + a short **PIN** identifies **who you are and what you see**. PINs are **per-role, not per-person** (one volunteer PIN, one family PIN, one nurse PIN) — no accounts, no app store. Volunteer name/alias is captured **at log time** so the timeline can still show who did what.

**Device:** **Mobile-first** (the volunteer is at a bedside with a phone). Desktop is worth designing only for the **family/admin review** screens — a family member checking in or uploading documents from home is a real desktop moment. Don't polish the Fast-Log for desktop.

---

## 4. Scope — what we BUILD vs. what we DESIGN

> Sydney's rule, and it governs everything: **if the app does too much, it gets watered down.**

### BUILD (wired, working — this is what's judged)

**Michelle — backend, agents, data**
- Agent 1: Handoff Summarizer (structured extraction + function calling)
- Agent 2: Care-Plan Q&A (RAG + refusal)
- Two Supabase Edge Functions holding the DO keys server-side
- Tables: `household`, `shift`, `log_entry`
- Swap the mock agent functions to real `fetch()` calls

**Sydney — frontend, mobile-first**
- **Volunteer arrival header:** who they're caring for, care-plan highlights, one-tap contact to family + nurse line, and **last shift's summary** so they walk in informed
- **Fast-Log:** tap status buttons, one-tap "meds given," voice-note button, seeded comfort checklist
- **Timeline:** reverse-chron, color-coded urgency, **who logged it and when**
- **Family Respite Hub:** read-only — who's on shift, care highlights, one-tap contact
- **Privacy & Security screen** — the entire compliance story, clickable
- **"Synthetic demo data" marker**

### DESIGN ONLY (static screens — for the pitch and the case study)

Not wired. These make the vision legible and are portfolio gold.
- **Family "request a shift"** flow (family creates a needed time slot → pings the hospice, who slots their own volunteer)
- **Admin calendar-history** view (nurse/coordinator sees any day's logs)
- **Patient self-logging** (framed as: the log accepts entries from whoever's at the bedside — in practice it's Fast-Log with a different alias)
- **RN dose-authorization** flow (the write-tier only the RN has)

### SAY ONLY (pitch, zero build)

Audio/video diary, PIN lockout, live audit trail, session auto-logoff, encryption/MFA, real SMS/Twilio, offline sync, full BAA compliance.

### Hard boundary: **companion app, not coordinator**

The hospice schedules its own volunteers internally (they have Volgistics/Better Impact and a volunteer database). **We own the family's *request* for help; they own the scheduling.** Do not rebuild their scheduling system — you'd lose, and it waters down the product.

---

## 5. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind (mobile-first) |
| Database | Supabase Postgres |
| Server-side key holder | Supabase Edge Functions |
| AI | **DigitalOcean Gradient AI** (serverless inference + Agent Platform + Knowledge Bases) |
| Voice input | Web Speech API (`webkitSpeechRecognition`) — browser-native, free |
| Deploy | Vercel/Netlify, or DO App Platform |

**Repo layout**
```
bedside/
  web/       ← Sydney: React frontend, all screens
  api/       ← Michelle: Edge Functions, agent calls, DB
  shared/    ← careplan.md, dictations.md, prompts.md
  docs/      ← this spec
  .env       ← NEVER committed (public repo)
```

**Ground rules:** both work on branches, `git pull --rebase` before every push, Sydney reviews/merges to `main`. Different folders = near-zero merge conflicts.

---

## 6. DigitalOcean integration — THE CORRECTED DETAILS

> ⚠️ **Earlier drafts had the wrong base URL.** These are the real values from DO's hacker guide.

### There are THREE distinct credentials. Confusing them is the #1 time-sink.

| Credential | Used for | Where |
|---|---|---|
| **Model access key** | Serverless inference (the Summarizer) | Console → Inference → Serverless Inference → Get Started → Create a Model Access Key |
| **Agent access key** | The RAG agent (Care-Plan Q&A) | Issued when you deploy the agent |
| DO OAuth token | Control-plane API (creating KBs) | Account settings |

**A 401 almost always means you used the wrong key type.**

### Agent 1 — Summarizer: serverless inference

No knowledge base. Straight chat completion.

- **Base URL:** `https://inference.do-ai.run/v1/`
- **Auth:** `Authorization: Bearer $DIGITAL_OCEAN_MODEL_ACCESS_KEY`
- **Model:** `anthropic-claude-4.6-sonnet` (or `anthropic-claude-opus-4.8` for max quality)
- **SDK:** **OpenAI SDK, pointed at the base URL.** DO's native Gradient SDK is deprecated — do not use it.

```javascript
// Supabase Edge Function: /summarize
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: Deno.env.get("DIGITAL_OCEAN_MODEL_ACCESS_KEY"),
  baseURL: "https://inference.do-ai.run/v1/",
});

const response = await client.chat.completions.create({
  model: "anthropic-claude-4.6-sonnet",
  messages: [
    { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
    { role: "user", content: rawTranscript },
  ],
  max_completion_tokens: 1024,
});
```

**Parse defensively.** Do not assume `response_format: { type: "json_object" }` works — verify it on your model. If it doesn't, the prompt already instructs JSON-only; strip markdown fences, `try/catch`, and fall back to `{ urgency: "yellow", confidence: "low" }` rather than crashing.

### Agent 2 — Care-Plan Q&A: Agent Platform + Knowledge Base

1. Create a **Knowledge Base**, upload `shared/careplan.md`.
2. Create an **Agent**, paste the A2 system prompt, **attach the Knowledge Base**.
3. Deploy it — you get an **agent endpoint** and an **agent access key**.

- **Endpoint:** `https://{your-agent-url}.agents.do-ai.run/api/v1/chat/completions?agent=true`
- **Auth:** `Authorization: Bearer $DIGITALOCEAN_AGENT_ACCESS_KEY`

> 🔴 **The `?agent=true` query param is mandatory.** Without it, the agent answers as a plain chatbot and **ignores the knowledge base entirely**. If the RAG demo looks like it's making things up, check this first.

**KB indexing takes time.** Upload the care plan early — it needs to chunk/embed/index before it's queryable.

### Environment variables

```
DIGITAL_OCEAN_MODEL_ACCESS_KEY=
DIGITALOCEAN_AGENT_ENDPOINT=
DIGITALOCEAN_AGENT_ACCESS_KEY=
```

### Other gotchas
- **CORS** on the Edge Function — set the headers or the browser preflight fails silently.
- **App Platform** listens on port **8080**, and inference exceeds the default 30s timeout — set it to 120s if you deploy a backend there.
- Install the DO skill so Claude Code knows all this: `npx skills add ajot/digitalocean-ai`

---

## 7. The agents

**2 core agents + 1 knowledge base. A 3rd agent is stretch only.**

The **router is the frontend**, not an agent. The Fast-Log screen calls Agent 1; the Q&A screen calls Agent 2. Don't build an orchestration layer.

### Agent 1 — Handoff Summarizer ⭐ (the star)
Messy dictation in → structured JSON out. Extracts summary, meds, mood, interventions (and whether they worked), plus an **AI-inferred** urgency flag with a reason and confidence.

**The technical edge — function calling.** Give it tools and let it *decide* to act:
- `notify_on_call_nurse(reason)` — fires **only** on urgency `red`
- `log_medication(name, time)` — structured med record
- `flag_care_plan_question(question)` — routes to RAG

This is the line between "we called an LLM" and "we built an agent." **Keep the tools stubbed** — they return a fake success. The agent *deciding to call them* is what scores; real SMS is not worth the time.

### Agent 2 — Care-Plan Q&A (the grounded one)
RAG over Bee's care plan. Grounded answers, and — critically — **graceful refusal** when the answer isn't in the notes, plus redirect-to-nurse for anything clinical. Plain text out. This is the anti-hallucination story.

### Agent 3 — Care-Plan Checklist Generator (STRETCH ONLY)
Care-plan prose in → personalized comfort-task checklist out. **Reuses Agent 2's existing knowledge base — no second KB.** Build **only** after Agents 1 and 2 are rock-solid and demoing. Until then, hardcode the checklist to Bee's plan and call the generated version "roadmap."

**How to describe it to a judge (accurate, not inflated):**
> "A multi-agent system: one agent does structured extraction and decides when to escalate; a second answers care questions grounded only in the household's own notes, and refuses when it doesn't know."

---

## 8. Security & compliance (closed loop — do not expand this)

**The foundation:** *We avoided the problem instead of solving it.* Zero real PHI. Everything synthetic — "Bee" at "The Bluebird House," aliases only. The hard compliance problems don't apply to the prototype.

Never claim HIPAA compliance. Claim **honest scoping**.

**BUILD:** the Privacy & Security screen + the "synthetic demo data" marker. *(Sydney's lane, parallel, doesn't touch the agents.)*

**SAY (three sentences, keep them in your pocket):**
1. "We don't store any real health information — everything's synthetic, aliases only, so we could focus the build on the AI."
2. "For production, both DigitalOcean and Supabase sign BAAs, dictation can run on-device (Chrome 139 on-device speech — audio never leaves the phone), and we'd build to the stricter 2026 HIPAA bar, where encryption and MFA move from *addressable* to *required*."
3. "Audit logs and PIN lockout are designed and roadmapped — here's the screen showing exactly what's real today versus what deployment needs."

**Enforced at the AI layer** (a great judge talking point): every agent prompt hard-codes the volunteer's legal lane — never give medical advice, never invent facts, never turn a med into a checklist item.

---

## 9. Build order (this order protects you)

1. **Credits + keys.** Redeem the $200 at the event. Create the model access key.
2. **Prove ONE call in the Model Playground — no code.** Paste the A1 prompt + dictation #3. Confirm clean JSON. *This is the gate. Nothing else matters until it passes.*
3. **Edge Function `/summarize`** → returns to the UI.
4. **End-to-end:** dictate → summary → timeline entry.
5. **Knowledge Base + Agent 2** → prove the 5 test questions in the console → Edge Function `/ask-careplan`.
6. **Function calling** on Agent 1 (the red-flag escalation).
7. *Only if solid:* Agent 3.
8. **Freeze new work with ~2 hours left.** Rehearse, record the video, write the Devpost. Submit **15 minutes early**.

**Bail order if behind:** drop Agent 3 → drop the stubbed extra tools → fight to keep RAG (it's cheap) → **never** sacrifice rehearsal time for a feature.

**Parallelism:** Sydney builds the entire UI against **mocked** responses matching the data contract, so she is never blocked on the agents. Michelle tests agents with curl/playground, never blocked on the UI. They meet at the contract.

---

## 10. Data contract

Lock this first. It's what lets both lanes build in parallel.

```
POST /summarize
  body:    { transcript: string }
  returns: {
    id, timestamp,
    summary: string,
    urgency: "green" | "yellow" | "red",
    urgency_reason: string,
    medications: [{ name, time }],
    mood: string | null,
    interventions: [{ what, worked: "yes"|"no"|"unclear" }],
    flag_for_next: string | null,
    confidence: "high" | "medium" | "low"
  }

POST /ask-careplan
  body:    { question: string }
  returns: { answer: string, sources: string[] }
```

**Data model**
- `household` — alias, created_at, care_plan_notes
- `shift` — household_id, volunteer_alias, start_time, end_time
- `log_entry` — shift_id, timestamp, type (status|med|note), raw_text, ai_summary, urgency_tag

---

## 11. The demo (this wins more than any feature)

Judging is science-fair style, **~3 minutes per team**, four criteria weighted **equally**: Technology, Design, Completion, Learning. Notably, **code quality, pitch polish, and idea quality are NOT judged**.

**The 3-minute arc:**
1. **The problem, 15 seconds.** A photo of a paper binder. Why it still wins today.
2. **The domain-expert line** *(Michelle — this is your unfair advantage, say it):* "I've spent a year researching how care coordination actually fails."
3. **The magic moment.** Dictate **dictation #3** live. Show the messy transcript, then the clean structured output, the **red flag**, and the agent **deciding on its own** to escalate to the nurse — all in one motion. *This is the whole demo. Rehearse it word-for-word.*
4. **The RAG beat.** "What calms her down?" → grounded answer. Then ask something *not* in the notes → **watch it refuse.** That single beat answers "why would a hospice trust an AI?"
5. **The Learning line** *(25% of the score, and most teams forget it's scored):* "Neither of us had touched Gradient before today — here's what we learned standing up a managed agent and a knowledge base."
6. **The honest close.** The Privacy & Security screen. What's real today vs. what production needs.

**Pre-answer the hard questions:**
- *"How is this different from Sagebeam / Lotsa Helping Hands?"* → Name them first. Paid caregivers vs. unpaid volunteers; **their urgency is human-picked, ours is inferred**; no grounded care-plan Q&A; no hospice framing.
- *"How do 80-year-old volunteers use this?"* → No app store, no password. Scan a QR, tap big buttons, dictate once.
- *"Isn't the voice note PHI?"* → It's tied to an alias, not an identity. It's a communication note, not a medical record. And on-device speech means the audio never leaves the phone.
- *"Why trust an AI summary?"* → It never makes clinical judgments; it restructures what the volunteer already said and flags urgency **for a human to act on**. Every AI entry keeps the raw note attached.

**Demo risks — mitigate now:**
- Live speech-to-text is the #1 thing that will embarrass you. Rehearse the exact phrasing, in the actual demo browser, on the venue wifi. **Have a canned fallback** (a "replay" button with fixed input).
- Show it on a **phone**, mirrored — it proves the "scan and go" premise live.
- **A live deployed URL beats a localhost demo.**
