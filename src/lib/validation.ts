import { HttpError } from "./http";

export function text(value: unknown, field: string, max = 255, required = true): string {
  if ((value === undefined || value === null) && !required) return "";
  if (typeof value !== "string" || (required && !value.trim()) || value.length > max) throw new HttpError(400, `${field} must be ${required ? "nonempty text" : "text"} of at most ${max} characters.`);
  return value.trim();
}

export function uuid(value: unknown, field = "id"): string {
  const id = text(value, field, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, `${field} must be a UUID.`);
  return id;
}

export function email(value: unknown): string {
  const result = text(value, "Email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, "Enter a valid email address.");
  return result;
}

export function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || Buffer.byteLength(value, "utf8") > 72) throw new HttpError(400, "Password must contain at least 12 characters and at most 72 UTF-8 bytes.");
  return value;
}

export function url(value: unknown, field: string): string {
  const result = text(value, field, 2048, false);
  if (!result) return "";
  try { const parsed = new URL(result); if (["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password) return result; }
  catch { throw new HttpError(400, `${field} must be an HTTP or HTTPS URL.`); }
  throw new HttpError(400, `${field} must be an HTTP or HTTPS URL without credentials.`);
}

export function strings(value: unknown, field: string, maxItems = 30, maxLength = 255): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new HttpError(400, `${field} must be a list of at most ${maxItems} items.`);
  return [...new Set(value.map(item => text(item, field, maxLength)))];
}

export function date(value: unknown, field: string, required = false): Date | null {
  if (!value && !required) return null;
  const result = text(value, field, 40);
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) throw new HttpError(400, `${field} must be an ISO 8601 timestamp with timezone.`);
  return new Date(result);
}
