import { buildApiUrl, buildAssetUrl, buildDisplayImageUrl } from "@/lib/config";
import { resolveProductThumbnail } from "@/lib/product-images";
import type {
  AdminUser,
  ApiResponse,
  AuthResponse,
  Category,
  DashboardAnalytics,
  Lead,
  Order,
  PaginatedResponse,
  Product,
  Review,
  SubCategory
} from "@/lib/types";

type ProductImageType = Product["images"][number];

const isProductImage = (image: ProductImageType | null | undefined): image is ProductImageType =>
  Boolean(image);

const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("alokit_admin_token");

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...options,
    headers
  });
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (payload && typeof payload === "object" && "errors" in payload) {
      const errors = (payload as { errors?: Array<{ field?: string; message?: string }> }).errors;
      const firstError = Array.isArray(errors) ? errors.find((error) => error?.message) : null;

      if (firstError?.message) {
        throw new Error(
          firstError.field ? `${firstError.field}: ${firstError.message}` : firstError.message
        );
      }
    }

    if (payload && typeof payload === "object" && "message" in payload) {
      throw new Error(String((payload as { message?: unknown }).message || "Request failed"));
    }

    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload.trim());
    }

    throw new Error("Request failed");
  }

  return payload as T;
}

const normalizeProductImage = (image: ProductImageType | null | undefined): ProductImageType | null => {
  if (!image) {
    return null;
  }

  return {
    ...image,
    publicId: image.publicId || (image as ProductImageType & { public_id?: string }).public_id || "",
    url: buildDisplayImageUrl(image.url),
    variants: image.variants
      ? {
          ...image.variants,
          original: buildAssetUrl(image.variants.original),
          thumbnail: buildAssetUrl(image.variants.thumbnail),
          productCard: buildAssetUrl(image.variants.productCard),
          productDetail: buildAssetUrl(image.variants.productDetail)
        }
      : image.variants
  };
};

const normalizeProduct = (product: Product): Product => {
  const featuredImage = buildDisplayImageUrl(product.featuredImage);
  const primaryImage = buildDisplayImageUrl(product.primaryImage);
  const galleryImages = Array.isArray(product.galleryImages)
    ? product.galleryImages.map((image) => buildDisplayImageUrl(image)).filter(Boolean)
    : [];
  const primaryImageData = normalizeProductImage(product.primaryImageData);
  const images = Array.isArray(product.images)
    ? product.images.map((image) => normalizeProductImage(image)).filter(isProductImage)
    : [];
  const resolvedThumbnail = resolveProductThumbnail({
    ...product,
    thumbnail: buildDisplayImageUrl(product.thumbnail),
    images
  });

  return {
    ...product,
    featuredImage,
    thumbnail: resolvedThumbnail,
    primaryImage,
    galleryImages,
    primaryImageData,
    productVideo: product.productVideo?.url
      ? {
          ...product.productVideo,
          url: buildDisplayImageUrl(product.productVideo.url)
        }
      : null,
    images
  };
};

const normalizeProductList = (response: PaginatedResponse<Product>): PaginatedResponse<Product> => ({
  ...response,
  data: Array.isArray(response.data) ? response.data.map(normalizeProduct) : []
});

const normalizeProductResponse = (response: ApiResponse<Product>): ApiResponse<Product> => ({
  ...response,
  data: normalizeProduct(response.data)
});

