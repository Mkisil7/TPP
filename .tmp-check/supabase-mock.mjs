// Minimal mock of the Supabase endpoints the auth flow touches (incl. MFA),
// so the full UI flow can run locally. TOTP verification is real RFC 6238.
import http from "http";
import crypto from "crypto";
import { b32encode, totp } from "./totp-util.mjs";

const users = new Map(); // email -> {id, email, password, factors: []}
const tables = { trusted_devices: [], login_codes: [], jobs: [] };

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const makeJwt = (user) =>
  `${b64u({ alg: "none", typ: "JWT" })}.${b64u({
    sub: user.id,
    role: "authenticated",
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 86400,
  })}.${b64u({ sig: "mock" })}`;

const sessionFor = (user) => ({
  access_token: makeJwt(user),
  token_type: "bearer",
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: crypto.randomUUID(),
  user: userJson(user),
});
const factorJson = (f) => ({
  id: f.id,
  friendly_name: f.friendly_name,
  factor_type: "totp",
  status: f.status,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
const userJson = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  factors: u.factors.map(factorJson),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const userFromAuth = (req) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    for (const u of users.values()) if (u.id === payload.sub) return u;
  } catch {}
  return null;
};

const parseFilters = (url) => {
  const filters = {};
  for (const [k, v] of url.searchParams) {
    const m = v.match(/^eq\.(.*)$/);
    if (k !== "select" && m) filters[k] = m[1];
  }
  return filters;
};
const matches = (row, f) => Object.entries(f).every(([k, v]) => String(row[k]) === v);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let body = "";
  for await (const chunk of req) body += chunk;
  const json = body ? JSON.parse(body) : null;
  const send = (status, data) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(data === undefined ? "" : JSON.stringify(data));
  };

  // ---- GoTrue core ----
  if (req.method === "POST" && url.pathname === "/auth/v1/signup") {
    const user = { id: crypto.randomUUID(), email: json.email, password: json.password, factors: [] };
    users.set(json.email, user);
    return send(200, sessionFor(user));
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    const user = users.get(json.email);
    if (!user || user.password !== json.password)
      return send(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
    return send(200, sessionFor(user));
  }
  if (req.method === "GET" && url.pathname === "/auth/v1/user") {
    const user = userFromAuth(req);
    if (!user) return send(401, { message: "invalid token" });
    return send(200, userJson(user));
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
    res.writeHead(204);
    return res.end();
  }

  // ---- GoTrue MFA ----
  if (req.method === "POST" && url.pathname === "/auth/v1/factors") {
    const user = userFromAuth(req);
    if (!user) return send(401, { message: "invalid token" });
    const secret = b32encode(crypto.randomBytes(20));
    const factor = {
      id: crypto.randomUUID(),
      friendly_name: json.friendly_name || "totp",
      status: "unverified",
      secret,
    };
    user.factors.push(factor);
    const uri = `otpauth://totp/mock:${encodeURIComponent(user.email)}?secret=${secret}&issuer=mock`;
    return send(200, {
      id: factor.id,
      type: "totp",
      friendly_name: factor.friendly_name,
      totp: {
        qr_code:
          "data:image/svg+xml;utf-8," +
          encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#dde5f5"/></svg>'),
        secret,
        uri,
      },
    });
  }
  const mfaMatch = url.pathname.match(/^\/auth\/v1\/factors\/([0-9a-f-]+)(\/challenge|\/verify)?$/);
  if (mfaMatch) {
    const user = userFromAuth(req);
    if (!user) return send(401, { message: "invalid token" });
    const factor = user.factors.find((f) => f.id === mfaMatch[1]);
    if (!factor) return send(404, { message: "factor not found" });
    if (req.method === "POST" && mfaMatch[2] === "/challenge") {
      return send(200, { id: crypto.randomUUID(), type: "totp", expires_at: Math.floor(Date.now() / 1000) + 300 });
    }
    if (req.method === "POST" && mfaMatch[2] === "/verify") {
      const ok = [0, -1, 1].some((w) => totp(factor.secret, w) === json.code);
      if (!ok) return send(422, { message: "Invalid TOTP code entered", error_description: "Invalid TOTP code entered" });
      factor.status = "verified";
      return send(200, sessionFor(user));
    }
    if (req.method === "DELETE") {
      user.factors = user.factors.filter((f) => f.id !== factor.id);
      return send(200, { id: factor.id });
    }
  }

  // ---- PostgREST ----
  const restMatch = url.pathname.match(/^\/rest\/v1\/(trusted_devices|login_codes|jobs)$/);
  if (restMatch) {
    const table = tables[restMatch[1]];
    const filters = parseFilters(url);
    const wantsObject = (req.headers.accept || "").includes("pgrst.object");
    if (req.method === "GET") {
      const rows = table.filter((r) => matches(r, filters));
      if (wantsObject) {
        if (rows.length === 1) return send(200, rows[0]);
        return send(406, { code: "PGRST116", message: `${rows.length} rows`, details: null, hint: null });
      }
      return send(200, rows);
    }
    if (req.method === "POST") {
      const rows = Array.isArray(json) ? json : [json];
      const prefer = req.headers.prefer || "";
      for (const row of rows) {
        if (prefer.includes("merge-duplicates")) {
          const i = table.findIndex((r) => r.user_id === row.user_id);
          if (i >= 0) {
            table[i] = { ...table[i], ...row };
            continue;
          }
        }
        table.push(row);
      }
      return send(201, undefined);
    }
    if (req.method === "PATCH") {
      for (const r of table) if (matches(r, filters)) Object.assign(r, json);
      res.writeHead(204);
      return res.end();
    }
    if (req.method === "DELETE") {
      for (let i = table.length - 1; i >= 0; i--) if (matches(table[i], filters)) table.splice(i, 1);
      res.writeHead(204);
      return res.end();
    }
  }

  send(404, { error: `unhandled ${req.method} ${url.pathname}` });
});

server.listen(54321, () => console.log("supabase mock (with MFA) on :54321"));
