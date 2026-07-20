import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4001);
const products = [
  { id: "iphone-15-pro", name: "Apple iPhone 15 Pro", category: "Electronics", price: 829.99, inventory: 8 },
  { id: "charizard-base", name: "Pokémon Base Set Charizard", category: "Collectibles", price: 310, inventory: 1 },
  { id: "new-balance-9060", name: "New Balance 9060 Sea Salt", category: "Fashion", price: 114.5, inventory: 12 },
  { id: "aeron-chair", name: "Herman Miller Aeron Chair", category: "Home & Garden", price: 599, inventory: 3 },
];

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://catalog");
  if (url.pathname === "/health") return json(response, 200, { service: "catalog", status: "ok" });
  if (request.method === "GET" && url.pathname === "/products") {
    const category = url.searchParams.get("category");
    return json(response, 200, { items: category ? products.filter((item) => item.category === category) : products });
  }
  const match = url.pathname.match(/^\/products\/([^/]+)$/);
  if (request.method === "GET" && match) {
    const product = products.find((item) => item.id === match[1]);
    return product ? json(response, 200, product) : json(response, 404, { error: "product_not_found" });
  }
  json(response, 404, { error: "route_not_found" });
}).listen(port, "0.0.0.0", () => console.log(`catalog listening on ${port}`));