export const adminAuthApi = {
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/admin/login", { method: "POST", body: JSON.stringify(body) }, false),
  profile: () => request<ApiResponse<AdminUser>>("/admin/profile"),
  updateProfile: (body: { fullName?: string; email?: string; phone?: string }) =>
    request<ApiResponse<AdminUser>>("/admin/profile", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    request<ApiResponse<null>>("/admin/change-password", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return request<ApiResponse<{ avatar: { public_id: string; url: string } }>>("/admin/avatar", {
      method: "PATCH",
      body: form
    }).then((response) => ({
      ...response,
      data: {
        ...response.data,
        avatar: {
          ...response.data.avatar,
          url: buildDisplayImageUrl(response.data.avatar?.url)
        }
      }
    }));
  }
};

export const dashboardApi = {
  get: () => request<ApiResponse<DashboardAnalytics>>("/admin/dashboard")
};

export const catalogApi = {
  categories: () =>
    request<ApiResponse<Category[]>>("/admin/categories").then((response) => ({
      ...response,
      data: Array.isArray(response.data)
        ? response.data.map((category) => ({
            ...category,
            image: buildDisplayImageUrl(category.image)
          }))
        : []
    })),
  createCategory: (body: Partial<Category>) =>
    request<ApiResponse<Category>>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(body)
    }).then((response) => ({
      ...response,
      data: {
        ...response.data,
        image: buildDisplayImageUrl(response.data.image)
      }
    })),
  updateCategory: (id: string, body: Partial<Category>) =>
    request<ApiResponse<Category>>(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }).then((response) => ({
      ...response,
      data: {
        ...response.data,
        image: buildDisplayImageUrl(response.data.image)
      }
    })),
  deleteCategory: (id: string) =>
    request<ApiResponse<null>>(`/admin/categories/${id}`, { method: "DELETE" }),
  subCategories: (category?: string) =>
    request<ApiResponse<SubCategory[]>>(
      `/admin/subcategories${category ? `?category=${category}` : ""}`
    ),
  createSubCategory: (body: Partial<SubCategory>) =>
    request<ApiResponse<SubCategory>>("/admin/subcategories", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  updateSubCategory: (id: string, body: Partial<SubCategory>) =>
    request<ApiResponse<SubCategory>>(`/admin/subcategories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  deleteSubCategory: (id: string) =>
    request<ApiResponse<null>>(`/admin/subcategories/${id}`, { method: "DELETE" })
};

export const productApi = {
  list: (params: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<PaginatedResponse<Product>>(`/admin/products?${query}`).then(normalizeProductList);
  },
  get: (id: string) => request<ApiResponse<Product>>(`/admin/products/${id}`).then(normalizeProductResponse),
  create: (body: FormData) =>
    request<ApiResponse<Product>>("/admin/products", {
      method: "POST",
      body
    }).then(normalizeProductResponse),
  update: (id: string, body: FormData) =>
    request<ApiResponse<Product>>(`/admin/products/${id}`, {
      method: "PATCH",
      body
    }).then(normalizeProductResponse),
  remove: (id: string) => request<ApiResponse<null>>(`/admin/products/${id}`, { method: "DELETE" }),
  updateStock: (id: string, body: { stock: number; lowStockThreshold?: number }) =>
    request<ApiResponse<Product>>(`/admin/products/${id}/stock`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }).then(normalizeProductResponse),
  updateStatus: (id: string, status: "active" | "inactive") =>
    request<ApiResponse<Product>>(`/admin/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }).then(normalizeProductResponse),
  updateFeatured: (id: string, isFeatured: boolean) =>
    request<ApiResponse<Product>>(`/admin/products/${id}/featured`, {
      method: "PATCH",
      body: JSON.stringify({ isFeatured })
    }).then(normalizeProductResponse)
};

export const orderApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<PaginatedResponse<Order>>(`/admin/orders?${query}`);
  },
  get: (id: string) => request<ApiResponse<Order>>(`/admin/orders/${id}`),
  updateStatus: (id: string, orderStatus: Order["orderStatus"]) =>
    request<ApiResponse<Order>>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus })
    }),
  updatePaymentStatus: (id: string, paymentStatus: Order["paymentStatus"]) =>
    request<ApiResponse<Order>>(`/admin/orders/${id}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus })
    })
};

export const userApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<PaginatedResponse<AdminUser>>(`/admin/users?${query}`);
  },
  get: (id: string) => request<ApiResponse<AdminUser>>(`/admin/users/${id}`),
  create: (body: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: AdminUser["role"];
    isActive?: boolean;
  }) =>
    request<ApiResponse<AdminUser>>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  update: (
    id: string,
    body: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: AdminUser["role"];
      isActive?: boolean;
    }
  ) =>
    request<ApiResponse<AdminUser>>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  resetPassword: (id: string, body: { password: string; confirmPassword: string }) =>
    request<ApiResponse<AdminUser>>(`/admin/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  block: (id: string) => request<ApiResponse<AdminUser>>(`/admin/users/${id}/block`, { method: "PATCH" }),
  unblock: (id: string) =>
    request<ApiResponse<AdminUser>>(`/admin/users/${id}/unblock`, { method: "PATCH" }),
  remove: (id: string) => request<ApiResponse<null>>(`/admin/users/${id}`, { method: "DELETE" }),
  orders: (id: string) => request<ApiResponse<Order[]>>(`/admin/users/${id}/orders`)
};

