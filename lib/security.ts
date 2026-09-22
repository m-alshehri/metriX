export function safeNext(value: string | null, fallback = "/en/dashboard") {
  if (!value || !/^\/(ar|en)(\/|$)/.test(value) || /[\\\r\n]/.test(value))
    return fallback;
  const url = new URL(value, "https://metrix.invalid");
  return url.origin === "https://metrix.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : fallback;
}

export function appOrigin() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL is required");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid APP_URL");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("APP_URL must use HTTPS");
  return url.origin;
}

export function safePublicUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
}
