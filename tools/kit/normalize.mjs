export function normalizeText(value) {
  return value.toLowerCase().replace(/\p{P}/gu, "").replace(/\s+/g, " ").trim();
}