export const reviewApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<PaginatedResponse<Review>>(`/reviews?${query}`);
  },
  approve: (id: string) => request<ApiResponse<Review>>(`/reviews/${id}/approve`, { method: "PATCH" }),
  reject: (id: string, rejectionReason: string) =>
    request<ApiResponse<Review>>(`/reviews/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason })
    }),
  hide: (id: string) => request<ApiResponse<Review>>(`/reviews/${id}/hide`, { method: "PATCH" }),
  feature: (id: string) => request<ApiResponse<Review>>(`/reviews/${id}/feature`, { method: "PATCH" })
};

export const leadApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<PaginatedResponse<Lead>>(`/leads?${query}`);
  },
  get: (id: string) => request<ApiResponse<Lead>>(`/leads/${id}`),
  updateStatus: (id: string, status: Lead["status"]) =>
    request<ApiResponse<Lead>>(`/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  addNote: (id: string, note: string) =>
    request<ApiResponse<Lead>>(`/leads/${id}/note`, {
      method: "POST",
      body: JSON.stringify({ note })
    })
};

type ContentMethod = "GET" | "POST" | "PUT" | "DELETE";

const contentRequest = <T>(path: string, method: ContentMethod, body?: unknown) =>
  request<T>(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

export const contentApi = {
  collections: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/collections", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/collections/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/collections", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/collections/${id}`, "PUT", body),
    delete: (id: string) => contentRequest<ApiResponse<null>>(`/admin/collections/${id}`, "DELETE")
  },
  blogs: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/blogs", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/blogs/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/blogs", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/blogs/${id}`, "PUT", body),
    delete: (id: string) => contentRequest<ApiResponse<null>>(`/admin/blogs/${id}`, "DELETE")
  },
  pages: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/pages", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/pages/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/pages", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/pages/${id}`, "PUT", body),
    delete: (id: string) => contentRequest<ApiResponse<null>>(`/admin/pages/${id}`, "DELETE")
  },
  faqs: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/faqs", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/faqs/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/faqs", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/faqs/${id}`, "PUT", body),
    delete: (id: string) => contentRequest<ApiResponse<null>>(`/admin/faqs/${id}`, "DELETE")
  },
  banners: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/banners", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/banners/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/banners", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/banners/${id}`, "PUT", body),
    delete: (id: string) => contentRequest<ApiResponse<null>>(`/admin/banners/${id}`, "DELETE")
  },
  homepage: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/homepage/sections", "GET"),
    get: (id: string) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/homepage/sections/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/homepage/sections", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/homepage/sections/${id}`, "PUT", body),
    delete: (id: string) =>
      contentRequest<ApiResponse<null>>(`/admin/homepage/sections/${id}`, "DELETE")
  },
  seo: {
    list: () => contentRequest<PaginatedResponse<Record<string, unknown>>>("/admin/seo", "GET"),
    get: (id: string) => contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/seo/${id}`, "GET"),
    create: (body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>("/admin/seo", "POST", body),
    update: (id: string, body: Record<string, unknown>) =>
      contentRequest<ApiResponse<Record<string, unknown>>>(`/admin/seo/${id}`, "PUT", body)
  }
};
