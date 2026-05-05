export const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const safeJsonParse = <T>(value: string, fallback: T): T => {
  try {
    return value.trim() ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const toTextareaJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

export const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");
