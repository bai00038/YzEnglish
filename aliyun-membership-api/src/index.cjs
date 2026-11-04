const { createRuntime } = require("./runtime.cjs");

let runtime;

function headersFromEvent(event) {
  const headers = {};
  for (const [key, value] of Object.entries(event.headers ?? {})) headers[key.toLowerCase()] = value;
  return headers;
}

function parseEvent(raw) {
  let event = raw;
  if (Buffer.isBuffer(event)) event = event.toString("utf8");
  if (typeof event === "string") {
    try {
      event = JSON.parse(event);
    } catch {
      event = {};
    }
  }
  const headers = headersFromEvent(event ?? {});
  return {
    method: event.httpMethod ?? event.requestContext?.http?.method ?? "GET",
    path: event.path ?? event.rawPath ?? event.requestContext?.http?.path ?? "/",
    headers,
    body: event.isBase64Encoded && typeof event.body === "string"
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body,
    ip: headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? event.requestContext?.http?.sourceIp ?? "unknown",
  };
}

exports.handler = async function handler(event, context, callback) {
  try {
    runtime ??= createRuntime(process.env);
    const response = await runtime.app(parseEvent(event));
    const cookies = response.headers["Set-Cookie"];
    const headers = { ...response.headers };
    delete headers["Set-Cookie"];
    const result = {
      statusCode: response.statusCode,
      headers,
      ...(Array.isArray(cookies) ? { multiValueHeaders: { "Set-Cookie": cookies } } : {}),
      isBase64Encoded: false,
      body: response.body,
    };
    if (callback) return callback(null, result);
    return result;
  } catch (error) {
    console.error("membership_api_error", { name: error?.name, message: error?.message });
    const result = {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: "internal_error" }),
    };
    if (callback) return callback(null, result);
    return result;
  }
};
