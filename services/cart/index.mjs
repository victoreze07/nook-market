import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4002);
const carts = new Map();

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://cart");
  if (url.pathname === "/health") return json(response, 200, { service: "cart", status: "ok" });
  const cartMatch = url.pathname.match(/^\/([^/]+)$/);
  const itemsMatch = url.pathname.match(/^\/([^/]+)\/items$/);
  if (request.method === "GET" && cartMatch) {
    return json(response, 200, { id: cartMatch[1], items: carts.get(cartMatch[1]) ?? [] });
  }
  if (request.method === "POST" && itemsMatch) {
    try {
      const item = await readJson(request);
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return json(response, 400, { error: "productId_and_positive_quantity_required" });
      }
      const items = carts.get(itemsMatch[1]) ?? [];
      const existing = items.find((entry) => entry.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        items.push({ productId: item.productId, quantity: item.quantity });
      }
      carts.set(itemsMatch[1], items);
      return json(response, 201, { id: itemsMatch[1], items });
    } catch {
      return json(response, 400, { error: "invalid_json" });
    }
  }
  json(response, 404, { error: "route_not_found" });
}).listen(port, "0.0.0.0", () => console.log(`cart listening on ${port}`));
