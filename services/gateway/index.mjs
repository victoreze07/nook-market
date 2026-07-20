import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT ?? 8080);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";
const routes = [
  ["/api/catalog", process.env.CATALOG_URL ?? "http://localhost:4001"],
  ["/api/carts", process.env.CART_URL ?? "http://localhost:4002"],
  ["/api/orders", process.env.ORDERS_URL ?? "http://localhost:4003"],
  ["/api/auth", process.env.AUTH_URL ?? "http://localhost:4004"],
];

function json(response, status, payload, requestId) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-headers": "content-type,x-request-id",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "x-request-id": requestId,
  });
  response.end(JSON.stringify(payload));
}

createServer(async (request, response) => {
  const requestId = request.headers["x-request-id"] ?? randomUUID();
  if (request.method === "OPTIONS") return json(response, 204, null, requestId);
  if (request.url === "/health") return json(response, 200, { service: "gateway", status: "ok" }, requestId);

  const route = routes.find(([prefix]) => request.url?.startsWith(prefix));
  if (!route) return json(response, 404, { error: "route_not_found" }, requestId);

  const [prefix, upstream] = route;
  const suffix = request.url.slice(prefix.length) || "/";
  try {
    const body = ["GET", "HEAD"].includes(request.method ?? "GET") ? undefined : request;
    const upstreamResponse = await fetch(`${upstream}${suffix}`, {
      method: request.method,
      headers: { "content-type": request.headers["content-type"] ?? "application/json", "x-request-id": requestId },
      body,
      duplex: body ? "half" : undefined,
    });
    response.writeHead(upstreamResponse.status, {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
      "access-control-allow-origin": allowedOrigin,
      "x-request-id": requestId,
    });
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: error.message }));
    json(response, 502, { error: "upstream_unavailable" }, requestId);
  }
}).listen(port, "0.0.0.0", () => console.log(`gateway listening on ${port}`));
