# Nook Market

Nook Market is an e-commerce storefront built with TypeScript and Next.js. Its
catalog, cart, and order APIs are lightweight Go services backed by PostgreSQL
and Redis.

## Stack

- TypeScript, Next.js, and React storefront
- Go catalog, cart, and order services
- PostgreSQL for products, users, and orders
- Redis for carts with a rolling 30-day expiry
- Docker Compose for local infrastructure

## Run locally

### Full stack with Docker

Copy `.env.example` to `.env`, update the database password, then run:

```bash
docker compose up --build
```

The storefront is available at `http://localhost:3000` and the API gateway at
`http://localhost:8080`.

### Storefront only

Requires Node.js 22 or later.

```bash
pnpm install
pnpm dev
```

## Services

| Service | Port | Purpose |
| --- | ---: | --- |
| Storefront | 3000 | Customer-facing web application |
| Gateway | 8080 | Public API entry point |
| Catalog | 4001 | Product reads |
| Cart | 4002 | Shopping-cart operations |
| Orders | 4003 | Order creation and lookup |
| Auth | 4004 | Local account operations |
| PostgreSQL | 5432 | Durable data storage |
| Redis | 6379 | Cart storage |

## API endpoints

```text
GET  /health
GET  /api/catalog/products
GET  /api/catalog/products/{productId}
GET  /api/carts/{cartId}
POST /api/carts/{cartId}/items
POST /api/orders
GET  /api/orders/{orderId}
```

Payments and authentication are demo implementations and require additional
security work before production use.
