# Mark, the Name Maker

Mark is an AI agent that invents creative, brandable business names — playful
coinages (Google, Grok), affixed forms (Shopify, Smartify), repurposed real
words (Amazon, Meta, Grab), portmanteaus (Netflix), and classical roots (Volvo)
— then checks each idea's **domain availability and price** for the TLDs you
care about, in real time.

Built with **Next.js (App Router) + TypeScript + Tailwind**, with a dark / LED
neon theme. Both the AI model and the domain checker are **swappable via env
config** behind small interfaces.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill in keys (see below)
npm run dev                     # http://localhost:3000
```

Out of the box it's configured for **Claude** (names) + **RDAP** (free
availability checks). With no keys at all you can still explore the UI by
setting `DOMAIN_PROVIDER=mock` and using the mock data — though name generation
needs a real AI key.

---

## How it works

```
Browser (dark/LED UI)
  └─ POST /api/generate → LLM provider  → ~10 NameIdea[]   (names appear instantly)
  └─ POST /api/check    → Domain provider → DomainResult[]  (pills fill in after)
```

- `app/api/*` — server-only route handlers; **API keys never reach the client**.
- `lib/llm/*` — `NameGenerator` interface + Claude / OpenAI / Gemini adapters + the per-mode prompts.
- `lib/domains/*` — `DomainChecker` interface + RDAP / Namecheap / Mock adapters.
- `components/*`, `app/page.tsx` — the UI and the two-phase flow.

### Saving names

Tap the **★** on any result to keep it. Saved names (with their domain
availability/price snapshot) live in a slide-over panel via the **Saved** button
top-right, and persist across reloads in `localStorage` — copy or remove them
anytime, or **Clear all**. No account required.

### Generation modes

1. **Playful / Invented** — coined words (Google, Grok, Zapier)
2. **Affix** — root + prefix/suffix (Shopify, Smartify, Calendly)
3. **Real Words** — repurposed everyday words (Amazon, Meta, Grab)
4. **Portmanteau** — blended words (Netflix, Pinterest)
5. **Classical Roots** — Latin/Greek/foreign roots (Volvo, Asana, Vimeo)
6. **Freeform** — describe exactly what you want

---

## Choosing the AI provider

Set `LLM_PROVIDER` to `claude`, `openai`, or `gemini`.

| Provider | Env vars | Extra install |
|----------|----------|---------------|
| `claude` (default) | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | already included (`@anthropic-ai/sdk`) |
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` | `npm i openai` |
| `gemini` | `GEMINI_API_KEY`, `GEMINI_MODEL` | `npm i @google/genai` |

The OpenAI and Gemini SDKs load lazily, so the default install stays lean — you
only install them if you switch. Model IDs default to `claude-sonnet-4-6`,
`gpt-5.5`, and `gemini-3.1-pro-preview` and are overridable via env (handy as
those last two evolve).

To add another provider, implement `NameGenerator` in `lib/llm/` and register it
in `getNameGenerator()`.

---

## Choosing the domain checker

Set `DOMAIN_PROVIDER` to `rdap`, `namecheap`, or `mock`.

- **`rdap`** (default) — free, no account. Authoritative availability via the
  RDAP system with a DNS fallback for TLDs without RDAP coverage. **Availability
  only — no pricing.**
- **`mock`** — deterministic fake data; great for offline UI work.
- **`namecheap`** — availability **and** price. See constraints below.

### Namecheap setup & constraints

Namecheap's API has real prerequisites — read these before switching:

1. **API access** must be enabled on your account, which requires one of:
   20+ domains, **or** $50+ account balance, **or** $50+ spent.
2. **IP whitelisting** — the *server's* public IPv4 must be whitelisted in your
   Namecheap API settings. A deployed app therefore needs a **static IP**.
3. **Sandbox** — develop against `sandbox.namecheap.com` for free. Set
   `NAMECHEAP_SANDBOX=true` (the default).

Then set:

```
DOMAIN_PROVIDER=namecheap
NAMECHEAP_API_USER=...
NAMECHEAP_API_KEY=...
NAMECHEAP_USERNAME=...
NAMECHEAP_CLIENT_IP=<your whitelisted server IPv4>
NAMECHEAP_SANDBOX=true
```

The adapter calls `namecheap.domains.check` (availability + premium price) and
`namecheap.users.getPricing` (regular price), parsing the XML responses. The
pricing call is best-effort: availability still returns if pricing parsing
fails.

---

## Verifying

- **UI only, no keys:** `DOMAIN_PROVIDER=mock` + any AI key → full flow with fake prices.
- **Real availability:** `ANTHROPIC_API_KEY` set + `DOMAIN_PROVIDER=rdap` → generate names; a known-taken domain (e.g. `google.com`) shows taken, a coinage shows available.
- **Swap test:** change `LLM_PROVIDER` / `DOMAIN_PROVIDER` and restart — no code change needed.
- `npm run build` should pass with clean types.

---

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the build
npm run lint     # next lint
```
