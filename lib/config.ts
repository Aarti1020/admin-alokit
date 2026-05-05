const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, "");

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);
const INVALID_REMOTE_IMAGE_HOSTNAMES = new Set([
  "images.alokit.local",
  "mock-cloudinary.local",
]);
const EMBEDDED_ASSET_PATH_PATTERN = /\/(assets|media)\/[^?#]+/i;
const DUPLICATE_EXTENSION_PATTERN = /(\.[a-z0-9]+)\1$/i;

const normalizeAssetPath = (value: string) =>
  value.replace(DUPLICATE_EXTENSION_PATTERN, "$1");
const MOCK_CLOUDINARY_HOSTNAMES = new Set(["mock-cloudinary.local"]);

const defaultApiBaseUrl = "https://api.alokit.co/api/v1";
const defaultBackendOrigin = "https://api.alokit.co";

const resolveApiBaseUrl = (value: string | undefined, backendOrigin: string) => {
  const normalizedValue = trimTrailingSlash(value || defaultApiBaseUrl);

  if (normalizedValue.startsWith("/backend-proxy/")) {
    return `${backendOrigin}${normalizedValue.replace("/backend-proxy", "")}`;
  }

  if (normalizedValue.startsWith("/api/")) {
    return `${backendOrigin}${normalizedValue}`;
  }

  return normalizedValue;
};

export const BACKEND_ORIGIN = trimTrailingSlash(
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || defaultBackendOrigin
);

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL,
  BACKEND_ORIGIN
);

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const buildAssetUrl = (value?: string | null) => {
  if (!value) return "";

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return "";

  if (/^https?:\/\/example\.com\//i.test(normalizedValue)) return "";
  if (normalizedValue.startsWith("data:")) return normalizedValue;

  if (normalizedValue.startsWith("/backend-proxy/")) {
    return `${BACKEND_ORIGIN}${normalizedValue
      .replace("/backend-proxy", "")
      .replace("/public", "")}`;
  }

  if (normalizedValue.startsWith("/api/")) {
    return `${BACKEND_ORIGIN}${normalizedValue}`;
  }

  if (normalizedValue.startsWith("/assets/")) {
    return `${BACKEND_ORIGIN}${normalizedValue}`;
  }

  if (normalizedValue.startsWith("/media/")) {
    return `${BACKEND_ORIGIN}${normalizeAssetPath(normalizedValue)}`;
  }

  if (normalizedValue.startsWith(`${BACKEND_ORIGIN}/assets/`)) {
    return normalizeAssetPath(normalizedValue);
  }

  if (normalizedValue.startsWith(`${BACKEND_ORIGIN}/media/`)) {
    return normalizeAssetPath(normalizedValue);
  }

  if (normalizedValue.startsWith(`${BACKEND_ORIGIN}/api/`)) {
    return normalizedValue;
  }

  try {
    const parsed = new URL(normalizedValue);

    if (INVALID_REMOTE_IMAGE_HOSTNAMES.has(parsed.hostname)) {
      return "";
    }

    if (MOCK_CLOUDINARY_HOSTNAMES.has(parsed.hostname)) {
      return `${BACKEND_ORIGIN}/assets${normalizeAssetPath(parsed.pathname)}`;
    }

    const embeddedAssetPath = parsed.pathname.match(EMBEDDED_ASSET_PATH_PATTERN)?.[0];
    if (embeddedAssetPath) {
      return `${BACKEND_ORIGIN}${normalizeAssetPath(embeddedAssetPath)}`;
    }

    if (LOCAL_HOSTNAMES.has(parsed.hostname) && parsed.pathname.startsWith("/assets/")) {
      return `${BACKEND_ORIGIN}${normalizeAssetPath(parsed.pathname)}`;
    }

    if (LOCAL_HOSTNAMES.has(parsed.hostname) && parsed.pathname.startsWith("/media/")) {
      return `${BACKEND_ORIGIN}${normalizeAssetPath(parsed.pathname)}`;
    }

    if (LOCAL_HOSTNAMES.has(parsed.hostname) && parsed.pathname.startsWith("/api/")) {
      return `${BACKEND_ORIGIN}${parsed.pathname}`;
    }

    return normalizedValue;
  } catch {
    return normalizedValue;
  }
};

export const buildDisplayImageUrl = (value?: string | null) => {
  if (!value) return "";

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return "";

  const assetUrl = buildAssetUrl(normalizedValue);
  if (assetUrl !== normalizedValue) {
    return assetUrl;
  }

  try {
    const parsed = new URL(normalizedValue);
    if (INVALID_REMOTE_IMAGE_HOSTNAMES.has(parsed.hostname)) {
      return "";
    }

    const embeddedAssetPath = parsed.pathname.match(EMBEDDED_ASSET_PATH_PATTERN)?.[0];
    if (embeddedAssetPath) {
      return `${BACKEND_ORIGIN}${normalizeAssetPath(embeddedAssetPath)}`;
    }
  } catch {
    return normalizedValue;
  }

  return normalizedValue;
};
