# Namblo, the Name Maker

Namblo is an AI agent that invents creative, brandable business names — playful
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

### Supabase auth and persistence

Create a Supabase project, then run the migrations in `supabase/migrations/`
(`0001…` → `0004…`) in the Supabase SQL editor or through the Supabase CLI.
`0003_server_quota.sql` adds the server-side daily quota table/functions;
`0004_tiers.sql` renames the plan tiers.

Add these values to `.env.local` and to your Vercel project environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# Server-only. Enables quota enforcement; never expose to the client.
SUPABASE_SERVICE_ROLE_KEY=...
```

### Pricing tiers

Four tiers, enforced **server-side** in `app/api/generate` and counted in
`public.usage_daily`. Limits and metadata live in one place: [lib/limits.ts](lib/limits.ts).

| tier (`profiles.plan`) | name | price | names/day | platform models |
|---|---|---|---|---|
| `guest` (logged out) | Free Loader | Free | 10 | cheap default only |
| `friend` | Namblo's Friend | Free | 30 | low + medium |
| `tea` | Tea for Namblo | $4.99/mo | 100 | low + medium |
| `sugar` | Namblo's Sugar Daddy/Mommy | $49.99/mo | 500 | all (incl. premium) |

The tier is **server-authoritative** — for a logged-in user it comes from
`profiles.plan` (surfaced via `/api/quota`), not any client toggle. Guests are
tracked by an httpOnly cookie (best-effort). **Bringing your own provider API key**
bypasses both the quota and the model gating (you pay your provider). Premium
(`high`-cost) models on the *platform* key are Sugar-only, enforced in the picker
and re-checked in the generate route (403 otherwise). Without
`SUPABASE_SERVICE_ROLE_KEY`, enforcement is disabled and the app shows the tier
limit uncapped.

To grant a tier before billing exists, set the row directly:
`update public.profiles set plan = 'tea' where id = '<user-uuid>';`

### Payments (Stripe)

Billing for the Tea / Sugar tiers is wired up (`app/api/stripe/` +
[lib/stripe.ts](lib/stripe.ts)). It stays dormant until you set the env vars.
Requires `SUPABASE_SERVICE_ROLE_KEY` (the webhook writes `profiles.plan`).

**Setup:**

1. **Stripe dashboard** (test mode first): create two recurring Products/Prices —
   Tea `$4.99/mo`, Sugar `$49.99/mo`; copy their `price_...` IDs. Enable the
   **Customer Portal** (Settings → Billing → Customer portal) and allow plan
   switching between the two prices.
2. **Run migration** `supabase/migrations/0005_stripe.sql`.
3. **Env** (`.env.local` + Vercel):
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_TEA=price_...
   STRIPE_PRICE_SUGAR=price_...
   ```
4. **Webhook endpoint** → `POST /api/stripe/webhook`, subscribed to
   `checkout.session.completed`, `customer.subscription.created/updated/deleted`.
   Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (its
   printed secret is your `STRIPE_WEBHOOK_SECRET`).

**Flow:** pricing "Upgrade" (from free) → `POST /api/stripe/checkout` → Stripe
Checkout; existing subscribers' Upgrade/Downgrade and "Manage subscription" →
`POST /api/stripe/portal` → Billing Portal. The webhook is the only thing that
sets `profiles.plan`, so the tier stays server-authoritative. Test cards:
`4242 4242 4242 4242`.

The app stores account data in `public.user_name_data`: one row per authenticated
Supabase user, with `history` and `saved` as JSONB arrays. Domain availability
snapshots stay embedded in each generated/saved name, so the database does not
create one row for every checked URL/domain. Row Level Security policies restrict
each user to their own row.

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

Tap the star on any result to keep it. Guests persist history and saved names in
this browser. Signed-in users sync both collections to Supabase, and any existing
local data is merged into the account on first sign-in. Saved names include their
domain availability/price snapshot, and can be copied, removed, or cleared from
the slide-over panel.

### Manual checks

Paste comma-separated names into **Check your own names** to check availability
without AI generation. Manual checks are chunked client-side and sent directly
to `/api/check` with the Porkbun provider.

### Generation modes

1. **Playful / Invented** — coined words (Google, Grok, Zapier)
2. **Affix** — root + prefix/suffix (Shopify, Smartify, Calendly)
3. **Real Words** — repurposed everyday words (Amazon, Meta, Grab)
4. **Portmanteau** — blended words (Netflix, Pinterest)
5. **Classical Roots** — Latin/Greek/foreign roots (Volvo, Asana, Vimeo)
6. **Freeform** — describe exactly what you want

In Affix mode, add an optional name pattern to constrain the shape of results:
`pipe-` starts every name with "pipe", `-pipe` ends every name with "pipe", and
`pi-pe` keeps "pi" at the start and "pe" at the end while the AI invents the
middle.

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
