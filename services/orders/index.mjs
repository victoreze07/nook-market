import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";

const port = Number(process.env.PORT ?? 4003);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY, customer_id varchar(320) NOT NULL, status varchar(40) NOT NULL,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb, total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id varchar(120) NOT NULL, quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0)
)`);
await pool.query("CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id)");
await pool.query("CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)");

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function findOrder(id) {
  const result = await pool.query(
    `SELECT o.id, o.customer_id AS "customerId", o.status, o.shipping_address AS "shippingAddress",
            o.total::float8 AS total, o.created_at AS "createdAt",
            COALESCE(json_agg(json_build_object('productId', i.product_id, 'quantity', i.quantity,
              'price', i.unit_price::float8)) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.id = $1 GROUP BY o.id`,
    [id],
  );
  return result.rows[0];
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://orders");
  if (url.pathname === "/health") {
    try {
      await pool.query("SELECT 1");
      return json(response, 200, { service: "orders", status: "ok" });
    } catch {
      return json(response, 503, { service: "orders", status: "unavailable" });
    }
  }

  if (request.method === "POST" && url.pathname === "/") {
    let client;
    try {
      const input = await readJson(request);
      if (!input.customerId || !Array.isArray(input.items) || input.items.length === 0 || input.items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
        return json(response, 400, { error: "customerId_and_valid_items_required" });
      }
      const id = randomUUID();
      const total = input.items.reduce((sum, item) => sum + Number(item.price ?? 0) * item.quantity, 0);
      client = await pool.connect();
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO orders (id, customer_id, status, shipping_address, total) VALUES ($1, $2, $3, $4, $5)",
        [id, String(input.customerId), "pending_payment", input.shippingAddress ?? {}, total],
      );
      for (const item of input.items) {
        await client.query(
          "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), id, String(item.productId), item.quantity, Number(item.price ?? 0)],
        );
      }
      await client.query("COMMIT");
      return json(response, 201, await findOrder(id));
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      console.error(error);
      return json(response, 500, { error: "order_creation_failed" });
    } finally {
      client?.release();
    }
  }

  if (request.method === "GET" && url.pathname === "/") {
    const customerId = url.searchParams.get("customerId");
    const result = await pool.query(
      `SELECT id, customer_id AS "customerId", status, total::float8 AS total, created_at AS "createdAt"
         FROM orders WHERE ($1::text IS NULL OR customer_id = $1) ORDER BY created_at DESC LIMIT 100`,
      [customerId],
    );
    return json(response, 200, { items: result.rows });
  }

  const match = url.pathname.match(/^\/([^/]+)$/);
  if (request.method === "GET" && match) {
    const order = await findOrder(match[1]);
    return order ? json(response, 200, order) : json(response, 404, { error: "order_not_found" });
  }
  json(response, 404, { error: "route_not_found" });
}).listen(port, "0.0.0.0", () => console.log(`orders listening on ${port}`));

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
