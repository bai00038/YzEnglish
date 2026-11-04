function parseCookies(header = "") {
  return String(header)
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const index = part.indexOf("=");
      if (index <= 0) return result;
      const key = part.slice(0, index);
      const value = part.slice(index + 1);
      try {
        result[key] = decodeURIComponent(value);
      } catch {
        result[key] = value;
      }
      return result;
    }, {});
}

function cookie(name, value, { domain, maxAge, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "Secure", "SameSite=Lax"];
  if (httpOnly) parts.push("HttpOnly");
  if (domain) parts.push(`Domain=${domain}`);
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join("; ");
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function readJsonBody(request) {
  if (request.body == null || request.body === "") return {};
  if (typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;
  const raw = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : String(request.body);
  if (Buffer.byteLength(raw, "utf8") > 8192) throw new Error("body_too_large");
  return JSON.parse(raw);
}

module.exports = { cookie, json, parseCookies, readJsonBody };
