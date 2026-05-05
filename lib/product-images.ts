import type { Product } from "@/lib/types";

const normalizeUrl = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  return "";
};

export const resolveProductThumbnail = (product?: Partial<Product> | null) => {
  if (!product) {
    return "";
  }

  return normalizeUrl(product.thumbnail) || normalizeUrl(product.images?.[0]?.url) || "";
};
