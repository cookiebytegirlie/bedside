# Bedside

## Structure

- `web/` — Sydney's React/Vite frontend
- `api/` — Edge Functions + agent calls
- `shared/` — data contract source-of-truth and seed data both sides read

Secrets live in `.env` only (gitignored). `.env.example` documents the shape.

## Data contract

```
POST /summarize
  body:    { transcript: string }
  returns: { id, timestamp, summary, urgency, urgency_reason,
             medications[], mood, interventions[], flag_for_next, confidence }

POST /ask-careplan
  body:    { question: string }
  returns: { answer: string, sources: string[] }
```

Both sides code against this shape. Sydney mocks `/summarize` responses in
`/web` while the real endpoint is being built; nobody blocks anybody.

## Editing agent prompts

`shared/prompts.md` is the human source of truth for all three agent system
prompts. The Edge Functions import their compiled twin at
`supabase/functions/_shared/prompts.ts`, which is generated. After editing
`shared/prompts.md`:

```
node scripts/sync-prompts.mjs
```

Commit both files together. Do not hand-edit `_shared/prompts.ts` — the
regenerator will overwrite you.
