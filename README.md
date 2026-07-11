# Bedside

A privacy-first handoff tool for hospice volunteer care.
Built for the MLH x DigitalOcean "AI for Social Good" Hackathon, San Francisco, July 10-11, 2026.

**The authoritative build spec lives in [`docs/spec.md`](docs/spec.md). Read it before writing code.**

## Structure

- `web/` - Sydney's React/Vite frontend, mobile-first
- `api/` - Michelle's Supabase Edge Functions + agent calls
- `shared/` - single source of truth: care plan, dictations, agent prompts
- `docs/` - the build spec

Secrets live in `.env` only (gitignored). `.env.example` documents the shape.

## Data contract

Both sides code against this. Sydney mocks the responses in `/web` while the
real endpoints are being built; nobody blocks anybody.

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
