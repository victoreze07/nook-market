import { createServer } from "node:http";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT ?? 4004);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    name varchar(120) NOT NULL,
    email varchar(320) UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`);

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${Buffer.from(derived).toString("hex")}`;
}

async function passwordMatches(password, stored) {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://auth");
  if (url.pathname === "/health") {
    try {
      await pool.query("SELECT 1");
      return json(response, 200, { service: "auth", status: "ok" });
    } catch {
      return json(response, 503, { service: "auth", status: "unavailable" });
    }
  }

  if (request.method === "POST" && url.pathname === "/register") {
    try {
      const input = await readJson(request);
      const name = String(input.name ?? "").trim();
      const email = String(input.email ?? "").trim().toLowerCase();
      const password = String(input.password ?? "");
      if (!name || !email.includes("@") || password.length < 8) {
        return json(response, 400, { error: "valid_name_email_and_8_character_password_required" });
      }
      const result = await pool.query(
        "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, created_at",
        [randomUUID(), name, email, await hashPassword(password)],
      );
      return json(response, 201, result.rows[0]);
    } catch (error) {
      if (error.code === "23505") return json(response, 409, { error: "email_already_registered" });
      console.error(error);
      return json(response, 500, { error: "registration_failed" });
    }
  }

  if (request.method === "POST" && url.pathname === "/login") {
    try {
      const input = await readJson(request);
      const email = String(input.email ?? "").trim().toLowerCase();
      const result = await pool.query("SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
      if (!user || !(await passwordMatches(String(input.password ?? ""), user.password_hash))) {
        return json(response, 401, { error: "invalid_email_or_password" });
      }
      delete user.password_hash;
      return json(response, 200, user);
    } catch (error) {
      console.error(error);
      return json(response, 500, { error: "login_failed" });
    }
  }

  json(response, 404, { error: "route_not_found" });
}).listen(port, "0.0.0.0", () => console.log(`auth listening on ${port}`));

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
