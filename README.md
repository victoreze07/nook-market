# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Docker microservices

The repository includes a first-stage container architecture alongside the
existing Sites deployment:

- `storefront` — the current Nook Market web experience on port `3000`
- `gateway` — the public backend entry point on port `8080`
- `catalog` — product reads on port `4001`
- `cart` — cart operations on port `4002`
- `orders` — order creation and lookup on port `4003`
- `postgres` — durable database infrastructure
- `redis` — cache and short-lived cart infrastructure

Copy `.env.example` to `.env`, change the database password, and start the
stack:

```bash
docker compose up --build
```

Useful endpoints:

```text
GET  http://localhost:8080/health
GET  http://localhost:8080/api/catalog/products
GET  http://localhost:8080/api/catalog/products/iphone-15-pro
GET  http://localhost:8080/api/carts/demo-cart
POST http://localhost:8080/api/carts/demo-cart/items
POST http://localhost:8080/api/orders
GET  http://localhost:8080/api/orders/{orderId}
```

Example requests:

```bash
curl -X POST http://localhost:8080/api/carts/demo-cart/items \
  -H "content-type: application/json" \
  -d '{"productId":"iphone-15-pro","quantity":1}'

curl -X POST http://localhost:8080/api/orders \
  -H "content-type: application/json" \
  -d '{"customerId":"demo-user","items":[{"productId":"iphone-15-pro","quantity":1}]}'
```

The service APIs currently use in-memory repositories so the boundaries can be
run and tested immediately. PostgreSQL and Redis are provisioned in Compose for
the next implementation step: replacing those repositories with durable
adapters, migrations, idempotency, and transactional checkout. Payments and
authentication are intentionally not mocked as production-ready features.
